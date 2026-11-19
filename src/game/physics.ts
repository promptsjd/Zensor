import Matter from 'matter-js';
import { DUNE_RADIUS_X, DUNE_Z_FLOOR_OFFSET, TABLE_FLOOR_Y, WORLD_W } from './constants';
import type { BowlConfig } from './types';

export interface GrainPhysicsOptions {
  friction?: number;
  frictionStatic?: number;
  frictionAir?: number;
  restitution?: number;
}

export function createRiceSeedVertices(
  rx: number,
  ry: number,
  segments = 14
): Matter.Vector[] {
  const verts: Matter.Vector[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    // Strictly convex tapered seed curve: plump middle, pointed tips at cosT = +-1
    const taper = Math.pow(Math.max(0, 1 - cosT * cosT), 0.85);
    verts.push({
      x: cosT * rx,
      y: Math.sign(sinT) * ry * taper,
    });
  }
  return verts;
}

export function createGrainBody(
  x: number,
  y: number,
  rx: number,
  ry: number,
  angle: number,
  collisionFilter: Matter.ICollisionFilter,
  options: GrainPhysicsOptions = {}
): Matter.Body {
  const verts = createRiceSeedVertices(rx, ry, 14);
  return Matter.Bodies.fromVertices(x, y, [verts], {
    friction: options.friction !== undefined ? options.friction : 0.96,
    frictionStatic: options.frictionStatic !== undefined ? options.frictionStatic : 1.45,
    frictionAir: options.frictionAir !== undefined ? options.frictionAir : 0.16,
    restitution: options.restitution !== undefined ? options.restitution : 0.01,
    density: 0.0024,
    slop: 0.005,
    sleepThreshold: 12,
    angle,
    collisionFilter,
  });
}

export function createBowlColliders(
  bowl: BowlConfig,
  category: number,
  grainMask: number
): Matter.Body[] {
  const bodies: Matter.Body[] = [];
  const rimInnerX = bowl.rx - 10;
  const baseInnerX = bowl.baseRx - 6;
  const topY = bowl.rimY + 8;
  const bottomY = bowl.baseY - 12;

  const profile: Array<{ x: number; y: number }> = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = (t - 0.5) * 2;
    const absU = Math.abs(u);
    const xOffset = u * (baseInnerX + (rimInnerX - baseInnerX) * Math.pow(absU, 0.72));
    const yOffset = bottomY - (bottomY - topY) * Math.pow(absU, 2.15);
    profile.push({ x: bowl.cx + xOffset, y: yOffset });
  }

  for (let i = 0; i < profile.length - 1; i++) {
    const p1 = profile[i];
    const p2 = profile[i + 1];
    const mx = (p1.x + p2.x) * 0.5;
    const my = (p1.y + p2.y) * 0.5;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const segLen = Math.hypot(dx, dy);
    const len = segLen + 4;
    const angle = Math.atan2(dy, dx);

    // Outward normal so inner bowl surface matches visual curve
    const nx = -dy / segLen;
    const ny = dx / segLen;
    const thickness = 14;

    const seg = Matter.Bodies.rectangle(
      mx + nx * (thickness * 0.5),
      my + ny * (thickness * 0.5),
      len,
      thickness,
      {
        isStatic: true,
        angle,
        friction: 0.75,
        frictionStatic: 1.0,
        restitution: 0.04,
        collisionFilter: {
          category,
          mask: grainMask,
        },
      }
    );
    bodies.push(seg);
  }

  return bodies;
}

export function createSliceFloorColliders(sliceGroup: number, zSlice: number): Matter.Body[] {
  const bodies: Matter.Body[] = [];
  const centerX = WORLD_W * 0.5;
  const floorY = TABLE_FLOOR_Y + zSlice * DUNE_Z_FLOOR_OFFSET;
  const sliceHalfW = DUNE_RADIUS_X * Math.sqrt(Math.max(0.05, 1 - zSlice * zSlice));

  const filter: Matter.ICollisionFilter = { group: sliceGroup, category: 0, mask: 0 };

  bodies.push(
    Matter.Bodies.rectangle(centerX, floorY + 24, sliceHalfW * 2, 48, {
      isStatic: true,
      friction: 0.98,
      frictionStatic: 1.45,
      restitution: 0.01,
      collisionFilter: filter,
    })
  );

  bodies.push(
    Matter.Bodies.rectangle(centerX - sliceHalfW - 6, floorY + 12, 24, 28, {
      isStatic: true,
      angle: 0.4,
      friction: 0.96,
      frictionStatic: 1.4,
      restitution: 0.01,
      collisionFilter: filter,
    })
  );

  bodies.push(
    Matter.Bodies.rectangle(centerX + sliceHalfW + 6, floorY + 12, 24, 28, {
      isStatic: true,
      angle: -0.4,
      friction: 0.96,
      frictionStatic: 1.4,
      restitution: 0.01,
      collisionFilter: filter,
    })
  );

  return bodies;
}

export function isPointInTaperedGrain(
  wx: number,
  wy: number,
  cx: number,
  cy: number,
  angle: number,
  rx: number,
  ry: number,
  pad: number
): boolean {
  const dx = wx - cx;
  const dy = wy - cy;
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  const lx = dx * cosA - dy * sinA;
  const ly = dx * sinA + dy * cosA;
  const effRx = rx + pad;
  const effRy = ry + pad;
  if (Math.abs(lx) > effRx) return false;
  const u = lx / effRx;
  const maxHalfY = effRy * Math.pow(Math.max(0, 1 - u * u), 0.72);
  return Math.abs(ly) <= maxHalfY;
}
