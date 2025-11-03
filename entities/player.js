export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");
    this.scene = scene;
    this.speed = 200;

    // Vida
    this.maxHP = 100;
    this.currentHP = this.maxHP;

    // Combate / XP
    this.baseDamage = 5;
    this.damageInterval = 200;
    this.auraRange = 110;
    this.level = 0;
    this.xp = 0;
    this.xpToNext = 10;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setTint(0x00ff00);

    // Aura (criada imediatamente para evitar overlaps undefined)
    this.aura = scene.add.circle(
      this.x,
      this.y,
      this.auraRange,
      0x00ffff,
      0.15
    );
    scene.physics.add.existing(this.aura);
    if (this.aura.body) {
      this.aura.body.setAllowGravity(false);
      this.aura.body.setImmovable(true);
      try {
        this.aura.body.setCircle(this.auraRange);
      } catch (e) {
        /* safe */
      }
      this.aura.body.isSensor = true;
    }
  }

  update(cursors) {
    if (this.scene.playerCanMove === false) return;
    this.body.setVelocity(0);

    if (cursors.W.isDown) this.body.setVelocityY(-this.speed);
    if (cursors.S.isDown) this.body.setVelocityY(this.speed);
    if (cursors.A.isDown) this.body.setVelocityX(-this.speed);
    if (cursors.D.isDown) this.body.setVelocityX(this.speed);

    this.body.velocity.normalize().scale(this.speed);

    // aura segue jogador
    if (this.aura) {
      this.aura.x = this.x;
      this.aura.y = this.y;
    }
  }

  gainXP(amount) {
    this.xp += amount;
    if (this.level === 0) this.xpToNext = 10;
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    if (this.xp >= this.xpToNext) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);
    if (this.scene && this.scene.updateXpBar) this.scene.updateXpBar();
    // chame o upgrade system com pequeno delay para evitar conflito de tweens
    this.scene.time.delayedCall(
      200,
      () => {
        if (this.scene.upgradeSystem) this.scene.upgradeSystem.open(this);
      },
      [],
      this
    );
  }

  takeDamage(amount) {
    this.currentHP -= amount;
    this.scene.cameras.main.shake(100, 0.005);
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    }
    if (this.scene && this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  heal(amount) {
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    if (this.scene && this.scene.updateHealthBar) this.scene.updateHealthBar();
  }

  die() {
    this.scene.physics.pause();
    this.setTint(0x000000);
    this.scene.add
      .text(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        "GAME OVER",
        { fontSize: "48px", fill: "#ff4444" }
      )
      .setOrigin(0.5);
    this.scene.time.delayedCall(3000, () => this.scene.scene.restart());
  }
}
