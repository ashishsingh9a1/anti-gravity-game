/**
 * ANTI-GRAVITY // OVERDRIVE - Visual Effects & Particle Engine
 * Neon glow particles, warping spacetime grid, shockwaves, and floating combat text.
 */

class Particle {
  constructor() {
    this.pos = new Vec2();
    this.vel = new Vec2();
    this.color = '#fff';
    this.alpha = 1;
    this.decay = 0.02;
    this.size = 3;
    this.active = false;
    this.shape = 'circle'; // 'circle', 'line', 'square'
    this.rotation = 0;
    this.rotSpeed = 0;
    this.drag = 0.96;
  }

  spawn(x, y, vx, vy, color, size, decay, shape = 'circle') {
    this.pos.set(x, y);
    this.vel.set(vx, vy);
    this.color = color;
    this.size = size;
    this.alpha = 1;
    this.decay = decay;
    this.shape = shape;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 8;
    this.drag = shape === 'square' ? 0.92 : 0.96;
    this.active = true;
  }

  update(dt) {
    if (!this.active) return;
    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;
    this.vel.x *= this.drag;
    this.vel.y *= this.drag;
    this.rotation += this.rotSpeed * dt;
    this.alpha -= this.decay * 60 * dt;
    if (this.alpha <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active || this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.translate(this.pos.x, this.pos.y);

    if (this.shape === 'circle') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.5, this.size * this.alpha), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'line') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      const angle = this.vel.heading();
      const spd = this.vel.mag();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-spd * 1.5, 0);
      ctx.lineTo(spd * 1.5, 0);
      ctx.stroke();
    } else if (this.shape === 'square') {
      ctx.rotate(this.rotation);
      ctx.fillStyle = this.color;
      const s = this.size * this.alpha;
      ctx.fillRect(-s / 2, -s / 2, s, s);
    }
    ctx.restore();
  }
}

