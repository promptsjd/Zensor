import {
  DUNE_RADIUS_X,
  DUNE_Z_FLOOR_OFFSET,
  HORIZON_Y,
  TABLE_FLOOR_Y,
  WORLD_W,
} from './constants';
import type { BowlConfig, GrainType, ViewTransform } from './types';

export interface DrawGrainOptions {
  isHovered?: boolean;
  redPulse?: number;
  scale?: number;
  shadowAlpha?: number;
}

export function renderBackdropBuffer(
  backdropCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
  view: ViewTransform
): void {
  backdropCanvas.width = targetWidth;
  backdropCanvas.height = targetHeight;
  const bctx = backdropCanvas.getContext('2d');
  if (!bctx) return;

  bctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  const horizonScreenY = view.offsetY + HORIZON_Y * view.scale;
  const centerScreenX = view.offsetX + WORLD_W * 0.5 * view.scale;

  // 1. Calm warm plaster / shoji wall above the counter
  const wallGrad = bctx.createLinearGradient(0, 0, 0, horizonScreenY);
  wallGrad.addColorStop(0, '#EBE3D6');
  wallGrad.addColorStop(0.75, '#E2D7C6');
  wallGrad.addColorStop(1, '#D3C5B0');
  bctx.fillStyle = wallGrad;
  bctx.fillRect(0, 0, view.cssW, horizonScreenY + 2);

  // Soft angled natural window light falloff across the back wall
  const sunWall = bctx.createRadialGradient(
    centerScreenX - view.cssW * 0.1,
    horizonScreenY * 0.25,
    20,
    centerScreenX,
    horizonScreenY * 0.6,
    Math.max(view.cssW, view.cssH) * 0.55
  );
  sunWall.addColorStop(0, 'rgba(255, 250, 240, 0.45)');
  sunWall.addColorStop(1, 'rgba(255, 250, 240, 0)');
  bctx.fillStyle = sunWall;
  bctx.fillRect(0, 0, view.cssW, horizonScreenY);

  // Subtle horizontal wall trim shadow right above the counter
  bctx.fillStyle = 'rgba(56, 38, 22, 0.08)';
  bctx.fillRect(0, horizonScreenY - 4, view.cssW, 4);

  // 2. Warm wooden tabletop counter (slightly angled perspective)
  const woodGrad = bctx.createLinearGradient(0, horizonScreenY, 0, view.cssH);
  woodGrad.addColorStop(0, '#9E7349');
  woodGrad.addColorStop(0.18, '#B38558');
  woodGrad.addColorStop(0.55, '#BA8C5E');
  woodGrad.addColorStop(1, '#9E7147');
  bctx.fillStyle = woodGrad;
  bctx.fillRect(0, horizonScreenY, view.cssW, view.cssH - horizonScreenY);

  // Perspective wooden planks converging toward vanishing point above horizon
  const vanishX = centerScreenX;
  const vanishY = horizonScreenY - 520 * view.scale;
  bctx.save();
  bctx.beginPath();
  bctx.rect(0, horizonScreenY, view.cssW, view.cssH - horizonScreenY);
  bctx.clip();

  const plankAngles = [-0.88, -0.62, -0.37, -0.12, 0.12, 0.37, 0.62, 0.88];
  for (let i = 0; i < plankAngles.length; i++) {
    const slope = plankAngles[i];
    const xTop = vanishX + slope * (horizonScreenY - vanishY);
    const xBot = vanishX + slope * (view.cssH - vanishY);

    bctx.beginPath();
    bctx.moveTo(xTop, horizonScreenY);
    bctx.lineTo(xBot, view.cssH);
    bctx.strokeStyle = 'rgba(68, 41, 18, 0.14)';
    bctx.lineWidth = 1.4;
    bctx.stroke();

    bctx.beginPath();
    bctx.moveTo(xTop + 1.5, horizonScreenY);
    bctx.lineTo(xBot + 1.5, view.cssH);
    bctx.strokeStyle = 'rgba(248, 224, 192, 0.10)';
    bctx.lineWidth = 1;
    bctx.stroke();
  }

  // Subtle organic wood grain fibers across the counter
  for (let i = 0; i < 65; i++) {
    const t = (i + 0.5) / 65;
    const yPos = horizonScreenY + Math.pow(t, 1.35) * (view.cssH - horizonScreenY);
    const alpha = 0.03 + (i % 5) * 0.008;
    bctx.beginPath();
    bctx.moveTo(0, yPos);
    const wave = Math.sin(i * 1.7) * 8 * view.scale;
    bctx.bezierCurveTo(
      view.cssW * 0.33,
      yPos + wave,
      view.cssW * 0.66,
      yPos - wave,
      view.cssW,
      yPos + (i % 2 === 0 ? 3 : -3)
    );
    bctx.strokeStyle =
      i % 3 === 0 ? `rgba(246, 222, 188, ${alpha})` : `rgba(74, 43, 18, ${alpha})`;
    bctx.lineWidth = 1 + (i % 3) * 0.6;
    bctx.stroke();
  }

  // Soft overhead warm light pool centered on the sorting area
  const tableLight = bctx.createRadialGradient(
    centerScreenX,
    view.offsetY + 620 * view.scale,
    40 * view.scale,
    centerScreenX,
    view.offsetY + 620 * view.scale,
    640 * view.scale
  );
  tableLight.addColorStop(0, 'rgba(255, 244, 224, 0.22)');
  tableLight.addColorStop(0.6, 'rgba(255, 240, 214, 0.06)');
  tableLight.addColorStop(1, 'rgba(35, 20, 10, 0.20)');
  bctx.fillStyle = tableLight;
  bctx.fillRect(0, horizonScreenY, view.cssW, view.cssH - horizonScreenY);

  // Crisp front counter bevel along the bottom edge of the horizon transition
  const bevelGrad = bctx.createLinearGradient(
    0,
    horizonScreenY,
    0,
    horizonScreenY + 12 * view.scale
  );
  bevelGrad.addColorStop(0, 'rgba(248, 226, 196, 0.32)');
  bevelGrad.addColorStop(1, 'rgba(248, 226, 196, 0)');
  bctx.fillStyle = bevelGrad;
  bctx.fillRect(0, horizonScreenY, view.cssW, 12 * view.scale);

  bctx.restore();
}

