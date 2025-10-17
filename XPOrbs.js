export default class XPOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value = 10) {
    super(scene, x, y, 'xp_orb');

    this.scene = scene;
    this.value = value;
    this.collected = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(6);
    this.setTint(0x00ffff);
    this.setAlpha(0.9);
    this.body.setAllowGravity(false);
  }

  update(player) {
    if (!player || this.collected) return;

    const px = player.sprite?.x ?? player.x;
    const py = player.sprite?.y ?? player.y;
    if (px === undefined || py === undefined) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);

    // 🧲 Dentro do raio magnético
    if (dist < player.magnetRadius) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, px, py);
      this.scene.physics.velocityFromRotation(angle, 200, this.body.velocity);
    } else {
      this.body.setVelocity(0);
    }
  }
}
