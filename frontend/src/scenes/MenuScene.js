// =============================================================
// MenuScene.js — Main Menu + Leaderboard + Wallet Connect
// =============================================================
import Phaser from 'phaser';
import { connectWallet, getWalletAddress, getIsConnected, diagnoseWallet } from '../stellar/wallet.js';
import { getLeaderboard, getPlayer, isRegistered, registerPlayer, runDiagnostics, CONTRACT_ID, RPC_URL } from '../stellar/contract.js';

const ACHIEVEMENT_NAMES = [
  '🌟 First Step',
  '💰 Coin Collector',
  '⚡ Speedrunner',
  '💎 Perfectionist',
  '🗺️ Explorer',
];

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.walletAddress = null;
    this.playerData = null;
    this.leaderboard = [];
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Debug info
    console.log('%c🎮 MENU SCENE LOADED', 'color: #7c3aed; font-size: 14px; font-weight: bold');
    console.log('Running diagnostics...');
    diagnoseWallet().catch(console.error);
    runDiagnostics().catch(console.error);

    // ── Background gradient (stars) ──
    this.createBackground();

    // ── Title ──
    this.add.text(W / 2, 55, '⭐ STELLAR MARIO', {
      fontFamily: "'Press Start 2P'",
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#7c3aed',
      strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#1a0a3d', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(W / 2, 88, 'BLOCKCHAIN PLATFORMER', {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color: '#a78bfa',
    }).setOrigin(0.5);

    // ── CONTRACT INFO (DEBUG) ──
    const contractDisplay = `Contract: ${CONTRACT_ID.slice(0, 12)}...${CONTRACT_ID.slice(-4)}`;
    this.add.text(W / 2, 108, contractDisplay, {
      fontFamily: 'monospace',
      fontSize: '7px',
      color: '#888888',
    }).setOrigin(0.5);

    // ── PLAY BUTTON ──
    this.playBtn = this.createButton(W / 2, 160, '▶  PLAY GAME', 0x7c3aed, 0x5b21b6);
    this.playBtn.on('pointerdown', () => this.startGame());

    // ── CONNECT WALLET BUTTON ──
    this.walletBtn = this.createButton(W / 2, 220, '🔗 CONNECT WALLET', 0x0891b2, 0x0e7490);
    this.walletBtn.on('pointerdown', () => this.handleWalletConnect());

    // ── LEADERBOARD panel ──
    this.createLeaderboardPanel();

    // ── Player info panel ──
    this.playerPanel = this.add.container(W - 220, 150);
    this.createPlayerPanel();

    // ── Listen untuk event wallet connected dari luar Phaser ──
    this.game.events.on('walletConnected', (address) => {
      this.handleWalletConnected(address);
    });

    // Jika sudah connected sebelumnya
    if (getIsConnected()) {
      this.handleWalletConnected(getWalletAddress());
    }

    // Load leaderboard awal
    this.loadLeaderboard();

    // Animasi floating player sprite di menu
    this.createMenuPlayer();
  }

  createBackground() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x24243e, 1);
    bg.fillRect(0, 0, W, H);

    // Ground strip
    const ground = this.add.graphics();
    ground.fillStyle(0x1a472a);
    ground.fillRect(0, H - 60, W, 60);
    ground.fillStyle(0x2d6a4f);
    ground.fillRect(0, H - 60, W, 15);

    // Stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H - 100);
      const size = Phaser.Math.FloatBetween(0.5, 2.5);
      const star = this.add.graphics();
      star.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      star.fillCircle(x, y, size);

      // Twinkle
      this.tweens.add({
        targets: star,
        alpha: 0.1,
        duration: Phaser.Math.Between(1000, 3000),
        ease: 'Sine.InOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Clouds
    for (let i = 0; i < 4; i++) {
      this.createCloud(Phaser.Math.Between(50, W - 50), Phaser.Math.Between(80, 200));
    }
  }

  createCloud(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.12);
    g.fillEllipse(x, y, 100, 40);
    g.fillEllipse(x + 30, y - 15, 70, 35);
    g.fillEllipse(x - 20, y - 10, 60, 30);

    this.tweens.add({
      targets: g,
      x: g.x + 30,
      duration: Phaser.Math.Between(8000, 15000),
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  createButton(x, y, label, colorNormal, colorHover) {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(colorNormal, 1);
    bg.fillRoundedRect(-135, -22, 270, 44, 12);
    bg.lineStyle(2, 0xffffff, 0.3);
    bg.strokeRoundedRect(-135, -22, 270, 44, 12);

    const text = this.add.text(0, 0, label, {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#ffffff',
    }).setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(270, 44);
    container.setInteractive();

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(colorHover, 1);
      bg.fillRoundedRect(-135, -22, 270, 44, 12);
      bg.lineStyle(2, 0xffffff, 0.5);
      bg.strokeRoundedRect(-135, -22, 270, 44, 12);
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(colorNormal, 1);
      bg.fillRoundedRect(-135, -22, 270, 44, 12);
      bg.lineStyle(2, 0xffffff, 0.3);
      bg.strokeRoundedRect(-135, -22, 270, 44, 12);
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });

    return container;
  }

  createLeaderboardPanel() {
    const W = this.scale.width;

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(20, 280, 380, 190, 12);
    panel.lineStyle(1, 0x7c3aed, 0.6);
    panel.strokeRoundedRect(20, 280, 380, 190, 12);

    this.add.text(40, 294, '🏆 LEADERBOARD', {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color: '#f6e05e',
    });

    this.leaderboardTexts = [];
    for (let i = 0; i < 5; i++) {
      const t = this.add.text(40, 320 + i * 28, `${i + 1}. ---`, {
        fontFamily: "'Press Start 2P'",
        fontSize: '8px',
        color: '#a0aec0',
      });
      this.leaderboardTexts.push(t);
    }
  }

  createPlayerPanel() {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(-100, -20, 200, 170, 12);
    g.lineStyle(1, 0x0891b2, 0.6);
    g.strokeRoundedRect(-100, -20, 200, 170, 12);

    this.playerPanelTitle = this.add.text(0, -6, 'YOUR STATS', {
      fontFamily: "'Press Start 2P'",
      fontSize: '8px',
      color: '#63b3ed',
    }).setOrigin(0.5);

    this.playerStatusText = this.add.text(0, 20, 'Connect wallet\nto see stats', {
      fontFamily: "'Press Start 2P'",
      fontSize: '7px',
      color: '#718096',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    this.playerPanel.add([g, this.playerPanelTitle, this.playerStatusText]);
  }

  createMenuPlayer() {
    // Sprite karakter mengambang di menu
    const player = this.add.image(680, 300, 'player_idle');
    player.setScale(3);

    this.tweens.add({
      targets: player,
      y: 285,
      duration: 1200,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    // Coin berputar
    const coin = this.add.image(720, 260, 'coin');
    coin.setScale(2);
    this.tweens.add({
      targets: coin,
      angle: 360,
      duration: 1000,
      repeat: -1,
    });
  }

  async handleWalletConnect() {
    try {
      const address = await connectWallet();
      this.handleWalletConnected(address);
    } catch (err) {
      this.showNotification(`❌ ${err.message}`, '#fc8181');
    }
  }

  async handleWalletConnected(address) {
    this.walletAddress = address;
    const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    // Update tombol wallet
    const walletBtnText = this.walletBtn.list[1];
    walletBtnText.setText(`✅ ${shortAddr}`);

    this.showNotification('✅ Wallet Connected!', '#68d391');

    // Load data pemain
    await this.loadPlayerData(address);
    await this.loadLeaderboard();
  }

  async loadPlayerData(address) {
    try {
      const registered = await isRegistered(address);

      if (!registered) {
        // Minta nama pemain
        const name = prompt('Masukkan nama pemain kamu (maks 20 karakter):') || 'Anonymous';
        await registerPlayer(address, name.slice(0, 20));
        this.showNotification('🎉 Player terdaftar!', '#68d391');
      }

      this.playerData = await getPlayer(address);
      this.updatePlayerPanel();
    } catch (err) {
      console.error('[Menu] Contract error:', err.message);
      console.error('[Menu] Full error stack:', err);
      console.error('[Menu] Error details:', {
        name: err.name,
        message: err.message,
        toString: String(err),
      });

      // ── Offline mode: tampilkan info wallet tanpa data on-chain ──
      const shortAddr = `${address.slice(0, 4)}...${address.slice(-4)}`;
      this.playerData = null;
      
      // Parse error untuk UI
      const errorMsg = String(err.message || err);
      let errorDetail = 'Contract Error';
      
      if (errorMsg.includes('offchain') || errorMsg.includes('RPC') || errorMsg.includes('fetch')) {
        errorDetail = '❌ RPC Issue';
      } else if (errorMsg.includes('CONTRACT ID') || errorMsg.includes('contract not found')) {
        errorDetail = '❌ Invalid Contract ID';
      } else if (errorMsg.includes('not found') || errorMsg.includes('404')) {
        errorDetail = '❌ Contract Not Found';
      } else if (errorMsg.includes('simulation')) {
        errorDetail = '⚠️ Simulation Failed';
      }
      
      this.playerStatusText.setText(
        `${shortAddr}\n\nMode Offline\n${errorDetail}`,
      );
      this.playerStatusText.setColor('#f6ad55');
      this.playerStatusText.setLineSpacing(6);
      
      // Tampilkan full error message
      const notifMsg = errorMsg.length > 50 
        ? errorMsg.substring(0, 47) + '...'
        : errorMsg;
      this.showNotification(`⚠️ ${notifMsg}`, '#f6e05e');
    }
  }

  updatePlayerPanel() {
    if (!this.playerData) return;
    const d = this.playerData;
    this.playerStatusText.setText(
      `🏆 ${d.total_score || 0}\n💰 ${d.coin_balance || 0} coins\n📍 Lv.${d.highest_level || 0}\n🎮 ${d.games_played || 0} games`
    );
    this.playerStatusText.setColor('#e2e8f0');
    this.playerStatusText.setLineSpacing(12);
  }

  async loadLeaderboard() {
    try {
      const board = await getLeaderboard();
      this.leaderboard = board || [];
      this.updateLeaderboardUI();
    } catch (err) {
      console.warn('[Menu] Leaderboard load error (contract belum deploy):', err);
    }
  }

  updateLeaderboardUI() {
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const hasData = this.leaderboard && this.leaderboard.length > 0;

    if (!hasData) {
      // Tampilkan pesan offline/belum ada data
      const messages = [
        'No players yet.',
        'Deploy contract',
        'to enable the',
        'leaderboard!',
        '→ contract.js',
      ];
      for (let i = 0; i < 5; i++) {
        this.leaderboardTexts[i].setText(messages[i]);
        this.leaderboardTexts[i].setColor(i === 0 ? '#a0aec0' : '#4a5568');
      }
      return;
    }

    for (let i = 0; i < 5; i++) {
      const entry = this.leaderboard[i];
      const text = this.leaderboardTexts[i];
      if (entry) {
        const name = String(entry.name || '???').slice(0, 10);
        const score = Number(entry.total_score) || 0;
        text.setText(`${medals[i]} ${name.padEnd(10)} ${score}`);
        text.setColor(i === 0 ? '#f6e05e' : i === 1 ? '#e2e8f0' : i === 2 ? '#ed8936' : '#a0aec0');
      } else {
        text.setText(`${medals[i]} ---`);
        text.setColor('#4a5568');
      }
    }
  }

  startGame() {
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', {
        walletAddress: this.walletAddress,
        playerData: this.playerData,
        level: 1,
      });
    });
  }

  showNotification(message, color = '#ffffff') {
    const W = this.scale.width;
    const notif = this.add.text(W / 2, 260, message, {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color,
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: notif,
      y: 240,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => notif.destroy(),
    });
  }
}
