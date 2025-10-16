import MainScene from '../Chaos rush/src/scenes/MainScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#111',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [MainScene],
};

new Phaser.Game(config);
