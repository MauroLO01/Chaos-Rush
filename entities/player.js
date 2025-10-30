export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    this.scene = scene;
    this.speed = 200;

    this.level = 0;
    this.xp = 0;
    this.xpToNext = 10;

    this.baseDamage = 5;      // Dano aplicado por 'tick'
    this.damageInterval = 200; // Tick a cada 200ms (5x por segundo)
    this.auraRange = 110;      // Raio da aura (para upgrades futuros)

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20);
    this.setTint(0x00ff00);

    this.aura = scene.add.circle(this.x, this.y, this.auraRange, 0x00ffff, 0.15);
    scene.physics.add.existing(this.aura);

    this.aura.body.setCircle(this.auraRange);
    this.aura.body.setAllowGravity(false);
    this.aura.body.setImmovable(true);
    this.aura.body.isSensor = true; 
  }

  update(cursors) {
    if (this.scene.playerCanMove === false) return;
    this.body.setVelocity(0);

    if (cursors.W.isDown) this.body.setVelocityY(-this.speed);
    if (cursors.S.isDown) this.body.setVelocityY(this.speed);
    if (cursors.A.isDown) this.body.setVelocityX(-this.speed);
    if (cursors.D.isDown) this.body.setVelocityX(this.speed);

    this.body.velocity.normalize().scale(this.speed);

    // A aura segue o player
    this.aura.x = this.x;
    this.aura.y = this.y;
  }

  gainXP(amount) {
    this.xp += amount;
    if (this.level === 0) {
      this.xpToNext = 10;
    }

    if (this.xp >= this.xpToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.5);

    console.log(`🔥 Subiu para o nível ${this.level}! XP restante: ${this.xp}. Próximo XP: ${this.xpToNext}`);
    this.scene.upgradeSystem.open(this);
  }
}