export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "enemy");
    this.scene = scene;
    this.speed = 70;
    this.hp = 50;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setTint(0xff3333);
    this.setCircle(10);
    this.setCollideWorldBounds(true);
  }

  update(player) {
    if (!player) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.scene.physics.velocityFromRotation(
      angle,
      this.speed,
      this.body.velocity
    );
    // moveToObject opcional: já usamos velocityFromRotation
  }

  takeDamage(dmg) {
    this.hp -= dmg;
    this.flashDamage();
    if (this.hp <= 0) {
      this.emit("die", this.x, this.y, Phaser.Math.Between(5, 15));
      this.destroy();
    }
  }

  flashDamage() {
    this.setTint(0xffffff);
    this.scene.time.delayedCall(
      100,
      () => {
        this.setTint(0xff3333);
      },
      [],
      this
    );
  }
}
