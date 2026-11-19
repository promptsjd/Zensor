import Matter from 'matter-js';
import { ZenAudio } from './audio';
import {
  BASE_GRAINS_PER_COLOR,
  CAT_LEFT_BOWL,
  CAT_LEFT_GRAIN,
  CAT_RIGHT_BOWL,
  CAT_RIGHT_GRAIN,
  DUNE_RADIUS_X,
  DUNE_RADIUS_Z,
  DUNE_Z_FLOOR_OFFSET,
  LEFT_BOWL,
  LEVEL_DUNE_PROFILES,
  LEVEL_STEP_PER_COLOR,
  MAX_LEVEL,
  RIGHT_BOWL,
  TABLE_FLOOR_Y,
  WORLD_H,
  WORLD_W,
} from './constants';
import {
  createBowlColliders,
  createGrainBody,
  createSliceFloorColliders,
  isPointInTaperedGrain,
} from './physics';
import {
  drawBowlBack,
  drawBowlFront,
  drawCenterRestingMat,
  drawRiceGrain,
  renderBackdropBuffer,
} from './renderer';
import { loadSave, persistSave } from './storage';
import type {
  BowlGrain,
  CompletionStats,
  FlyingGrain,
  GameHudState,
  GrainType,
  PileGrain,
  RedPulse,
  ViewTransform,
} from './types';

export interface ZensorCallbacks {
  onHudUpdate: (hud: GameHudState) => void;
  onMistake: () => void;
  onComplete: (stats: CompletionStats) => void;
}

