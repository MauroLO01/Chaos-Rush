export default class XPOrb extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, value = 10) {
    super(scene, x, y, "xp_orb");
    this.scene = scene;
    this.value = value;
    this.collected = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCircle(6);
    this.setTint(0x00ffff);
    this.setAlpha(0.9);
    this.body.setAllowGravity(false);

    // Behavior: flutuar levemente
    this.floatTimer = 0;
    this.baseY = y;
  }

  update(player) {
    // Movimiento leve (flutuação) quando não atraído
    this.floatTimer += this.scene.game.loop.delta / 1000;
    this.y = this.baseY + Math.sin(this.floatTimer * 2) * 4;

    // Atração por ímã do player
    if (player && player.magnetRadius) {
      const dist = Phaser.Math.Distance.Between(
        this.x,
        this.y,
        player.x,
        player.y
      );
      if (dist <= (player.magnetRadius || 120)) {
        // move em direção ao player
        this.scene.physics.moveToObject(this, player, 200);
      } else {
        // desacelera quando longe
        this.body.setVelocity(
          this.body.velocity.x * 0.95,
          this.body.velocity.y * 0.95
        );
      }
    }
  }
}
