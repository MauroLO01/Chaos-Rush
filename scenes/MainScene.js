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
        this.scale.on('resize', this.resize, this);
        this.resize({ width: this.scale.width, height: this.scale.height });
        this.cursors = this.input.keyboard.addKeys('W,S,A,D');

        // Player
        this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
        this.player.magnetRadius = 100;

        // Inimigos e Spawns
        this.enemies = this.physics.add.group();
        this.waveCount = 0; // Começa no 0
        this.baseSpawnDelay = 15000; // 15 segundos entre as ondas (Mais respiro)
        this.initialSpawnAmount = 3; // Inicia com 3 inimigos

        this.time.addEvent({
            delay: 500, // Primeira onda em 0.5 segundo
            callback: this.startWave,
            callbackScope: this,
            loop: false
        })

        // 💠 XP Orbs
        this.xpOrbs = this.physics.add.group({
            classType: XPOrb,
            runChildUpdate: true
        });

        this.upgradeSystem = new UpgradeSystem(this);

        this.enemiesInAura = new Set();

        this.physics.add.overlap(
            this.player.aura,
            this.enemies,
            (aura, enemy) => this.enemiesInAura.add(enemy),
            null,
            this
        );

        this.physics.add.overlap(
            this.player,
            this.xpOrbs,
            this.handleXPCollect,
            null,
            this
        );

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
        this.enemies.children.iterate(enemy => enemy?.update(this.player));
        this.xpOrbs.children.iterate(orb => orb?.update(this.player));
    }

    // --- MÉTODOS DE SPAWN E DIFICULDADE ---

    getOffScreenPosition() {
        const camera = this.cameras.main;
        const padding = 50;

        const camLeft = camera.scrollX;
        const camRight = camera.scrollX + camera.width;
        const camTop = camera.scrollY;
        const camBottom = camera.scrollY + camera.height;

        const side = Phaser.Math.Between(0, 3);

        let x, y;

        switch (side) {
            case 0: // Topo
                x = Phaser.Math.Between(camLeft, camRight);
                y = camTop - padding;
                break;
            case 1: // Direita
                x = camRight + padding;
                y = Phaser.Math.Between(camTop, camBottom);
                break;
            case 2: // Base
                x = Phaser.Math.Between(camLeft, camRight);
                y = camBottom + padding;
                break;
            case 3: // Esquerda
                x = camLeft - padding;
                y = Phaser.Math.Between(camTop, camBottom);
                break;
        }

        return { x, y };
    }

    spawnEnemy() {
        const spawnPos = this.getOffScreenPosition();
        const x = spawnPos.x;
        const y = spawnPos.y;

        const enemy = new Enemy(this, x, y);
        enemy.on('die', (ex, ey, value) => {
            this.spawnXPOrb(ex, ey, value);
        });

        this.enemies.add(enemy);
    }

    startWave() {
        this.waveCount++;

        // Quantidade aumenta a cada 2 ondas
        const amountToSpawn = this.initialSpawnAmount + Math.floor(this.waveCount / 2) * 2;
        console.log(`🌊 INICIANDO ONDA ${this.waveCount}: ${amountToSpawn} inimigos.`);

        // Spawna os inimigos com um pequeno atraso entre eles
        for (let i = 0; i < amountToSpawn; i++) {
            this.time.delayedCall(i * 100, this.spawnEnemy, [], this);
        }

        // Re-agenda a próxima onda, diminuindo o tempo
        const difficultyFactor = Math.min(this.waveCount * 500, 10000);
        const nextDelay = this.baseSpawnDelay - difficultyFactor;

        this.time.addEvent({
            delay: nextDelay > 5000 ? nextDelay : 5000, // Mínimo de 5 segundos de espera
            callback: this.startWave,
            callbackScope: this,
            loop: false
        });
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

    handleXPCollect(playerSprite, orb) {
        if (!orb || orb.collected) return;

        orb.collected = true;

        const xpValue = orb.value || 10;
        this.player.gainXP(xpValue);

        this.showXPText(orb.x, orb.y, `+${xpValue} XP`);

        orb.destroy();

        console.log(`✅ XP coletado: ${xpValue}`);
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

    resize(gameSize) {
        const { width, height } = gameSize;

        if (this.player) {
        }

        this.cameras.main.setViewport(0, 0, width, height);

        if (this.titleText) {
            this.titleText.setPosition(width / 2, height / 2);
        }
    }
}