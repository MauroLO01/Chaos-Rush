export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player');

    this.scene = scene;
    this.speed = 200;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;

    // NOVAS PROPRIEDADES DE COMBATE (Para o sistema de DPS)
    this.baseDamage = 5;      // Dano aplicado por 'tick'
    this.damageInterval = 200; // Tick a cada 200ms (5x por segundo)
    this.auraRange = 100;      // Raio da aura (para upgrades futuros)

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setSize(20, 20); // hitbox
    this.setTint(0x00ff00);

    // Configuração da Aura
    this.aura = scene.add.circle(this.x, this.y, this.auraRange, 0x00ffff, 0.15);
    scene.physics.add.existing(this.aura);

    // CORREÇÃO CRÍTICA: Garantir que o corpo de física esteja habilitado e configurado
    this.aura.body.setCircle(this.auraRange);
    this.aura.body.setAllowGravity(false);
    this.aura.body.setImmovable(true);
    this.aura.body.isSensor = true; // MELHORIA: A aura deve ser apenas um sensor
  }

  update(cursors) {
    this.body.setVelocity(0);
    // ... lógica de movimento ...

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
    if (this.xp >= this.xpToNext) this.levelUp();
  }

  levelUp() {
    this.level++;
    this.xp -= this.xpToNext;
    this.xpToNext = Math.floor(this.xpToNext * 1.3);

    console.log(`🔥 Subiu para o nível ${this.level}!`);
    this.scene.upgradeSystem.open(this);
  }
}