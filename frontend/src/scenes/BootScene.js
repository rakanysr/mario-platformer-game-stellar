// =============================================================
// BootScene.js — Preload semua aset game
// =============================================================
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Progress bar saat load
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    const barBg = this.add.graphics();

    barBg.fillStyle(0x222244);
    barBg.fillRoundedRect(width / 2 - 160, height / 2 - 16, 320, 32, 10);

    this.load.on('progress', (value) => {
      bar.clear();
      bar.fillStyle(0x7c3aed);
      bar.fillRoundedRect(width / 2 - 156, height / 2 - 12, 312 * value, 24, 8);
    });

    // ── Generate semua tekstur secara programatik ──
    // (Tidak perlu file PNG eksternal!)
    this.load.on('complete', () => this.generateTextures());
  }

  // Buat tekstur pixel-art secara programatik menggunakan Graphics
  generateTextures() {
    this.createPlayerTexture();
    this.createEnemyTexture();
    this.createCoinTexture();
    this.createTileTextures();
    this.createFlagTexture();
    this.createStarTexture();
    this.scene.start('MenuScene');
  }

  // Karakter Mario (32x32)
  createPlayerTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Idle frame
    g.clear();
    // Topi merah
    g.fillStyle(0xe53e3e); g.fillRect(6, 0, 20, 6);
    g.fillRect(4, 6, 24, 4);
    // Wajah (kulit)
    g.fillStyle(0xfbd38d); g.fillRect(4, 10, 24, 12);
    // Mata
    g.fillStyle(0x1a202c); g.fillRect(10, 13, 4, 4); g.fillRect(18, 13, 4, 4);
    // Kumis
    g.fillStyle(0x744210); g.fillRect(6, 20, 20, 2);
    // Baju merah
    g.fillStyle(0xe53e3e); g.fillRect(2, 22, 28, 8);
    // Overall biru
    g.fillStyle(0x3182ce); g.fillRect(0, 22, 6, 10); g.fillRect(26, 22, 6, 10);
    g.fillRect(4, 30, 24, 4);
    // Sepatu coklat
    g.fillStyle(0x7b341e); g.fillRect(0, 28, 14, 4); g.fillRect(18, 28, 14, 4);

    g.generateTexture('player_idle', 32, 32);

    // Walk frame (sedikit beda)
    g.clear();
    g.fillStyle(0xe53e3e); g.fillRect(6, 0, 20, 6); g.fillRect(4, 6, 24, 4);
    g.fillStyle(0xfbd38d); g.fillRect(4, 10, 24, 12);
    g.fillStyle(0x1a202c); g.fillRect(10, 13, 4, 4); g.fillRect(18, 13, 4, 4);
    g.fillStyle(0x744210); g.fillRect(6, 20, 20, 2);
    g.fillStyle(0xe53e3e); g.fillRect(2, 22, 28, 8);
    g.fillStyle(0x3182ce); g.fillRect(0, 22, 6, 10); g.fillRect(26, 22, 6, 10);
    g.fillRect(4, 30, 24, 4);
    g.fillStyle(0x7b341e); g.fillRect(2, 28, 14, 4); g.fillRect(16, 28, 14, 4);
    g.generateTexture('player_walk', 32, 32);

    g.destroy();
  }

  // Musuh Goomba (28x28)
  createEnemyTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Badan
    g.fillStyle(0xc05621); g.fillRect(2, 10, 24, 16);
    g.fillRect(6, 6, 16, 8);
    // Mata putih
    g.fillStyle(0xffffff); g.fillRect(6, 10, 7, 7); g.fillRect(15, 10, 7, 7);
    // Pupil
    g.fillStyle(0x1a202c); g.fillRect(9, 12, 3, 3); g.fillRect(18, 12, 3, 3);
    // Alis marah
    g.fillStyle(0x1a202c); g.fillRect(5, 8, 8, 2); g.fillRect(15, 8, 8, 2);
    // Kaki
    g.fillStyle(0x7b341e); g.fillRect(2, 24, 10, 6); g.fillRect(16, 24, 10, 6);
    g.generateTexture('enemy', 28, 28);
    g.destroy();
  }

  // Koin berkilau (20x20)
  createCoinTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Lingkaran emas
    g.fillStyle(0xf6e05e);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0xecc94b);
    g.fillCircle(10, 10, 7);
    // Highlight
    g.fillStyle(0xffffff);
    g.fillCircle(7, 7, 3);
    // Simbol bintang
    g.fillStyle(0xd69e2e);
    g.fillRect(8, 4, 4, 12);
    g.fillRect(4, 8, 12, 4);
    g.generateTexture('coin', 20, 20);
    g.destroy();
  }

  // Tile platform (48x48)
  createTileTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Ground tile
    g.fillStyle(0x68d391); g.fillRect(0, 0, 48, 16);  // Rumput
    g.fillStyle(0x8b6914); g.fillRect(0, 16, 48, 32); // Tanah
    // Texture detail
    g.fillStyle(0x48bb78); g.fillRect(4, 4, 8, 4); g.fillRect(20, 2, 6, 5); g.fillRect(36, 4, 8, 3);
    g.fillStyle(0x744210); g.fillRect(6, 20, 10, 6); g.fillRect(26, 24, 8, 4); g.fillRect(38, 18, 6, 8);
    // Grid lines
    g.lineStyle(1, 0x5a4a2c, 0.3);
    g.strokeRect(0, 0, 48, 48);
    g.generateTexture('ground', 48, 48);

    // Brick tile (merah)
    g.clear();
    g.fillStyle(0xfc8181); g.fillRect(0, 0, 48, 48);
    g.fillStyle(0xe53e3e);
    g.fillRect(0, 0, 22, 22); g.fillRect(26, 0, 22, 22);
    g.fillRect(13, 26, 22, 22);
    g.lineStyle(2, 0xc53030);
    g.strokeRect(0, 0, 48, 48); g.strokeRect(0, 0, 22, 22); g.strokeRect(26, 0, 22, 22);
    g.generateTexture('brick', 48, 48);

    // Platform melayang (batu abu)
    g.clear();
    g.fillStyle(0xa0aec0); g.fillRect(0, 0, 48, 48);
    g.fillStyle(0x718096); g.fillRect(4, 4, 40, 18);
    g.fillStyle(0xcbd5e0); g.fillRect(2, 2, 44, 8);
    g.fillStyle(0x4a5568); g.fillRect(0, 36, 48, 12);
    g.generateTexture('platform', 48, 48);

    g.destroy();
  }

  // Flag tujuan
  createFlagTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    // Tiang
    g.fillStyle(0x4a5568); g.fillRect(12, 0, 4, 120);
    // Bendera
    g.fillStyle(0x38a169); g.fillTriangle(16, 10, 16, 50, 50, 30);
    // Bintang di bendera
    g.fillStyle(0xf6e05e); g.fillCircle(35, 30, 6);
    g.generateTexture('flag', 60, 120);
    g.destroy();
  }

  // Star particle
  createStarTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xf6e05e);
    g.fillCircle(6, 6, 5);
    g.generateTexture('star_particle', 12, 12);
    g.destroy();
  }
}