export function drawCenterRestingMat(ctx: CanvasRenderingContext2D): void {
  const cx = WORLD_W * 0.5;
  const cy = TABLE_FLOOR_Y + 4;
  const shadowRx = DUNE_RADIUS_X + 28;
  const shadowRy = Math.round(DUNE_Z_FLOOR_OFFSET * 1.28);

  ctx.save();
  const shadowGrad = ctx.createRadialGradient(cx, cy + 2, 30, cx, cy + 2, shadowRx);
  shadowGrad.addColorStop(0, 'rgba(34, 18, 8, 0.36)');
  shadowGrad.addColorStop(0.55, 'rgba(34, 18, 8, 0.22)');
  shadowGrad.addColorStop(0.85, 'rgba(34, 18, 8, 0.08)');
  shadowGrad.addColorStop(1, 'rgba(34, 18, 8, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, shadowRx, shadowRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function traceTaperedSeedPath(ctx: CanvasRenderingContext2D, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.bezierCurveTo(-rx * 0.44, -ry * 1.32, rx * 0.44, -ry * 1.32, rx, 0);
  ctx.bezierCurveTo(rx * 0.44, ry * 1.32, -rx * 0.44, ry * 1.32, -rx, 0);
  ctx.closePath();
}

export function drawRiceGrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  type: GrainType,
  shade: number,
  options: DrawGrainOptions = {}
): void {
  const { isHovered = false, redPulse = 0, scale = 1, shadowAlpha = 0.36 } = options;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  if (shadowAlpha > 0) {
    ctx.save();
    ctx.translate(1.0, 1.7);
    ctx.fillStyle = `rgba(18, 10, 4, ${shadowAlpha * 0.55})`;
    traceTaperedSeedPath(ctx, rx * 1.12, ry * 1.18);
    ctx.fill();
    ctx.fillStyle = `rgba(18, 10, 4, ${shadowAlpha})`;
    traceTaperedSeedPath(ctx, rx * 0.96, ry * 0.98);
    ctx.fill();
    ctx.restore();
  }

  if (isHovered) {
    ctx.strokeStyle =
      type === 'white' ? 'rgba(255, 252, 238, 0.95)' : 'rgba(246, 212, 156, 0.90)';
    ctx.lineWidth = 1.6;
    traceTaperedSeedPath(ctx, rx + 1.8, ry + 1.4);
    ctx.stroke();
  }

  const bodyGrad = ctx.createRadialGradient(-rx * 0.22, -ry * 0.45, ry * 0.15, 0, 0, rx * 1.15);
  if (type === 'white') {
    const warm = Math.round((shade - 0.5) * 8);
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.35, `rgb(252, ${246 + warm}, ${234 + warm})`);
    bodyGrad.addColorStop(0.75, `rgb(${232 + warm}, ${222 + warm}, ${205 + warm})`);
    bodyGrad.addColorStop(1, `rgb(${194 + warm}, ${180 + warm}, ${160 + warm})`);
  } else {
    const tint = Math.round((shade - 0.5) * 10);
    bodyGrad.addColorStop(0, `rgb(${92 + tint}, ${86 + tint}, ${82 + tint})`);
    bodyGrad.addColorStop(0.38, `rgb(${48 + tint}, ${44 + tint}, ${42 + tint})`);
    bodyGrad.addColorStop(0.78, `rgb(${25 + tint}, ${22 + tint}, ${21 + tint})`);
    bodyGrad.addColorStop(1, '#0E0C0B');
  }

  ctx.fillStyle = bodyGrad;
  traceTaperedSeedPath(ctx, rx, ry);
  ctx.fill();

  const rimShade = ctx.createLinearGradient(0, -ry, 0, ry);
  rimShade.addColorStop(
    0,
    type === 'white' ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.14)'
  );
  rimShade.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
  rimShade.addColorStop(1, type === 'white' ? 'rgba(84, 62, 38, 0.22)' : 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = rimShade;
  ctx.fill();

  ctx.strokeStyle =
    type === 'white' ? 'rgba(116, 94, 70, 0.46)' : 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 0.65;
  ctx.stroke();

  if (redPulse > 0.01) {
    ctx.fillStyle = `rgba(205, 68, 60, ${0.52 * redPulse})`;
    traceTaperedSeedPath(ctx, rx + 0.4, ry + 0.4);
    ctx.fill();
  }

  ctx.restore();
}

