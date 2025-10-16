import Player from '../entities/player.js';
import Enemy from '../entities/enemy.js';
import UpgradeSystem from '../systens/UpgradeSystem.js';


export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    preload() {
        this.textures.generate('player', { data: ['0'], pixelWidth: 20 });
        this.textures.generate('enemy', { data: ['1'], pixelWidth: 20 });   
        this.textures.generate('xp_orb', { data: ['2'], pixelWidth: 10});
    }

    create() {
        this.cursors = this.input.keyboard.addKeys('W,S,A,D');

        this.player = new Player(this, 400, 300);

        this.enemies = this.physics.add.group();
        this.spawnEnemy();

        this.upgradeSystem = new UpgradeSystem(this);

        this.enemiesInAura = new Set();

        this.enemies.on('die', (x, y, value) => this.spawnXPOrb(x, y, value));

        this.physics.add.overlap(
            this.player.aura,
            this.enemies,
            (aura, enemy) => {
                this.enemiesInAura.add(enemy);
            },
            null,
            this
        );

        this.time.addEvent({
            delay: this.player.damageInterval,
            callback: this.processAuraDamage,
            callbackScope: this,
            loop: true
        });
    }

    update() {
        this.player.update(this.cursors);
       
        this.enemies.children.iterate(enemy => enemy?.update(this.player));
    }

    // NOVO: Função para processar o dano (chamada a cada 200ms)
    processAuraDamage() {
        this.enemiesInAura.forEach(enemy => {
            if (enemy && enemy.active) {
                enemy.takeDamage(this.player.baseDamage);
            }
        });

        // Limpa o Set, pronto para ser preenchido novamente no próximo frame
        this.enemiesInAura.clear();
    }

    spawnEnemy() {
        const x = Phaser.Math.Between(50, 750);
        const y = Phaser.Math.Between(50, 550);
        const enemy = new Enemy(this, x, y);
        this.enemies.add(enemy);
    }

    spawnXPOrb(x, y, value) {
        console.log(`💠 XP orb dropado em (${x}, ${y}) valendo ${value}. Pronto para a Etapa 2!`);
        // futuro: adicionar classe XPOrb
    }
}
