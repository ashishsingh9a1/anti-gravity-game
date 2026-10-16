/**
 * ANTI-GRAVITY // OVERDRIVE - Game Entities
 * Player ship, enemy variants, projectile types, singularity wells, orbital satellites, and XP crystals.
 */

// ===================== PROJECTILE ===================== //
class Projectile {
  constructor(x, y, vx, vy, options = {}) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(vx, vy);
    this.radius = options.radius || 4;
    this.color = options.color || '#00f3ff';
    this.damage = options.damage || 20;
    this.isEnemy = options.isEnemy || false;
    this.isReflected = options.isReflected || false;
    this.type = options.type || 'plasma'; // 'plasma', 'railgun', 'missile', 'flak'
    this.pierce = options.pierce || 0;
    this.life = options.life || 2.5;
    this.homing = options.homing || false;
    this.homingTarget = null;
    this.homingTurnRate = options.homingTurnRate || 4;
    this.active = true;
    this.trailTimer = 0;
  }

  update(dt, enemies = [], fx = null) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }

    // Homing logic for quantum missiles & reflected bullets
    if (this.homing && !this.isEnemy && enemies.length > 0) {
      if (!this.homingTarget || !this.homingTarget.active) {
        // Find closest enemy
        let closestDist = Infinity;
        for (let i = 0; i < enemies.length; i++) {
          const e = enemies[i];
          if (!e.active) continue;
          const d = this.pos.distSq(e.pos);
          if (d < closestDist) {
            closestDist = d;
            this.homingTarget = e;
          }
        }
      }

      if (this.homingTarget && this.homingTarget.active) {
        const desiredAngle = Math.atan2(
          this.homingTarget.pos.y - this.pos.y,
          this.homingTarget.pos.x - this.pos.x
        );
        const currentAngle = this.vel.heading();
        let diff = desiredAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turn = Math.sign(diff) * Math.min(Math.abs(diff), this.homingTurnRate * dt);
        this.vel.rotate(turn);
      }
    }

    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;

    // Thruster smoke trails
    if (fx && this.type === 'missile') {
      this.trailTimer += dt;
      if (this.trailTimer > 0.03) {
        this.trailTimer = 0;
        const p = fx.getParticle();
        p.spawn(
          this.pos.x - this.vel.x * 0.2,
          this.pos.y - this.vel.y * 0.2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          '#ff0055',
          3,
          0.05,
          'circle'
        );
        fx.particles.push(p);
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    const angle = this.vel.heading();
    ctx.rotate(angle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.color;

    if (this.type === 'plasma') {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius * 2, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'railgun') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.radius * 2;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.stroke();
    } else if (this.type === 'missile') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.lineTo(10, 0);
      ctx.lineTo(6, 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===================== SINGULARITY WELL ===================== //
class SingularityWell {
  constructor(x, y, duration = 3.2, radius = 260, damage = 180) {
    this.pos = new Vec2(x, y);
    this.duration = duration;
    this.timer = 0;
    this.radius = radius;
    this.damage = damage;
    this.active = true;
    this.rotation = 0;
    this.pulseTick = 0;
  }

  update(dt, enemies, fx) {
    if (!this.active) return;
    this.timer += dt;
    this.rotation += dt * 4;

    // Pull enemies inward with swirl
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      PhysicsEngine.applyGravityWell(e, this.pos, 45, this.radius, 0.6);
    }

    // Warp spacetime grid continuously
    if (fx) {
      fx.grid.warp(this.pos.x, this.pos.y, -12, this.radius * 0.9);
      this.pulseTick += dt;
      if (this.pulseTick > 0.08) {
        this.pulseTick = 0;
        // Particle spiraling into center
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * this.radius * 0.8 + 20;
        const spd = 3.5;
        const vx = -Math.cos(angle) * spd - Math.sin(angle) * spd * 0.5;
        const vy = -Math.sin(angle) * spd + Math.cos(angle) * spd * 0.5;
        const p = fx.getParticle();
        p.spawn(
          this.pos.x + Math.cos(angle) * dist,
          this.pos.y + Math.sin(angle) * dist,
          vx, vy, '#bc13fe', 3, 0.04, 'line'
        );
        fx.particles.push(p);
      }
    }

    // Detonate at end of life
    if (this.timer >= this.duration) {
      this.detonate(enemies, fx);
    }
  }

  detonate(enemies, fx) {
    this.active = false;
    if (window.audioEngine) window.audioEngine.playExplosion(2.2);

    if (fx) {
      fx.addShockwave(this.pos.x, this.pos.y, this.radius * 1.2, '#bc13fe', 0.6, 8);
      fx.emitExplosion(this.pos.x, this.pos.y, 2.5, '#bc13fe', '#00f3ff');
      fx.grid.warp(this.pos.x, this.pos.y, 60, this.radius * 1.3);
    }

    // Burst damage to all trapped entities
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const d = this.pos.dist(e.pos);
      if (d <= this.radius) {
        const falloff = 1 - d / this.radius;
        e.takeDamage(this.damage * (0.5 + falloff * 0.5), fx);
      }
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Event Horizon accretion disk
    const lifeRatio = this.timer / this.duration;
    const currentR = 25 + Math.sin(this.timer * 8) * 4;

    ctx.rotate(this.rotation);
    ctx.strokeStyle = '#bc13fe';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#bc13fe';
    ctx.shadowBlur = 18;

    // Spiral swirl arms
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, currentR * (1 + i * 0.4), i * 2, i * 2 + Math.PI, false);
      ctx.stroke();
    }

    // Pure black void core
    ctx.fillStyle = '#000000';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, currentR, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon glowing boundary
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.stroke();

    ctx.restore();
  }
}

