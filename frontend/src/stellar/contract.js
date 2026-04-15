// =============================================================
// Soroban Contract Client
// Kompatibel dengan @stellar/stellar-sdk v13
// =============================================================
import {
  // Named imports — bukan StellarSdk.SorobanRpc (undefined di v13!)
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  Keypair,
  Account,
  xdr,
  scValToNative,
} from '@stellar/stellar-sdk';

import { signTransaction } from './wallet.js';

// ✅ Contract ID dari deployment sebelumnya
const CONTRACT_ID = 'CAYDXSHWUMRM35CZCN5MRM5NUDEG73JKFVPIAKSFGBRWH2OFF46LYK37';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

console.log('[Contract] Using ID:', CONTRACT_ID);

// Contract sudah di-deploy — aktifkan semua fungsi
const CONTRACT_DEPLOYED = true;

let rpc = null;

function getRpc() {
  if (!rpc) {
    // v13: SorobanRpc di-import sebagai named import, bukan namespace
    rpc = new SorobanRpc.Server(RPC_URL);
  }
  return rpc;
}

// =============================================================
// HELPERS
// =============================================================

/**
 * Build & submit transaksi yang mengubah state (butuh sign)
 */
async function invokeContract(walletAddress, method, params) {
  if (!CONTRACT_DEPLOYED) {
    throw new Error('Contract belum di-deploy. Set CONTRACT_ID di contract.js');
  }

  const server  = getRpc();
  const account = await server.getAccount(walletAddress);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  // Simulate
  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error}`);
  }

  // Assemble dengan footprint
  const assembledTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // Sign via Freighter
  const signedXdr = await signTransaction(assembledTx.toXDR(), 'TESTNET');
  const signedTx  = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // Submit
  const sendResult = await server.sendTransaction(signedTx);

  // Poll untuk konfirmasi
  let result = await server.getTransaction(sendResult.hash);
  while (result.status === 'NOT_FOUND') {
    await new Promise(r => setTimeout(r, 1000));
    result = await server.getTransaction(sendResult.hash);
  }

  if (result.status !== 'SUCCESS') {
    throw new Error(`Transaction failed: ${result.status}`);
  }

  return result;
}

/**
 * Baca data dari contract (simulasi saja, tidak perlu sign)
 */
async function readContract(method, params = []) {
  if (!CONTRACT_DEPLOYED) {
    throw new Error('Contract belum di-deploy. Set CONTRACT_DEPLOYED di contract.js');
  }

  const server  = getRpc();
  const keypair = Keypair.random();
  const account = new Account(keypair.publicKey(), '0');
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(simResult)) {
    const errorMsg = `Read error on ${method}: ${simResult.error}`;
    console.error('[Contract] ' + errorMsg);
    console.error('[Contract] Full error:', simResult);
    throw new Error(errorMsg);
  }

  return simResult.result?.retval;
}

// =============================================================
// CONTRACT FUNCTIONS
// =============================================================

/**
 * Daftarkan pemain baru
 */
export async function registerPlayer(walletAddress, playerName) {
  const addrVal = new Address(walletAddress).toScVal();
  const nameVal = xdr.ScVal.scvString(playerName);
  return invokeContract(walletAddress, 'register_player', [addrVal, nameVal]);
}

/**
 * Cek apakah address sudah terdaftar
 * @returns {boolean} — false jika contract belum deploy
 */
export async function isRegistered(playerAddress) {
  if (!CONTRACT_DEPLOYED) return false;
  const addrVal = new Address(playerAddress).toScVal();
  const result  = await readContract('is_registered', [addrVal]);
  return scValToNative(result);
}

/**
 * Ambil data pemain
 * @returns {object|null}
 */
export async function getPlayer(playerAddress) {
  if (!CONTRACT_DEPLOYED) return null;
  const addrVal = new Address(playerAddress).toScVal();
  const result  = await readContract('get_player', [addrVal]);
  return scValToNative(result);
}

/**
 * Submit skor setelah menyelesaikan level
 */
export async function submitScore(walletAddress, level, score, coins, timeSeconds, noDeath) {
  const addrVal = new Address(walletAddress).toScVal();
  const params = [
    addrVal,
    xdr.ScVal.scvU32(level),
    xdr.ScVal.scvU64(xdr.Uint64.fromString(String(score))),
    xdr.ScVal.scvU32(coins),
    xdr.ScVal.scvU32(timeSeconds),
    xdr.ScVal.scvBool(noDeath),
  ];
  return invokeContract(walletAddress, 'submit_score', params);
}

/**
 * Ambil global leaderboard (top 10)
 * @returns {Array} — kosong jika contract belum deploy
 */
export async function getLeaderboard() {
  if (!CONTRACT_DEPLOYED) return [];
  const result = await readContract('get_leaderboard', []);
  return scValToNative(result);
}

/**
 * Ambil best score pemain untuk level tertentu
 */
export async function getLevelRecord(playerAddress, level) {
  if (!CONTRACT_DEPLOYED) return 0;
  const addrVal = new Address(playerAddress).toScVal();
  const lvVal   = xdr.ScVal.scvU32(level);
  const result  = await readContract('get_level_record', [addrVal, lvVal]);
  return scValToNative(result);
}

/**
 * Ambil achievements pemain
 * @returns {Array} — kosong jika contract belum deploy
 */
export async function getAchievements(playerAddress) {
  if (!CONTRACT_DEPLOYED) return [];
  const addrVal = new Address(playerAddress).toScVal();
  const result  = await readContract('get_achievements', [addrVal]);
  return scValToNative(result);
}

/**
 * Jumlah total pemain terdaftar
 */
export async function getPlayerCount() {
  if (!CONTRACT_DEPLOYED) return 0;
  const result = await readContract('player_count', []);
  return scValToNative(result);
}
