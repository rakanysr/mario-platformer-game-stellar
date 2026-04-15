// =============================================================
// main.js — Phaser 3 Game Entry Point
// =============================================================
import Phaser from 'phaser';
import { BootScene }    from './scenes/BootScene.js';
import { MenuScene }    from './scenes/MenuScene.js';
import { GameScene }    from './scenes/GameScene.js';
import { GameOverScene} from './scenes/GameOverScene.js';
import { connectWallet } from './stellar/wallet.js';

// ----------------------------------------------------------------
// Phaser Game Config
// ----------------------------------------------------------------
const config = {
  type: Phaser.AUTO,
  width: 900,
  height: 500,
  parent: 'game-wrapper',
  backgroundColor: '#1a1a2e',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  scale: {
    mode: Phaser.Scale.NONE,
  },
};

// Init game
const game = new Phaser.Game(config);

// ----------------------------------------------------------------
// Wallet button handler (luar Phaser)
// ----------------------------------------------------------------
document.getElementById('connect-btn').addEventListener('click', async () => {
  const btn = document.getElementById('connect-btn');
  btn.textContent = 'CONNECTING...';
  btn.disabled = true;

  try {
    const address = await connectWallet();
    // Emit ke Phaser bahwa wallet sudah connect
    game.events.emit('walletConnected', address);
  } catch (err) {
    btn.textContent = 'CONNECT WALLET';
    btn.disabled = false;
    alert(`${err.message}\n\nPastikan Freighter wallet terinstall dan jaringan diset ke Testnet.`);
  }
});

// Loading screen hide
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 500);
  }
}, 2200);

export { game };
