export default class PassiveSystem {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Ativa a passiva da classe escolhida
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

        console.log("🧩 Classe recebida (normalizada):", normalized);

        // Mapeamento principal — com fallback para includes()
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

        // Busca direta
        if (map[normalized]) {
            console.log(`✨ Passiva reconhecida diretamente: ${normalized}`);
            map[normalized]();
            return;
        }

        // Busca parcial inteligente (pega palavras-chave)
        for (const key in map) {
            if (normalized.includes(key)) {
                console.log(`🔍 Passiva reconhecida por similaridade: ${key}`);
                map[key]();
                return;
            }
        }

        console.warn("⚠️ Nenhuma passiva encontrada para:", normalized);
    }

    // ─────────────── 🧪 ALQUIMISTA ESPECTRAL ───────────────
    activateAlquimista() {
        console.log("🧪 Passiva ativada: Ressaca Mágica (+15% chance de resetar cooldowns)");

        this.scene.events.on("pickupXP", () => {
            const chance = 0.15;
            if (Math.random() < chance) {
                console.log("💥 Ressaca Mágica ativada — cooldowns resetados!");
                this.scene.weaponSystem?.resetAllCooldowns?.();
            }
        });
    }

    // ─────────────── ⚰️ COVEIRO PROFANO ───────────────
    activateCoveiro() {
        console.log("⚰️ Passiva ativada: Culto dos Mortos (+1 invocação, +duração)");

        const p = this.scene.player;
        if (!p) return;

        p.speed *= 0.9; // -10% de velocidade
        p.summonBonus = { duration: 1.2, quantity: 1 };

        const text = this.scene.add.text(p.x, p.y - 30, "🕯️ Culto dos Mortos", {
            fontSize: "12px",
            fill: "#ccccff",
        }).setOrigin(0.5).setDepth(10).setAlpha(0.7);

        this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: p.y - 60,
            duration: 2000,
            onComplete: () => text.destroy(),
        });
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