const FIXED_STEP_MS = 1000 / 60;

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class ZensorEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly callbacks: ZensorCallbacks;
  private readonly audio = new ZenAudio();
  private readonly prefersReducedMotion: boolean;

  private readonly view: ViewTransform = {
    dpr: 1,
    cssW: window.innerWidth,
    cssH: window.innerHeight,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };

  private readonly backdropCanvas = document.createElement('canvas');
  private backdropDirty = true;

  private engine: Matter.Engine | null = null;
  private pileGrains: PileGrain[] = [];
  private flyingGrains: FlyingGrain[] = [];
  private leftBowlGrains: BowlGrain[] = [];
  private rightBowlGrains: BowlGrain[] = [];
  private redPulses: RedPulse[] = [];

  private hoveredGrainId: number | null = null;
  private tremorStrength = 0;
  private tremorPhase = 0;

  private sortedWhite = 0;
  private sortedBlack = 0;
  private mistakes = 0;
  private startTimeMs: number | null = null;
  private isCompleted = false;

  private currentLevel = 1;
  private totalPilesCompleted = 0;
  private activeLevel = 1;
  private activePerColor = BASE_GRAINS_PER_COLOR;
  private activeTotalGrains = BASE_GRAINS_PER_COLOR * 2;

  private rafId: number | null = null;
  private completionTimeoutId: number | null = null;
  private lastFrameTime = performance.now();
  private physicsAccumulator = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: ZensorCallbacks) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }

    this.canvas = canvas;
    this.ctx = context;
    this.callbacks = callbacks;
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const saved = loadSave();
    this.currentLevel = saved.currentLevel;
    this.totalPilesCompleted = saved.totalPilesCompleted;

    this.bindEvents();
    this.handleResize();
    this.resetLevel();
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  public setSoundEnabled(enabled: boolean): void {
    this.audio.setEnabled(enabled);
  }

  public startNextOrReplayLevel(): void {
    this.resetLevel();
  }

  public resetAllProgress(): void {
    this.currentLevel = 1;
    this.totalPilesCompleted = 0;
    persistSave({
      currentLevel: this.currentLevel,
      totalPilesCompleted: this.totalPilesCompleted,
    });
    this.resetLevel();
  }

  public dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.completionTimeoutId !== null) {
      window.clearTimeout(this.completionTimeoutId);
      this.completionTimeoutId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('auxclick', this.handleAuxClick);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.audio.dispose();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('auxclick', this.handleAuxClick);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
  }

  private readonly handleResize = (): void => {
    this.view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.view.cssW = window.innerWidth;
    this.view.cssH = window.innerHeight;

    this.canvas.width = Math.floor(this.view.cssW * this.view.dpr);
    this.canvas.height = Math.floor(this.view.cssH * this.view.dpr);

    this.view.scale = Math.min(this.view.cssW / WORLD_W, this.view.cssH / WORLD_H);
    this.view.offsetX = (this.view.cssW - WORLD_W * this.view.scale) * 0.5;
    this.view.offsetY = (this.view.cssH - WORLD_H * this.view.scale) * 0.5;

    this.backdropDirty = true;
  };

  private readonly handleAuxClick = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private readonly handlePointerMove = (e: PointerEvent): void => {
    const { x, y } = this.screenToWorld(e.clientX, e.clientY);
    const hovered = this.findGrainAt(x, y);
    this.hoveredGrainId = hovered ? hovered.id : null;
    this.canvas.style.cursor = hovered ? 'pointer' : 'default';
  };

  private readonly handlePointerLeave = (): void => {
    this.hoveredGrainId = null;
    this.canvas.style.cursor = 'default';
  };

  private readonly handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 1) {
      e.preventDefault();
      return;
    }
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();

    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }

    const { x, y } = this.screenToWorld(e.clientX, e.clientY);
    const grain = this.findGrainAt(x, y);
    if (!grain) return;

    const isLeftClick = e.button === 0;
    const isRightClick = e.button === 2;
    const isWhiteAction = isLeftClick && !e.shiftKey;
    const isBlackAction = isRightClick || (isLeftClick && e.shiftKey);

    if ((grain.type === 'white' && isWhiteAction) || (grain.type === 'black' && isBlackAction)) {
      this.launchGrainToBowl(grain);
    } else {
      this.triggerWrongButtonFeedback(grain);
    }
  };

  private resetLevel(): void {
    if (this.completionTimeoutId !== null) {
      window.clearTimeout(this.completionTimeoutId);
      this.completionTimeoutId = null;
    }

    this.activeLevel = Math.max(1, Math.min(MAX_LEVEL, this.currentLevel));
    this.activePerColor = BASE_GRAINS_PER_COLOR + (this.activeLevel - 1) * LEVEL_STEP_PER_COLOR;
    this.activeTotalGrains = this.activePerColor * 2;

    this.engine = Matter.Engine.create({
      enableSleeping: true,
      gravity: { x: 0, y: 1.25, scale: 0.001 },
      positionIterations: 12,
      velocityIterations: 10,
    });

    this.pileGrains = [];
    this.flyingGrains = [];
    this.leftBowlGrains = [];
    this.rightBowlGrains = [];
    this.redPulses = [];
    this.hoveredGrainId = null;
    this.tremorStrength = 0;
    this.sortedWhite = 0;
    this.sortedBlack = 0;
    this.mistakes = 0;
    this.startTimeMs = null;
    this.isCompleted = false;

    Matter.Composite.add(this.engine.world, [
      ...createBowlColliders(LEFT_BOWL, CAT_LEFT_BOWL, CAT_LEFT_GRAIN),
      ...createBowlColliders(RIGHT_BOWL, CAT_RIGHT_BOWL, CAT_RIGHT_GRAIN),
    ]);

    const colors: GrainType[] = [];
    for (let i = 0; i < this.activePerColor; i++) {
      colors.push('white', 'black');
    }
    shuffleArray(colors);

    const centerX = WORLD_W * 0.5;
    const rowSpacing = 5.95;
    const slices = LEVEL_DUNE_PROFILES[this.activeLevel];
    let colorIdx = 0;

    slices.forEach((slice, sliceIdx) => {
      if (!this.engine) return;
      const sliceGroup = sliceIdx + 1;
      const zSlice = slice.z;
      const floorY = TABLE_FLOOR_Y + zSlice * DUNE_Z_FLOOR_OFFSET;
      const maxHalfX = DUNE_RADIUS_X * Math.sqrt(Math.max(0.05, 1 - zSlice * zSlice));

      Matter.Composite.add(this.engine.world, createSliceFloorColliders(sliceGroup, zSlice));

      slice.layers.forEach((count, layerIdx) => {
        if (!this.engine) return;
        const rowY = floorY - 3.8 - layerIdx * rowSpacing;

        for (let c = 0; c < count; c++) {
          const type = colors[colorIdx++];
          let x: number;

          if (count === 1) {
            x = centerX + (Math.random() - 0.5) * 3;
          } else if (layerIdx === 0) {
            const u = (c / (count - 1)) * 2 - 1;
            const absU = Math.abs(u);
            const coreHalfW = Math.min(maxHalfX - 18, (count - 3) * 5.6);
            if (absU <= 0.78 || count <= 7) {
              const t = absU / (count <= 7 ? 1 : 0.78);
              x = centerX + Math.sign(u) * t * (count <= 7 ? maxHalfX - 8 : coreHalfW);
            } else {
              const rimT = (absU - 0.78) / 0.22;
              x = centerX + Math.sign(u) * (coreHalfW + rimT * (maxHalfX - 6 - coreHalfW));
            }
          } else {
            const colSpacing = 10.8;
            const stagger = layerIdx % 2 === 0 ? 0 : 2.0;
            const span = (count - 1) * colSpacing;
            x = centerX - span * 0.5 + c * colSpacing + stagger - 1.0;
          }

          const z = Math.max(-1, Math.min(1, zSlice + (Math.random() - 0.5) * 0.08));
          const zScale = 1.0 + z * 0.12;
          const jitterX = (Math.random() - 0.5) * 0.4;
          const jitterY = (Math.random() - 0.5) * 0.25;

          const rx = (5.0 + (Math.random() - 0.5) * 0.45) * zScale;
          const ry = (2.25 + (Math.random() - 0.5) * 0.22) * zScale;
          const baseAngle = (Math.random() - 0.5) * 0.14;

          const body = createGrainBody(x + jitterX, rowY + jitterY, rx, ry, baseAngle, {
            group: sliceGroup,
            category: 0,
            mask: 0,
          });

          const grain: PileGrain = {
            id: body.id,
            type,
            rx,
            ry,
            z,
            zScale,
            sliceGroup,
            shade: Math.random(),
            redPulse: 0,
            body,
          };

          this.pileGrains.push(grain);
          Matter.Composite.add(this.engine.world, body);
        }
      });
    });

    for (let i = 0; i < 48; i++) {
      Matter.Engine.update(this.engine, FIXED_STEP_MS);
    }

    this.emitHudUpdate();
  }

  private emitHudUpdate(): void {
    this.callbacks.onHudUpdate({
      activeLevel: this.activeLevel,
      maxLevel: MAX_LEVEL,
      sortedWhite: this.sortedWhite,
      sortedBlack: this.sortedBlack,
      targetPerColor: this.activePerColor,
      remaining: this.activeTotalGrains - this.sortedWhite - this.sortedBlack,
    });
  }

  private getSortedPileGrains(): PileGrain[] {
    return this.pileGrains.sort((a, b) => {
      const dz = a.z - b.z;
      if (Math.abs(dz) > 0.004) return dz;
      const dy = b.body.position.y - a.body.position.y;
      if (Math.abs(dy) > 0.2) return dy;
      return a.id - b.id;
    });
  }

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.view.offsetX) / this.view.scale,
      y: (clientY - rect.top - this.view.offsetY) / this.view.scale,
    };
  }

  private findGrainAt(wx: number, wy: number): PileGrain | null {
    const ordered = this.getSortedPileGrains();

    for (let i = ordered.length - 1; i >= 0; i--) {
      const g = ordered[i];
      if (
        isPointInTaperedGrain(
          wx,
          wy,
          g.body.position.x,
          g.body.position.y,
          g.body.angle,
          g.rx,
          g.ry,
          0.8
        )
      ) {
        return g;
      }
    }

    let bestGrain: PileGrain | null = null;
    let bestDist = Infinity;
    for (let i = ordered.length - 1; i >= 0; i--) {
      const g = ordered[i];
      if (
        isPointInTaperedGrain(
          wx,
          wy,
          g.body.position.x,
          g.body.position.y,
          g.body.angle,
          g.rx,
          g.ry,
          2.4
        )
      ) {
        const d = Math.hypot(wx - g.body.position.x, wy - g.body.position.y);
        if (d < bestDist) {
          bestDist = d;
          bestGrain = g;
        }
      }
    }
    return bestGrain;
  }

  private triggerWrongButtonFeedback(grain: PileGrain): void {
    this.mistakes++;
    this.audio.playError();

    if (!this.prefersReducedMotion) {
      this.tremorStrength = 1.0;
      this.tremorPhase = 0;
    }

    grain.redPulse = 1.0;
    this.redPulses.push({
      x: grain.body.position.x,
      y: grain.body.position.y,
      progress: 0,
    });

    this.callbacks.onMistake();
  }

  private launchGrainToBowl(grain: PileGrain): void {
    if (!this.engine) return;
    if (this.startTimeMs === null) {
      this.startTimeMs = performance.now();
    }

    this.audio.init();

    const idx = this.pileGrains.indexOf(grain);
    if (idx !== -1) {
      this.pileGrains.splice(idx, 1);
    }
    Matter.Composite.remove(this.engine.world, grain.body);

    const gx = grain.body.position.x;
    const gy = grain.body.position.y;
    const gz = grain.z;
    for (const other of this.pileGrains) {
      const dx = other.body.position.x - gx;
      const dzPx = (other.z - gz) * DUNE_RADIUS_Z;
      const distXZ = Math.hypot(dx, dzPx);
      if (distXZ <= 36 && other.body.position.y <= gy + 10) {
        Matter.Sleeping.set(other.body, false);
      }
    }

    const targetBowl = grain.type === 'white' ? LEFT_BOWL : RIGHT_BOWL;
    const targetX = targetBowl.cx + (Math.random() - 0.5) * 68;
    const targetY = targetBowl.rimY + 6;
    const controlX = (gx + targetX) * 0.5;
    const controlY = Math.min(gy, targetY) - 185 - Math.random() * 40;

    this.flyingGrains.push({
      type: grain.type,
      rx: grain.rx,
      ry: grain.ry,
      shade: grain.shade,
      startX: gx,
      startY: gy,
      startAngle: grain.body.angle,
      controlX,
      controlY,
      targetX,
      targetY,
      targetAngle: (Math.random() - 0.5) * 0.6,
      elapsed: 0,
      duration: 430,
    });
  }

  private updateSimulation(dtMs: number): void {
    if (!this.engine) return;

    const clampedDt = Math.min(dtMs, 40);
    this.physicsAccumulator += clampedDt;

    while (this.physicsAccumulator >= FIXED_STEP_MS) {
      Matter.Engine.update(this.engine, FIXED_STEP_MS);
      this.physicsAccumulator -= FIXED_STEP_MS;
    }

    if (this.tremorStrength > 0) {
      this.tremorPhase += clampedDt * 0.068;
      this.tremorStrength = Math.max(0, this.tremorStrength - clampedDt / 290);
    }

    for (const g of this.pileGrains) {
      if (g.redPulse > 0) {
        g.redPulse = Math.max(0, g.redPulse - clampedDt / 360);
      }
    }

    for (let i = this.redPulses.length - 1; i >= 0; i--) {
      this.redPulses[i].progress += clampedDt / 380;
      if (this.redPulses[i].progress >= 1) {
        this.redPulses.splice(i, 1);
      }
    }

    for (let i = this.flyingGrains.length - 1; i >= 0; i--) {
      const fg = this.flyingGrains[i];
      fg.elapsed += clampedDt;
      const t = Math.min(1, fg.elapsed / fg.duration);

      if (t >= 1) {
        const isWhite = fg.type === 'white';
        const body = createGrainBody(
          fg.targetX,
          fg.targetY,
          fg.rx,
          fg.ry,
          fg.targetAngle,
          {
            group: 0,
            category: isWhite ? CAT_LEFT_GRAIN : CAT_RIGHT_GRAIN,
            mask: isWhite ? CAT_LEFT_BOWL | CAT_LEFT_GRAIN : CAT_RIGHT_BOWL | CAT_RIGHT_GRAIN,
          },
          { friction: 0.72, frictionStatic: 0.9, frictionAir: 0.04, restitution: 0.06 }
        );
        Matter.Body.setVelocity(body, { x: (Math.random() - 0.5) * 0.5, y: 2.4 });

        const bowlGrain: BowlGrain = {
          type: fg.type,
          rx: fg.rx,
          ry: fg.ry,
          shade: fg.shade,
          body,
        };

        if (isWhite) {
          this.leftBowlGrains.push(bowlGrain);
          this.sortedWhite++;
        } else {
          this.rightBowlGrains.push(bowlGrain);
          this.sortedBlack++;
        }

        Matter.Composite.add(this.engine.world, body);
        this.flyingGrains.splice(i, 1);

        this.audio.playBowlLand();
        this.emitHudUpdate();

        if (!this.isCompleted && this.sortedWhite + this.sortedBlack === this.activeTotalGrains) {
          this.isCompleted = true;
          const finishedLevel = this.activeLevel;
          const totalGrains = this.activeTotalGrains;
          const wasMaxLevel = finishedLevel >= MAX_LEVEL;
          this.totalPilesCompleted += 1;
          this.currentLevel = Math.min(MAX_LEVEL, finishedLevel + 1);
          persistSave({
            currentLevel: this.currentLevel,
            totalPilesCompleted: this.totalPilesCompleted,
          });

          const elapsedSec = this.startTimeMs
            ? Math.max(1, Math.round((performance.now() - this.startTimeMs) / 1000))
            : 0;
          const mins = Math.floor(elapsedSec / 60);
          const secs = String(elapsedSec % 60).padStart(2, '0');
          const totalClicks = totalGrains + this.mistakes;
          const accuracy = Math.round((totalGrains / Math.max(1, totalClicks)) * 100);

          this.completionTimeoutId = window.setTimeout(() => {
            this.completionTimeoutId = null;
            this.audio.playComplete();
            this.callbacks.onComplete({
              finishedLevel,
              totalGrains,
              wasMaxLevel,
              timeFormatted: `${mins}:${secs}`,
              accuracy,
            });
          }, 550);
        }
      }
    }
  }

  private renderScene(): void {
    if (this.backdropDirty) {
      renderBackdropBuffer(
        this.backdropCanvas,
        this.canvas.width,
        this.canvas.height,
        this.view
      );
      this.backdropDirty = false;
    }

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.backdropCanvas, 0, 0);

    const tremorPx =
      this.tremorStrength > 0 ? Math.sin(this.tremorPhase) * 6.5 * this.tremorStrength : 0;
    this.ctx.setTransform(
      this.view.dpr * this.view.scale,
      0,
      0,
      this.view.dpr * this.view.scale,
      (this.view.offsetX + tremorPx) * this.view.dpr,
      this.view.offsetY * this.view.dpr
    );

    drawCenterRestingMat(this.ctx);

    drawBowlBack(this.ctx, LEFT_BOWL);
    drawBowlBack(this.ctx, RIGHT_BOWL);

    for (const g of this.leftBowlGrains) {
      drawRiceGrain(
        this.ctx,
        g.body.position.x,
        g.body.position.y,
        g.rx,
        g.ry,
        g.body.angle,
        g.type,
        g.shade,
        { shadowAlpha: 0.22 }
      );
    }
    for (const g of this.rightBowlGrains) {
      drawRiceGrain(
        this.ctx,
        g.body.position.x,
        g.body.position.y,
        g.rx,
        g.ry,
        g.body.angle,
        g.type,
        g.shade,
        { shadowAlpha: 0.22 }
      );
    }

    const orderedPile = this.getSortedPileGrains();
    for (const g of orderedPile) {
      const grainTremor =
        g.redPulse > 0 && !this.prefersReducedMotion
          ? Math.sin(this.tremorPhase * 1.4) * 2.2 * g.redPulse
          : 0;
      drawRiceGrain(
        this.ctx,
        g.body.position.x + grainTremor,
        g.body.position.y,
        g.rx,
        g.ry,
        g.body.angle,
        g.type,
        g.shade,
        {
          isHovered: g.id === this.hoveredGrainId,
          redPulse: g.redPulse,
          shadowAlpha: 0.38,
        }
      );
    }

    for (const p of this.redPulses) {
      const radius = 12 + p.progress * 34;
      const alpha = (1 - p.progress) * 0.55;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(205, 68, 60, ${alpha})`;
      this.ctx.lineWidth = 2.4 * (1 - p.progress * 0.5);
      this.ctx.stroke();
      this.ctx.restore();
    }

    drawBowlFront(this.ctx, LEFT_BOWL);
    drawBowlFront(this.ctx, RIGHT_BOWL);

    for (const fg of this.flyingGrains) {
      const rawT = Math.min(1, fg.elapsed / fg.duration);
      const t = rawT < 0.5 ? 2 * rawT * rawT : 1 - Math.pow(-2 * rawT + 2, 2) / 2;
      const inv = 1 - t;

      const x = inv * inv * fg.startX + 2 * inv * t * fg.controlX + t * t * fg.targetX;
      const y = inv * inv * fg.startY + 2 * inv * t * fg.controlY + t * t * fg.targetY;
      const angle = fg.startAngle + (fg.targetAngle - fg.startAngle) * t;
      const lift = Math.sin(t * Math.PI);

      this.ctx.save();
      this.ctx.fillStyle = `rgba(28, 17, 9, ${0.14 * (1 - lift * 0.45)})`;
      this.ctx.beginPath();
      this.ctx.ellipse(
        x,
        y + 26 + lift * 95,
        fg.rx * (0.9 + lift * 0.25),
        fg.ry * 0.85,
        0,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.restore();

      drawRiceGrain(this.ctx, x, y, fg.rx, fg.ry, angle, fg.type, fg.shade, {
        scale: 1 + lift * 0.2,
        shadowAlpha: 0.12,
      });
    }
  }

  private readonly tick = (now: number): void => {
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.updateSimulation(dt);
    this.renderScene();
    this.rafId = requestAnimationFrame(this.tick);
  };
}
