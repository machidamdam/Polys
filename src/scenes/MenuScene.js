export default class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(0, 0, width, height, 0x0e1a2e).setOrigin(0, 0);

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height * 0.55);
      const a = Phaser.Math.FloatBetween(0.3, 1);
      this.add.rectangle(x, y, 2, 2, 0xffffff, a);
    }

    // Title
    this.add.text(width / 2, height * 0.25, 'POLYS', {
      fontFamily: 'monospace',
      fontSize: '56px',
      color: '#ffd700',
      stroke: '#7a4000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Une île à explorer', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#c8a850',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.52, '🌿', { fontSize: '48px' }).setOrigin(0.5);

    // Play button
    const btn = this.add.rectangle(width / 2, height * 0.70, 180, 50, 0xffd700).setInteractive();
    this.add.text(width / 2, height * 0.70, 'EXPLORER', {
      fontFamily: 'monospace', fontSize: '18px', color: '#1a0a2e',
    }).setOrigin(0.5);

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('IsoScene'));
    });

    this.cameras.main.fadeIn(400);
  }
}
