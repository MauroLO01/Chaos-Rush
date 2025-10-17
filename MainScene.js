import Player from '../entities/player.js';
import Enemy from '../entities/enemy.js';
import XPOrb from '../entities/XPOrb.js';
import UpgradeSystem from '../systems/UpgradeSystem.js';

export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.textures.generate('player', { data: ['0'], pixelWidth: 20 });
        this.textures.generate('enemy', { data: ['1'], pixelWidth: 20 });
        this.textures.generate('xp_orb', { data: ['2'], pixelWidth: 10 });
    }

    create() {
        // 🎮 Controles
        this.cursors = this.input.keyboard.addKeys('W,S,A,D');

        // 👤 Player
        this.player = new Player(this, 400, 300);
        this.player.magnetRadius = 150; // raio do "imã"

        // 🧱 Inimigos
        this.enemies = this.physics.add.group();
        this.spawnEnemy();

        // 💠 XP Orbs
        this.xpOrbs = this.physics.add.group({
            classType: XPOrb,
            runChildUpdate: true
        });

        // ⚙️ Sistema de upgrades
        this.upgradeSystem = new UpgradeSystem(this);

        // 🌀 Overlap da aura com inimigos
        this.enemiesInAura = new Set();

        this.physics.add.overlap(
            this.player.aura,
            this.enemies,
            (aura, enemy) => this.enemiesInAura.add(enemy),
            null,
            this
        );

        // 🧲 Overlap da coleta de XP (player com XP orbs)
        this.physics.add.overlap(
            this.player.sprite,
            this.xpOrbs,
            this.handleXPCollect,
            null,
            this
        );

        // ⚔️ Intervalo de dano da aura
        this.time.addEvent({
            delay: this.player.damageInterval || 200,
            callback: this.processAuraDamage,
            callbackScope: this,
            loop: true
        });

        this.cameras.main.setBackgroundColor('#202733');
    }

    update() {
        this.player.update(this.cursors);
        this.enemies.children.iterate(enemy => enemy?.update(this.player.sprite));
        this.xpOrbs.children.iterate(orb => orb?.update(this.player));
    }

    // 🧱 Spawna 1 inimigo
    spawnEnemy() {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 550);
        const enemy = new Enemy(this, x, y);

        // Quando o inimigo morre → dropa XP
        enemy.on('die', (ex, ey, value) => this.spawnXPOrb(ex, ey, value));

        this.enemies.add(enemy);
    }

    // 💠 Cria um orbe de XP no local do inimigo
    spawnXPOrb(x, y, value) {
        const orb = new XPOrb(this, x, y, value);
        this.xpOrbs.add(orb);
    }

    // 💥 Aplica o dano da aura
    processAuraDamage() {
        this.enemiesInAura.forEach(enemy => {
            if (enemy && enemy.active) {
                enemy.takeDamage(this.player.baseDamage || 10);
            }
        });
        this.enemiesInAura.clear();
    }

    // 💎 Função chamada ao coletar o XP
    handleXPCollect(playerSprite, orb) {
        if (!orb || orb.collected) return;

        orb.collected = true;
        orb.destroy();

        const xpValue = orb.value || 10;
        this.player.gainXP(xpValue);

        // Animação simples de feedback
        this.add.text(orb.x, orb.y - 10, `+${xpValue}XP`, {
            fontSize: '12px',
            color: '#00ffff'
        }).setOrigin(0.5).setDepth(10).setAlpha(0.8)
            .setScrollFactor(0)
            .setScale(1)
            .setInteractive();

        console.log(`✅ XP coletado: ${xpValue}`);
    }
}
