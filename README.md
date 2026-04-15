# ⭐ Stellar Mario: Blockchain Platformer 🍄

![Stellar Mario Screenshot](./docs/screenshot.png) <!-- GANTI NANTI DENGAN NAMA FILE SCREENSHOT ANDA -->

**Stellar Mario** adalah game Web3 2D Platformer bergaya retro (mirip Super Mario) yang mengintegrasikan keseruan game klasik dengan teknologi **Stellar Smart Contracts (Soroban)**. Semua pencapaian pemain, mulai dari skor, pengumpulan koin, hingga *global leaderboard* dan sistem *achievement* direkam secara desentralisasi di atas blockchain Stellar Testnet!

## 🎮 Fitur Utama

### 🛠️ Fitur Web3 & Soroban
- **Freighter Wallet Integration:** Otentikasi dan transaksi pemain menggunakan Freighter Wallet secara aman (menggunakan API Freighter v4 terbaru).
- **On-chain Leaderboard:** Peringkat Top 10 global dicatat dan diurutkan otomatis di dalam smart contract Soroban.
- **Player Stats & Profile:** Data permanen pemain meliputi Level Tertinggi, Total Koin, Total Game, dan Skor Akumulasi.
- **Smart Achievements System:** Selesaikan tantangan (seperti "Coin Collector" atau "Speedrunner") untuk mendapatkan achievement yang terekam di blockchain.
- **Seamless Contract Interactions:** Fungsi read-only untuk memuat data tanpa memotong biaya fee (simulasi), dan auto-signing untuk meminimalisir interupsi bermain.

### 🕹️ Fitur Gameplay (Phaser 3)
- **Procedural Graphics:** Hebatnya, game ini **tidak menggunakan file gambar `.png` atau `.jpg` sama sekali!** Seluruh sprite karakter, animasi gerak, musuh, tile tanah, hingga koin digambar secara algoritmik 100% menggunakan kode dengan `Phaser.Graphics`.
- **Classic Platformer Physics:** Sistem gravitasi dan tabrakan mulus (jump, run, fall death detection).
- **Infinite Potential:** Engine game didesain modular dengan level generator sehingga Anda bisa mengembangkan level tanpa batas.

---

## 🏗️ Tech Stack

- **Smart Contract:** Rust, Soroban SDK (v22), `stellar-cli`
- **Frontend / Client:** JavaScript, [Phaser 3](https://phaser.io/) (Game Engine), DOM Manipulation
- **Bundler:** Vite
- **Web3 Interface:** `@stellar/stellar-sdk` v13, `@stellar/freighter-api`
- **Deployment:** Vercel (Frontend), Stellar Testnet (Contract)

---

## 📂 Struktur Project

```text
mario-platformer-game-stellar-workshop/
├── contracts/
│   └── platformer/         # Folder Smart Contract Soroban (Rust)
│       ├── src/lib.rs      # Logika Utama Smart Contract Player, Score, & Leaderboard
│       └── Cargo.toml      # Konfigurasi Rust / Dependensi
├── frontend/               # Folder Game Client Android/Web
│   ├── src/                
│   │   ├── scenes/         # Scene Phaser (Boot, Menu, Game, GameOver)
│   │   ├── stellar/        # Client Integrasi Stellar (contract.js & wallet.js)
│   │   └── main.js         # Entry point Phaser Game
│   ├── index.html          # Shell HTML UI
│   └── vite.config.js      # Konfigurasi Vite
└── Cargo.toml              # Workspace Cargo configuration
```

---

## 🚀 Panduan Memulai (Development Lokal)

### Persyaratan
1. [Node.js](https://nodejs.org/en) (v18+)
2. [Rust & Cargo](https://rustup.rs/) (v1.81+) & target wasm32: `rustup target add wasm32-unknown-unknown`
3. [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
4. Extension Browser **[Freighter Wallet](https://freighter.app/)** (Ubah Network ke **Testnet**)

### 1. Compile & Deploy Smart Contract
*(Jika Anda hanya ingin menjalankan UI, Anda bisa melewati langkah ini karena Contract ID testnet sudah ada by default di codebase kami: `CAYDXSH...`).*

```bash
# Compile contract menjadi WASM
stellar contract build

# Setup Testnet Identity (jika belum ada)
stellar keys generate testnet-deployer --network testnet
stellar keys fund testnet-deployer --network testnet

# Deploy ke Testnet
stellar contract deploy --wasm target/wasm32v1-none/release/platformer.wasm --source testnet-deployer --network testnet
```
*(Catat **Contract ID** yang muncul dan masukkan ke file `frontend/src/stellar/contract.js`).*

```bash
# Initialize Contract Admin
stellar contract invoke --id <CONTRACT_ID> --source testnet-deployer --network testnet -- initialize --admin $(stellar keys address testnet-deployer)
```

### 2. Menjalankan Game Frontend

```bash
cd frontend

# Install dependensi
npm install

# Jalankan server lokal
npm run dev
```

Buka `http://localhost:3000` di web browser Anda. Pastikan Freighter Wallet ter-unlock dan set ke **Testnet**.

---

## 🕹️ Cara Bermain

1. **Connect Wallet:** Klik tombol `CONNECT WALLET` di layar utama. Izinkan pop-up Freighter menghubungkan akun Anda.
2. **Daftarkan Username:** (Hanya diminta 1 kali) Masukkan nama panggilan untuk tampil di Leaderboard.
3. **Mulai Bermain:** Klik `PLAY GAME`.
4. **Kontrol Karakter:**
   - **Panah Kanan / Kiri (← / →):** Berjalan
   - **Tombol Atas (↑) / Spasi:** Melompat
5. Hindari musuh berbentuk kotak merah bata. Kumpulkan koin emas.
6. Berhasil mencapai titik ujung kordinat tanpa mati (atau mati terjatuh) akan memicu transaksi blockchain otomatis (Soroban Invoke) untuk menyimpan rekor dan mengecek *achievement*. Konfirmasi transaksi pop-up pada Freighter Anda agar skor tercatat secara global!

---

## 📜 Lisensi

Proyek ini dibuat untuk keperluan edukasi dan *workshop*. Bebas digunakan dan dimodifikasi di bawah [MIT License].
