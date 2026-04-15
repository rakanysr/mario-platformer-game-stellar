// =============================================================
// GameOverScene.js — Submit Skor ke Soroban + Hasil Akhir
// =============================================================
import Phaser from 'phaser';
import { submitScore } from '../stellar/contract.js';

const ACHIEVEMENT_NAMES = [
  { id: 0, icon: '🌟', name: 'First Step',      desc: 'Selesaikan level pertama' },
  { id: 1, icon: '💰', name: 'Coin Collector',  desc: 'Kumpulkan 100 koin total' },
  { id: 2, icon: '⚡', name: 'Speedrunner',     desc: 'Selesaikan dalam 60 detik' },
  { id: 3, icon: '💎', name: 'Perfectionist',   desc: 'Selesaikan tanpa mati' },
  { id: 4, icon: '🗺️', name: 'Explorer',        desc: 'Selesaikan level 5+' },
];

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.success     = data.success     ?? false;
    this.score       = data.score       ?? 0;
    this.coins       = data.coins       ?? 0;
    this.level       = data.level       ?? 1;
    this.timeSeconds = data.timeSeconds ?? 0;
    this.noDeath     = data.noDeath     ?? false;
    this.walletAddress = data.walletAddress || null;
    this.playerData  = data.playerData  || null;
    this.submitted   = false;
    this.newAchievements = [];
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.fadeIn(500);

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f0c29, 0x0f0c29, this.success ? 0x1a4731 : 0x4a1010, this.success ? 0x1a4731 : 0x4a1010, 1);
    bg.fillRect(0, 0, W, H);

    // Stars bg
    for (let i = 0; i < 60; i++) {
      const star = this.add.graphics();
      star.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.1, 0.6));
      star.fillCircle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), Phaser.Math.FloatBetween(0.5, 2));
    }

    // Title
    const titleText = this.success ? '🎉 LEVEL CLEAR!' : '💀 GAME OVER';
    const titleColor = this.success ? '#68d391' : '#fc8181';

    this.add.text(W / 2, 55, titleText, {
      fontFamily: "'Press Start 2P'",
      fontSize: '28px',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 10, fill: true },
    }).setOrigin(0.5);

    // Stars animation (hanya kalau berhasil)
    if (this.success) {
      this.createVictoryParticles();
    }

    // Stats panel
    this.createStatsPanel();

    // On-chain submission
    if (this.success && this.walletAddress) {
      this.submitToBlockchain();
    } else if (this.success && !this.walletAddress) {
      this.add.text(W / 2, 290, '⚠️ Connect wallet untuk simpan skor!', {
        fontFamily: "'Press Start 2P'",
        fontSize: '8px',
        color: '#f6e05e',
      }).setOrigin(0.5);
    }

    // Buttons
    this.createButtons();
  }

  createStatsPanel() {
    const W = this.scale.width;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.5);
    panel.fillRoundedRect(W / 2 - 210, 100, 420, 160, 14);
    panel.lineStyle(1, this.success ? 0x68d391 : 0xfc8181, 0.6);
    panel.strokeRoundedRect(W / 2 - 210, 100, 420, 160, 14);

    const stats = [
      { label: 'SCORE',    value: this.score.toLocaleString(),          icon: '🏆' },
      { label: 'COINS',    value: this.coins,                           icon: '💰' },
      { label: 'LEVEL',    value: this.level,                           icon: '📍' },
      { label: 'TIME',     value: `${this.timeSeconds}s`,               icon: '⏱' },
      { label: 'NO DEATH', value: this.noDeath ? 'YES ✓' : 'NO',        icon: '💎' },
    ];

    stats.forEach((stat, i) => {
      const x = i % 2 === 0 ? W / 2 - 150 : W / 2 + 50;
      const y = 120 + Math.floor(i / 2) * 42 + (i === 4 ? 0 : 0);

      if (i === 4) {
        // Item terakhir di tengah
        this.add.text(W / 2, 200, `${stat.icon} ${stat.label}: ${stat.value}`, {
          fontFamily: "'Press Start 2P'",
          fontSize: '10px',
          color: this.noDeath ? '#68d391' : '#fc8181',
        }).setOrigin(0.5);
        return;
      }

      this.add.text(x, y, `${stat.icon} ${stat.label}`, {
        fontFamily: "'Press Start 2P'",
        fontSize: '8px',
        color: '#a0aec0',
      });
      this.add.text(x, y + 16, String(stat.value), {
        fontFamily: "'Press Start 2P'",
        fontSize: '12px',
        color: '#ffffff',
      });
    });
  }

  async submitToBlockchain() {
    const W = this.scale.width;

    const statusText = this.add.text(W / 2, 290, '⏳ Menyimpan skor ke Stellar...', {
      fontFamily: "'Press Start 2P'",
      fontSize: '8px',
      color: '#a78bfa',
      backgroundColor: '#00000099',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5);

    // Animasi dots
    let dots = 0;
    const dotTimer = this.time.addEvent({
      delay: 500,
      repeat: -1,
      callback: () => {
        dots = (dots + 1) % 4;
        statusText.setText('⏳ Menyimpan skor ke Stellar' + '.'.repeat(dots));
      },
    });

    try {
      await submitScore(
        this.walletAddress,
        this.level,
        this.score,
        this.coins,
        this.timeSeconds,
        this.noDeath
      );

      dotTimer.destroy();
      statusText.setText('✅ Skor tersimpan on-chain!');
      statusText.setColor('#68d391');
      this.submitted = true;

      // Tampilkan transaction hash badge
      this.add.text(W / 2, 315, '🔗 Lihat di Stellar Explorer', {
        fontFamily: "'Press Start 2P'",
        fontSize: '7px',
        color: '#63b3ed',
        backgroundColor: '#00000099',
        padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          window.open(`https://stellar.expert/explorer/testnet`, '_blank');
        });
    } catch (err) {
      dotTimer.destroy();
      console.error('[GameOver] Submit error:', err);
      statusText.setText('⚠️ Gagal simpan (contract belum deploy?)');
      statusText.setColor('#f6e05e');
    }
  }

  createVictoryParticles() {
    const W = this.scale.width;
    const colors = [0xf6e05e, 0x68d391, 0x63b3ed, 0xe879f9, 0xfc8181];

    for (let i = 0; i < 30; i++) {
      const p = this.add.graphics();
      p.fillStyle(colors[i % colors.length], 1);
      p.fillCircle(0, 0, 5);
      p.x = Phaser.Math.Between(0, W);
      p.y = -20;

      this.tweens.add({
        targets: p,
        y: Phaser.Math.Between(100, 500),
        x: p.x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        angle: Phaser.Math.Between(0, 720),
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 1500),
        ease: 'Power1',
        onComplete: () => p.destroy(),
      });
    }
  }

  createButtons() {
    const W = this.scale.width;
    const H = this.scale.height;

    // PLAY AGAIN
    const retryBtn = this.createButton(W / 2 - 150, H - 80, '▶ PLAY AGAIN', 0x7c3aed);
    retryBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', {
          walletAddress: this.walletAddress,
          playerData: this.playerData,
          level: this.success ? this.level + 1 : this.level,
        });
      });
    });

    // MENU
    const menuBtn = this.createButton(W / 2 + 150, H - 80, '🏠 MENU', 0x2d3748);
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    // Next level btn (jika menang)
    if (this.success) {
      const nextBtn = this.createButton(W / 2, H - 130, `⭐ LEVEL ${this.level + 1} →`, 0xd97706);
      nextBtn.on('pointerdown', () => {
        this.cameras.main.fadeOut(300);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('GameScene', {
            walletAddress: this.walletAddress,
            playerData: this.playerData,
            level: this.level + 1,
          });
        });
      });
    }
  }

  createButton(x, y, label, color) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-110, -18, 220, 36, 10);

    const text = this.add.text(0, 0, label, {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(220, 36).setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 100 });
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    return container;
  }
}
