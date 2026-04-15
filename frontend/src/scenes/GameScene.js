// =============================================================
// GameScene.js — Core Gameplay (Mario-style 2D Platformer)
// =============================================================
import Phaser from 'phaser';

const TILE = 48;          // ukuran tile
const GAME_WIDTH = 900;
const GAME_HEIGHT = 500;
const WORLD_WIDTH = 3600; // dunia 4x layar

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });

    // State
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.levelTime = 0;
    this.isDead = false;
    this.levelComplete = false;
    this.levelStartTime = 0;
    this.deaths = 0;

    // Input
    this.cursors = null;
    this.wasd = null;

    // Game objects
    this.player = null;
    this.enemies = null;
    this.coinGroup = null;
    this.groundGroup = null;
    this.brickGroup = null;
    this.platformGroup = null;
    this.flag = null;
  }

  init(data) {
    this.walletAddress = data.walletAddress || null;
    this.playerData = data.playerData || null;
    this.level = data.level || 1;
    this.score = 0;
    this.coins = 0;
    this.lives = 3;
    this.isDead = false;
    this.levelComplete = false;
    this.deaths = 0;
  }

  create() {
    // Physics world bounds — perluas ke bawah agar player bisa jatuh keluar layar
    // Batas bawah 600px lebih dari GAME_HEIGHT agar ada ruang fall death
    this.physics.world.setBounds(0, -500, WORLD_WIDTH, GAME_HEIGHT + 1200);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // Background layers
    this.createBackground();

    // Build level
    this.buildLevel();

    // Player
    this.createPlayer();

    // HUD
    this.createHUD();

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Timer
    this.levelStartTime = this.time.now;

    // Fade in
    this.cameras.main.fadeIn(400);
  }

  // ─── Background ───────────────────────────────────────────────

  createBackground() {
    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a4e, 0x1a1a4e, 0x0d3b69, 0x0d3b69, 1);
    bg.fillRect(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    bg.setScrollFactor(0.05);

    // Mountains (parallax mid)
    this.createMountains();

    // Stars
    for (let i = 0; i < 200; i++) {
      const star = this.add.graphics();
      star.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.2, 0.9));
      star.fillCircle(
        Phaser.Math.Between(0, WORLD_WIDTH),
        Phaser.Math.Between(0, GAME_HEIGHT - 200),
        Phaser.Math.FloatBetween(0.5, 2)
      );
      star.setScrollFactor(0.1);
    }
  }

  createMountains() {
    const mtn = this.add.graphics();
    mtn.fillStyle(0x1e3a5f, 0.8);
    // Buat beberapa puncak gunung
    for (let x = 0; x < WORLD_WIDTH; x += 300) {
      const h = Phaser.Math.Between(120, 250);
      mtn.fillTriangle(x, GAME_HEIGHT - 100, x + 150, GAME_HEIGHT - 100 - h, x + 300, GAME_HEIGHT - 100);
    }
    mtn.setScrollFactor(0.2);
  }

  // ─── Level Builder ────────────────────────────────────────────

  buildLevel() {
    this.groundGroup = this.physics.add.staticGroup();
    this.brickGroup = this.physics.add.staticGroup();
    this.platformGroup = this.physics.add.staticGroup();
    this.coinGroup = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ bounceX: 1, collideWorldBounds: true });

    // Level layout — array baris x kolom
    // G=ground, B=brick, P=platform, C=coin, E=enemy, F=flag, _=kosong
    const layout = this.getLevelLayout(this.level);
    this.parseLayout(layout);
  }

  getLevelLayout(level) {
    // Level 1 — Tutorial
    if (level === 1) {
      return [
        // Baris 0 (y=0*48)
        '                                                                             F  ',
        // Baris 1
        '                                                                             F  ',
        // Baris 2
        '                   C   C   C                      C   C                     F  ',
        // Baris 3
        '             BBB               PPP          PPP                             F  ',
        // Baris 4
        '                  PPP                 C                   BBB              F  ',
        // Baris 5
        '   C   C                   C                 E        C          E          F  ',
        // Baris 6 — ground floor
        'GGGGGGG   GGGGG   GGGGGGGGGGG   GGGGG   GGGGGGG   GGGGGGGGG   GGGGGGGGGGGGGGG',
        // Baris 7
        'GGGGGGG   GGGGG   GGGGGGGGGGG   GGGGG   GGGGGGG   GGGGGGGGG   GGGGGGGGGGGGGGG',
      ];
    }

    // Level 2 — lebih susah
    return [
      '                                                               F  ',
      '                   E                    E       E             F  ',
      '      C   C   C                  C   C                        F  ',
      '  BBB         BBB     PPP                  PPP       BBB  PPP F  ',
      '         PPP                E        BBB                       F  ',
      ' E                    C          C            E   C             F  ',
      'GGG   GGGGG   GGGGG   GGG   GGGGG   GGGGG   GGGGG   GGGGGGGGGGGG',
      'GGG   GGGGG   GGGGG   GGG   GGGGG   GGGGG   GGGGG   GGGGGGGGGGGG',
    ];
  }

  parseLayout(layout) {
    const rows = layout.length;

    layout.forEach((row, rowIdx) => {
      const y = GAME_HEIGHT - (rows - rowIdx) * TILE;

      for (let col = 0; col < row.length; col++) {
        const ch = row[col];
        const x = col * TILE + TILE / 2;

        if (ch === 'G') {
          const tile = this.groundGroup.create(x, y, 'ground');
          tile.setScale(1).refreshBody();
        } else if (ch === 'B') {
          const tile = this.brickGroup.create(x, y, 'brick');
          tile.setScale(1).refreshBody();
        } else if (ch === 'P') {
          const tile = this.platformGroup.create(x, y, 'platform');
          tile.setScale(1).refreshBody();
        } else if (ch === 'C') {
          const coin = this.coinGroup.create(x, y, 'coin');
          coin.setScale(1.2).refreshBody();
          // Animasi bobbing
          this.tweens.add({
            targets: coin,
            y: coin.y - 8,
            duration: 700,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1,
            delay: Phaser.Math.Between(0, 500),
          });
        } else if (ch === 'E') {
          const enemy = this.enemies.create(x, y, 'enemy');
          enemy.setScale(1.1);
          enemy.body.setVelocityX(Phaser.Math.Between(0, 1) ? 80 : -80);
          enemy.body.setGravityY(400);
          enemy.body.setCollideWorldBounds(true);
          enemy.body.setBounceX(1);
          enemy.isEnemy = true;
        } else if (ch === 'F') {
          if (!this.flag) {
            this.flag = this.add.image(x, y, 'flag');
            this.flag.setOrigin(0.5, 1);
            this.physics.add.existing(this.flag, true); // static
            this.tweens.add({
              targets: this.flag,
              y: this.flag.y - 5,
              duration: 1000,
              ease: 'Sine.InOut',
              yoyo: true,
              repeat: -1,
            });
          }
        }
      }
    });
  }

  // ─── Player ───────────────────────────────────────────────────

  createPlayer() {
    this.player = this.physics.add.sprite(96, GAME_HEIGHT - 200, 'player_idle');
    this.player.setScale(1.4);
    // Jangan gunakan setCollideWorldBounds(true) agar player bisa jatuh off-screen
    // Gunakan setBoundsCollision: hanya blok kiri, kanan, atas — bukan bawah
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.player.body.setGravityY(400);
    this.player.body.setSize(28, 30);

    // Collider dengan platform
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.player, this.brickGroup, this.hitBrick, null, this);
    this.physics.add.collider(this.player, this.platformGroup);

    // Collider enemy
    this.physics.add.collider(this.enemies, this.groundGroup);
    this.physics.add.collider(this.enemies, this.brickGroup);
    this.physics.add.collider(this.enemies, this.platformGroup);

    // Overlap coin
    this.physics.add.overlap(this.player, this.coinGroup, this.collectCoin, null, this);

    // Overlap enemy
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);

    // Overlap flag
    if (this.flag) {
      this.physics.add.overlap(this.player, this.flag, this.reachFlag, null, this);
    }
  }

  hitBrick(player, brick) {
    if (player.body.velocity.y < 0 && player.y > brick.y) {
      // Player melompat kena bawah brick
      brick.setTint(0xff8888);
      this.time.delayedCall(100, () => {
        brick.destroy();
        this.addScore(10);
        this.createScorePopup(brick.x, brick.y, '+10');
      });
    }
  }

  collectCoin(player, coin) {
    // Particle burst
    this.createCoinBurst(coin.x, coin.y);
    coin.destroy();
    this.coins++;
    this.addScore(100);
    this.updateHUD();
    this.createScorePopup(coin.x, coin.y, '+100');
  }

  hitEnemy(player, enemy) {
    if (this.isDead || this.levelComplete) return;

    const playerBottom = player.body.bottom;
    const enemyTop = enemy.body.top;

    if (playerBottom <= enemyTop + 20 && player.body.velocity.y > 0) {
      // Injak dari atas — musuh mati
      enemy.setTint(0xff0000);
      enemy.body.setVelocityX(0);
      this.addScore(200);
      this.createScorePopup(enemy.x, enemy.y, '+200 STOMP!');
      this.player.setVelocityY(-350); // Bounce up
      this.time.delayedCall(300, () => enemy.destroy());
    } else {
      // Disentuh dari samping — player mati
      this.playerDie();
    }
  }

  reachFlag(player, flag) {
    if (this.levelComplete) return;
    this.levelComplete = true;
    this.completeLevelAnimation();
  }

  // ─── HUD ──────────────────────────────────────────────────────

  createHUD() {
    // HUD tidak scroll
    const hudBg = this.add.graphics().setScrollFactor(0).setDepth(10);
    hudBg.fillStyle(0x000000, 0.6);
    hudBg.fillRoundedRect(10, 10, 880, 44, 10);

    this.hudScore = this.add.text(30, 22, 'SCORE: 0', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#f6e05e',
    }).setScrollFactor(0).setDepth(11);

    this.hudCoins = this.add.text(230, 22, '💰 0', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#fbd38d',
    }).setScrollFactor(0).setDepth(11);

    this.hudLives = this.add.text(380, 22, '❤️  x3', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#fc8181',
    }).setScrollFactor(0).setDepth(11);

    this.hudTime = this.add.text(560, 22, '⏱ 000', {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#90cdf4',
    }).setScrollFactor(0).setDepth(11);

    this.hudLevel = this.add.text(760, 22, `LV ${this.level}`, {
      fontFamily: "'Press Start 2P'",
      fontSize: '11px',
      color: '#a78bfa',
    }).setScrollFactor(0).setDepth(11);

    // On-chain badge
    const badge = this.walletAddress
      ? `⭐ ${this.walletAddress.slice(0, 5)}...`
      : '⭐ OFFLINE';
    this.hudWallet = this.add.text(GAME_WIDTH - 20, 58, badge, {
      fontFamily: "'Press Start 2P'",
      fontSize: '7px',
      color: '#667eea',
    }).setScrollFactor(0).setDepth(11).setOrigin(1, 0);
  }

  updateHUD() {
    this.hudScore.setText(`SCORE: ${this.score}`);
    this.hudCoins.setText(`💰 ${this.coins}`);
    this.hudLives.setText(`❤️  x${this.lives}`);
    const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
    this.hudTime.setText(`⏱ ${String(elapsed).padStart(3, '0')}`);
  }

  // ─── Update Loop ──────────────────────────────────────────────

  update() {
    if (this.isDead || this.levelComplete) return;

    const onGround = this.player.body.blocked.down;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const jump = this.cursors.up.isDown || this.wasd.up.isDown ||
                 this.cursors.space?.isDown || this.wasd.jump.isDown;

    // Horizontal movement
    if (left) {
      this.player.setVelocityX(-220);
      this.player.setFlipX(true);
      this.player.setTexture('player_walk');
    } else if (right) {
      this.player.setVelocityX(220);
      this.player.setFlipX(false);
      this.player.setTexture('player_walk');
    } else {
      this.player.setVelocityX(0);
      this.player.setTexture('player_idle');
    }

    // Jump
    if (jump && onGround) {
      this.player.setVelocityY(-580);
      this.addScore(5);
    }

    // Fall death — trigger saat player turun 100px di bawah layar
    if (this.player.y > GAME_HEIGHT + 100) {
      this.playerDie();
    }

    // Update HUD timer
    this.updateHUD();
  }

  // ─── Scoring ──────────────────────────────────────────────────

  addScore(pts) {
    this.score += pts;
    this.hudScore.setText(`SCORE: ${this.score}`);
  }

  createScorePopup(x, y, text) {
    const popup = this.add.text(x, y - 20, text, {
      fontFamily: "'Press Start 2P'",
      fontSize: '9px',
      color: '#f6e05e',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: popup,
      y: y - 70,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  createCoinBurst(x, y) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.image(x, y, 'star_particle');
      const angle = (Math.PI * 2 / 8) * i;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ─── Player Death ─────────────────────────────────────────────

  playerDie() {
    if (this.isDead) return;
    this.isDead = true;
    this.deaths++;

    this.player.setTint(0xff4444);
    // Animasi death — loncat ke atas lalu jatuh (seperti Mario klasik)
    this.player.setVelocityY(-380);
    this.player.setVelocityX(0);
    // Nonaktifkan collider sementara agar player menembus platform saat mati
    this.player.body.setGravityY(800);
    this.player.body.checkCollision.none = true;

    this.cameras.main.shake(300, 0.015);

    this.time.delayedCall(1800, () => {
      this.lives--;
      if (this.lives <= 0) {
        this.endLevel(false);
      } else {
        // Respawn — reset semua body state
        this.player.clearTint();
        this.player.body.checkCollision.none = false; // aktifkan collision kembali
        this.player.body.setGravityY(400);            // reset gravity
        this.player.setPosition(96, GAME_HEIGHT - 200);
        this.player.setVelocity(0, 0);
        this.isDead = false;
        this.cameras.main.flash(400, 255, 100, 100, false);
      }
    });
  }

  // ─── Level Complete ───────────────────────────────────────────

  completeLevelAnimation() {
    // Animasi menuju bendera
    this.player.setVelocityX(150);
    this.player.setFlipX(false);

    this.time.delayedCall(1500, () => {
      const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
      this.addScore(Math.max(0, 5000 - elapsed * 10)); // Time bonus
      this.addScore(this.lives * 500);                 // Lives bonus

      // Flash effect
      this.cameras.main.flash(500, 255, 255, 200);

      this.time.delayedCall(600, () => {
        this.endLevel(true);
      });
    });
  }

  endLevel(success) {
    const elapsed = Math.floor((this.time.now - this.levelStartTime) / 1000);
    const noDeath = this.deaths === 0;

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOverScene', {
        success,
        score: this.score,
        coins: this.coins,
        level: this.level,
        timeSeconds: elapsed,
        noDeath,
        walletAddress: this.walletAddress,
        playerData: this.playerData,
      });
    });
  }
}
