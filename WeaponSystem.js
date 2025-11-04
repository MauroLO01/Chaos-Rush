// WeaponSystem.js
export default class WeaponSystem {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.cooldowns = {}; // keyed by weaponKey
    }

    useWeapon(key) {
        if (this.cooldowns[key]) return;
        switch (key) {
            case "frascoInstavel": this._useFrasco(); break;
            case "paRitualistica": this._useShovel(); break;
            case "sinoPurificacao": this._useBell(); break;
            default: break;
        }
    }

    startCooldown(key, ms) {
        this.cooldowns[key] = true;
        this.scene.time.delayedCall(ms, () => { this.cooldowns[key] = false; });
    }

    resetAllCooldowns() {
        Object.keys(this.cooldowns).forEach(k => this.cooldowns[k] = false);
    }

    // --- FRASCO INSTÁVEL: lança frasco, explode criando área DOT com efeito aleatório ---
    _useFrasco() {
        const scene = this.scene;
        const p = this.player;
        const flask = scene.physics.add.sprite(p.x, p.y, 'flask')?.setDepth(5) || scene.add.circle(p.x, p.y, 6, 0xffffff);
        // impulse
        const vx = Phaser.Math.Between(-200, 200);
        const vy = Phaser.Math.Between(-200, 200);
        if (flask.body) flask.body.setVelocity(vx, vy);

        this.startCooldown('frascoInstavel', 1200);

        // explode after short delay
        scene.time.delayedCall(700, () => {
            const exX = flask.x || p.x, exY = flask.y || p.y;
            if (flask.destroy) flask.destroy();

            const area = scene.add.circle(exX, exY, 60, 0xff6600, 0.25).setDepth(4);
            // choose random effect
            const effects = ['fire', 'poison', 'slow'];
            const effect = Phaser.Utils.Array.GetRandom(effects);

            // damage over time for enemies inside
            const ticks = 6;
            let ticksDone = 0;
            const timer = scene.time.addEvent({
                delay: 300,
                loop: true,
                callback: () => {
                    ticksDone++;
                    scene.enemies.children.iterate(e => {
                        if (!e || !e.active) return;
                        const d = Phaser.Math.Distance.Between(e.x, e.y, exX, exY);
                        if (d <= 60) {
                            e.takeDamage(8); // base DOT
                            if (effect === 'poison') { e.takeDamage(2); }
                            if (effect === 'slow') {
                                e.speed = (e._origSpeed || e.speed) * 0.6;
                                scene.time.delayedCall(400, () => { if (e && e.active) e.speed = e._origSpeed || e.speed; });
                            }
                        }
                    });
                    if (ticksDone >= ticks) {
                        area.destroy();
                        timer.remove(false);
                    }
                }
            });
        });
    }

    // --- PÁ RITUALÍSTICA: lança e retorna como bumerangue; chance de spawnar esqueleto ---
    _useShovel() {
        const scene = this.scene;
        const p = this.player;
        const shovel = scene.physics.add.sprite(p.x, p.y, 'shovel')?.setDepth(6) || scene.add.rectangle(p.x, p.y, 12, 6, 0xaaaaaa);
        // throw forward (toward pointer or up)
        const pointer = scene.input.activePointer;
        const angle = Phaser.Math.Angle.Between(p.x, p.y, pointer.worldX || p.x + 100, pointer.worldY || p.y);
        const speed = 500;
        scene.physics.velocityFromRotation(angle, speed, shovel.body?.velocity || { x: 0, y: 0 });
        this.startCooldown('paRitualistica', 1200);

        // detect collisions with enemies while going forward
        const hitHandler = (obj, enemy) => {
            if (!enemy || !enemy.active) return;
            enemy.takeDamage(20);
            // chance to unearth a small skeleton minion
            if (Phaser.Math.FloatBetween(0, 1) < 0.25) { this._spawnSkeleton(enemy.x, enemy.y); }
        };

        // after short time return to player
        scene.time.delayedCall(400, () => {
            // reverse velocity to come back
            scene.physics.moveToObject(shovel, p, 600);
            scene.time.delayedCall(600, () => { if (shovel.destroy) shovel.destroy(); });
        });

        // overlap
        scene.physics.add.overlap(shovel, scene.enemies, hitHandler);
    }

    _spawnSkeleton(x, y) {
        const scene = this.scene;
        // simple allied sprite that follows player and damages enemies on contact
        const s = scene.physics.add.sprite(x, y, 'skeleton')?.setTint(0xdddddd) || scene.add.circle(x, y, 8, 0xdddddd);
        scene.physics.add.existing(s);
        s.isAlly = true;
        s.hp = 20;
        s.update = function (player) {
            if (!this.body) return;
            scene.physics.moveToObject(this, player, 80);
        };
        // damage on overlap with enemies
        scene.physics.add.overlap(s, scene.enemies, (ally, enemy) => {
            if (!enemy || !enemy.active) return;
            enemy.takeDamage(8);
        });
        // auto-destroy after duration (base 6s, passiva pode increase)
        const duration = (this.player.summonDurationBonus || 6000) * (1 + (this.player.summonCountBonus || 0) * 0.1);
        scene.time.delayedCall(duration, () => { if (s.destroy) s.destroy(); });
    }

    // --- SINO DA PURIFICAÇÃO: ring ao redor do player, empurra e danifica ---
    _useBell() {
        const scene = this.scene;
        const p = this.player;
        const radius = 120;
        // visual
        const wave = scene.add.circle(p.x, p.y, radius, 0x66ccff, 0.18).setDepth(4);
        // apply to enemies
        scene.enemies.children.iterate(e => {
            if (!e || !e.active) return;
            const d = Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y);
            if (d <= radius) {
                // push away
                const angle = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
                const kb = 300 * (p.knockbackBonus || 1);
                scene.physics.velocityFromRotation(angle, kb, e.body.velocity);
                // damage, with extra if passive set
                const extra = p.extraDamageOnPush || 0;
                e.takeDamage(12 + extra);
                // let passive know (if it listens)
                scene.events.emit('enemyPushed', e);
            }
        });
        this.startCooldown('sinoPurificacao', 1400);
        scene.time.delayedCall(260, () => wave.destroy());
    }
}