class ShockwaveRing {
  constructor(x, y, maxRadius, color = '#bc13fe', duration = 0.5, lineWidth = 4) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.color = color;
    this.duration = duration;
    this.timer = 0;
    this.lineWidth = lineWidth;
    this.active = true;
  }

  update(dt) {
    this.timer += dt;
    const progress = this.timer / this.duration;
    if (progress >= 1) {
      this.active = false;
    } else {
      // Ease-out expansion
      this.radius = 5 + (this.maxRadius - 5) * Math.sin(progress * Math.PI * 0.5);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const progress = this.timer / this.duration;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(1, this.lineWidth * (1 - progress * 0.7));
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffd700', size = 16, life = 0.8) {
    this.x = x + (Math.random() - 0.5) * 16;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.vy = -35;
    this.active = true;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.vy *= 0.92;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${this.size}px 'Rajdhani', sans-serif`;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

/**
 * Spacetime Grid that bends and warps around gravity sources
 */
class SpacetimeGrid {
  constructor(width, height, spacing = 50) {
    this.spacing = spacing;
    this.cols = Math.ceil(width / spacing) + 1;
    this.rows = Math.ceil(height / spacing) + 1;
    this.points = [];
    this.init(width, height);
  }

  init(width, height) {
    this.cols = Math.ceil(width / this.spacing) + 1;
    this.rows = Math.ceil(height / this.spacing) + 1;
    this.points = [];

    for (let y = 0; y <= this.rows; y++) {
      for (let x = 0; x <= this.cols; x++) {
        const origX = x * this.spacing;
        const origY = y * this.spacing;
        this.points.push({
          origX, origY,
          currX: origX, currY: origY,
          vx: 0, vy: 0
        });
      }
    }
  }

  warp(cx, cy, force, radius) {
    const rSq = radius * radius;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const dx = p.origX - cx;
      const dy = p.origY - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < rSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const factor = (1 - dist / radius);
        const pull = force * factor;
        p.vx += (dx / dist) * pull;
        p.vy += (dy / dist) * pull;
      }
    }
  }

  update(dt) {
    const spring = 0.12;
    const friction = 0.86;

    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      // Hooke's spring return to origin
      const ax = (p.origX - p.currX) * spring;
      const ay = (p.origY - p.currY) * spring;

      p.vx = (p.vx + ax) * friction;
      p.vy = (p.vy + ay) * friction;

      p.currX += p.vx * 60 * dt;
      p.currY += p.vy * 60 * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      for (let x = 0; x <= this.cols; x++) {
        const idx = y * (this.cols + 1) + x;
        if (!this.points[idx]) continue;
        const p = this.points[idx];
        if (x === 0) ctx.moveTo(p.currX, p.currY);
        else ctx.lineTo(p.currX, p.currY);
      }
      ctx.stroke();
    }

    // Vertical grid lines
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      for (let y = 0; y <= this.rows; y++) {
        const idx = y * (this.cols + 1) + x;
        if (!this.points[idx]) continue;
        const p = this.points[idx];
        if (y === 0) ctx.moveTo(p.currX, p.currY);
        else ctx.lineTo(p.currX, p.currY);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
}

/**
 * High performance pooled particle manager
 */
class FXManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.pool = [];
    this.maxParticles = 800;

    // Pre-populate pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push(new Particle());
    }

    this.shockwaves = [];
    this.floatingTexts = [];
    this.grid = new SpacetimeGrid(canvas.width, canvas.height, 45);

    // Parallax Starfield
    this.stars = [];
    this.initStars(canvas.width, canvas.height);
  }

  resize(w, h) {
    this.grid.init(w, h);
    this.initStars(w, h);
  }

  initStars(w, h) {
    this.stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.7 + 0.3,
        flicker: Math.random() * Math.PI * 2
      });
    }
  }

  getParticle() {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    return new Particle();
  }

  recycleParticle(p) {
    p.active = false;
    if (this.pool.length < this.maxParticles) {
      this.pool.push(p);
    }
  }

  emitSparks(x, y, count = 8, color = '#00f3ff', speed = 4) {
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.8 + 0.2) * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const size = Math.random() * 2.5 + 1.5;
      const decay = Math.random() * 0.03 + 0.02;
      p.spawn(x, y, vx, vy, color, size, decay, 'line');
      this.particles.push(p);
    }
  }

  emitExplosion(x, y, intensity = 1, primaryColor = '#ff0055', secondaryColor = '#ffd700') {
    const count = Math.floor(18 * intensity);
    // Shockwave ring
    this.addShockwave(x, y, 70 * intensity, primaryColor, 0.45, 4);

    // Grid warp outward explosion
    this.grid.warp(x, y, 40 * intensity, 160 * intensity);

    // Debris fragments
    for (let i = 0; i < count; i++) {
      const p = this.getParticle();
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 5 + 2) * intensity;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const col = Math.random() > 0.4 ? primaryColor : secondaryColor;
      const size = Math.random() * 4 + 2;
      const decay = Math.random() * 0.025 + 0.015;
      const shape = Math.random() > 0.5 ? 'square' : 'circle';
      p.spawn(x, y, vx, vy, col, size, decay, shape);
      this.particles.push(p);
    }
  }

  emitThruster(x, y, angle, color = '#00f3ff') {
    const p = this.getParticle();
    const spread = (Math.random() - 0.5) * 0.4;
    const thrustAngle = angle + Math.PI + spread;
    const spd = Math.random() * 3 + 2;
    const vx = Math.cos(thrustAngle) * spd;
    const vy = Math.sin(thrustAngle) * spd;
    p.spawn(x, y, vx, vy, color, Math.random() * 3 + 2, 0.07, 'circle');
    this.particles.push(p);
  }

  addShockwave(x, y, maxRadius, color = '#bc13fe', duration = 0.5, lineWidth = 4) {
    this.shockwaves.push(new ShockwaveRing(x, y, maxRadius, color, duration, lineWidth));
  }

  addFloatingText(x, y, text, color = '#ffd700', size = 16) {
    this.floatingTexts.push(new FloatingText(x, y, text, color, size));
  }

  update(dt, playerVel = null) {
    // Update Stars
    const vx = playerVel ? -playerVel.x * 0.05 : 0;
    const vy = playerVel ? -playerVel.y * 0.05 : 0;
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.x += vx * s.speed;
      s.y += vy * s.speed;
      s.flicker += dt * 3;

      if (s.x < 0) s.x += this.canvas.width;
      if (s.x > this.canvas.width) s.x -= this.canvas.width;
      if (s.y < 0) s.y += this.canvas.height;
      if (s.y > this.canvas.height) s.y -= this.canvas.height;
    }

    // Update Spacetime Grid
    this.grid.update(dt);

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(dt);
      if (!p.active) {
        this.recycleParticle(p);
        this.particles.splice(i, 1);
      }
    }

    // Update Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.update(dt);
      if (!s.active) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.update(dt);
      if (!t.active) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  drawBackground(ctx) {
    // Starfield
    ctx.save();
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const alpha = s.alpha * (0.7 + Math.sin(s.flicker) * 0.3);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Spacetime Grid
    this.grid.draw(ctx);
  }

  drawForeground(ctx) {
    // Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      this.shockwaves[i].draw(ctx);
    }

    // Particles with additive glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
    ctx.restore();

    // Floating text
    for (let i = 0; i < this.floatingTexts.length; i++) {
      this.floatingTexts[i].draw(ctx);
    }
  }
}

window.FXManager = FXManager;