function traceBowlFrontGlass(ctx: CanvasRenderingContext2D, bowl: BowlConfig): void {
  const { cx, rimY, baseY, rx, rimRy, baseRx, baseRy } = bowl;
  ctx.beginPath();
  ctx.moveTo(cx - rx, rimY);
  ctx.bezierCurveTo(cx - rx, rimY + 95, cx - baseRx - 14, baseY - 10, cx - baseRx, baseY);
  ctx.ellipse(cx, baseY, baseRx, baseRy, 0, Math.PI, 0, true);
  ctx.bezierCurveTo(cx + baseRx + 14, baseY - 10, cx + rx, rimY + 95, cx + rx, rimY);
  ctx.ellipse(cx, rimY, rx, rimRy, 0, 0, Math.PI, false);
}

function traceBowlOuterWall(ctx: CanvasRenderingContext2D, bowl: BowlConfig): void {
  const { cx, rimY, baseY, rx, baseRx, baseRy } = bowl;
  ctx.beginPath();
  ctx.moveTo(cx - rx, rimY);
  ctx.bezierCurveTo(cx - rx, rimY + 95, cx - baseRx - 14, baseY - 10, cx - baseRx, baseY);
  ctx.ellipse(cx, baseY, baseRx, baseRy, 0, Math.PI, 0, true);
  ctx.bezierCurveTo(cx + baseRx + 14, baseY - 10, cx + rx, rimY + 95, cx + rx, rimY);
}

export function drawBowlBack(ctx: CanvasRenderingContext2D, bowl: BowlConfig): void {
  const { cx, rimY, baseY, rx, rimRy, baseRx, baseRy } = bowl;
  ctx.save();

  const shadowGrad = ctx.createRadialGradient(
    cx,
    baseY + 8,
    baseRx * 0.3,
    cx,
    baseY + 8,
    rx * 1.08
  );
  shadowGrad.addColorStop(0, 'rgba(32, 18, 8, 0.36)');
  shadowGrad.addColorStop(0.65, 'rgba(32, 18, 8, 0.15)');
  shadowGrad.addColorStop(1, 'rgba(32, 20, 10, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(cx, baseY + 10, rx * 1.05, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  traceBowlOuterWall(ctx, bowl);
  ctx.ellipse(cx, rimY, rx, rimRy, 0, 0, Math.PI, true);
  const backGrad = ctx.createLinearGradient(cx - rx, rimY, cx + rx, baseY);
  backGrad.addColorStop(0, 'rgba(232, 242, 244, 0.22)');
  backGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.10)');
  backGrad.addColorStop(1, 'rgba(216, 232, 236, 0.24)');
  ctx.fillStyle = backGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, rimRy, 0, Math.PI, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY - 5, baseRx * 0.92, baseRy * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(240, 248, 250, 0.18)';
  ctx.fill();

  ctx.restore();
}

export function drawBowlFront(ctx: CanvasRenderingContext2D, bowl: BowlConfig): void {
  const { cx, rimY, baseY, rx, rimRy, baseRx, baseRy } = bowl;
  ctx.save();

  traceBowlFrontGlass(ctx, bowl);

  const frontGrad = ctx.createLinearGradient(cx - rx, rimY, cx + rx, rimY);
  frontGrad.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
  frontGrad.addColorStop(0.16, 'rgba(244, 251, 252, 0.16)');
  frontGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  frontGrad.addColorStop(0.84, 'rgba(236, 247, 250, 0.14)');
  frontGrad.addColorStop(1, 'rgba(255, 255, 255, 0.32)');
  ctx.fillStyle = frontGrad;
  ctx.fill();

  traceBowlOuterWall(ctx, bowl);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.56)';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.82, rimY + 22);
  ctx.bezierCurveTo(
    cx - rx * 0.78,
    rimY + 76,
    cx - baseRx * 0.92,
    baseY - 22,
    cx - baseRx * 0.72,
    baseY - 6
  );
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + rx * 0.84, rimY + 28);
  ctx.bezierCurveTo(
    cx + rx * 0.8,
    rimY + 74,
    cx + baseRx * 0.95,
    baseY - 24,
    cx + baseRx * 0.78,
    baseY - 8
  );
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, baseY, baseRx, baseRy, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, rimY, rx, rimRy, 0, 0, Math.PI);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(252, 246, 236, 0.82)';
  ctx.shadowColor = 'rgba(32, 18, 8, 0.45)';
  ctx.shadowBlur = 4;
  ctx.fillText(bowl.label, cx, baseY + 42);

  ctx.restore();
}
