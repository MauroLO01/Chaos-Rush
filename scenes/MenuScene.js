export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    preload() {

    }

    create() {
        this.cameras.main.setBackgroundColor('#000000');

        this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, "CHAOS RUSH", {
            fontSize: '48px',
            fill: '#00ffff',
            fontStyle: 'bold'
        }). setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 50, "Fractured Realms", {
            fontSize: '24px',
            fill: "#ffffff",
        }).setOrigin(0.5)
          .setDepth(100);

        const startText = this.add.text(this.scale.width / 2, this.scale.height / 2, "PRESSIONE PARA INICIAR", {
            fontSize: '32px',
            fill: '#ff4500'
        }).setOrigin(0.5)
           .setDepth(100);

        this.tweens.add({
            targets: startText,
            alpha: 0.2,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        this.input.keyboard.once('keydown-ENTER', this.startGame, this);
    }

    startGame() {
        this.scene.start('MainScene');
        this.scene.stop('MenuScene');
    }
}