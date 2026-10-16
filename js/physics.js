/**
 * ANTI-GRAVITY // OVERDRIVE - Physics & Vector Math
 * Gravitational vector calculus, orbital mechanics, collision detection, and screen trauma.
 */

class Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  mag() {
    return Math.sqrt(this.magSq());
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  normalize() {
    const m = this.mag();
    if (m > 0.00001) {
      this.x /= m;
      this.y /= m;
    }
    return this;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.normalize().mult(max);
    }
    return this;
  }

  static fromAngle(angle, length = 1) {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static dist(v1, v2) {
    return v1.dist(v2);
  }

  static lerp(v1, v2, amt) {
    return new Vec2(
      v1.x + (v2.x - v1.x) * amt,
      v1.y + (v2.y - v1.y) * amt
    );
  }
}

class PhysicsEngine {
  static checkCircleOverlap(c1, r1, c2, r2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const radSum = r1 + r2;
    return (dx * dx + dy * dy) <= (radSum * radSum);
  }

  /**
   * Applies gravitational pull towards a point (e.g. Singularity Well or XP Magnet)
   */
  static applyGravityWell(entity, wellPos, strength, radius, swirl = 0.5) {
    const dx = wellPos.x - entity.pos.x;
    const dy = wellPos.y - entity.pos.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius && distSq > 100) {
      const dist = Math.sqrt(distSq);
      const forceMag = (strength / distSq) * 1000;
      const nx = dx / dist;
      const ny = dy / dist;

      // Inward pull
      entity.vel.x += nx * forceMag;
      entity.vel.y += ny * forceMag;

      // Swirl / Angular momentum for vortex effect
      if (swirl !== 0) {
        entity.vel.x += -ny * forceMag * swirl;
        entity.vel.y += nx * forceMag * swirl;
      }
    }
  }

  /**
   * Applies Anti-Gravity Repulsion pulse outward from a center point
   */
  static applyRepulsionPulse(entity, center, force, radius) {
    const dx = entity.pos.x - center.x;
    const dy = entity.pos.y - center.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius && distSq > 4) {
      const dist = Math.sqrt(distSq);
      const factor = (1 - dist / radius);
      const impulse = force * factor;
      const nx = dx / dist;
      const ny = dy / dist;

      entity.vel.x += nx * impulse;
      entity.vel.y += ny * impulse;
      return true;
    }
    return false;
  }

  /**
   * Raycast intersection between line segment (beam) and circle (enemy)
   */
  static checkBeamCircleHit(start, dir, length, circlePos, circleRadius) {
    const toCircle = new Vec2(circlePos.x - start.x, circlePos.y - start.y);
    const proj = toCircle.x * dir.x + toCircle.y * dir.y;

    if (proj < 0 || proj > length) return false;

    const closestPoint = new Vec2(
      start.x + dir.x * proj,
      start.y + dir.y * proj
    );

    return closestPoint.distSq(circlePos) <= (circleRadius * circleRadius);
  }
}

/**
 * Screen Camera Trauma Shake (GDC Juice design: Trauma^2 with smooth decay)
 */
class CameraShake {
  constructor() {
    this.trauma = 0;
    this.maxOffset = 22;
    this.maxRoll = 0.04;
    this.decay = 1.35; // per second
    this.offsetX = 0;
    this.offsetY = 0;
    this.roll = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  update(dt) {
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.decay * dt);
      const shake = this.trauma * this.trauma; // quadratic falloff
      this.offsetX = (Math.random() * 2 - 1) * this.maxOffset * shake;
      this.offsetY = (Math.random() * 2 - 1) * this.maxOffset * shake;
      this.roll = (Math.random() * 2 - 1) * this.maxRoll * shake;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
      this.roll = 0;
    }
  }

  apply(ctx, width, height) {
    if (this.trauma > 0.001) {
      ctx.save();
      ctx.translate(width / 2 + this.offsetX, height / 2 + this.offsetY);
      ctx.rotate(this.roll);
      ctx.translate(-width / 2, -height / 2);
      return true;
    }
    return false;
  }

  restore(ctx, applied) {
    if (applied) {
      ctx.restore();
    }
  }
}

window.Vec2 = Vec2;
window.PhysicsEngine = PhysicsEngine;
window.CameraShake = CameraShake;
