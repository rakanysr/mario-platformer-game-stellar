#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, IntoVal, String, Symbol, Vec,
};

// ============================================================
// DATA TYPES
// ============================================================

#[contracttype]
#[derive(Clone)]
pub struct PlayerData {
    pub name: String,
    pub total_score: u64,
    pub coin_balance: u32,
    pub highest_level: u32,
    pub games_played: u32,
}

#[contracttype]
#[derive(Clone)]
pub struct LeaderboardEntry {
    pub player: Address,
    pub name: String,
    pub total_score: u64,
    pub highest_level: u32,
}

// Storage Keys
const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const PLAYER_COUNT: Symbol = symbol_short!("P_COUNT");
const LEADERBOARD: Symbol = symbol_short!("LBOARD");

fn player_key(env: &Env, player: &Address) -> soroban_sdk::Val {
    (symbol_short!("PLAYER"), player.clone()).into_val(env)
}

fn level_key(env: &Env, player: &Address, level: u32) -> soroban_sdk::Val {
    (symbol_short!("LEVEL"), player.clone(), level).into_val(env)
}

fn achievement_key(env: &Env, player: &Address) -> soroban_sdk::Val {
    (symbol_short!("ACH"), player.clone()).into_val(env)
}

// ── Helper bebas (free function) — hindari borrow conflict dengan closure ──
fn has_achievement(achievements: &Vec<u32>, id: u32) -> bool {
    for a in achievements.iter() {
        if a == id {
            return true;
        }
    }
    false
}

// ============================================================
// CONTRACT
// ============================================================

#[contract]
pub struct PlatformerContract;

