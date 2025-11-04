import Player from "../entities/player.js";
import Enemy from "../entities/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";
import ClassSystem from "../systems/classSystems.js";
import PassiveSystem from "../systems/passiveSystem.js";
import WeaponSystem from "../systems/weaponSystem.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 20, 20);
    g.generateTexture("player", 20, 20);
    g.clear();

    g.fillStyle(0xff3333, 1);
    g.fillRect(0, 0, 20, 20);
    g.generateTexture("enemy", 20, 20);
    g.clear();

    g.fillStyle(0x6a00ff, 1);
    g.fillCircle(5, 5, 5);
    g.generateTexture("xp_orb", 10, 10);
    g.destroy();
  }

  create() {
    this.cursors = this.input.keyboard.addKeys("W,S,A,D");
    this.cameras.main.setBackgroundColor("#202733");

    // Inicializa grupos e sistemas
    this.enemies = this.physics.add.group();
    this.xpOrbs = this.physics.add.group({ classType: XPOrb, runChildUpdate: true });
    this.enemiesInAura = new Set();
    this.waveCount = 0;
    this.spawnAmount = 3;
    this.baseSpawnDelay = 3000;

    // Inicializa sistemas centrais
    this.upgradeSystem = new UpgradeSystem(this);
    this.classSystem = new ClassSystem(this);
    this.passiveSystem = new PassiveSystem(this);
    this.weaponSystem = new WeaponSystem(this);

    // Pausa física até escolher classe
    this.physics.pause();
    this.isGameStarted = false;

    // Abre menu de seleção de classe
    this.classSystem.openSelectionMenu((selectedClass) => {
      console.log(`Classe escolhida: ${selectedClass.name}`);
      this.startGame(selectedClass);
    });

    // Texto de debug
    this.add.text(10, 10, "CHAOS RUSH (DEBUG)", {
      fontSize: "16px",
      fill: "#ffffff"
    }).setScrollFactor(0);
  }

  startGame(selectedClass) {
    if (this.isGameStarted) return;
    this.isGameStarted = true;

    // Cria o player baseado na classe
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2, selectedClass);

    this.weaponSystem = new WeaponSystem(this, this.player);
    this.passiveSystem = new PassiveSystem(this, this.player);

    this.passiveSystem.applyPassive(selectedClass.passiveKey);

    this.time.addEvent({
      delay: 1200,
      loop: true,
      callback: () => this.weaponSystem.useWeapon(selectedClass.weaponKey)
    });

    // --- 🧩 APLICA ATRIBUTOS DA CLASSE ---
    if (selectedClass.moveSpeed) {
      this.player.speed *= (1 + selectedClass.moveSpeed); // multiplicativo, mais justo
    }
    if (selectedClass.damageMultiplier) {
      this.player.baseDamage *= selectedClass.damageMultiplier;
    }

    // Aplica passiva (⚡ ESSENCIAL)
    if (selectedClass.passive) {
      try {
        selectedClass.passive(this, this.player);
        console.log(`✅ Passiva aplicada: ${selectedClass.name}`);
      } catch (err) {
        console.warn(`⚠️ Erro ao aplicar passiva da classe ${selectedClass.name}:`, err);
      }
    }

    this.player.magnetRadius = 100;

    // Interface do jogador
    this.healthBarBG = this.add.rectangle(100, 20, 200, 20, 0x333333).setOrigin(0, 0).setScrollFactor(0);
    this.healthBar = this.add.rectangle(100, 20, 200, 20, 0xff0000).setOrigin(0, 0).setScrollFactor(0);

    this.xpBarBG = this.add.rectangle(100, 50, 200, 10, 0x222222).setOrigin(0, 0).setScrollFactor(0);
    this.xpBar = this.add.rectangle(100, 50, 0, 10, 0x6a00ff).setOrigin(0, 0).setScrollFactor(0);

    this.levelText = this.add.text(310, 35, `Lv ${this.player.level}`, {
      fontSize: "16px",
      fill: "#ffffff"
    }).setScrollFactor(0);

    this.updateHealthBar();
    this.updateXpBar();

    // Câmera segue o player
    this.cameras.main.startFollow(this.player);

    // Colisões e overlaps
    this.physics.add.overlap(this.player.aura, this.enemies, (aura, enemy) => {
      this.enemiesInAura.add(enemy);
    });
    this.physics.add.overlap(this.player, this.xpOrbs, this.handleXPCollect, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);

    // Dano da aura
    this.time.addEvent({
      delay: this.player.damageInterval || 200,
      callback: this.processAuraDamage,
      callbackScope: this,
      loop: true
    });

    // Retoma física e começa o jogo
    this.physics.resume();

    // Inicia a primeira wave
    this.time.delayedCall(1000, () => this.startWave(), [], this);

    console.log(`✅ Player inicializado como: ${selectedClass.name}`);
  }

  update() {
    if (!this.player || !this.isGameStarted) return;

    this.player.update(this.cursors);
    this.enemies.children.iterate((enemy) => enemy?.update(this.player));
    this.xpOrbs.children.iterate((orb) => orb?.update(this.player));

    this.updateHealthBar();
    this.updateXpBar();
  }

  // -------- SISTEMAS DE COMBATE / XP --------

  processAuraDamage() {
    this.enemiesInAura.forEach((enemy) => {
      if (enemy && enemy.active) enemy.takeDamage(this.player.baseDamage || 10);
    });
    this.enemiesInAura.clear();
  }

  handleXPCollect(playerSprite, orb) {
    if (!orb || orb.collected) return;
    orb.collected = true;
    const xpValue = orb.value || 10;
    this.player.gainXP(xpValue);
    this.showXPText(orb.x, orb.y, `+${xpValue} XP`);
    this.events.emit('pickupXP', orb);
    orb.destroy();
  }

  handlePlayerHit(player, enemy) {
    if (!player.lastHitTime || this.time.now - player.lastHitTime > 1000) {
      player.currentHP -= 10;
      this.updateHealthBar();
      player.setTint(0xff5555);
      this.time.delayedCall(150, () => player.clearTint());
      player.lastHitTime = this.time.now;
      if (player.currentHP <= 0) this.handlePlayerDeath();
    }
  }

  handlePlayerDeath() {
    this.physics.pause();
    this.player.setTint(0x000000);
    this.add.text(this.scale.width / 2, this.scale.height / 2, "💀 GAME OVER 💀", {
      fontSize: "48px",
      fill: "#ff0000",
      fontStyle: "bold"
    }).setOrigin(0.5);
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

  showXPText(x, y, text) {
    const xpText = this.add.text(x, y - 10, text, {
      fontSize: "16px",
      fill: "#00ffff",
      fontStyle: "bold",
      stroke: "#000",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(20).setAlpha(1);

    this.tweens.add({
      targets: xpText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => xpText.destroy()
    });
  }

  // -------- WAVES --------

  spawnEnemy() {
    const minDistance = (this.player.auraRange || 100) * 1.5;
    const screenMargin = 50;
    const width = this.scale.width;
    const height = this.scale.height;

    let x, y;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
      case 0: x = Phaser.Math.Between(-screenMargin, width + screenMargin); y = -screenMargin; break;
      case 1: x = Phaser.Math.Between(-screenMargin, width + screenMargin); y = height + screenMargin; break;
      case 2: x = -screenMargin; y = Phaser.Math.Between(-screenMargin, height + screenMargin); break;
      case 3: x = width + screenMargin; y = Phaser.Math.Between(-screenMargin, height + screenMargin); break;
    }

    const distance = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (distance < minDistance) {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, x, y);
      x = this.player.x + Math.cos(angle) * minDistance * 1.2;
      y = this.player.y + Math.sin(angle) * minDistance * 1.2;
    }

    const enemy = new Enemy(this, x, y);
    enemy.on("die", (ex, ey, value) => this.spawnXPOrb(ex, ey, value));
    this.enemies.add(enemy);
  }

  spawnXPOrb(x, y, value) {
    const orb = new XPOrb(this, x, y, value);
    this.xpOrbs.add(orb);
  }

  startWave() {
    if (!this.isGameStarted) return;

    for (let i = 0; i < this.spawnAmount; i++) {
      this.time.delayedCall(i * 200, this.spawnEnemy, [], this);
    }

    this.waveCount++;
    this.spawnAmount += 2;
    const nextDelay = this.baseSpawnDelay - this.waveCount * 500;
    this.time.addEvent({
      delay: nextDelay > 10000 ? nextDelay : 10000,
      callback: this.startWave,
      callbackScope: this,
      loop: false
    });
  }
}
