export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    this.scene = scene;
    this.speed = 200;

    // 🩸 Sistema de vida
    this.maxHP = 100;
    this.currentHP = this.maxHP;

    // ⚔️ Atributos de combate
    this.baseDamage = 5;
    this.damageInterval = 200;
    this.auraRange = 110;

    // 🧠 XP e Level
    this.level = 0;
    this.xp = 0;
    this.xpToNext = 10;

    // 🧍 Player base
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setTint(0x00ff00);

    // 🔵 Aura
    this.aura = scene.add.circle(this.x, this.y, this.auraRange, 0x00ffff, 0.15);
    scene.physics.add.existing(this.aura);
    this.aura.body.setCircle(this.auraRange);
    this.aura.body.setAllowGravity(false);
    this.aura.body.setImmovable(true);
    this.aura.body.isSensor = true;
  }
  openScene() {
    this.scene.upgradeSystem.open(this);
  }

  update(cursors) {
    if (this.scene.playerCanMove === false) return;
    this.body.setVelocity(0);

    if (cursors.W.isDown) this.body.setVelocityY(-this.speed);
    if (cursors.S.isDown) this.body.setVelocityY(this.speed);
    if (cursors.A.isDown) this.body.setVelocityX(-this.speed);
    if (cursors.D.isDown) this.body.setVelocityX(this.speed);

    this.body.velocity.normalize().scale(this.speed);

    this.aura.x = this.x;
    this.aura.y = this.y;
    
  }

  takeDamage(amount) {
    this.currentHP -= amount;

    this.scene.cameras.main.shake(100, 0.005);

    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    }

    if (this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  heal(amount) {
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    if (this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  die() {
    console.log("☠️ Player morreu!");
    this.scene.physics.pause();

    const gameOverText = this.scene.add.text(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      "GAME OVER",
      { fontSize: "48px", fill: "#ff4444", fontStyle: "bold" }
    ).setOrigin(0.5);

    this.scene.time.delayedCall(3000, () => {
      this.scene.scene.restart();
    });
  }

  gainXP(amount) {
    this.xp += amount;

    // Atualiza a barra de XP visualmente
    if (this.scene && this.scene.updateXpBar) {
      this.scene.updateXpBar();
    }
    // Checa se subiu de nível
    if (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

levelUp() {
  this.level++;
  this.xp -= this.xpToNext;
  this.xpToNext = Math.floor(this.xpToNext * 1.5);

  if (this.scene && this.scene.updateXpBar) {
    this.scene.updateXpBar();
    this.openScene();
  }
  

  console.log(`🔼 Level Up! Novo nível: ${this.level}`);
}

}
