export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy');

        this.scene = scene;
        this.speed = 70;
        this.hp = 50; // Vida base

        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Ajuste: setTint é a cor base, 0xff3333 é um bom vermelho
        this.setTint(0xff3333);

        // Configuração do Corpo de Física
        this.setCircle(10);
        this.setCollideWorldBounds(true);
    }

    update(player) {
        if (!player) return;

        const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        this.scene.physics.moveToObject(
            this,
            player,
            this.speed
        );
    }

    takeDamage(dmg) {
        this.hp -= dmg;

        // Feedback Visual
        this.flashDamage();

        if (this.hp <= 0) {
            this.emit('die', this.x, this.y, Phaser.Math.Between(5, 15));
            this.destroy();
        }
    }

    flashDamage() {
        this.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            this.setTint(0xff3333);
        }, [], this);
    }
}
