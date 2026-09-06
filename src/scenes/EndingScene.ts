import Phaser from 'phaser';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../gameConfig';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create(): void {
    if (this.textures.exists('background-ending')) {
      this.add.image(0, 0, 'background-ending').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff4cf, 0.56).setOrigin(0);
    this.add.rectangle(0, GAME_HEIGHT - 112, GAME_WIDTH, 112, 0x537c54, 0.52).setOrigin(0);

    this.add.text(GAME_WIDTH / 2, 78, '서유기 완결', {
      color: '#8a4c16', fontSize: '22px', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, '불경과 깨달음의 귀환', {
      color: '#3d2600',
      fontSize: '43px',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.image(GAME_WIDTH / 2, 280, 'corn-wukong-clean-idle').setDisplaySize(142, 166);
    this.add.text(GAME_WIDTH / 2, 354, `손오공 · ${StageManager.getCompanions().join(' · ')}`, {
      color: '#6c3d12', fontSize: '20px', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(
      GAME_WIDTH / 2,
      399,
      '네 친구는 천축국의 불경을 고향에 전했습니다.\n옥수수손오공은 힘보다 책임, 혼자보다 우정이 더 크다는 것을 배웠어요.',
      {
        color: '#4b3200',
        fontSize: '21px',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: 760 }
      }
    ).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 485, '여행 지도로 돌아가기', {
      color: '#5b3900',
      fontSize: '20px',
      fontStyle: 'bold',
      backgroundColor: 'rgba(255,255,255,0.62)',
      padding: { x: 18, y: 9 }
    }).setOrigin(0.5).setInteractive();

    const goTitle = () => this.scene.start('TitleScene');
    this.input.keyboard?.once('keydown-ENTER', goTitle);
    this.input.once('pointerdown', goTitle);
  }
}
