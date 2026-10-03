import Phaser from 'phaser';
import { Music } from '../audio/Music';
import { Sfx } from '../audio/Sfx';
import { StageManager } from '../game/StageManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';
import { createButton } from '../ui/Button';
import { companionTextures } from '../game/data/companions';
import { addCoverBackground } from '../ui/background';

const closingWords = '네 친구는 천축국의 불경을 고향에 전했어요. 옥수수손오공은 힘보다 책임, 혼자보다 우정이 더 크다는 것을 배웠어요.';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create(): void {
    if (this.textures.exists('background-ending')) {
      addCoverBackground(this, 'background-ending');
    }
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xfff4cf, 0.5).setOrigin(0);
    Sfx.clear();
    Music.play('finale');

    this.add.text(GAME_WIDTH / 2, 50, '서유기 완결', { color: '#8a4c16', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5);
    const title = this.add.text(GAME_WIDTH / 2, 100, '불경과 깨달음의 귀환', {
      color: '#3d2600', fontSize: '46px', fontStyle: 'bold', stroke: '#fff7d6', strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: { from: 0.8, to: 1 }, duration: 700, ease: 'Back.easeOut' });

    // The whole party, side by side at the end of the road.
    const party = ['corn-wukong-clean-idle', ...StageManager.getCompanions().map((name) => companionTextures[name])];
    party.forEach((key, index) => {
      const x = GAME_WIDTH / 2 + (index - (party.length - 1) / 2) * 130;
      const member = this.add.image(x, 300, key).setOrigin(0.5, 1);
      member.setScale(140 / member.height);
      this.tweens.add({ targets: member, y: member.y - 10, duration: 500, delay: index * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.add.text(GAME_WIDTH / 2, 326, ['손오공', ...StageManager.getCompanions()].join(' · '), {
      color: '#6c3d12', fontSize: '22px', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 386, closingWords, {
      color: '#4b3200',
      fontSize: '22px',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 760 }
    }).setOrigin(0.5);

    // Ignore taps for a moment so the closing dialogue's last tap does not skip the ending.
    let ready = false;
    this.time.delayedCall(1500, () => {
      ready = true;
    });
    const goTitle = () => {
      if (!ready) return;
      this.scene.start('TitleScene');
    };
    createButton(this, GAME_WIDTH / 2, 482, '처음 화면으로', goTitle, { width: 260, primary: true });
    this.input.keyboard?.on('keydown-ENTER', goTitle);
  }
}
