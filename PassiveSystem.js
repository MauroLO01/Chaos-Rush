export default class PassiveSystem {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Decide qual passiva ativar com base na classe
     * @param {string} className - nome normalizado da classe
     */
    activateClassAbilities(className) {
        if (!className) {
            console.warn("⚠️ Nenhum nome de classe recebido no PassiveSystem.");
            return;
        }

        const normalized = className
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z]/g, "");

        const map = {
            alquimista: () => this.activateAlquimista(),
            alquimistaespectral: () => this.activateAlquimista(),
            spectralalchemist: () => this.activateAlquimista(),

            coveiro: () => this.activateCoveiro(),
            coveiroprofano: () => this.activateCoveiro(),
            gravedigger: () => this.activateCoveiro(),

            sentinela: () => this.activateSentinela(),
            sentineladosino: () => this.activateSentinela(),
            bellsentinel: () => this.activateSentinela(),
        };

        if (map[normalized]) {
            console.log(`✨ Passiva reconhecida: ${normalized}`);
            map[normalized]();
            return;
        }

        // fallback para nomes semelhantes
        for (const key in map) {
            if (normalized.includes(key)) {
                map[key]();
                return;
            }
        }

        console.warn("⚠️ Nenhuma passiva encontrada para:", normalized);
    }

    // ALQUIMISTA ESPECTRAL
    activateAlquimista() {
        const scene = this.scene;
        const player = scene.player;
        if (!player || !scene.weaponSystem) return;

        player.killCount = 0;
        player.maxKillsForPassive = 40;
        player.passiveReady = false;

        // Atualiza visualmente a barrinha
        const updatePassiveBar = () => {
            const percent = Math.min(player.killCount / player.maxKillsForPassive, 1);
            scene.passiveBar.width = 200 * percent;
            scene.passiveText.setText(`Passiva: ${Math.floor(percent * 100)}%`);

            // Se estiver pronta
            if (percent >= 1 && !player.passiveReady) {
                player.passiveReady = true;

                // Brilho pulsante
                scene.tweens.add({
                    targets: scene.passiveBar,
                    alpha: { from: 1, to: 0.5 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                });

                scene.passiveText.setText("☠️ PASSIVA PRONTA!");
                scene.passiveText.setColor("#00ffaa");
            }
        };

        // Aumenta o progresso da barra a cada abate
        scene.events.on("enemyKilled", () => {
            if (player.passiveReady) return;
            player.killCount++;
            updatePassiveBar();
        });

        // Ativa quando o jogador aperta espaço
        scene.input.keyboard.on("keydown-SPACE", () => {
            if (!player.passiveReady) return;

            //Reset cooldowns e lança 3 frascos
            scene.weaponSystem.resetAllCooldowns();
            for (let i = 0; i < 3; i++) {
                scene.time.delayedCall(i * 150, () => {
                    scene.weaponSystem._useFrasco(true);
                });
            }

            // Efeito visual
            const fx = scene.add.circle(player.x, player.y, 30, 0x00ff88, 0.3)
                .setDepth(10)
                .setScale(0);
            scene.tweens.add({
                targets: fx,
                scale: 2,
                alpha: 0,
                duration: 800,
                onComplete: () => fx.destroy(),
            });

            const fxText = scene.add.text(player.x, player.y - 30, "Ressaca Mágica!", {
                fontSize: "18px",
                fill: "#00ff88",
                fontStyle: "bold",
                stroke: "#003300",
                strokeThickness: 4,
            })
                .setOrigin(0.5)
                .setDepth(20);

            scene.tweens.add({
                targets: fxText,
                y: player.y - 60,
                alpha: 0,
                duration: 1200,
                ease: "Cubic.easeOut",
                onComplete: () => fxText.destroy(),
            });

            // Reset tudo
            player.killCount = 0;
            player.passiveReady = false;
            scene.passiveBar.alpha = 1;
            updatePassiveBar();
        });

        // Atualiza a barra desde o início
        updatePassiveBar();
    }


    //COVEIRO PROFANO
    // COVEIRO PROFANO
    activateCoveiro() {
        console.log("💀 Passiva ativada: Colheita de Essência (Necromante)");

        const scene = this.scene;
        const player = scene.player;
        if (!player) return;

        // === CONFIGURAÇÕES ===
        player.soulsCollected = 0;
        player.maxSouls = 25; // inimigos necessários para encher a barra
        player.passiveReady = false;

        // === ATUALIZAÇÃO DA BARRA EXISTENTE ===
        const updatePassiveBar = () => {
            const percent = Math.min(player.soulsCollected / player.maxSouls, 1);
            scene.passiveBar.width = 200 * percent;
            scene.passiveText.setText(`Essência: ${Math.floor(percent * 100)}%`);

            if (percent >= 1 && !player.passiveReady) {
                player.passiveReady = true;

                // Efeito visual de prontidão
                scene.tweens.add({
                    targets: scene.passiveBar,
                    alpha: { from: 1, to: 0.5 },
                    duration: 400,
                    yoyo: true,
                    repeat: -1,
                });

                scene.passiveText.setText("☠️ COLHEITA DE ESSÊNCIA PRONTA!");
                scene.passiveText.setColor("#00ffaa");
            }
        };

        // === EVENTO: Ao matar inimigo ===
        scene.events.on("enemyKilled", () => {
            if (player.passiveReady) return;
            player.soulsCollected++;
            updatePassiveBar();
        });

        // === EVENTO: Ativação com SPACE ===
        scene.input.keyboard.on("keydown-SPACE", () => {
            if (!player.passiveReady) return;

            // Reset visuais e contadores
            player.passiveReady = false;
            player.soulsCollected = 0;
            scene.passiveBar.alpha = 1;
            updatePassiveBar();

            // 🧟 Cria servos dos inimigos marcados
            const markedEnemies = scene.enemies.getChildren().filter(e => e.active && e.isMarked);
            if (markedEnemies.length === 0) return;

            markedEnemies.forEach(enemy => {
                const ghost = scene.physics.add.sprite(enemy.x, enemy.y, "ghostMinion")
                    .setScale(0.8)
                    .setDepth(5)
                    .setTint(0x66ffcc);

                ghost.damage = 35;
                ghost.speed = 120;
                ghost.maxHP = 15;
                ghost.currentHP = ghost.maxHP;

                enemy.destroy();

                // Vida útil
                scene.time.delayedCall(5000, () => {
                    if (ghost.active) this.explodeGhost(scene, ghost);
                });

                // Ataque automático
                scene.time.addEvent({
                    delay: 400,
                    loop: true,
                    callback: () => {
                        if (!ghost.active) return;
                        const target = scene.enemies.getChildren().find(e => e.active);
                        if (!target) return;

                        const dx = target.x - ghost.x;
                        const dy = target.y - ghost.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist < 180) {
                            ghost.setVelocity((dx / dist) * ghost.speed, (dy / dist) * ghost.speed);

                            if (dist < 25) {
                                target.takeDamage(ghost.damage);
                                this.explodeGhost(scene, ghost);
                            }
                        }
                    }
                });
            });

            // 💥 Feedback visual da ativação
            const fxText = scene.add.text(player.x, player.y - 40, "☠️ Colheita de Essência!", {
                fontSize: "18px",
                fill: "#00ffaa",
                fontStyle: "bold",
                stroke: "#003300",
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(10);

            scene.tweens.add({
                targets: fxText,
                y: player.y - 70,
                alpha: 0,
                duration: 1000,
                onComplete: () => fxText.destroy()
            });
        });

        // Atualiza desde o início
        updatePassiveBar();
    }




    // ─────────────── 🔔 SENTINELA DO SINO ───────────────
    activateSentinela() {
        console.log("🔔 Passiva ativada: Eco Sagrado (+1 dano em empurrões, +30% knockback)");

        const p = this.scene.player;
        if (!p) return;

        p.knockbackBonus = 1.3;
        p.pushDamageBonus = 1;

        const safeCircle = this.scene.add.circle(p.x, p.y, 80, 0x88ccff, 0.1);
        safeCircle.setDepth(1);

        this.scene.events.on("update", () => {
            safeCircle.x = p.x;
            safeCircle.y = p.y;
        });
    }
}
