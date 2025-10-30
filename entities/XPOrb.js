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

    this.baseX = x;
    this.baseY = y;

    this.floatAmpX = 6;
    this.floatAmpY = 4;
    this.floatSpeed = 0.0025;

    this.attractionsStrength = 300;
    this.maxAttraction = 500;
    this.collectDistance = 21;

    this.body.setDrag(100, 100);

    this._t0 = Phaser.Math.FloatBetween(0, Math.PI * 2);
  }

  update(player) {
    if (this.collected) return;
    if (!player) return;

    const px = player.sprite?.x ?? player.x;
    const py = player.sprite?.y ?? player.y;

    if (px == undefined || py == undefined) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);

    const magnetRadius = player.magnetRadius ?? 150;

    if (dist < magnetRadius) {
      this.body.stop();
      this.scene.physics.moveToObject(
        this,
        player,
        this.attractionsStrength
      );
      this.setTint(0x00ff00);
    } else {
      const t = this.scene.time.now * this.floatSpeed + this._t0;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);

      if (dist >= (player.magnetRadius ?? 150)) {
        const targetX = this.baseX + Math.cos(t) * this.floatAmpX;
        const targetY = this.baseY + Math.cos(t * 1.2) * this.floatAmpY;

        const dx = targetX - this.x;
        const dy = targetY - this.y;

        const followSpeed = 20;
        this.body.setVelocity(dx * followSpeed, dy * followSpeed);
      }
    }
  }
}
