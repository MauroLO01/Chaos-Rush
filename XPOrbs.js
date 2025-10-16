class XPOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value) {
    super(scene, x, y, 'xp_orb');

    this.scene = scene;
    this.value = value;
    this.attractionSpeed = 400;
    this.isCollected = false;

    this.attractionRadius = 150;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(5);
    this.setImmovable(false);
    this.setOrigin(0.5)
    this.setDepth(1);
  }

  update(player) {
    if (!player || this.isCollected) return;
    const distance = Phaser.Math.Distance.between(this.x, this.y, player.x, player.y)

    if (distance < this.attractionRadius) {
      this.scene.physics.moveToObject(
        this,
        player,
        this.attractionSpeed,
      );
      this.seiTint(0x00ff00);
    } else {
      this.body.setVelocity(0, 0);
      this.clearTint();
    }
  }

  Collect() {
    if (this.isCollected) return;
    this.isCollected = true;
    this.destroy();
  }
}

export default XPOrb