#[contractimpl]
impl PlatformerContract {
    // ----------------------------------------------------------
    // ADMIN
    // ----------------------------------------------------------

    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&PLAYER_COUNT, &0u32);

        let leaderboard: Vec<LeaderboardEntry> = Vec::new(&env);
        env.storage().instance().set(&LEADERBOARD, &leaderboard);
        env.storage().instance().extend_ttl(100_000, 100_000);
    }

    // ----------------------------------------------------------
    // PLAYER MANAGEMENT
    // ----------------------------------------------------------

    pub fn register_player(env: Env, player: Address, name: String) {
        player.require_auth();

        let key = player_key(&env, &player);
        if env.storage().persistent().has(&key) {
            panic!("player already registered");
        }

        let data = PlayerData {
            name,
            total_score: 0,
            coin_balance: 0,
            highest_level: 0,
            games_played: 0,
        };

        env.storage().persistent().set(&key, &data);
        env.storage().persistent().extend_ttl(&key, 100_000, 100_000);

        let count: u32 = env.storage().instance().get(&PLAYER_COUNT).unwrap_or(0);
        env.storage().instance().set(&PLAYER_COUNT, &(count + 1));

        let ach_key = achievement_key(&env, &player);
        let achievements: Vec<u32> = Vec::new(&env);
        env.storage().persistent().set(&ach_key, &achievements);
        env.storage().persistent().extend_ttl(&ach_key, 100_000, 100_000);
    }

    pub fn get_player(env: Env, player: Address) -> PlayerData {
        let key = player_key(&env, &player);
        env.storage().persistent().get(&key).expect("player not found")
    }

    pub fn is_registered(env: Env, player: Address) -> bool {
        let key = player_key(&env, &player);
        env.storage().persistent().has(&key)
    }

    // ----------------------------------------------------------
    // GAME SCORING
    // ----------------------------------------------------------

    pub fn submit_score(
        env: Env,
        player: Address,
        level: u32,
        score: u64,
        coins: u32,
        time_seconds: u32,
        no_death: bool,
    ) {
        player.require_auth();

        let p_key = player_key(&env, &player);
        let mut data: PlayerData = env
            .storage()
            .persistent()
            .get(&p_key)
            .expect("player not found");

        data.total_score  += score;
        data.coin_balance += coins;
        data.games_played += 1;
        if level > data.highest_level {
            data.highest_level = level;
        }

        let lv_key = level_key(&env, &player, level);
        let current_best: u64 = env.storage().persistent().get(&lv_key).unwrap_or(0);
        if score > current_best {
            env.storage().persistent().set(&lv_key, &score);
            env.storage().persistent().extend_ttl(&lv_key, 100_000, 100_000);
        }

        env.storage().persistent().set(&p_key, &data);
        env.storage().persistent().extend_ttl(&p_key, 100_000, 100_000);

        // Check & unlock achievements (menggunakan free function, bukan closure)
        Self::check_achievements(&env, &player, level, coins, time_seconds, no_death, &data);

        Self::update_leaderboard(&env, &player, &data);
    }

    pub fn get_level_record(env: Env, player: Address, level: u32) -> u64 {
        let lv_key = level_key(&env, &player, level);
        env.storage().persistent().get(&lv_key).unwrap_or(0)
    }

    // ----------------------------------------------------------
    // LEADERBOARD
    // ----------------------------------------------------------

    pub fn get_leaderboard(env: Env) -> Vec<LeaderboardEntry> {
        env.storage()
            .instance()
            .get(&LEADERBOARD)
            .unwrap_or_else(|| Vec::new(&env))
    }

    fn update_leaderboard(env: &Env, player: &Address, data: &PlayerData) {
        let leaderboard: Vec<LeaderboardEntry> = env
            .storage()
            .instance()
            .get(&LEADERBOARD)
            .unwrap_or_else(|| Vec::new(env));

        // Hapus entry lama player ini
        let mut new_board: Vec<LeaderboardEntry> = Vec::new(env);
        for entry in leaderboard.iter() {
            if entry.player != *player {
                new_board.push_back(entry);
            }
        }

        // Tambah entry baru
        new_board.push_back(LeaderboardEntry {
            player: player.clone(),
            name: data.name.clone(),
            total_score: data.total_score,
            highest_level: data.highest_level,
        });

        // Bubble sort descending by total_score
        let len = new_board.len();
        for i in 0..len {
            for j in 0..(len - 1 - i) {
                let a = new_board.get(j).unwrap();
                let b = new_board.get(j + 1).unwrap();
                if a.total_score < b.total_score {
                    new_board.set(j, b.clone());
                    new_board.set(j + 1, a);
                }
            }
        }

        // Potong top 10
        if new_board.len() > 10 {
            let mut top10: Vec<LeaderboardEntry> = Vec::new(env);
            for i in 0..10 {
                top10.push_back(new_board.get(i).unwrap());
            }
            env.storage().instance().set(&LEADERBOARD, &top10);
        } else {
            env.storage().instance().set(&LEADERBOARD, &new_board);
        }

        env.storage().instance().extend_ttl(100_000, 100_000);
    }

    // ----------------------------------------------------------
    // ACHIEVEMENTS
    // ----------------------------------------------------------

    pub fn get_achievements(env: Env, player: Address) -> Vec<u32> {
        let ach_key = achievement_key(&env, &player);
        env.storage()
            .persistent()
            .get(&ach_key)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Cek dan unlock achievement — menggunakan free function `has_achievement`
    /// agar tidak ada borrow conflict antara immutable (check) dan mutable (push_back)
    fn check_achievements(
        env: &Env,
        player: &Address,
        level: u32,
        _coins: u32,
        time_seconds: u32,
        no_death: bool,
        data: &PlayerData,
    ) {
        let ach_key = achievement_key(env, player);
        let mut achievements: Vec<u32> = env
            .storage()
            .persistent()
            .get(&ach_key)
            .unwrap_or_else(|| Vec::new(env));

        // Setiap check: borrow dilepas sebelum push_back dipanggil
        // karena has_achievement adalah free function (bukan closure)

        // 0: First Level
        if level >= 1 && !has_achievement(&achievements, 0) {
            achievements.push_back(0u32);
        }

        // 1: Coin Collector — total koin >= 100
        if data.coin_balance >= 100 && !has_achievement(&achievements, 1) {
            achievements.push_back(1u32);
        }

        // 2: Speedrunner — selesai dalam 60 detik
        if time_seconds <= 60 && !has_achievement(&achievements, 2) {
            achievements.push_back(2u32);
        }

        // 3: Perfectionist — tanpa mati
        if no_death && !has_achievement(&achievements, 3) {
            achievements.push_back(3u32);
        }

        // 4: Explorer — level 5+
        if data.highest_level >= 5 && !has_achievement(&achievements, 4) {
            achievements.push_back(4u32);
        }

        env.storage().persistent().set(&ach_key, &achievements);
        env.storage().persistent().extend_ttl(&ach_key, 100_000, 100_000);
    }

    // ----------------------------------------------------------
    // UTILS
    // ----------------------------------------------------------

    pub fn player_count(env: Env) -> u32 {
        env.storage().instance().get(&PLAYER_COUNT).unwrap_or(0)
    }
}
