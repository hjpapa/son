import Phaser from 'phaser';

export class MudMonster extends Phaser.Physics.Arcade.Sprite {
  private direction: -1 | 1 = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly patrolLeft: number,
    private readonly patrolRight: number
  ) {
    super(scene, x, y, 'mud-monster');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(4);
    this.setBounce(0.05);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(68, 42);
    body.setOffset(14, 24);
    body.setCollideWorldBounds(false);
  }

  update(): void {
    if (!this.active) {
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityX(70 * this.direction);

    if (this.x <= this.patrolLeft) {
      this.direction = 1;
    } else if (this.x >= this.patrolRight) {
      this.direction = -1;
    }

    this.setFlipX(this.direction > 0);
  }

  defeat(): void {
    if (!this.active) {
      return;
    }

    this.disableBody(true, true);
    this.scene.add
      .text(this.x, this.y - 40, '퍽!', {
        color: '#5c3400',
        fontSize: '22px',
        fontStyle: 'bold'
      })
      .setOrigin(0.5)
      .setDepth(20);
  }
}
