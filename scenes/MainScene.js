import Player from '../entities/player.js';
import Enemy from '../entities/enemy.js';
import XPOrb from '../entities/XPOrb.js';
import UpgradeSystem from '../systens/UpgradeSystem.js';

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
        this.cursors = this.input.keyboard.addKeys('W,S,A,D');

        this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
        this.upgradeSystem = new UpgradeSystem(this)
        this.player.magnetRadius = 100;

        // BARRA DE VIDA 
        this.healthBarBG = this.add.rectangle(100, 20, 200, 20, 0x333333)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.healthBar = this.add.rectangle(100, 20, 200, 20, 0xff0000)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        // BARRA DE XP 
        this.xpBarBG = this.add.rectangle(100, 50, 200, 10, 0x222222)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.xpBar = this.add.rectangle(100, 50, 200, 10, 0x6a00ff)
            .setOrigin(0, 0)
            .setScrollFactor(0);

        this.levelText = this.add.text(310, 35, `Lv ${this.player.level}`, {
            fontSize: "16px",
            fill: "#ffffff"
        }).setScrollFactor(0);

        this.updateHealthBar();
        this.updateXpBar();


        this.upgradeSystem = new UpgradeSystem(this);

        // 👾 Grupo de inimigos
        this.enemies = this.physics.add.group();
        this.waveCount = 0;
        this.baseSpawnDelay = 3000;
        this.spawnAmount = 3;

        // Primeira onda
        this.time.addEvent({
            delay: 1000,
            callback: this.startWave,
            callbackScope: this,
            loop: false
        });

        // 💠 XP Orbs
        this.xpOrbs = this.physics.add.group({
            classType: XPOrb,
            runChildUpdate: true
        });

        this.enemiesInAura = new Set();

        // Aura de dano
        this.physics.add.overlap(
            this.player.aura,
            this.enemies,
            (aura, enemy) => this.enemiesInAura.add(enemy),
            null,
            this
        );

        // Coleta de XP
        this.physics.add.overlap(
            this.player,
            this.xpOrbs,
            this.handleXPCollect,
            null,
            this
        );

        // Dano periódico da aura
        this.time.addEvent({
            delay: this.player.damageInterval || 200,
            callback: this.processAuraDamage,
            callbackScope: this,
            loop: true
        });

        this.cameras.main.setBackgroundColor('#202733');
        this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    }

    update() {
        this.player.update(this.cursors);
        this.enemies.children.iterate(enemy => enemy?.update(this.player));
        this.xpOrbs.children.iterate(orb => orb?.update(this.player));
    }

    spawnEnemy() {
        const minDistance = (this.player.auraRange || 100) * 1.5;
        const screenMargin = 50;
        const width = this.scale.width;
        const height = this.scale.height;

        let x, y;
        const side = Phaser.Math.Between(0, 3);

        switch (side) {
            case 0: // topo
                x = Phaser.Math.Between(-screenMargin, width + screenMargin);
                y = -screenMargin;
                break;
            case 1: // baixo
                x = Phaser.Math.Between(-screenMargin, width + screenMargin);
                y = height + screenMargin;
                break;
            case 2: // esquerda
                x = -screenMargin;
                y = Phaser.Math.Between(-screenMargin, height + screenMargin);
                break;
            case 3: // direita
                x = width + screenMargin;
                y = Phaser.Math.Between(-screenMargin, height + screenMargin);
                break;
        }

        const distance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
        if (distance < minDistance) {
            const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
            x = this.player.x + Math.cos(angle) * minDistance * 1.2;
            y = this.player.y + Math.sin(angle) * minDistance * 1.2;
        }

        const enemy = new Enemy(this, x, y);

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

    // ✨ Coleta de XP + texto flutuante
    handleXPCollect(playerSprite, orb) {
        if (!orb || orb.collected) return;

        orb.collected = true;
        const xpValue = orb.value || 10;
        this.player.gainXP(xpValue);

        this.showXPText(orb.x, orb.y, `+${xpValue} XP`);
        orb.destroy();
    }

    handlePlayerHit(player, enemies) {
        if (!player.lastHitTime || this.time.now - player.lastHitTime > 1000) {
            player.currentHP -= 10;
            this.updateHealthBar();

            player.setTint(0xff5555);
            this.time.delayedCall(150, () => player.clearTint());

            this.lastHitTime = this.time.now;

            if (player.currentHP <= 0) {
                this.handlePlayerHit();
            }
        }
    }

    handlePlayerDeath() {
        this.physics.pause();
        this.physic.setTint(0x000000);

        const gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2, "💀 GAME OVER 💀", {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        console.log("☠️ O jogador morreu!")
    }

    showXPText(x, y, text) {
        const xpText = this.add.text(x, y - 10, text, {
            fontSize: '16px',
            fill: '#00ffff',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setDepth(20)
            .setAlpha(1);

        this.tweens.add({
            targets: xpText,
            scale: { from: 1.3, to: 1 },
            duration: 150,
            ease: 'Back.easeOut',
        });


        this.tweens.add({
            targets: xpText,
            y: y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Cubic.easeOut',
            delay: 150,
            onComplete: () => xpText.destroy(),
        });
    }

    // 🔁 Sistema de ondas progressivas
    startWave() {
        console.log(`Iniciando nova onda ${this.waveCount}: ${this.spawnAmount} inimigos.`);
        for (let i = 0; i < this.spawnAmount; i++) {
            this.time.delayedCall(i * 200, this.spawnEnemy, [], this);
        }

        this.waveCount++;
        this.spawnAmount += 2;

        const nextDelay = this.baseSpawnDelay - (this.waveCount * 500);

        this.time.addEvent({
            delay: nextDelay > 10000 ? nextDelay : 10000,
            callback: this.startWave,
            callbackScope: this,
            loop: false
        });
    }

    resize(gameSize) {
        const { width, height } = gameSize;

        if (this.player) {
            this.player.sprite.x = width / 2;
            this.player.sprite.y = height / 2;
        }

        this.cameras.main.setViewport(0, 0, width, height);

        if (this.titleText) {
            this.titleText.setPosition(width / 2, height / 2);
        }
    }

    updateHealthBar() {
        const hpPercent = Phaser.Math.Clamp(this.player.currentHP / this.player.maxHP, 0, 1);
        this.healthBar.width = 200 * hpPercent;
    }

    updateXpBar() {
        const xpPercent = Phaser.Math.Clamp(this.player.xp / this.player.xpToNext, 0, 1);
        this.xpBar.width = 200 * xpPercent;
        this.levelText.setText(`Lv ${this.player.level}`);
    }

    Open(player) {
        console.log('tentando abrir o sistema de upgrades...')
        if (this.isOpen) return;
    }
}
