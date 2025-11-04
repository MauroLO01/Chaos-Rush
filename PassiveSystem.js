export default class PassiveSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.activeEffects = [];
    }

    activateClassAbilities(classType) {
        this.classType = classType;

        switch (classType) {
            case "alchemist":
                this.setupAlchemist();
                break;

            case "gravedigger":
                this.setupGravedigger();
                break;

            case "sentinel":
                this.setupSentinel();
                break;

            default:
                console.warn("Classe não reconhecida:", classType);
        }
    }

    // 🔮 ALCHEMISTA ESPECTRAL
    setupAlchemist() {
        console.log("Classe: Alquimista Espectral ativa 🧪");

        this.player.luck += 0.15; // Passiva: +15% de chance de “Ressaca Mágica”

        // Arma: Frasco Instável
        this.scene.input.keyboard.on("keydown-SPACE", () => this.throwFlask());
    }

    throwFlask() {
        if (!this.scene || this.isThrowing) return;
        this.isThrowing = true;

        const flask = this.scene.physics.add.sprite(this.player.x, this.player.y, "flask");
        flask.setScale(0.6);
        flask.setVelocity(
            Math.cos(this.player.rotation) * 250,
            Math.sin(this.player.rotation) * 250
        );

        this.scene.time.delayedCall(800, () => {
            this.createFlaskArea(flask.x, flask.y);
            flask.destroy();
            this.isThrowing = false;
        });
    }

    createFlaskArea(x, y) {
        const type = Phaser.Math.RND.pick(["fire", "poison", "slow"]);
        const color =
            type === "fire" ? 0xff6600 : type === "poison" ? 0x00ff00 : 0x66ccff;

        const area = this.scene.add.circle(x, y, 80, color, 0.3);
        this.scene.physics.add.existing(area);
        area.body.setAllowGravity(false);
        area.body.isSensor = true;

        const duration = 4000;
        this.scene.time.delayedCall(duration, () => area.destroy());

        const overlap = this.scene.physics.add.overlap(
            area,
            this.scene.enemies,
            (_, enemy) => {
                if (!enemy || !enemy.active) return;
                enemy.takeDamage(3);

                if (type === "fire") this.applyFire(enemy);
                if (type === "poison") this.applyPoison(enemy);
                if (type === "slow") this.applySlow(enemy);
            }
        );

        this.scene.time.delayedCall(duration, () =>
            this.scene.physics.world.removeCollider(overlap)
        );
    }

    applyFire(enemy) {
        if (enemy.isOnFire) return;
        enemy.isOnFire = true;

        const burn = this.scene.time.addEvent({
            delay: 400,
            repeat: 4,
            callback: () => enemy.takeDamage(2),
        });

        this.scene.time.delayedCall(2000, () => {
            burn.remove();
            enemy.isOnFire = false;
        });
    }

    applyPoison(enemy) {
        if (enemy.isPoisoned) return;
        enemy.isPoisoned = true;

        const poison = this.scene.time.addEvent({
            delay: 800,
            repeat: 5,
            callback: () => enemy.takeDamage(1),
        });

        this.scene.time.delayedCall(4000, () => {
            poison.remove();
            enemy.isPoisoned = false;
        });
    }

    applySlow(enemy) {
        if (enemy.isSlowed) return;
        enemy.isSlowed = true;

        const originalSpeed = enemy.speed;
        enemy.speed *= 0.6;

        this.scene.time.delayedCall(3000, () => {
            enemy.speed = originalSpeed;
            enemy.isSlowed = false;
        });
    }

    // ⚰️ COVEIRO PROFANO (ainda básico)
    setupGravedigger() {
        console.log("Classe: Coveiro Profano ativa ⚰️");
        this.player.speed *= 0.9; // Penalidade de velocidade
    }

    // 🔔 SENTINELA DO SINO (placeholder)
    setupSentinel() {
        console.log("Classe: Sentinela do Sino ativa 🔔");
    }
}
