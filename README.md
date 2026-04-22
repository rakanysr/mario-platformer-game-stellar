# ⭐ Stellar Mario: Blockchain Platformer 🍄

<img width="2559" height="1361" alt="image" src="https://github.com/user-attachments/assets/c6d41e23-6d50-425e-bf17-a755da519ae6" />

<img width="2532" height="1305" alt="image" src="https://github.com/user-attachments/assets/453f5893-c9a4-4cc1-87f3-42646a35c148" />


CONTRACT ID: CD2U3XYUQFADHRHO2TG3RMNLDOX5CEX25GENYQZHINRADIPQMTMTOFBW

**Stellar Mario** is a Web3 2D retro-style Platformer game (similar to Super Mario) that integrates the fun of classic gaming with **Stellar Smart Contracts (Soroban)** technology. All player achievements, from scores, coin collection, to the global leaderboard and achievement tracking system, are recorded decentrally on the Stellar Mainnet blockchain!

## 🎮 Main Features

### 🛠️ Web3 & Soroban Features
- **Freighter Wallet Integration:** Secure player authentication and transactions using Freighter Wallet (using the latest Freighter v4 API).
- **On-chain Leaderboard:** The Top 10 global leaderboard is automatically recorded and sorted inside the Soroban smart contract.
- **Player Stats & Profile:** Persistent player data includes Highest Level, Total Coins, Total Games, and Accumulated Score.
- **Smart Achievements System:** Complete challenges (such as "Coin Collector" or "Speedrunner") to earn achievements recorded on the blockchain.
- **Seamless Contract Interactions:** Read-only functions to load data without transaction fees (via simulation), and auto-signing implementation to minimize gameplay interruptions.

### 🕹️ Gameplay Features (Phaser 3)
- **Procedural Graphics:** Amazingly, this game **does not use any `.png` or `.jpg` image files at all!** All character sprites, movement animations, enemies, ground tiles, and coins are drawn algorithmically 100% using code with `Phaser.Graphics`.
- **Classic Platformer Physics:** Smooth gravity and collision system (jump, run, fall death detection).
- **Infinite Potential:** The game engine is designed modularly with a level generator so you can expand levels limitlessly.

---

## 🏗️ Tech Stack

- **Smart Contract:** Rust, Soroban SDK (v22), `stellar-cli`
- **Frontend / Client:** JavaScript, [Phaser 3](https://phaser.io/) (Game Engine), DOM Manipulation
- **Bundler:** Vite
- **Web3 Interface:** `@stellar/stellar-sdk` v13, `@stellar/freighter-api`
- **Deployment:** Vercel (Frontend), Stellar Mainnet (Contract)

---

## 📂 Project Structure

```text
mario-platformer-game-stellar-workshop/
├── contracts/
│   └── platformer/         # Soroban Smart Contract Folder (Rust)
│       ├── src/lib.rs      # Main Logic for Player, Score, & Leaderboard
│       └── Cargo.toml      # Rust / Dependencies Configuration
├── frontend/               # Android/Web Game Client Folder
│   ├── src/                
│   │   ├── scenes/         # Phaser Scenes (Boot, Menu, Game, GameOver)
│   │   ├── stellar/        # Stellar Integration Client (contract.js & wallet.js)
│   │   └── main.js         # Phaser Game Entry point
│   ├── index.html          # HTML UI Shell
│   └── vite.config.js      # Vite Configuration
└── Cargo.toml              # Workspace Cargo configuration
```

---

## 🚀 Getting Started (Local Development)

### Requirements
1. [Node.js](https://nodejs.org/en) (v18+)
2. [Rust & Cargo](https://rustup.rs/) (v1.81+) & wasm32 target: `rustup target add wasm32-unknown-unknown`
3. [Stellar CLI](https://developers.stellar.org/docs/build/smart-contracts/getting-started/setup)
4. Browser Extension **[Freighter Wallet](https://freighter.app/)** (Change Network to **Mainnet**)

### 1. Compile & Deploy Smart Contract
*(If you only want to run the UI, you can skip this step because the Mainnet Contract ID is already set by default in our codebase: `CD2U3XYUQFADHRHO2TG3RMNLDOX5CEX25GENYQZHINRADIPQMTMTOFBW`).*

```bash
# Compile contract into WASM
stellar contract build

# Deploy to Mainnet (requires XLM)
stellar contract deploy --wasm target/wasm32v1-none/release/platformer.wasm --source-account <your_wallet_alias> --network mainnet
```
*(Copy the generated **Contract ID** and insert it into the `frontend/src/stellar/contract.js` file).*

```bash
# Initialize Contract Admin
stellar contract invoke --id <CONTRACT_ID> --source-account <your_wallet_alias> --network mainnet -- initialize --admin <your_wallet_address>
```

### 2. Running the Frontend Game

```bash
cd frontend

# Install dependencies
npm install

# Run local server
npm run dev
```

Open `http://localhost:3000` in your web browser. Make sure Freighter Wallet is unlocked and set to **Mainnet**.

---

## 🕹️ How to Play

1. **Connect Wallet:** Click the `CONNECT WALLET` button on the main screen. Allow the Freighter pop-up to connect your account.
2. **Register Username:** (Only asked once) Enter a nickname to be displayed on the Leaderboard.
3. **Start Playing:** Click `PLAY GAME`.
4. **Character Controls:**
   - **Left / Right Arrows (← / →):** Walk
   - **Up Arrow (↑) / Space:** Jump
5. Avoid brick-red box enemies. Collect gold coins.
6. Reaching the end coordinate without dying (or falling to death) will trigger an automatic blockchain transaction (Soroban Invoke) to save records and check *achievements*. Confirm the transaction pop-up on your Freighter to record your score globally!

---

## 📜 License

This project was created for educational purposes and *workshops*. Free to use and modify under the [MIT License].
