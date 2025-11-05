// 📦 WeaponSystem.js — versão corrigida e com debug

const FRASCO_CONFIG = {
    VELOCITY: 350,
    LIFESPAN: 900,
    AREA_RADIUS: 60,
    AREA_TICK_RATE: 300,
    BASE_TICKS: 6,
};

function getDebuffColor(type) {
    switch (type) {
        case "fire": return 0xff7700;
        case "poison": return 0x00aa00;
        case "slow": return 0x3366ff;
        default: return 0xffffff;
    }
}

export default class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.cooldowns = {};
    }

    useWeapon(key) {
        if (this.cooldowns[key]) return;

        switch (key) {
            case "frascoInstavel": this._useFrasco(); break;
            case "paRitualistica": this._useShovel(); break;
            case "sinoPurificacao": this._useBell(); break;
            default:
                console.warn("⚠️ Arma não reconhecida:", key);
                break;
        }
    }

    startCooldown(key, ms) {
        this.cooldowns[key] = true;
        this.scene.time.delayedCall(ms, () => { this.cooldowns[key] = false; });
    }

    resetAllCooldowns() {
        Object.keys(this.cooldowns).forEach(k => this.cooldowns[k] = false);
    }

    // ─────────────── 🧪 FRASCO INSTÁVEL ───────────────
    _useFrasco() {
        const scene = this.scene;
        const p = this.player;

        console.log("🧪 Usando frasco instável!");
        console.log("Textura existe?", scene.textures.exists("flask"));
        console.log("Inimigos ativos:", scene.enemies?.countActive(true) || 0);

        const effects = ["fire", "poison", "slow"];
        const chosenEffect = effects[Math.floor(Math.random() * effects.length)];

        // ✅ Garante que a textura existe
        if (!scene.textures.exists("flask")) {
            console.error("❌ Textura 'flask' não encontrada! Verifique o preload().");
            return;
        }

        const flask = scene.physics.add.sprite(p.x, p.y, "flask")
            .setDepth(5)
            .setTint(getDebuffColor(chosenEffect));

        // Movimento aleatório
        const angle = Phaser.Math.Between(0, 360);
        scene.physics.velocityFromAngle(angle, FRASCO_CONFIG.VELOCITY, flask.body.velocity);

        this.startCooldown("frascoInstavel", 1200);

        // 💥 Quando colidir com inimigo
        scene.physics.add.collider(flask, scene.enemies, (frasco, enemy) => {
            console.log(`💥 Frasco colidiu com inimigo (${chosenEffect})`);
            this._createGroundEffect(frasco.x, frasco.y, chosenEffect);
            frasco.destroy();
        });

        // ⏰ Se não colidir, cria o efeito ao fim da vida
        scene.time.delayedCall(FRASCO_CONFIG.LIFESPAN, () => {
            if (flask.active) {
                console.log(`🧨 Frasco expirou (${chosenEffect})`);
                this._createGroundEffect(flask.x, flask.y, chosenEffect);
                flask.destroy();
            }
        });
    }

    _createGroundEffect(x, y, effect) {
        const scene = this.scene;
        const durationMultiplier = this.player.debuffDurationMultiplier || 1;
        const totalTicks = Math.ceil(FRASCO_CONFIG.BASE_TICKS * durationMultiplier);

        const color = getDebuffColor(effect);
        const area = scene.add.circle(x, y, FRASCO_CONFIG.AREA_RADIUS, color, 0.25)
            .setStrokeStyle(2, color)
            .setDepth(4);

        console.log(`🌫️ Criando área de debuff: ${effect} (${totalTicks} ticks)`);

        let ticksDone = 0;

        const timer = scene.time.addEvent({
            delay: FRASCO_CONFIG.AREA_TICK_RATE,
            loop: true,
            callback: () => {
                ticksDone++;

                scene.enemies.children.iterate(e => {
                    if (!e || !e.active) return;

                    const distance = Phaser.Math.Distance.Between(e.x, e.y, x, y);
                    if (distance <= FRASCO_CONFIG.AREA_RADIUS) {
                        this._applyFlaskDebuff(e, effect);
                    }
                });

                if (ticksDone >= totalTicks) {
                    area.destroy();
                    timer.remove(false);
                    console.log(`✅ Efeito ${effect} finalizado`);
                }
            }
        });
    }

    _applyFlaskDebuff(enemy, effect) {
        const scene = this.scene;
        const baseDotDamage = 8 * (this.player.dotDamageBonus || 1);

        switch (effect) {
            case "fire":
                enemy.takeDamage(baseDotDamage * 1.5);
                break;
            case "poison":
                enemy.takeDamage(baseDotDamage + 2);
                break;
            case "slow":
                enemy.takeDamage(baseDotDamage * 0.5);

                if (!enemy._origSpeed) enemy._origSpeed = enemy.speed;
                if (enemy.speed > enemy._origSpeed * 0.6) {
                    enemy.speed = enemy._origSpeed * 0.6;

                    scene.time.delayedCall(FRASCO_CONFIG.AREA_TICK_RATE, () => {
                        if (enemy.active && enemy.speed < enemy._origSpeed) {
                            enemy.speed = enemy._origSpeed;
                        }
                    });
                }
                break;
        }
    }

    // ─────────────── ⚰️ COVEIRO ───────────────
    _useShovel() {
        const scene = this.scene;
        const p = this.player;
        const shovel = scene.physics.add.sprite(p.x, p.y, "shovel")?.setDepth(6)
            || scene.add.rectangle(p.x, p.y, 12, 6, 0xaaaaaa);
        const pointer = scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX || p.x + 100, pointer.worldY || p.y);
        const speed = 500;
        scene.physics.velocityFromRotation(angle, speed, shovel.body?.velocity || { x: 0, y: 0 });
        this.startCooldown("paRitualistica", 1200);

        const hitHandler = (obj, enemy) => {
            if (!enemy || !enemy.active) return;
            enemy.takeDamage(20);
            if (Phaser.Math.FloatBetween(0, 1) < 0.25) this._spawnSkeleton(enemy.x, enemy.y);
        };

        scene.time.delayedCall(400, () => {
            scene.physics.moveToObject(shovel, p, 600);
            scene.time.delayedCall(600, () => shovel.destroy());
        });

        scene.physics.add.overlap(shovel, scene.enemies, hitHandler);
    }

    _spawnSkeleton(x, y) {
        const scene = this.scene;
        const s = scene.physics.add.sprite(x, y, "skeleton")?.setTint(0xdddddd)
            || scene.add.circle(x, y, 8, 0xdddddd);
        scene.physics.add.existing(s);
        s.isAlly = true;
        s.hp = 20;

        s.update = function (player) {
            if (!this.body) return;
            scene.physics.moveToObject(this, player, 80);
        };

        scene.physics.add.overlap(s, scene.enemies, (ally, enemy) => {
            if (!enemy || !enemy.active) return;
            enemy.takeDamage(8);
        });

        const duration = (this.player.summonDurationBonus || 6000) * (1 + (this.player.summonCountBonus || 0) * 0.1);
        scene.time.delayedCall(duration, () => s.destroy());
    }

    // ─────────────── 🔔 SENTINELA ───────────────
    _useBell() {
        const scene = this.scene;
        const p = this.player;
        const radius = 120;
        const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
        scene.enemies.children.iterate(e => {
            if (!e || !e.active) return;
            const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
            if (d <= radius) {
                const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
                const kb = 300 * (p.knockbackBonus || 1);
                scene.physics.velocityFromRotation(angle, kb, e.body.velocity);
                const extra = p.extraDamageOnPush || 0;
                e.takeDamage(12 + extra);
                scene.events.emit("enemyPushed", e);
            }
        });
        this.startCooldown("sinoPurificacao", 1400);
        scene.time.delayedCall(260, () => wave.destroy());
    }
}
