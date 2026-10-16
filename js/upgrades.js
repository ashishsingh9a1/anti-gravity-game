/**
 * ANTI-GRAVITY // OVERDRIVE - Rogue-lite Upgrade System
 * Card generator, perk registry, stat mutations, and level-up modal controller.
 */

class UpgradeSystem {
  constructor() {
    this.catalog = [
      {
        id: 'blaster_multishot',
        name: 'MULTI-PLASMA ARRAY',
        icon: '⚡',
        rarity: 'rare',
        maxLevel: 4,
        description: 'Adds an additional plasma cannon to your primary spread array.',
        statText: '+1 Projectile per shot',
        apply: (player) => {
          player.weapons.blaster.count += 1;
          player.weapons.blaster.damage = Math.round(player.weapons.blaster.damage * 0.95); // slight balance
        }
      },
      {
        id: 'blaster_overclock',
        name: 'HYPER-CYCLER',
        icon: '🔥',
        rarity: 'common',
        maxLevel: 5,
        description: 'Accelerates primary blaster firing rate and projectile muzzle velocity.',
        statText: '+25% Fire Rate, +15% Velocity',
        apply: (player) => {
          player.weapons.blaster.fireRate = Math.max(0.08, player.weapons.blaster.fireRate * 0.78);
          player.weapons.blaster.bulletSpeed *= 1.15;
        }
      },
      {
        id: 'railgun',
        name: 'GRAVITON RAILGUN',
        icon: '💫',
        rarity: 'epic',
        maxLevel: 4,
        description: 'Fires high-density relativistic beams that pierce infinitely through lines of enemies.',
        statText: 'Unlock Piercing Railgun / +40% Beam Dmg',
        apply: (player) => {
          player.weapons.railgun.level += 1;
          if (player.weapons.railgun.level > 1) {
            player.weapons.railgun.damage *= 1.4;
            player.weapons.railgun.fireRate = Math.max(0.7, player.weapons.railgun.fireRate * 0.85);
          }
        }
      },
      {
        id: 'missiles',
        name: 'SEEKER SWARM',
        icon: '🚀',
        rarity: 'rare',
        maxLevel: 4,
        description: 'Launches smart micro-missiles that curve and hunt the closest high-threat targets.',
        statText: 'Unlock Homing Missiles / +1 Missile',
        apply: (player) => {
          player.weapons.missiles.level += 1;
          if (player.weapons.missiles.level > 1) {
            player.weapons.missiles.count += 1;
            player.weapons.missiles.damage *= 1.25;
          }
        }
      },
      {
        id: 'singularity',
        name: 'SINGULARITY WELL',
        icon: '🕳',
        rarity: 'legendary',
        maxLevel: 3,
        description: 'Spawns miniature black holes that pull in hostile swarms and detonate in a supernova.',
        statText: 'Spawns Spacetime Vortex / +50% Collapse Dmg',
        apply: (player) => {
          player.weapons.singularity.level += 1;
          if (player.weapons.singularity.level > 1) {
            player.weapons.singularity.damage *= 1.5;
            player.weapons.singularity.cooldown = Math.max(4.0, player.weapons.singularity.cooldown * 0.8);
          }
          const box = document.getElementById('slot-singularity-box');
          if (box) box.style.display = 'flex';
        }
      },
      {
        id: 'orbitals',
        name: 'PLASMA ORBITALS',
        icon: '🪐',
        rarity: 'epic',
        maxLevel: 3,
        description: 'Deploys high-energy plasma moons that rotate gravitationally around your craft, shredding enemies.',
        statText: '+1 Orbital Plasma Moon / +30% Rotation',
        apply: (player) => {
          player.weapons.orbitals.level += 1;
          const count = player.weapons.orbitals.satellites.length;
          const sign = count % 2 === 0 ? 1 : -1;
          player.weapons.orbitals.satellites.push(new OrbitalSatellite(70 + count * 15, 2.4 * sign, 35));
        }
      },
      {
        id: 'tesla',
        name: 'TESLA ARC CONDUCTOR',
        icon: '🌩',
        rarity: 'rare',
        maxLevel: 4,
        description: 'Emits high-voltage chain lightning that jumps between hostile swarm entities.',
        statText: 'Unlock Chain Arc / +1 Chain Jump',
        apply: (player) => {
          player.weapons.tesla.level += 1;
          if (player.weapons.tesla.level > 1) {
            player.weapons.tesla.chains += 1;
            player.weapons.tesla.damage *= 1.3;
          }
        }
      },
      {
        id: 'pulse_overdrive',
        name: 'GRAV-PULSE AMPLIFIER',
        icon: '🌀',
        rarity: 'epic',
        maxLevel: 4,
        description: 'Expands the radius and lowers the cooldown of your Anti-Gravity repulsion pulse.',
        statText: '+30% Radius, -20% Cooldown',
        apply: (player) => {
          player.pulseRadius *= 1.3;
          player.pulseCooldown = Math.max(1.8, player.pulseCooldown * 0.8);
        }
      },
      {
        id: 'phase_dash',
        name: 'QUANTUM DRIFT',
        icon: '✨',
        rarity: 'rare',
        maxLevel: 3,
        description: 'Improves thruster responsiveness and significantly reduces Phase Dash cooldown.',
        statText: '+15% Flight Speed, -30% Dash Cooldown',
        apply: (player) => {
          player.baseSpeed *= 1.15;
          player.dashCooldown = Math.max(0.9, player.dashCooldown * 0.7);
        }
      },
      {
        id: 'forcefield',
        name: 'AEGIS BARRIER',
        icon: '🛡',
        rarity: 'common',
        maxLevel: 5,
        description: 'Increases maximum shield capacity and speeds up energetic regeneration rate.',
        statText: '+30 Max Shield, +4 Shield/sec',
        apply: (player) => {
          player.maxShield += 30;
          player.shield += 30;
          player.shieldRegenRate += 4;
        }
      },
      {
        id: 'nanite_hull',
        name: 'NANO-REPAIR MATRIX',
        icon: '💚',
        rarity: 'common',
        maxLevel: 5,
        description: 'Reinforces ship titanium hull and instantly repairs 40 HP.',
        statText: '+30 Max Hull, +40 Immediate Repair',
        apply: (player) => {
          player.maxHp += 30;
          player.hp = Math.min(player.maxHp, player.hp + 40);
        }
      },
      {
        id: 'crit_matrix',
        name: 'PRECISION OVERCLOCK',
        icon: '🎯',
        rarity: 'rare',
        maxLevel: 4,
        description: 'Augments targeting sensors, dramatically increasing critical hit chance and critical damage.',
        statText: '+12% Crit Rate, +0.5x Crit Damage',
        apply: (player) => {
          player.critChance = Math.min(0.8, player.critChance + 0.12);
          player.critMultiplier += 0.5;
        }
      },
      {
        id: 'xp_magnet',
        name: 'GRAV-HARVESTER',
        icon: '🧲',
        rarity: 'common',
        maxLevel: 4,
        description: 'Broadens the gravitational vacuum field that pulls floating XP crystals to your ship.',
        statText: '+65% Crystal Collection Radius',
        apply: (player) => {
          player.magnetRadius *= 1.65;
        }
      },
      {
        id: 'deflector_charge',
        name: 'KINETIC CONVERTER',
        icon: '💫',
        rarity: 'legendary',
        maxLevel: 3,
        description: 'Reflected enemy projectiles deal catastrophic damage and gain aggressive homing thrusters.',
        statText: '+150% Deflected Bullet Damage',
        apply: (player) => {
          player.bulletReflectMult += 1.5;
        }
      }
    ];

    // Tracks levels of upgrades picked
    this.currentLevels = {};
  }

  reset() {
    this.currentLevels = {};
  }

  getCurrentLevel(upgradeId) {
    return this.currentLevels[upgradeId] || 0;
  }

  getRandomOptions(player, count = 3) {
    // Filter available options that have not reached maxLevel
    const available = this.catalog.filter(item => {
      const curLvl = this.getCurrentLevel(item.id);
      return curLvl < item.maxLevel;
    });

    // Shuffle and pick
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  applyUpgrade(player, upgradeId) {
    const item = this.catalog.find(u => u.id === upgradeId);
    if (!item) return;

    this.currentLevels[upgradeId] = (this.currentLevels[upgradeId] || 0) + 1;
    item.apply(player);
  }
}

window.UpgradeSystem = UpgradeSystem;
