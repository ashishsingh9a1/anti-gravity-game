/**
 * ANTI-GRAVITY // OVERDRIVE - Master Game Engine
 * Wave director, collision solver, state machine, input processing, and UI coordinator.
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // State
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'LEVEL_UP', 'GAME_OVER'
    this.selectedShip = 'apex';
    this.selectedDifficulty = 'cadet'; // 'cadet' (Easy), 'commander' (Normal), 'overdrive' (Hard)
    this.lastTime = performance.now();

    // Core Systems
    this.cameraShake = new CameraShake();
    this.fx = new FXManager(this.canvas);
    this.upgrades = new UpgradeSystem();

    // Entities
    this.player = null;
    this.projectiles = [];
    this.enemies = [];
    this.singularities = [];
    this.crystals = [];
    this.barrels = [];
    this.supplyDrops = [];

    // Session Stats
    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxCombo = 1.0;
    this.kills = 0;
    this.totalDamageDealt = 0;
    this.gameTime = 0;
    this.rerollsRemaining = 1;

    // Wave Director & Progressive Difficulty
    this.currentWave = 1;
    this.waveTimer = 40; // seconds per wave
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.isBossActive = false;
    this.activeBoss = null;
    this.supplyDropTimer = 18;
    this.barrelSpawnTimer = 8;

    // Input State
    this.input = {
      keys: {},
      mouseX: window.innerWidth / 2,
      mouseY: window.innerHeight / 2,
      isMouseDown: false,
      touchMove: { x: 0, y: 0 }
    };

    // High Scores
    this.highScore = parseInt(localStorage.getItem('anti_gravity_high_score') || '0', 10);
    this.highestWave = parseInt(localStorage.getItem('anti_gravity_highest_wave') || '1', 10);
    this.totalKillsSaved = parseInt(localStorage.getItem('anti_gravity_total_kills') || '0', 10);

    this.initWindow();
    this.initInputs();
    this.initUI();
    this.renderShipPreviews();
    this.updateMenuStats();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initWindow() {
    const resize = () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.fx) this.fx.resize(this.canvas.width, this.canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();
  }

  initInputs() {
    window.addEventListener('keydown', (e) => {
      this.input.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }

      if (e.code === 'Space') {
        if (this.state === 'PLAYING' && this.player) {
          this.triggerPlayerPulse();
        }
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.state === 'PLAYING' && this.player) {
          this.player.triggerDash(this.fx);
        }
      }

      if (e.code === 'KeyQ' || e.code === 'KeyE') {
        if (this.state === 'PLAYING' && this.player && this.player.weapons.singularity.level > 0) {
          this.player.fireSingularity(this.singularities, this.enemies);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.input.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      this.input.mouseX = e.clientX;
      this.input.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.input.isMouseDown = true;
      } else if (e.button === 2) {
        // Right click activates Grav Pulse
        e.preventDefault();
        if (this.state === 'PLAYING' && this.player) {
          this.triggerPlayerPulse();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.input.isMouseDown = false;
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mobile / Touch controls
    this.initTouchControls();
  }

  triggerPlayerPulse() {
    if (!this.player) return;
    const fired = this.player.triggerPulse(this.enemies, this.projectiles, this.crystals, this.fx);
    if (fired) {
      // Also check pulse detonation on nearby barrels!
      for (let i = 0; i < this.barrels.length; i++) {
        const b = this.barrels[i];
        if (!b.active || b.isDetonating) continue;
        if (this.player.pos.dist(b.pos) <= this.player.pulseRadius) {
          b.takeDamage(1, this.fx);
        }
      }
    }
  }

  initTouchControls() {
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 820);
    const touchOverlay = document.getElementById('touch-controls');
    if (isTouch && touchOverlay) {
      this.input.isTouchDevice = true;
      this.input.touchAim = { x: 0, y: 0 };
      touchOverlay.style.display = 'block';

      // Left Move Joystick
      const moveZone = document.getElementById('touch-move');
      const moveKnob = document.getElementById('touch-move-knob');
      let moveTouchId = null;
      let startX = 0, startY = 0;

      moveZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        moveTouchId = touch.identifier;
        const rect = moveZone.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }, { passive: false });

      moveZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === moveTouchId) {
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const dist = Math.min(45, Math.hypot(dx, dy));
            const angle = Math.atan2(dy, dx);
            moveKnob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
            this.input.touchMove.x = (Math.cos(angle) * dist) / 45;
            this.input.touchMove.y = (Math.sin(angle) * dist) / 45;
          }
        }
      }, { passive: false });

      const resetMove = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === moveTouchId) {
            moveTouchId = null;
            moveKnob.style.transform = 'translate(0px, 0px)';
            this.input.touchMove.x = 0;
            this.input.touchMove.y = 0;
          }
        }
      };
      moveZone.addEventListener('touchend', resetMove);
      moveZone.addEventListener('touchcancel', resetMove);

      // Right Aim Joystick (Optional Manual Aiming)
      const aimZone = document.getElementById('touch-aim');
      const aimKnob = document.getElementById('touch-aim-knob');
      if (aimZone && aimKnob) {
        let aimTouchId = null;
        let aimStartX = 0, aimStartY = 0;

        aimZone.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const touch = e.changedTouches[0];
          aimTouchId = touch.identifier;
          const rect = aimZone.getBoundingClientRect();
          aimStartX = rect.left + rect.width / 2;
          aimStartY = rect.top + rect.height / 2;
        }, { passive: false });

        aimZone.addEventListener('touchmove', (e) => {
          e.preventDefault();
          for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === aimTouchId) {
              const dx = t.clientX - aimStartX;
              const dy = t.clientY - aimStartY;
              const dist = Math.min(45, Math.hypot(dx, dy));
              const angle = Math.atan2(dy, dx);
              aimKnob.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
              if (dist > 8) {
                this.input.touchAim.x = Math.cos(angle);
                this.input.touchAim.y = Math.sin(angle);
              }
            }
          }
        }, { passive: false });

        const resetAim = (e) => {
          for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === aimTouchId) {
              aimTouchId = null;
              aimKnob.style.transform = 'translate(0px, 0px)';
              this.input.touchAim.x = 0;
              this.input.touchAim.y = 0;
            }
          }
        };
        aimZone.addEventListener('touchend', resetAim);
        aimZone.addEventListener('touchcancel', resetAim);
      }

      // Touch Buttons
      const pulseBtn = document.getElementById('touch-pulse-btn');
      if (pulseBtn) {
        pulseBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(20);
          if (this.state === 'PLAYING' && this.player) {
            this.triggerPlayerPulse();
          }
        }, { passive: false });
      }

      const dashBtn = document.getElementById('touch-dash-btn');
      if (dashBtn) {
        dashBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(15);
          if (this.state === 'PLAYING' && this.player) {
            this.player.triggerDash(this.fx);
          }
        }, { passive: false });
      }

      const vortexBtn = document.getElementById('touch-vortex-btn');
      if (vortexBtn) {
        vortexBtn.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (navigator.vibrate) navigator.vibrate(30);
          if (this.state === 'PLAYING' && this.player && this.player.weapons.singularity.level > 0) {
            this.player.fireSingularity(this.singularities, this.enemies);
          }
        }, { passive: false });
      }
    }
  }

  initUI() {
    // Menu Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => {
      window.audioEngine.startMusic();
      this.startGame();
    });

    document.getElementById('btn-how-to-play').addEventListener('click', () => {
      document.getElementById('instructions-modal').classList.remove('hidden');
    });

    document.getElementById('btn-close-instructions').addEventListener('click', () => {
      document.getElementById('instructions-modal').classList.add('hidden');
    });

    // Ship Select Cards
    const shipCards = document.querySelectorAll('.ship-card');
    shipCards.forEach(card => {
      card.addEventListener('click', () => {
        shipCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedShip = card.dataset.ship;
      });
    });

    // Difficulty Buttons
    const diffButtons = document.querySelectorAll('.diff-btn');
    diffButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedDifficulty = btn.dataset.diff;
      });
    });

    // Interactive HUD Clickable Ability Slots
    const slotPulse = document.getElementById('slot-pulse');
    if (slotPulse) {
      slotPulse.addEventListener('click', () => {
        if (this.state === 'PLAYING' && this.player) {
          this.triggerPlayerPulse();
        }
      });
    }

    const slotDash = document.getElementById('slot-dash');
    if (slotDash) {
      slotDash.addEventListener('click', () => {
        if (this.state === 'PLAYING' && this.player) {
          this.player.triggerDash(this.fx);
        }
      });
    }

    const slotSingularity = document.getElementById('slot-singularity-box');
    if (slotSingularity) {
      slotSingularity.addEventListener('click', () => {
        if (this.state === 'PLAYING' && this.player && this.player.weapons.singularity.level > 0) {
          this.player.fireSingularity(this.singularities, this.enemies);
        }
      });
    }

    // Upgrade Modal: Reroll & Salvage Buttons
    const btnReroll = document.getElementById('btn-reroll-cards');
    if (btnReroll) {
      btnReroll.addEventListener('click', () => {
        if (this.rerollsRemaining > 0) {
          this.rerollsRemaining--;
          document.getElementById('reroll-count').textContent = this.rerollsRemaining;
          if (this.rerollsRemaining <= 0) {
            btnReroll.style.opacity = '0.5';
            btnReroll.style.pointerEvents = 'none';
          }
          this.renderUpgradeCards();
        }
      });
    }

    const btnSalvage = document.getElementById('btn-salvage-cards');
    if (btnSalvage) {
      btnSalvage.addEventListener('click', () => {
        if (this.player) {
          this.player.hp = this.player.maxHp;
          this.player.shield = this.player.maxShield;
          if (this.fx) {
            this.fx.addFloatingText(this.player.pos.x, this.player.pos.y - 25, 'SCRAP SALVAGED: +100% REPAIRED!', '#00ff88', 18);
          }
        }
        document.getElementById('upgrade-screen').classList.add('hidden');
        this.state = 'PLAYING';
        this.lastTime = performance.now();
      });
    }

    // Sound Toggle Button
    const soundBtn = document.getElementById('btn-sound-toggle');
    soundBtn.addEventListener('click', () => {
      const isMuted = window.audioEngine.toggleMute();
      soundBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    // Pause Toggle Button
    document.getElementById('btn-pause-toggle').addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    });

    document.getElementById('btn-resume-game').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-restart-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-quit-menu').addEventListener('click', () => this.showMenu());
    document.getElementById('btn-play-again').addEventListener('click', () => this.startGame());
    document.getElementById('btn-gameover-menu').addEventListener('click', () => this.showMenu());

    // Volume Slider
    document.getElementById('slider-volume').addEventListener('input', (e) => {
      window.audioEngine.setVolume(parseFloat(e.target.value));
    });
  }

  renderShipPreviews() {
    const renderPreview = (canvasId, shipType, primaryCol) => {
      const c = document.getElementById(canvasId);
      if (!c) return;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 80, 80);
      ctx.save();
      ctx.translate(40, 40);
      ctx.rotate(-Math.PI / 2);
      ctx.shadowColor = primaryCol;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = primaryCol;
      ctx.fillStyle = '#0e1626';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-14, -16);
      ctx.lineTo(-8, -6);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-8, 6);
      ctx.lineTo(-14, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = primaryCol;
      ctx.beginPath();
      ctx.ellipse(3, 0, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    renderPreview('preview-apex', 'apex', '#00f3ff');
    renderPreview('preview-vortex', 'vortex', '#bc13fe');
    renderPreview('preview-aegis', 'aegis', '#ffd700');
  }

  updateMenuStats() {
    document.getElementById('menu-high-score').textContent = this.highScore.toLocaleString();
    document.getElementById('menu-highest-wave').textContent = `Wave ${this.highestWave}`;
    document.getElementById('menu-total-kills').textContent = this.totalKillsSaved.toLocaleString();
  }

  getDifficultyMultipliers() {
    if (this.selectedDifficulty === 'cadet') {
      return {
        speed: 0.65,
        hp: 0.65,
        spawnInterval: 2.2,
        shieldRegen: 1.5,
        xpBonus: 1.5,
        scoreBonus: 1.0
      };
    } else if (this.selectedDifficulty === 'overdrive') {
      return {
        speed: 1.25,
        hp: 1.25,
        spawnInterval: 1.2,
        shieldRegen: 0.85,
        xpBonus: 1.0,
        scoreBonus: 1.5
      };
    }
    // Standard Commander
    return {
      speed: 1.0,
      hp: 1.0,
      spawnInterval: 1.6,
      shieldRegen: 1.0,
      xpBonus: 1.0,
      scoreBonus: 1.0
    };
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.maxCombo = 1.0;
    this.kills = 0;
    this.totalDamageDealt = 0;
    this.gameTime = 0;
    this.rerollsRemaining = 1;

    const diff = this.getDifficultyMultipliers();
    this.currentWave = 1;
    this.waveTimer = 40;
    this.spawnTimer = 0;
    this.spawnInterval = diff.spawnInterval;
    this.isBossActive = false;
    this.activeBoss = null;
    this.supplyDropTimer = 16;
    this.barrelSpawnTimer = 6;

    // Reset systems
    this.upgrades.reset();
    this.player = new Player(this.canvas.width, this.canvas.height, this.selectedShip);

    // Apply difficulty modifiers to player
    this.player.shieldRegenRate *= diff.shieldRegen;

    this.projectiles = [];
    this.enemies = [];
    this.singularities = [];
    this.crystals = [];
    this.barrels = [];
    this.supplyDrops = [];

    // Spawn 3 starting explosive barrels for interactive strategy!
    for (let i = 0; i < 3; i++) {
      this.spawnBarrel();
    }

    // Hide modals
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('upgrade-screen').classList.add('hidden');
    document.getElementById('boss-warning').style.display = 'none';

    window.audioEngine.setIntensity(1);
    this.updateObjectiveBanner();
    this.updateHUD();
    this.syncArsenalTray();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    document.getElementById('pause-screen').classList.remove('hidden');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    document.getElementById('pause-screen').classList.add('hidden');
    this.lastTime = performance.now();
  }

  showMenu() {
    this.state = 'MENU';
    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('upgrade-screen').classList.add('hidden');
    this.updateMenuStats();
  }

  triggerLevelUp() {
    this.state = 'LEVEL_UP';
    const btnReroll = document.getElementById('btn-reroll-cards');
    if (btnReroll) {
      document.getElementById('reroll-count').textContent = this.rerollsRemaining;
      btnReroll.style.opacity = this.rerollsRemaining > 0 ? '1' : '0.5';
      btnReroll.style.pointerEvents = this.rerollsRemaining > 0 ? 'auto' : 'none';
    }
    this.renderUpgradeCards();
    document.getElementById('upgrade-screen').classList.remove('hidden');
  }

  renderUpgradeCards() {
    const container = document.getElementById('upgrade-cards-container');
    container.innerHTML = '';

    const options = this.upgrades.getRandomOptions(this.player, 3);
    options.forEach(opt => {
      const curLvl = this.upgrades.getCurrentLevel(opt.id);
      const card = document.createElement('div');
      card.className = `upgrade-card rarity-${opt.rarity}`;
      card.innerHTML = `
        <span class="upgrade-card-tag">${opt.rarity}</span>
        <div class="upgrade-card-icon">${opt.icon}</div>
        <div class="upgrade-card-name">${opt.name}</div>
        <div class="upgrade-card-level">TIER ${curLvl + 1} / ${opt.maxLevel}</div>
        <div class="upgrade-card-desc">${opt.description}</div>
        <div class="upgrade-card-stats">${opt.statText}</div>
      `;

      card.addEventListener('click', () => {
        this.upgrades.applyUpgrade(this.player, opt.id);
        document.getElementById('upgrade-screen').classList.add('hidden');
        this.syncArsenalTray();
        this.state = 'PLAYING';
        this.lastTime = performance.now();
      });

      container.appendChild(card);
    });
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    if (window.audioEngine) window.audioEngine.playGameOver();

    // Save records
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('anti_gravity_high_score', this.highScore.toString());
    }
    if (this.currentWave > this.highestWave) {
      this.highestWave = this.currentWave;
      localStorage.setItem('anti_gravity_highest_wave', this.highestWave.toString());
    }
    this.totalKillsSaved += this.kills;
    localStorage.setItem('anti_gravity_total_kills', this.totalKillsSaved.toString());

    // Populate Game Over stats
    document.getElementById('stat-final-score').textContent = this.score.toLocaleString();
    document.getElementById('stat-final-wave').textContent = `Wave ${this.currentWave}`;
    document.getElementById('stat-final-kills').textContent = this.kills.toLocaleString();
    document.getElementById('stat-final-damage').textContent = Math.round(this.totalDamageDealt).toLocaleString();
    document.getElementById('stat-final-combo').textContent = `x${this.maxCombo.toFixed(1)}`;

    const mins = Math.floor(this.gameTime / 60).toString().padStart(2, '0');
    const secs = Math.floor(this.gameTime % 60).toString().padStart(2, '0');
    document.getElementById('stat-final-time').textContent = `${mins}:${secs}`;

    document.getElementById('gameover-screen').classList.remove('hidden');
  }

  syncArsenalTray() {
    const tray = document.getElementById('active-weapons-tray');
    tray.innerHTML = '';

    const weapons = [
      { name: 'Blaster', icon: '⚡', level: this.player.weapons.blaster.count },
      { name: 'Railgun', icon: '💫', level: this.player.weapons.railgun.level },
      { name: 'Missiles', icon: '🚀', level: this.player.weapons.missiles.level },
      { name: 'Singularity', icon: '🕳', level: this.player.weapons.singularity.level },
      { name: 'Tesla', icon: '🌩', level: this.player.weapons.tesla.level },
      { name: 'Orbitals', icon: '🪐', level: this.player.weapons.orbitals.level }
    ];

    weapons.forEach(w => {
      if (w.level > 0) {
        const chip = document.createElement('div');
        chip.className = 'weapon-icon-chip';
        chip.title = `${w.name} (Tier ${w.level})`;
        chip.innerHTML = `${w.icon}<span class="chip-level">${w.level}</span>`;
        tray.appendChild(chip);
      }
    });

    if (this.player.weapons.singularity.level > 0) {
      const touchVortex = document.getElementById('touch-vortex-btn');
      if (touchVortex) touchVortex.style.display = 'flex';
    }
  }

  updateObjectiveBanner(customText = null, isAlert = false) {
    const banner = document.getElementById('objective-banner');
    const icon = document.getElementById('objective-icon');
    const text = document.getElementById('objective-text');

    if (!banner || !text || !icon) return;

    if (customText) {
      text.textContent = customText;
      if (isAlert) banner.classList.add('alert-supply');
      else banner.classList.remove('alert-supply');
      return;
    }

    banner.classList.remove('alert-supply');

    if (this.currentWave === 1) {
      icon.textContent = '🌱';
      text.textContent = 'SECTOR 1 (EASY RECON): CALIBRATE SHIP & DESTROY SCOUT PROBES';
    } else if (this.currentWave === 2) {
      icon.textContent = '🌀';
      text.textContent = 'SECTOR 2: DRIFTING SWARM &bull; USE SPACE / R-CLICK PULSE TO DEFLECT';
    } else if (this.currentWave === 3) {
      icon.textContent = '⚡';
      text.textContent = 'SECTOR 3: LASER TURRETS &bull; REFLECT HOSTILE LASERS INTO HOMING SHOTS!';
    } else if (this.currentWave === 4) {
      icon.textContent = '🚀';
      text.textContent = 'SECTOR 4: WARP INTERCEPTORS &bull; USE SHIFT TO PHASE-DASH THROUGH DANGER';
    } else if (this.currentWave === 5) {
      icon.textContent = '🕳';
      text.textContent = 'SECTOR 5: GRAV-WEAVERS &bull; COUNTERACT ENEMY TRACTOR BEAMS';
    } else if (this.currentWave === 6) {
      icon.textContent = '💀';
      text.textContent = 'SECTOR 6: DREADNOUGHT LEVIATHAN COLOSSUS INCOMING!';
    } else {
      icon.textContent = '🔥';
      text.textContent = `SECTOR ${this.currentWave}: HYPER-OVERDRIVE &bull; SURVIVE THE VOID ESCALATION`;
    }
  }

  // ===================== WAVE DIRECTOR & PROGRESSION ===================== //

  updateDirector(dt) {
    if (this.isBossActive) {
      if (this.activeBoss && !this.activeBoss.active) {
        // Boss Defeated!
        this.isBossActive = false;
        this.activeBoss = null;
        document.getElementById('boss-warning').style.display = 'none';

        // Massive celebration XP drops & supply drop
        for (let i = 0; i < 24; i++) {
          this.crystals.push(new XpCrystal(
            this.canvas.width / 2 + (Math.random() - 0.5) * 220,
            this.canvas.height / 2 + (Math.random() - 0.5) * 220,
            5
          ));
        }
        this.spawnSupplyDrop();
        this.advanceWave();
      }
      return;
    }

    this.waveTimer -= dt;
    if (this.waveTimer <= 0) {
      if (this.currentWave === 6 || (this.currentWave > 6 && this.currentWave % 5 === 0)) {
        // Spawn Boss!
        this.spawnBoss();
      } else {
        this.advanceWave();
      }
    }

    // Spawn Enemy Waves
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyPack();
    }

    // Spawn Interactive Grav Barrels periodically
    this.barrelSpawnTimer -= dt;
    if (this.barrelSpawnTimer <= 0 && this.barrels.length < 4) {
      this.barrelSpawnTimer = 14;
      this.spawnBarrel();
    }

    // Spawn Supply Drops periodically
    this.supplyDropTimer -= dt;
    if (this.supplyDropTimer <= 0 && this.supplyDrops.length < 2) {
      this.supplyDropTimer = 26;
      this.spawnSupplyDrop();
    }
  }

  advanceWave() {
    this.currentWave++;
    this.waveTimer = 40;
    const diff = this.getDifficultyMultipliers();
    this.spawnInterval = Math.max(0.65, diff.spawnInterval - (this.currentWave * 0.08));

    if (this.fx) {
      this.fx.addShockwave(this.canvas.width / 2, this.canvas.height / 2, 400, '#00f3ff', 0.8, 6);
      this.fx.addFloatingText(this.canvas.width / 2, this.canvas.height / 2 - 50, `SECTOR ${this.currentWave} REACHED`, '#00f3ff', 28);
    }

    this.updateObjectiveBanner();

    // Audio intensity scaling
    const musicIntensity = this.currentWave === 6 ? 3 : (this.currentWave > 3 ? 2 : 1);
    window.audioEngine.setIntensity(musicIntensity);
  }

  spawnBoss() {
    this.isBossActive = true;
    const warning = document.getElementById('boss-warning');
    warning.style.display = 'block';

    if (window.audioEngine) window.audioEngine.setIntensity(3);
    this.cameraShake.addTrauma(0.6);

    const bx = this.canvas.width / 2;
    const by = -80;
    this.activeBoss = new BossLeviathan(bx, by, this.currentWave);
    this.enemies.push(this.activeBoss);
    this.updateObjectiveBanner('ALERT: DESTROY THE DREADNOUGHT LEVIATHAN!', true);
  }

  spawnBarrel() {
    const margin = 80;
    const x = margin + Math.random() * (this.canvas.width - margin * 2);
    const y = margin + Math.random() * (this.canvas.height - margin * 2);
    this.barrels.push(new ExplosiveBarrel(x, y));
  }

  spawnSupplyDrop() {
    const x = 50 + Math.random() * (this.canvas.width - 100);
    const y = 50 + Math.random() * (this.canvas.height - 100);
    this.supplyDrops.push(new SupplyDrop(x, y));

    if (window.audioEngine) window.audioEngine.playObjectiveComplete();
    this.updateObjectiveBanner('📦 SUPPLY DROP DETECTED &bull; RETRIEVE EMERGENCY CAPSULE!', true);
    setTimeout(() => {
      this.updateObjectiveBanner();
    }, 4500);
  }

  spawnEnemyPack() {
    const diff = this.getDifficultyMultipliers();

    // Wave 1: Gentle easy Scout Probes only!
    if (this.currentWave === 1) {
      const probeCount = this.selectedDifficulty === 'cadet' ? 2 : 3;
      for (let i = 0; i < probeCount; i++) {
        const x = Math.random() < 0.5 ? -30 : this.canvas.width + 30;
        const y = Math.random() * this.canvas.height;
        this.enemies.push(new Enemy(x, y, {
          type: 'probe',
          radius: 13,
          hp: 20 * diff.hp,
          speed: 1.6 * diff.speed,
          color: '#00ff88',
          scoreValue: 80,
          xpValue: 2,
          damage: 5
        }));
      }
      return;
    }

    // General wave packing
    const packSize = Math.floor((Math.random() * 2 + 2 + this.currentWave * 0.4) * (this.selectedDifficulty === 'cadet' ? 0.8 : 1.0));
    const spawnSide = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let originX = 0, originY = 0;

    if (spawnSide === 0) { originX = Math.random() * this.canvas.width; originY = -30; }
    else if (spawnSide === 1) { originX = this.canvas.width + 30; originY = Math.random() * this.canvas.height; }
    else if (spawnSide === 2) { originX = Math.random() * this.canvas.width; originY = this.canvas.height + 30; }
    else { originX = -30; originY = Math.random() * this.canvas.height; }

    for (let i = 0; i < packSize; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      const x = originX + offsetX;
      const y = originY + offsetY;

      // Enemy type probabilities based on progressive wave
      const roll = Math.random();
      if (this.currentWave >= 5 && roll < 0.22) {
        this.enemies.push(new Enemy(x, y, {
          type: 'gravweaver',
          radius: 20,
          hp: (90 + this.currentWave * 14) * diff.hp,
          speed: 2.1 * diff.speed,
          color: '#bc13fe',
          scoreValue: 350,
          xpValue: 4
        }));
      } else if (this.currentWave >= 4 && roll < 0.38) {
        this.enemies.push(new Enemy(x, y, {
          type: 'dasher',
          radius: 14,
          hp: (50 + this.currentWave * 10) * diff.hp,
          speed: 4.6 * diff.speed,
          color: '#ffd700',
          scoreValue: 250,
          xpValue: 2
        }));
      } else if (this.currentWave >= 3 && roll < 0.65) {
        this.enemies.push(new Enemy(x, y, {
          type: 'orbiter',
          radius: 16,
          hp: (55 + this.currentWave * 11) * diff.hp,
          speed: 3.0 * diff.speed,
          color: '#00f3ff',
          scoreValue: 200,
          xpValue: 2
        }));
      } else {
        // Standard Swarmers
        this.enemies.push(new Enemy(x, y, {
          type: 'swarmer',
          radius: 12,
          hp: (30 + this.currentWave * 7) * diff.hp,
          speed: (3.2 + Math.random() * 0.5) * diff.speed,
          color: '#ff0055',
          scoreValue: 100,
          xpValue: 1
        }));
      }
    }
  }

  // ===================== MAIN GAME LOOP ===================== //

  loop(timestamp) {
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (dt > 0.1) dt = 0.1; // clamp delta time

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.cameraShake.update(dt);

    // Combo streak decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1.0;
      }
    }

    // Update Wave Director
    this.updateDirector(dt);

    // Update Player
    if (this.player) {
      const levelUp = this.player.update(dt, this.input, this.fx, this.projectiles, this.singularities, this.enemies);
      if (levelUp) {
        this.triggerLevelUp();
        return;
      }
      if (this.player.hp <= 0) {
        this.triggerGameOver();
        return;
      }
    }

    // Update Singularities
    for (let i = this.singularities.length - 1; i >= 0; i--) {
      const s = this.singularities[i];
      s.update(dt, this.enemies, this.fx);
      if (!s.active) {
        this.singularities.splice(i, 1);
      }
    }

    // Update Explosive Grav Barrels
    for (let i = this.barrels.length - 1; i >= 0; i--) {
      const b = this.barrels[i];
      b.update(dt, this.enemies, this.barrels, this.fx, this.cameraShake);
      if (!b.active) {
        this.barrels.splice(i, 1);
      }
    }

    // Update Supply Drops
    for (let i = this.supplyDrops.length - 1; i >= 0; i--) {
      const s = this.supplyDrops[i];
      s.update(dt, this.player, this.enemies, this.crystals, this.fx, this.cameraShake);
      if (!s.active) {
        this.supplyDrops.splice(i, 1);
      }
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, this.player, this.projectiles, this.fx);
      if (!e.active) {
        // Enemy defeated!
        this.kills++;
        this.combo = Math.min(10.0, this.combo + 0.15);
        this.comboTimer = 3.2; // 3.2 seconds window
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const diff = this.getDifficultyMultipliers();
        const earnedScore = Math.round(e.scoreValue * this.combo * diff.scoreBonus);
        this.score += earnedScore;

        // Drop XP crystal with difficulty multiplier
        const xpAmount = Math.max(1, Math.round(e.xpValue * diff.xpBonus));
        this.crystals.push(new XpCrystal(e.pos.x, e.pos.y, xpAmount));
        this.enemies.splice(i, 1);
      }
    }

    // Update Projectiles & Check Collisions
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, this.enemies, this.fx);

      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Friendly bullet vs Barrel collision
      if (!p.isEnemy) {
        for (let bIdx = 0; bIdx < this.barrels.length; bIdx++) {
          const b = this.barrels[bIdx];
          if (!b.active || b.isDetonating) continue;
          if (PhysicsEngine.checkCircleOverlap(p.pos, p.radius, b.pos, b.radius)) {
            b.takeDamage(1, this.fx);
            p.active = false;
            break;
          }
        }
      }

      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Friendly bullet vs Enemy collision
      if (!p.isEnemy) {
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          if (!e.active) continue;

          if (PhysicsEngine.checkCircleOverlap(p.pos, p.radius, e.pos, e.radius)) {
            e.takeDamage(p.damage, this.fx);
            this.totalDamageDealt += p.damage;

            if (p.pierce > 0) {
              p.pierce--;
            } else {
              p.active = false;
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
      // Enemy bullet vs Player collision
      else if (p.isEnemy && this.player) {
        if (PhysicsEngine.checkCircleOverlap(p.pos, p.radius, this.player.pos, this.player.radius)) {
          this.player.takeDamage(p.damage, this.fx, this.cameraShake);
          p.active = false;
          this.projectiles.splice(i, 1);
        }
      }
    }

    // Update XP Crystals
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const c = this.crystals[i];
      c.update(dt, this.player);
      if (!c.active) {
        this.crystals.splice(i, 1);
      }
    }

    // Update Particle & FX Manager
    this.fx.update(dt, this.player ? this.player.vel : null);

    // Sync HUD Elements
    this.updateHUD();
  }

  updateHUD() {
    if (!this.player) return;

    // HP Bar
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    document.getElementById('hp-fill').style.width = `${hpRatio * 100}%`;
    document.getElementById('hp-val').textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    // Shield Bar
    const shieldRatio = Math.max(0, this.player.shield / this.player.maxShield);
    document.getElementById('shield-fill').style.width = `${shieldRatio * 100}%`;
    document.getElementById('shield-val').textContent = `${Math.ceil(this.player.shield)} / ${this.player.maxShield}`;

    // Pulse Bar
    const pulseRatio = this.player.pulseTimer <= 0 ? 1 : (1 - this.player.pulseTimer / this.player.pulseCooldown);
    document.getElementById('pulse-fill').style.width = `${pulseRatio * 100}%`;
    const pulseStatus = document.getElementById('slot-pulse-status');
    if (this.player.pulseTimer <= 0) {
      document.getElementById('pulse-val').textContent = 'READY';
      pulseStatus.textContent = 'READY';
      pulseStatus.className = 'ability-status';
    } else {
      document.getElementById('pulse-val').textContent = `${this.player.pulseTimer.toFixed(1)}s`;
      pulseStatus.textContent = `${this.player.pulseTimer.toFixed(1)}s`;
      pulseStatus.className = 'ability-status cooldown';
    }

    // Dash Slot
    const dashStatus = document.getElementById('slot-dash-status');
    if (this.player.dashTimer <= 0) {
      dashStatus.textContent = 'READY';
      dashStatus.className = 'ability-status';
    } else {
      dashStatus.textContent = `${this.player.dashTimer.toFixed(1)}s`;
      dashStatus.className = 'ability-status cooldown';
    }

    // Singularity Slot
    if (this.player.weapons.singularity.level > 0) {
      const singStatus = document.getElementById('slot-singularity-status');
      singStatus.textContent = 'ACTIVE';
    }

    // Active Powerups Tray in HUD
    const powerupTray = document.getElementById('powerup-tray');
    if (powerupTray) {
      let html = '';
      if (this.player.overchargeTimer > 0) {
        html += `<div class="powerup-chip">⚡ OVERCHARGE: ${this.player.overchargeTimer.toFixed(1)}s</div>`;
      }
      if (this.player.invincibleTimer > 0) {
        html += `<div class="powerup-chip" style="background: rgba(0, 243, 255, 0.25); border-color: #00f3ff;">🛡️ INVINCIBLE: ${this.player.invincibleTimer.toFixed(1)}s</div>`;
      }
      powerupTray.innerHTML = html;
    }

    // XP Bar
    const xpRatio = Math.min(1, this.player.xp / this.player.xpToNextLevel);
    document.getElementById('xp-fill').style.width = `${xpRatio * 100}%`;
    document.getElementById('hud-level').textContent = this.player.level;

    // Wave & Timer
    document.getElementById('wave-title').textContent = this.isBossActive ? 'BOSS FIGHT' : `SECTOR ${this.currentWave}`;
    const mins = Math.floor(this.waveTimer / 60).toString().padStart(2, '0');
    const secs = Math.floor(this.waveTimer % 60).toString().padStart(2, '0');
    document.getElementById('wave-timer').textContent = this.isBossActive ? 'SURVIVE' : `${mins}:${secs}`;

    // Score & Multiplier
    document.getElementById('hud-score').textContent = this.score.toString().padStart(6, '0');
    document.getElementById('hud-multiplier').textContent = `${this.combo.toFixed(1)}x MULTIPLIER`;
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera Shake offset & rotation
    const shakeApplied = this.cameraShake.apply(this.ctx, this.canvas.width, this.canvas.height);

    // 1. Spacetime Grid & Starfield Background
    this.fx.drawBackground(this.ctx);

    // 2. Explosive Grav Barrels
    for (let i = 0; i < this.barrels.length; i++) {
      this.barrels[i].draw(this.ctx);
    }

    // 3. Supply Drops
    for (let i = 0; i < this.supplyDrops.length; i++) {
      this.supplyDrops[i].draw(this.ctx);
    }

    // 4. Singularities (Event Horizons)
    for (let i = 0; i < this.singularities.length; i++) {
      this.singularities[i].draw(this.ctx);
    }

    // 5. XP Crystals
    for (let i = 0; i < this.crystals.length; i++) {
      this.crystals[i].draw(this.ctx);
    }

    // 6. Enemies & Bosses
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].draw(this.ctx);
    }

    // 7. Projectiles
    for (let i = 0; i < this.projectiles.length; i++) {
      this.projectiles[i].draw(this.ctx);
    }

    // 8. Player Ship
    if (this.player) {
      this.player.draw(this.ctx);
    }

    // 9. Shockwaves, Floating Damage Text, Particles
    this.fx.drawForeground(this.ctx);

    // Restore Camera Shake
    this.cameraShake.restore(this.ctx, shakeApplied);
  }
}

// Initialize on page load
window.addEventListener('load', () => {
  window.game = new GameEngine();
});
