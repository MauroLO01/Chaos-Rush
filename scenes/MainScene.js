import Player from "../entities/player.js";
import Enemy from "../entities/enemy.js";
import XPOrb from "../entities/XPOrb.js";
import UpgradeSystem from "../systems/UpgradeSystem.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Gerar texturas simples com Graphics (garante que existam)
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

    // Player
    this.player = new Player(this, this.scale.width / 2, this.scale.height / 2);
    this.player.magnetRadius = 100;

    // Inicializa o sistema de upgrades (deve existir antes do levelUp)
    this.upgradeSystem = new UpgradeSystem(this);

    // BARRA DE VIDA
    this.healthBarBG = this.add
      .rectangle(100, 20, 200, 20, 0x333333)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.healthBar = this.add
      .rectangle(100, 20, 200, 20, 0xff0000)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    // BARRA DE XP
    this.xpBarBG = this.add
      .rectangle(100, 50, 200, 10, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0);
    this.xpBar = this.add
      .rectangle(100, 50, 0, 10, 0x6a00ff)
      .setOrigin(0, 0)
      .setScrollFactor(0);

    this.levelText = this.add
      .text(310, 35, `Lv ${this.player.level}`, {
        fontSize: "16px",
        fill: "#ffffff",
      })
      .setScrollFactor(0);

    this.updateHealthBar();
    this.updateXpBar();

    // INIMIGOS
    this.enemies = this.physics.add.group();
    this.waveCount = 0;
    this.baseSpawnDelay = 3000;
    this.spawnAmount = 3;

    // XP Orbs
    this.xpOrbs = this.physics.add.group({
      classType: XPOrb,
      runChildUpdate: true,
    });

    this.enemiesInAura = new Set();

    // Colisões — só cria overlap se a aura existir
    if (this.player && this.player.aura) {
      this.physics.add.overlap(
        this.player.aura,
        this.enemies,
        (aura, enemy) => {
          if (enemy && enemy.active) this.enemiesInAura.add(enemy);
        },
        null,
        this
      );
    } else {
      console.warn("Player.aura ainda não definido — overlap adiado.");
    }

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
      loop: true,
    });

    // Dano ao tocar inimigo
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      null,
      this
    );

    // Primeira onda (com atraso)
    this.time.delayedCall(1000, () => this.startWave(), [], this);

    this.cameras.main.setBackgroundColor("#202733");

    // DEBUG: mostra que a cena carregou
    console.log("MainScene criada OK");
    this.add
      .text(10, 10, "CHAOS RUSH (DEBUG)", { fontSize: "16px", fill: "#ffffff" })
      .setScrollFactor(0);
  }

  update() {
    this.player.update(this.cursors);
    this.enemies.children.iterate((enemy) => enemy?.update(this.player));
    this.xpOrbs.children.iterate((orb) => orb?.update(this.player));

    this.updateHealthBar();
    this.updateXpBar();
  }

  spawnEnemy() {
    const minDistance = (this.player.auraRange || 100) * 1.5;
    const screenMargin = 50;
    const width = this.scale.width;
    const height = this.scale.height;

    let x, y;
    const side = Phaser.Math.Between(0, 3);
    switch (side) {
      case 0:
        x = Phaser.Math.Between(-screenMargin, width + screenMargin);
        y = -screenMargin;
        break;
      case 1:
        x = Phaser.Math.Between(-screenMargin, width + screenMargin);
        y = height + screenMargin;
        break;
      case 2:
        x = -screenMargin;
        y = Phaser.Math.Between(-screenMargin, height + screenMargin);
        break;
      case 3:
        x = width + screenMargin;
        y = Phaser.Math.Between(-screenMargin, height + screenMargin);
        break;
    }

    const distance = Phaser.Math.Distance.Between(
      x,
      y,
      this.player.x,
      this.player.y
    );
    if (distance < minDistance) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        x,
        y
      );
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
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "💀 GAME OVER 💀", {
        fontSize: "48px",
        fill: "#ff0000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    console.log("☠️ O jogador morreu!");
  }

  showXPText(x, y, text) {
    const xpText = this.add
      .text(x, y - 10, text, {
        fontSize: "16px",
        fill: "#00ffff",
        fontStyle: "bold",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(1);

    this.tweens.add({
      targets: xpText,
      scale: { from: 1.3, to: 1 },
      duration: 150,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: xpText,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeOut",
      delay: 150,
      onComplete: () => xpText.destroy(),
    });
  }

  startWave() {
    console.log(
      `Iniciando nova onda ${this.waveCount}: ${this.spawnAmount} inimigos.`
    );
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
      loop: false,
    });
  }

  updateHealthBar() {
    const hpPercent = Phaser.Math.Clamp(
      this.player.currentHP / this.player.maxHP,
      0,
      1
    );
    this.healthBar.width = 200 * hpPercent;
  }

  updateXpBar() {
    const xpPercent = Phaser.Math.Clamp(
      this.player.xp / this.player.xpToNext,
      0,
      1
    );
    this.xpBar.width = 200 * xpPercent;
    this.levelText.setText(`Lv ${this.player.level}`);
  }
}