// ===================== ORBITAL SATELLITE ===================== //
class OrbitalSatellite {
  constructor(orbitRadius = 75, speed = 2.4, damage = 35) {
    this.orbitRadius = orbitRadius;
    this.angle = 0;
    this.speed = speed;
    this.damage = damage;
    this.radius = 8;
    this.pos = new Vec2();
  }

  update(dt, playerPos, enemies, fx) {
    this.angle += this.speed * dt;
    this.pos.x = playerPos.x + Math.cos(this.angle) * this.orbitRadius;
    this.pos.y = playerPos.y + Math.sin(this.angle) * this.orbitRadius;

    // Collision with enemies
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      if (PhysicsEngine.checkCircleOverlap(this.pos, this.radius, e.pos, e.radius)) {
        e.takeDamage(this.damage * dt * 4, fx);
        if (fx && Math.random() < 0.3) {
          fx.emitSparks(this.pos.x, this.pos.y, 4, '#00f3ff', 3);
        }
      }
    }
  }

  draw(ctx, playerPos) {
    ctx.save();
    // Gravitational tether line
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(playerPos.x, playerPos.y);
    ctx.lineTo(this.pos.x, this.pos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plasma orb
    ctx.translate(this.pos.x, this.pos.y);
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ===================== XP CRYSTAL ===================== //
class XpCrystal {
  constructor(x, y, value = 1) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    this.value = value;
    this.radius = 6 + Math.min(6, value * 1.5);
    this.color = value >= 5 ? '#bc13fe' : (value >= 2 ? '#ffd700' : '#00f3ff');
    this.active = true;
    this.friction = 0.94;
    this.rot = Math.random() * Math.PI;
  }

  update(dt, player) {
    if (!this.active) return;
    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;
    this.rot += dt * 3;

    // Magnet gravitational pull
    const dist = this.pos.dist(player.pos);
    if (dist < player.magnetRadius) {
      const pullSpeed = (1 - dist / player.magnetRadius) * 450 + 200;
      const angle = Math.atan2(player.pos.y - this.pos.y, player.pos.x - this.pos.x);
      this.vel.x += Math.cos(angle) * pullSpeed * dt;
      this.vel.y += Math.sin(angle) * pullSpeed * dt;
    }

    // Pickup collision
    if (dist < (this.radius + player.radius)) {
      this.active = false;
      player.addXp(this.value);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rot);

    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;

    // Diamond polygon
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.7, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// ===================== PLAYER SHIP ===================== //
class Player {
  constructor(canvasWidth, canvasHeight, archetype = 'apex') {
    this.archetype = archetype;
    this.pos = new Vec2(canvasWidth / 2, canvasHeight / 2);
    this.vel = new Vec2();
    this.targetPos = new Vec2(canvasWidth / 2, canvasHeight / 2);
    this.angle = 0;
    this.radius = 16;

    // Attributes
    this.maxHp = 100;
    this.hp = 100;
    this.maxShield = 50;
    this.shield = 50;
    this.shieldRegenRate = 8; // hp/sec
    this.shieldDelay = 3.0; // sec after hit
    this.shieldTimer = 0;

    this.baseSpeed = 6.2;
    this.accel = 1.1;
    this.friction = 0.90;

    // Cooldowns
    this.pulseCooldown = 4.5;
    this.pulseTimer = 0;
    this.pulseRadius = 240;

    this.dashCooldown = 2.2;
    this.dashTimer = 0;
    this.isDashing = false;
    this.dashDuration = 0.16;
    this.dashCurrentTimer = 0;

    this.invulnerableTimer = 0;
    this.magnetRadius = 140;

    // Progression
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 10;
    this.totalXp = 0;

    // Combat Stats
    this.critChance = 0.15;
    this.critMultiplier = 2.0;
    this.damageMultiplier = 1.0;
    this.bulletReflectMult = 3.0;

    // Weapons Inventory & Levels
    this.weapons = {
      blaster: { level: 1, timer: 0, fireRate: 0.18, bulletSpeed: 14, damage: 24, count: 1 },
      railgun: { level: 0, timer: 0, fireRate: 1.6, damage: 160, beamWidth: 8 },
      missiles: { level: 0, timer: 0, fireRate: 1.2, damage: 70, count: 2 },
      singularity: { level: 0, timer: 0, cooldown: 8.0, duration: 3.5, damage: 220 },
      tesla: { level: 0, timer: 0, fireRate: 0.9, damage: 45, chains: 3, range: 180 },
      orbitals: { level: 0, satellites: [] }
    };

    // Apply ship archetype perks
    this.applyArchetype();
  }

  applyArchetype() {
    if (this.archetype === 'vortex') {
      this.baseSpeed = 7.4;
      this.dashCooldown = 1.6;
      this.maxHp = 80;
      this.hp = 80;
      this.maxShield = 40;
      this.shield = 40;
      // Starts with Singularity Well weapon
      this.weapons.singularity.level = 1;
    } else if (this.archetype === 'aegis') {
      this.baseSpeed = 5.2;
      this.maxHp = 130;
      this.hp = 130;
      this.maxShield = 80;
      this.shield = 80;
      this.pulseRadius = 280;
      // Starts with 2 Orbitals
      this.weapons.orbitals.level = 1;
      this.weapons.orbitals.satellites.push(new OrbitalSatellite(70, 2.2, 40));
      this.weapons.orbitals.satellites.push(new OrbitalSatellite(70, -2.2, 40));
    } else {
      // Apex Striker
      this.critChance = 0.25;
      this.pulseCooldown = 3.8;
      this.pulseRadius = 260;
    }
  }

  update(dt, input, fx, projectiles, singularities, enemies) {
    // Cooldown timers
    if (this.pulseTimer > 0) this.pulseTimer -= dt;
    if (this.dashTimer > 0) this.dashTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;

    // Shield Regeneration
    this.shieldTimer += dt;
    if (this.shieldTimer >= this.shieldDelay && this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + this.shieldRegenRate * dt);
    }

    // Aim angle toward cursor
    const dx = input.mouseX - this.pos.x;
    const dy = input.mouseY - this.pos.y;
    this.angle = Math.atan2(dy, dx);

    // Movement calculation
    let moveX = 0;
    let moveY = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) moveY -= 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) moveY += 1;
    if (input.keys['KeyA'] || input.keys['ArrowLeft']) moveX -= 1;
    if (input.keys['KeyD'] || input.keys['ArrowRight']) moveX += 1;

    // Touch joystick support
    if (input.touchMove.x !== 0 || input.touchMove.y !== 0) {
      moveX = input.touchMove.x;
      moveY = input.touchMove.y;
    }

    const moveMag = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveMag > 0.001) {
      moveX /= moveMag;
      moveY /= moveMag;

      const spd = this.baseSpeed * this.accel;
      this.vel.x += moveX * spd;
      this.vel.y += moveY * spd;

      // Thruster particles
      if (fx && Math.random() < 0.6) {
        const moveAngle = Math.atan2(moveY, moveX);
        fx.emitThruster(this.pos.x, this.pos.y, moveAngle, '#00f3ff');
      }
    }

    // Phase Dash logic
    if (this.isDashing) {
      this.dashCurrentTimer -= dt;
      this.invulnerableTimer = 0.1;
      if (fx && Math.random() < 0.8) {
        fx.emitSparks(this.pos.x, this.pos.y, 2, '#bc13fe', 2);
      }
      if (this.dashCurrentTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Apply inertia and friction
    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;

    // Screen Boundary Clamping
    const pad = this.radius + 4;
    if (this.pos.x < pad) { this.pos.x = pad; this.vel.x = 0; }
    if (this.pos.x > window.innerWidth - pad) { this.pos.x = window.innerWidth - pad; this.vel.x = 0; }
    if (this.pos.y < pad) { this.pos.y = pad; this.vel.y = 0; }
    if (this.pos.y > window.innerHeight - pad) { this.pos.y = window.innerHeight - pad; this.vel.y = 0; }

    // Update Orbitals
    if (this.weapons.orbitals.level > 0) {
      for (let i = 0; i < this.weapons.orbitals.satellites.length; i++) {
        this.weapons.orbitals.satellites[i].update(dt, this.pos, enemies, fx);
      }
    }

    // Update Auto-Weapons
    this.updateWeapons(dt, projectiles, singularities, enemies, fx);
  }

  updateWeapons(dt, projectiles, singularities, enemies, fx) {
    // 1. Primary Blaster
    const w = this.weapons.blaster;
    w.timer += dt;
    if (w.timer >= w.fireRate) {
      w.timer = 0;
      this.fireBlaster(projectiles);
    }

    // 2. Railgun
    if (this.weapons.railgun.level > 0) {
      const rw = this.weapons.railgun;
      rw.timer += dt;
      if (rw.timer >= rw.fireRate) {
        rw.timer = 0;
        this.fireRailgun(projectiles, enemies, fx);
      }
    }

    // 3. Quantum Missiles
    if (this.weapons.missiles.level > 0) {
      const mw = this.weapons.missiles;
      mw.timer += dt;
      if (mw.timer >= mw.fireRate) {
        mw.timer = 0;
        this.fireMissiles(projectiles);
      }
    }

    // 4. Singularity Vortex
    if (this.weapons.singularity.level > 0) {
      const sw = this.weapons.singularity;
      sw.timer += dt;
      if (sw.timer >= sw.cooldown) {
        sw.timer = 0;
        this.fireSingularity(singularities, enemies);
      }
    }

    // 5. Tesla Chain Arc
    if (this.weapons.tesla.level > 0) {
      const tw = this.weapons.tesla;
      tw.timer += dt;
      if (tw.timer >= tw.fireRate) {
        tw.timer = 0;
        this.fireTeslaArc(enemies, fx);
      }
    }
  }

  fireBlaster(projectiles) {
    const w = this.weapons.blaster;
    if (window.audioEngine) window.audioEngine.playLaser();

    const count = w.count;
    const spreadAngle = count > 1 ? 0.12 : 0;
    const startAngle = this.angle - ((count - 1) * spreadAngle) / 2;

    for (let i = 0; i < count; i++) {
      const a = startAngle + i * spreadAngle;
      const isCrit = Math.random() < this.critChance;
      const dmg = w.damage * this.damageMultiplier * (isCrit ? this.critMultiplier : 1);
      const col = isCrit ? '#ffd700' : '#00f3ff';
      const vx = Math.cos(a) * w.bulletSpeed;
      const vy = Math.sin(a) * w.bulletSpeed;

      projectiles.push(new Projectile(
        this.pos.x + Math.cos(a) * 18,
        this.pos.y + Math.sin(a) * 18,
        vx, vy,
        { radius: isCrit ? 6 : 4, color: col, damage: dmg, type: 'plasma' }
      ));
    }
  }

  fireRailgun(projectiles, enemies, fx) {
    const rw = this.weapons.railgun;
    if (window.audioEngine) window.audioEngine.playRailgun();

    const isCrit = Math.random() < this.critChance;
    const dmg = rw.damage * this.damageMultiplier * (isCrit ? this.critMultiplier : 1);
    const col = isCrit ? '#ffd700' : '#bc13fe';
    const vx = Math.cos(this.angle) * 32;
    const vy = Math.sin(this.angle) * 32;

    // High speed piercing hyper-beam
    projectiles.push(new Projectile(
      this.pos.x + Math.cos(this.angle) * 20,
      this.pos.y + Math.sin(this.angle) * 20,
      vx, vy,
      { radius: rw.beamWidth, color: col, damage: dmg, type: 'railgun', pierce: 99, life: 1.0 }
    ));

    if (fx) {
      fx.grid.warp(this.pos.x, this.pos.y, 18, 120);
    }
  }

  fireMissiles(projectiles) {
    const mw = this.weapons.missiles;
    if (window.audioEngine) window.audioEngine.playLaser(0.6);

    for (let i = 0; i < mw.count; i++) {
      const a = this.angle + (i === 0 ? -0.5 : 0.5);
      const spd = 7;
      const vx = Math.cos(a) * spd;
      const vy = Math.sin(a) * spd;
      const dmg = mw.damage * this.damageMultiplier;

      projectiles.push(new Projectile(
        this.pos.x, this.pos.y,
        vx, vy,
        { radius: 5, color: '#ff0055', damage: dmg, type: 'missile', homing: true, life: 3.5 }
      ));
    }
  }

  fireSingularity(singularities, enemies) {
    // Spawns near enemy cluster or forward towards aim
    let spawnDist = 180;
    const sx = this.pos.x + Math.cos(this.angle) * spawnDist;
    const sy = this.pos.y + Math.sin(this.angle) * spawnDist;
    singularities.push(new SingularityWell(sx, sy, 3.2, 260, this.weapons.singularity.damage));
  }

  fireTeslaArc(enemies, fx) {
    const tw = this.weapons.tesla;
    // Find closest enemy within range
    let curTarget = null;
    let closestDist = tw.range * tw.range;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const d = this.pos.distSq(e.pos);
      if (d < closestDist) {
        closestDist = d;
        curTarget = e;
      }
    }

    if (curTarget) {
      if (window.audioEngine) window.audioEngine.playLaser(1.6);
      let hitList = [curTarget];
      curTarget.takeDamage(tw.damage * this.damageMultiplier, fx);

      // Arc chain
      let prevPos = this.pos;
      if (fx) {
        fx.emitSparks(curTarget.pos.x, curTarget.pos.y, 6, '#00f3ff', 4);
      }

      for (let c = 1; c < tw.chains; c++) {
        let nextTarget = null;
        let nextDist = (tw.range * 0.8) * (tw.range * 0.8);
        for (let j = 0; j < enemies.length; j++) {
          const cand = enemies[j];
          if (!cand.active || hitList.includes(cand)) continue;
          const d2 = curTarget.pos.distSq(cand.pos);
          if (d2 < nextDist) {
            nextDist = d2;
            nextTarget = cand;
          }
        }
        if (nextTarget) {
          hitList.push(nextTarget);
          nextTarget.takeDamage(tw.damage * 0.7 * this.damageMultiplier, fx);
          curTarget = nextTarget;
        } else {
          break;
        }
      }
    }
  }

  // ===================== ACTIVE SKILLS ===================== //

  triggerPulse(enemies, enemyProjectiles, crystals, fx) {
    if (this.pulseTimer > 0) return false;
    this.pulseTimer = this.pulseCooldown;

    if (window.audioEngine) window.audioEngine.playAntiGravPulse();

    // Visual Shockwave & Spacetime Grid blast
    if (fx) {
      fx.addShockwave(this.pos.x, this.pos.y, this.pulseRadius, '#bc13fe', 0.5, 6);
      fx.grid.warp(this.pos.x, this.pos.y, 75, this.pulseRadius * 1.2);
    }

    // 1. Repel enemies and deal concussive damage
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const repelled = PhysicsEngine.applyRepulsionPulse(e, this.pos, 35, this.pulseRadius);
      if (repelled) {
        e.takeDamage(35 * this.damageMultiplier, fx);
      }
    }

    // 2. Reflect enemy projectiles into homing player projectiles!
    let reflectCount = 0;
    for (let i = 0; i < enemyProjectiles.length; i++) {
      const p = enemyProjectiles[i];
      if (!p.active) continue;
      const d = this.pos.dist(p.pos);
      if (d <= this.pulseRadius) {
        p.isEnemy = false;
        p.isReflected = true;
        p.homing = true;
        p.color = '#ffd700';
        p.damage *= this.bulletReflectMult;
        p.vel.mult(-1.3); // reverse and accelerate!
        p.life = 2.5;
        reflectCount++;
      }
    }

    if (reflectCount > 0 && fx) {
      fx.addFloatingText(this.pos.x, this.pos.y - 25, `DEFLECTED x${reflectCount}!`, '#ffd700', 18);
    }

    // 3. SUCK IN ALL XP CRYSTALS INSTANTLY!
    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];
      if (!c.active) continue;
      const d = this.pos.dist(c.pos);
      if (d <= this.pulseRadius * 1.8) {
        const angle = Math.atan2(this.pos.y - c.pos.y, this.pos.x - c.pos.x);
        c.vel.x = Math.cos(angle) * 750;
        c.vel.y = Math.sin(angle) * 750;
      }
    }

    return true;
  }

  triggerDash(fx) {
    if (this.dashTimer > 0) return false;
    this.dashTimer = this.dashCooldown;
    this.isDashing = true;
    this.dashCurrentTimer = this.dashDuration;

    if (window.audioEngine) window.audioEngine.playDash();

    // Dash impulse towards current movement or aim
    const spd = 28;
    this.vel.x = Math.cos(this.angle) * spd;
    this.vel.y = Math.sin(this.angle) * spd;

    if (fx) {
      fx.addShockwave(this.pos.x, this.pos.y, 80, '#00f3ff', 0.35, 4);
      fx.emitSparks(this.pos.x, this.pos.y, 14, '#00f3ff', 5);
      fx.grid.warp(this.pos.x, this.pos.y, 30, 90);
    }
    return true;
  }

  takeDamage(amount, fx, cameraShake) {
    if (this.invulnerableTimer > 0 || this.isDashing) return;

    this.shieldTimer = 0; // reset regen timer
    this.invulnerableTimer = 0.45; // i-frames

    if (cameraShake) cameraShake.addTrauma(0.45);

    // Shield takes damage first
    if (this.shield > 0) {
      if (window.audioEngine) window.audioEngine.playShieldHit();
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
      }
      if (fx) fx.emitSparks(this.pos.x, this.pos.y, 8, '#00f3ff', 4);
    }

    // Hull damage
    if (amount > 0) {
      if (window.audioEngine) window.audioEngine.playHit();
      this.hp = Math.max(0, this.hp - amount);
      if (fx) {
        fx.emitSparks(this.pos.x, this.pos.y, 12, '#ff0055', 6);
        fx.addFloatingText(this.pos.x, this.pos.y - 20, `-${Math.round(amount)}`, '#ff0055', 18);
      }
    }
  }

  addXp(amount) {
    this.xp += amount;
    this.totalXp += amount;
    if (window.audioEngine) window.audioEngine.playXpPickup(this.xp);

    if (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      // Exponential curve for survivor leveling
      this.xpToNextLevel = Math.round(this.xpToNextLevel * 1.35 + 5);
      if (window.audioEngine) window.audioEngine.playLevelUp();
      return true; // triggers level up modal
    }
    return false;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Invulnerability blink
    if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shield Dome when shield active
    if (this.shield > 0) {
      const shieldRatio = this.shield / this.maxShield;
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(0, 243, 255, ${0.08 * shieldRatio})`;
      ctx.fill();
      ctx.restore();
    }

    // Rotate to face aim angle
    ctx.rotate(this.angle);

    // Ship Hull Vector Graphics
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#0e1626';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;

    // Sleek fighter polygon
    ctx.beginPath();
    ctx.moveTo(18, 0); // nose
    ctx.lineTo(-12, -14); // left wingtip
    ctx.lineTo(-6, -5); // left inner
    ctx.lineTo(-10, 0); // engine mount
    ctx.lineTo(-6, 5); // right inner
    ctx.lineTo(-12, 14); // right wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit Canopy
    ctx.fillStyle = this.archetype === 'vortex' ? '#bc13fe' : (this.archetype === 'aegis' ? '#ffd700' : '#00f3ff');
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(2, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thruster engine glow
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-16 - Math.random() * 4, 0);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Draw Orbitals
    if (this.weapons.orbitals.level > 0) {
      for (let i = 0; i < this.weapons.orbitals.satellites.length; i++) {
        this.weapons.orbitals.satellites[i].draw(ctx, this.pos);
      }
    }
  }
}

// ===================== ENEMY VARIANTS ===================== //
class Enemy {
  constructor(x, y, options = {}) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2();
    this.radius = options.radius || 14;
    this.hp = options.hp || 30;
    this.maxHp = this.hp;
    this.speed = options.speed || 3.2;
    this.damage = options.damage || 15;
    this.xpValue = options.xpValue || 1;
    this.color = options.color || '#ff0055';
    this.scoreValue = options.scoreValue || 100;
    this.type = options.type || 'swarmer';
    this.active = true;
    this.friction = 0.94;
    this.angle = 0;
    this.shootTimer = Math.random() * 2;
  }

  takeDamage(amount, fx) {
    if (!this.active) return;
    this.hp -= amount;
    if (fx) {
      fx.addFloatingText(this.pos.x, this.pos.y - 10, `${Math.round(amount)}`, '#fff', 13);
      fx.emitSparks(this.pos.x, this.pos.y, 4, this.color, 3);
    }
    if (this.hp <= 0) {
      this.die(fx);
    }
  }

  die(fx) {
    this.active = false;
    if (window.audioEngine) window.audioEngine.playExplosion(this.radius > 25 ? 1.8 : 0.8);
    if (fx) {
      fx.emitExplosion(this.pos.x, this.pos.y, this.radius > 25 ? 2.0 : 0.9, this.color, '#ffd700');
    }
  }

  update(dt, player, projectiles, fx) {
    if (!this.active) return;

    const toPlayer = new Vec2(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    const dist = toPlayer.mag();
    this.angle = toPlayer.heading();

    if (this.type === 'swarmer') {
      // Swarm straight at player with pack inertia
      toPlayer.normalize().mult(this.speed);
      this.vel.add(toPlayer);
    } else if (this.type === 'orbiter') {
      // Circle player at 200px distance, shooting plasma
      const targetDist = 220;
      const angleOffset = Math.PI / 2;
      const orbitDir = new Vec2(-Math.sin(this.angle), Math.cos(this.angle));

      if (dist > targetDist + 40) {
        toPlayer.normalize().mult(this.speed);
        this.vel.add(toPlayer);
      } else if (dist < targetDist - 40) {
        toPlayer.normalize().mult(-this.speed);
        this.vel.add(toPlayer);
      } else {
        orbitDir.mult(this.speed);
        this.vel.add(orbitDir);
      }

      this.shootTimer += dt;
      if (this.shootTimer >= 2.2) {
        this.shootTimer = 0;
        const bulletVel = Vec2.fromAngle(this.angle, 6);
        projectiles.push(new Projectile(this.pos.x, this.pos.y, bulletVel.x, bulletVel.y, {
          isEnemy: true, color: '#ff0055', damage: 18, radius: 5
        }));
      }
    } else if (this.type === 'dasher') {
      // Wait, then charge forward
      this.shootTimer += dt;
      if (this.shootTimer < 2.0) {
        // Slow creep while tracking
        toPlayer.normalize().mult(this.speed * 0.4);
        this.vel.add(toPlayer);
      } else if (this.shootTimer >= 2.0 && this.shootTimer < 2.8) {
        // Charging phase: rocket forward!
        const chargeDir = Vec2.fromAngle(this.angle, 14);
        this.vel.add(chargeDir);
        if (fx && Math.random() < 0.4) {
          fx.emitSparks(this.pos.x, this.pos.y, 2, '#ffaa00', 3);
        }
      } else {
        this.shootTimer = 0;
      }
    } else if (this.type === 'gravweaver') {
      // Heavy gravity caster: creates tractor beam towards self!
      toPlayer.normalize().mult(this.speed * 0.5);
      this.vel.add(toPlayer);

      // Cast gravitational pull on player
      if (dist < 350) {
        PhysicsEngine.applyGravityWell(player, this.pos, 22, 350, 0);
      }

      this.shootTimer += dt;
      if (this.shootTimer >= 3.0) {
        this.shootTimer = 0;
        // 3-way spread
        for (let i = -1; i <= 1; i++) {
          const a = this.angle + i * 0.25;
          const bVel = Vec2.fromAngle(a, 5.5);
          projectiles.push(new Projectile(this.pos.x, this.pos.y, bVel.x, bVel.y, {
            isEnemy: true, color: '#bc13fe', damage: 22, radius: 6
          }));
        }
      }
    }

    // Physics step
    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;

    // Contact damage with player
    if (PhysicsEngine.checkCircleOverlap(this.pos, this.radius, player.pos, player.radius)) {
      player.takeDamage(this.damage, fx);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.fillStyle = '#160815';

    if (this.type === 'swarmer') {
      // Triangular fast interceptor
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius, -this.radius * 0.7);
      ctx.lineTo(-this.radius * 0.5, 0);
      ctx.lineTo(-this.radius, this.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'orbiter') {
      // Circular turret drone
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.radius + 4, 0);
      ctx.stroke();
    } else if (this.type === 'dasher') {
      // Diamond needle
      ctx.beginPath();
      ctx.moveTo(this.radius * 1.4, 0);
      ctx.lineTo(0, -this.radius * 0.6);
      ctx.lineTo(-this.radius * 0.8, 0);
      ctx.lineTo(0, this.radius * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (this.type === 'gravweaver') {
      // Heavy Octagon
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const px = Math.cos(a) * this.radius;
        const py = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gravity core
      ctx.fillStyle = '#bc13fe';
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ===================== LEVIATHAN BOSS ===================== //
class BossLeviathan extends Enemy {
  constructor(x, y, wave = 5) {
    super(x, y, {
      radius: 54,
      hp: 1200 + wave * 450,
      speed: 1.6,
      damage: 40,
      xpValue: 40,
      color: '#ff0055',
      scoreValue: 5000,
      type: 'boss'
    });
    this.wave = wave;
    this.bossAngle = 0;
    this.spiralAngle = 0;
    this.phaseTimer = 0;
    this.attackPhase = 0; // 0: spiral barrage, 1: gravitational collapse, 2: minion summons
    this.isBoss = true;
  }

  update(dt, player, projectiles, fx) {
    if (!this.active) return;
    this.bossAngle += dt * 0.8;
    this.phaseTimer += dt;

    // Follow player steadily
    const toPlayer = new Vec2(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    toPlayer.normalize().mult(this.speed);
    this.vel.add(toPlayer);

    this.pos.x += this.vel.x * 60 * dt;
    this.pos.y += this.vel.y * 60 * dt;
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;

    // Phase cycle every 6 seconds
    if (this.phaseTimer > 6.0) {
      this.phaseTimer = 0;
      this.attackPhase = (this.attackPhase + 1) % 3;
    }

    // Phase 0: Bullet Hell Spiral Barrage
    if (this.attackPhase === 0) {
      this.spiralAngle += dt * 4.5;
      this.shootTimer += dt;
      if (this.shootTimer >= 0.14) {
        this.shootTimer = 0;
        for (let i = 0; i < 4; i++) {
          const a = this.spiralAngle + (i * Math.PI) / 2;
          const bVel = Vec2.fromAngle(a, 5.2);
          projectiles.push(new Projectile(this.pos.x, this.pos.y, bVel.x, bVel.y, {
            isEnemy: true, color: '#ff0055', damage: 20, radius: 6
          }));
        }
      }
    }
    // Phase 1: Gravitational Collapse (Sucks player towards boss, then fires nova blast)
    else if (this.attackPhase === 1) {
      PhysicsEngine.applyGravityWell(player, this.pos, 35, 500, 0.4);
      if (fx && Math.random() < 0.5) {
        fx.grid.warp(this.pos.x, this.pos.y, -15, 300);
      }
      this.shootTimer += dt;
      if (this.shootTimer >= 1.5) {
        this.shootTimer = 0;
        // Nova shockwave of projectiles
        if (fx) fx.addShockwave(this.pos.x, this.pos.y, 220, '#bc13fe', 0.6, 6);
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI * 2) / 16;
          const bVel = Vec2.fromAngle(a, 6.0);
          projectiles.push(new Projectile(this.pos.x, this.pos.y, bVel.x, bVel.y, {
            isEnemy: true, color: '#bc13fe', damage: 25, radius: 7
          }));
        }
      }
    }
    // Phase 2: Targeted Crossfire Burst
    else if (this.attackPhase === 2) {
      this.shootTimer += dt;
      if (this.shootTimer >= 0.8) {
        this.shootTimer = 0;
        const baseA = Math.atan2(player.pos.y - this.pos.y, player.pos.x - this.pos.x);
        for (let i = -2; i <= 2; i++) {
          const a = baseA + i * 0.15;
          const bVel = Vec2.fromAngle(a, 7.5);
          projectiles.push(new Projectile(this.pos.x, this.pos.y, bVel.x, bVel.y, {
            isEnemy: true, color: '#ffd700', damage: 22, radius: 6
          }));
        }
      }
    }

    // Contact damage
    if (PhysicsEngine.checkCircleOverlap(this.pos, this.radius, player.pos, player.radius)) {
      player.takeDamage(this.damage, fx);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Rotating dreadnought armor plates
    ctx.rotate(this.bossAngle);
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 25;
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 4;
    ctx.fillStyle = '#100511';

    // Outer spiked ring
    const points = 12;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = (i * Math.PI * 2) / points;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.75;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner pulsing graviton core
    ctx.rotate(-this.bossAngle * 2);
    ctx.fillStyle = '#bc13fe';
    ctx.shadowColor = '#bc13fe';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Boss Health Bar above boss
    const barW = 120;
    const barH = 8;
    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.save();
    ctx.translate(this.pos.x - barW / 2, this.pos.y - this.radius - 20);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, barW, barH);
    ctx.fillStyle = '#ff0055';
    ctx.fillRect(0, 0, barW * hpRatio, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, barW, barH);
    ctx.font = 'bold 10px Rajdhani';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('LEVIATHAN DREADNOUGHT', barW / 2, -4);
    ctx.restore();
  }
}

window.Projectile = Projectile;
window.SingularityWell = SingularityWell;
window.OrbitalSatellite = OrbitalSatellite;
window.XpCrystal = XpCrystal;
window.Player = Player;
window.Enemy = Enemy;
window.BossLeviathan = BossLeviathan;
