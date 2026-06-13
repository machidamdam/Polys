export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width, height } = this.scale;

    // Gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x0d2a5e, 0x0d2a5e, 1);
    bg.fillRect(0, 0, width, height);

    // Stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height * 0.6);
      const s = Phaser.Math.FloatBetween(1, 3);
      this.add.rectangle(x, y, s, s, 0xffffff, Phaser.Math.FloatBetween(0.4, 1));
    }

    // Title
    this.add.text(width / 2, height * 0.22, 'POLYS', {
      fontFamily: 'monospace',
      fontSize: '52px',
      color: '#ffd700',
      stroke: '#8b4a00',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.35, 'Cité des Dieux', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#c8a850',
    }).setOrigin(0.5);

    // Lightning decoration
    this.add.text(width / 2, height * 0.48, '⚡', {
      fontSize: '40px',
    }).setOrigin(0.5);

    // Play button
    const btnY = height * 0.65;
    const btn = this.add.rectangle(width / 2, btnY, 200, 52, 0xffd700).setInteractive();
    this.add.text(width / 2, btnY, 'JOUER', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#1a0a2e',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0xffe44a));
    btn.on('pointerout', () => btn.setFillStyle(0xffd700));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('GameScene'));
    });

    // Version
    this.add.text(width / 2, height - 20, 'v0.1 - Zeus Pixel Art', {
      fontFamily: 'monospace', fontSize: '10px', color: '#444488',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(600);
  }
}
