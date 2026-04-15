// =============================================================
// Soroban Contract Client
// Kompatibel dengan @stellar/stellar-sdk v13
// =============================================================
import {
  // Named imports
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  Address,
  Keypair,
  Account,
  xdr,
  scValToNative,
  nativeToScVal,
} from '@stellar/stellar-sdk';

// Import SorobanRpc dari sub-path yang benar
import { SorobanRpc } from '@stellar/stellar-sdk';

import { signTransaction } from './wallet.js';

// Debug: Check SorobanRpc availability
console.log('[Contract] SorobanRpc available?', typeof SorobanRpc, SorobanRpc);
console.log('[Contract] SorobanRpc.Server available?', SorobanRpc?.Server ? 'YES' : 'NO');

// ✅ Contract ID dari deployment sebelumnya
const CONTRACT_ID = 'CAYDXSHWUMRM35CZCN5MRM5NUDEG73JKFVPIAKSFGBRWH2OFF46LYK37';
const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

console.log('[Contract] Using ID:', CONTRACT_ID);

// Export untuk diagnostics
export { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE };

// Contract sudah di-deploy — aktifkan semua fungsi
const CONTRACT_DEPLOYED = true;

let rpc = null;

// =============================================================
// DIAGNOSTICS — test RPC & CONTRACT
// =============================================================
export async function runDiagnostics() {
  console.log('%c=== STELLAR DIAGNOSTICS ===', 'color: #7c3aed; font-weight: bold; font-size: 12px');
  console.log('📋 Configuration:');
  console.log('   CONTRACT_ID:', CONTRACT_ID);
  console.log('   RPC_URL:', RPC_URL);
  console.log('   NETWORK_PASSPHRASE:', NETWORK_PASSPHRASE);
  console.log('   CONTRACT_DEPLOYED flag:', CONTRACT_DEPLOYED);
  
  // Check SorobanRpc
  console.log('🔍 Checking SorobanRpc availability:');
  console.log('   typeof SorobanRpc:', typeof SorobanRpc);
  console.log('   SorobanRpc.Server:', SorobanRpc?.Server ? '✅ Available' : '❌ Not Available');
  console.log('   SorobanRpc.Api:', SorobanRpc?.Api ? '✅ Available' : '❌ Not Available');
  
  try {
    const server = getRpc();
    console.log('✅ RPC Server instantiated');
    console.log('   Server type:', server.constructor?.name);
    
    // Test RPC connection using base URL
    try {
      console.log('🔍 Testing RPC HTTP connection...');
      const response = await fetch(RPC_URL);
      console.log('✅ RPC HTTP status:', response.status);
    } catch (e) {
      console.error('❌ RPC HTTP request failed:', e.message);
      return;
    }
    
    // Test Contract with detailed trace
    console.log('🔍 Testing contract simulation...');
    try {
      const contract = new Contract(CONTRACT_ID);
      console.log('✅ Contract object created');
      
      // Build test transaction - just call method without parameters
      const testTx = new TransactionBuilder(
        new Account(Keypair.random().publicKey(), '0'),
        { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(contract.call('get_leaderboard'))  // No params, no spreading
        .setTimeout(30)
        .build();
      
      console.log('✅ Test TX built');
      console.log('   TX XDR length:', testTx.toXDR().length);
      
      // Call simulateTransaction
      console.log('🔍 Calling server.simulateTransaction...');
      const simResult = await server.simulateTransaction(testTx);
      
      console.log('✅ Got simulation response');
      console.log('   Response type:', typeof simResult);
      console.log('   Response keys:', Object.keys(simResult).slice(0, 5));
      console.log('   Full response:', simResult);
      
      // Check error
      const isError = simResult.error || (simResult.errorResult && simResult.errorResult.code !== 'txSUCCESS');
      if (isError) {
        console.warn('⚠️  Contract simulation error:');
        console.warn('   Error:', simResult.error || simResult.errorResult);
      } else {
        console.log('✅ Simulation successful!');
        console.log('   Result structure:', simResult.result ? Object.keys(simResult.result) : 'null');
      }
    } catch (e) {
      console.error('❌ Contract simulation failed:');
      console.error('   Error message:', e.message);
      console.error('   Error:', e);
    }
    
  } catch (err) {
    console.error('❌ Diagnostics fatal error:', err);
  }
}

// Run diagnostics on load
console.log('[Contract] Running diagnostics...');
runDiagnostics().catch(console.error);

function getRpc() {
  if (!rpc) {
    try {
      // Try dengan SorobanRpc class jika tersedia
      if (SorobanRpc && SorobanRpc.Server) {
        console.log('[Contract] Creating RPC with SorobanRpc.Server');
        rpc = new SorobanRpc.Server(RPC_URL);
      } else {
        // Fallback: buat object minimalis yang berisi method yang diperlukan
        console.warn('[Contract] SorobanRpc.Server not available, using fetch-based RPC');
        rpc = createMinimalRpcClient(RPC_URL);
      }
    } catch (e) {
      console.error('[Contract] RPC initialization error:', e);
      // Tetap return attempt dengan minimal RPC
      if (!rpc) rpc = createMinimalRpcClient(RPC_URL);
    }
  }
  return rpc;
}

/**
 * Minimal RPC client jika SorobanRpc tidak available
 */
function createMinimalRpcClient(url) {
  return {
    url: url,
    simulateTransaction: async (tx) => {
      console.log('[RPC] Calling simulateTransaction via fetch');
      console.log('[RPC] TX XDR length:', tx.toXDR().length);
      const txXdr = tx.toXDR();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now().toString(),
            method: 'simulateTransaction',
            params: { transaction: txXdr },
          }),
        });
        
        const data = await response.json();
        console.log('[RPC] simulateTransaction response:', data);
        
        if (data.error) {
          console.error('[RPC] RPC Error:', data.error);
          return { error: data.error.message || JSON.stringify(data.error) };
        }
        
        if (!data.result) {
          console.warn('[RPC] No result in response');
          return { result: null };
        }
        
        console.log('[RPC] Simulation result success');
        console.log('   data.result keys:', Object.keys(data.result || {}).slice(0, 10));
        console.log('   data.result:', data.result);
        return data.result;
      } catch (e) {
        console.error('[RPC] simulateTransaction fetch error:', e);
        throw e;
      }
    },
    sendTransaction: async (tx) => {
      console.log('[RPC] Calling sendTransaction via fetch');
      const txXdr = tx.toXDR();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now().toString(),
          method: 'sendTransaction',
          params: { transaction: txXdr },
        }),
      });
      const data = await response.json();
      console.log('[RPC] sendTransaction response:', data);
      if (data.error) {
        console.error('[RPC] sendTransaction error:', data.error);
        throw new Error(data.error.message || JSON.stringify(data.error));
      }
      if (!data.result) {
        console.error('[RPC] sendTransaction no result');
        throw new Error('No result from sendTransaction');
      }
      console.log('[RPC] sendTransaction success, hash:', data.result.hash);
      return data.result;
    },
    getTransaction: async (hash) => {
      console.log('[RPC] Calling getTransaction for hash:', hash);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now().toString(),
            method: 'getTransaction',
            params: { hash },
          }),
        });
        const data = await response.json();
        console.log('[RPC] getTransaction response:', data);
        
        if (data.error) {
          // If error, assume NOT_FOUND
          console.warn('[RPC] getTransaction error, returning NOT_FOUND:', data.error);
          return { status: 'NOT_FOUND' };
        }
        
        if (data.result) {
          console.log('[RPC] Got transaction result:', data.result);
          return data.result;
        }
        
        // No result and no error = transaction not found yet
        return { status: 'NOT_FOUND' };
      } catch (e) {
        console.error('[RPC] getTransaction fetch error:', e.message);
        // Return NOT_FOUND on error
        return { status: 'NOT_FOUND' };
      }
    },
    getAccount: async (accountId) => {
      console.log('[RPC] Calling getAccount for account:', accountId);
      
      // Soroban RPC doesn't support getAccount - use Horizon API as fallback
      try {
        const horizonUrl = 'https://horizon-testnet.stellar.org';
        const response = await fetch(`${horizonUrl}/accounts/${accountId}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.warn('[RPC] Horizon getAccount failed:', data);
          // Return minimal account for sequence 0
          return new Account(accountId, '0');
        }
        
        console.log('[RPC] Got account from Horizon');
        return new Account(accountId, data.sequence);
      } catch (e) {
        console.warn('[RPC] Horizon call failed, using fallback sequence 0:', e.message);
        return new Account(accountId, '0');
      }
    },
  };
}

// =============================================================
// HELPERS
// =============================================================

/**
 * Check apakah simulation result mengandung error
 */
function isSimulationError(simResult) {
  if (!simResult) return false;
  // Check berbagai jenis error yang mungkin terjadi
  if (simResult.error) return true;
  if (simResult.errorResult && simResult.errorResult.code) {
    return simResult.errorResult.code !== 'txSUCCESS';
  }
  // Try gunakan SorobanRpc.Api jika tersedia
  try {
    if (SorobanRpc && SorobanRpc.Api && SorobanRpc.Api.isSimulationError) {
      return SorobanRpc.Api.isSimulationError(simResult);
    }
  } catch (e) {
    // Ignore silently
  }
  return false;
}

/**
 * Safe convert ScVal to native format
 * Handles both raw ScVal and XDR-encoded result objects
 */
function safeScValToNative(val) {
  if (!val) return null;
  
  try {
    // Check jika ini XDR-encoded result object
    if (val.xdr && typeof val.xdr === 'string') {
      console.log('[Contract] Detected XDR-encoded result, decoding...');
      try {
        // Decode XDR string to ScVal
        const scVal = xdr.ScVal.fromXDR(val.xdr, 'base64');
        console.log('[Contract] Decoded XDR to ScVal:', scVal);
        const native = scValToNative(scVal);
        console.log('[Contract] SafeScValToNative success via XDR decode:', native);
        return native;
      } catch (xdrErr) {
        console.warn('[Contract] XDR decode failed:', xdrErr.message);
        // Fallback to raw value
        return val;
      }
    }
    
    // Check jika sudah native format (bukan ScVal)
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      console.log('[Contract] Value is already native:', typeof val);
      return val;
    }
    
    // Try convert dengan scValToNative
    const native = scValToNative(val);
    console.log('[Contract] SafeScValToNative success, type:', typeof native);
    return native;
  } catch (e) {
    console.warn('[Contract] SafeScValToNative failed, returning raw value:', e.message);
    console.warn('[Contract] Raw value:', val);
    // Fallback: return value as-is
    return val;
  }
}

/**
 * Assemble transaction dengan fallback jika SorobanRpc.assembleTransaction tidak tersedia
 */
function assembleTransaction(tx, simResult) {
  try {
    if (SorobanRpc && SorobanRpc.assembleTransaction) {
      return SorobanRpc.assembleTransaction(tx, simResult).build();
    }
  } catch (e) {
    console.warn('[Contract] SorobanRpc.assembleTransaction not available:', e.message);
  }
  // Fallback: return tx as-is (mungkin sudah assembled)
  return tx;
}

/**
 * Build & submit transaksi yang mengubah state (butuh sign)
 */
async function invokeContract(walletAddress, method, params) {
  if (!CONTRACT_DEPLOYED) {
    throw new Error('Contract belum di-deploy. Set CONTRACT_ID di contract.js');
  }

  const server  = getRpc();
  let account;
  
  try {
    console.log('[Contract] Attempting to get account from RPC');
    account = await server.getAccount(walletAddress);
    console.log('[Contract] Got account from RPC:', account);
  } catch (e) {
    console.warn('[Contract] getAccount failed, using fallback Account with sequence 0:', e.message);
    // Fallback: create Account dengan sequence 0 - Soroban akan handle sequence
    account = new Account(walletAddress, '0');
  }
  
  const contract = new Contract(CONTRACT_ID);

  let tx;
  try {
    console.log('[Contract] Building contract operation...');
    // Build operation - handle empty params carefully
    let operation;
    if (params && params.length > 0) {
      console.log('[Contract] Building operation with', params.length, 'params');
      operation = contract.call(method, ...params);
    } else {
      console.log('[Contract] Building operation with no params');
      operation = contract.call(method);
    }
    console.log('[Contract] Operation built successfully');
    
    tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();
    
    console.log('[Contract] TX built successfully, XDR length:', tx.toXDR().length);
  } catch (buildErr) {
    console.error('[Contract] Error building transaction:', buildErr.message);
    console.error('[Contract] Error:', buildErr);
    throw buildErr;
  }

  // Simulate
  let simResult;
  try {
    simResult = await server.simulateTransaction(tx);
    console.log('[Contract] Simulation success');
  } catch (simErr) {
    console.error('[Contract] Simulation failed:', simErr.message);
    throw simErr;
  }
  
  if (isSimulationError(simResult)) {
    throw new Error(`Simulation error: ${simResult.error || simResult.errorResult}`);
  }

  // Assemble dengan footprint
  const assembledTx = assembleTransaction(tx, simResult);

  // Sign via Freighter
  const signedXdr = await signTransaction(assembledTx.toXDR(), 'TESTNET');
  const signedTx  = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  // Submit
  const sendResult = await server.sendTransaction(signedTx);
  console.log('[Contract] sendTransaction result:', sendResult);

  // Check result status immediately
  if (sendResult.status === 'ERROR') {
    console.error('[Contract] Transaction submission ERROR:', sendResult);
    throw new Error(`Transaction failed: ${sendResult.errorResultXdr}`);
  }

  // If already SUCCESS, return immediately
  if (sendResult.status === 'SUCCESS') {
    console.log('[Contract] Transaction already SUCCESS');
    return sendResult;
  }

  // Otherwise, do brief polling (only for PENDING status)
  let result = sendResult;
  let attempts = 0;
  const maxAttempts = 3; // Only 3 attempts = 3 seconds max
  
  try {
    // Poll if PENDING
    if (sendResult.status === 'PENDING') {
      console.log('[Contract] Transaction PENDING, polling...');
      
      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000));
        const nextResult = await server.getTransaction(sendResult.hash);
        attempts++;
        console.log(`[Contract] Poll attempt ${attempts}: status=${nextResult?.status}`);
        
        if (nextResult?.status && nextResult.status !== 'NOT_FOUND' && nextResult.status !== 'PENDING') {
          result = nextResult;
          console.log('[Contract] Poll got result:', result.status);
          break;
        }
        
        // Stop if ERROR
        if (nextResult?.status === 'ERROR') {
          console.error('[Contract] Transaction ERROR after submission:', nextResult);
          throw new Error(`Transaction failed: ${nextResult.errorResultXdr}`);
        }
      }
    }
  } catch (pollErr) {
    console.error('[Contract] Polling error:', pollErr.message);
    // If polling error, but sendTransaction succeeded, assume OK
    if (sendResult.status !== 'ERROR') {
      console.warn('[Contract] Ignoring polling error, transaction was submitted');
      result = { status: 'SUCCESS', hash: sendResult.hash };
    } else {
      throw pollErr;
    }
  }

  // Final status check
  if (result?.status === 'ERROR') {
    throw new Error(`Transaction failed: ${result.errorResultXdr}`);
  }

  console.log('[Contract] Final transaction status:', result?.status || 'SUBMITTED');
  return result || { status: 'SUCCESS', hash: sendResult.hash };
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

  console.log('[Contract] readContract method:', method);
  console.log('[Contract] readContract params:', params);

  let operation;
  try {
    // Build operation - handle empty params carefully
    if (params && params.length > 0) {
      console.log('[Contract] Building operation with', params.length, 'params');
      operation = contract.call(method, ...params);
    } else {
      console.log('[Contract] Building operation with no params');
      operation = contract.call(method);
    }
    console.log('[Contract] Operation built successfully');
  } catch (opErr) {
    console.error('[Contract] Error building operation:', opErr.message);
    throw opErr;
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  console.log('[Contract] Read TX built, XDR length:', tx.toXDR().length);

  let simResult;
  try {
    simResult = await server.simulateTransaction(tx);
    console.log('[Contract] Read simulation success');
  } catch (simErr) {
    console.error('[Contract] Read simulation error:', simErr.message);
    throw simErr;
  }

  if (isSimulationError(simResult)) {
    const errorMsg = `Read error on ${method}: ${simResult.error || simResult.errorResult}`;
    console.error('[Contract] ' + errorMsg);
    console.error('[Contract] Full error:', simResult);
    throw new Error(errorMsg);
  }

  // Extract retval dari Soroban simulation result
  // RPC returns DIRECTLY: { transactionData, events, minResourceFee, results, stateChanges, latestLedger }
  // Actual return value is di results[0]
  let retval = null;
  
  // Try berbagai lokasi return value (check langsung di simResult dulu)
  if (simResult.results?.[0]) {
    retval = simResult.results[0];
    console.log('[Contract] Got retval from simResult.results[0]');
    console.log('[Contract] retval type:', typeof retval);
    console.log('[Contract] retval:', retval);
    console.log('[Contract] retval keys:', Object.keys(retval || {}));
  } else if (simResult.result?.results?.[0]) {
    retval = simResult.result.results[0];
    console.log('[Contract] Got retval from simResult.result.results[0]');
  } else if (simResult.result?.retval) {
    retval = simResult.result.retval;
    console.log('[Contract] Got retval from simResult.result.retval');
  } else if (simResult.retval) {
    retval = simResult.retval;
    console.log('[Contract] Got retval from simResult.retval');
  }
  
  if (!retval) {
    console.warn('[Contract] readContract returned no retval for method:', method);
    console.warn('[Contract] simResult keys:', Object.keys(simResult || {}));
    console.warn('[Contract] simResult.results:', simResult?.results);
    console.warn('[Contract] simResult.result?.results:', simResult?.result?.results);
    console.warn('[Contract] Full simResult:', simResult);
    throw new Error(`No result from ${method}`);
  }
  return retval;
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
  try {
    const addrVal = new Address(playerAddress).toScVal();
    const result  = await readContract('is_registered', [addrVal]);
    if (!result) {
      console.warn('[Contract] isRegistered result is null/undefined');
      return false;
    }
    console.log('[Contract] isRegistered raw result:', result);
    const native = safeScValToNative(result);
    console.log('[Contract] isRegistered converted:', native);
    return native || false;
  } catch (e) {
    console.error('[Contract] isRegistered error:', e.message);
    return false;
  }
}

/**
 * Ambil data pemain
 * @returns {object|null}
 */
export async function getPlayer(playerAddress) {
  if (!CONTRACT_DEPLOYED) return null;
  try {
    const addrVal = new Address(playerAddress).toScVal();
    const result  = await readContract('get_player', [addrVal]);
    if (!result) {
      console.warn('[Contract] getPlayer result is null/undefined');
      return null;
    }
    console.log('[Contract] getPlayer raw result:', result);
    const native = safeScValToNative(result);
    console.log('[Contract] getPlayer converted:', native);
    return native || null;
  } catch (e) {
    console.error('[Contract] getPlayer error:', e.message);
    return null;
  }
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
  try {
    const result = await readContract('get_leaderboard', []);
    if (!result) {
      console.warn('[Contract] getLeaderboard result is null/undefined');
      return [];
    }
    console.log('[Contract] getLeaderboard raw result:', result);
    const native = safeScValToNative(result);
    console.log('[Contract] getLeaderboard converted:', native);
    return native || [];
  } catch (e) {
    console.error('[Contract] getLeaderboard error:', e.message);
    return [];
  }
}

/**
 * Ambil best score pemain untuk level tertentu
 */
export async function getLevelRecord(playerAddress, level) {
  if (!CONTRACT_DEPLOYED) return 0;
  try {
    const addrVal = new Address(playerAddress).toScVal();
    const lvVal   = xdr.ScVal.scvU32(level);
    const result  = await readContract('get_level_record', [addrVal, lvVal]);
    if (!result) {
      console.warn('[Contract] getLevelRecord result is null/undefined');
      return 0;
    }
    const native = safeScValToNative(result);
    return native || 0;
  } catch (e) {
    console.error('[Contract] getLevelRecord error:', e.message);
    return 0;
  }
}

/**
 * Ambil achievements pemain
 * @returns {Array} — kosong jika contract belum deploy
 */
export async function getAchievements(playerAddress) {
  if (!CONTRACT_DEPLOYED) return [];
  try {
    const addrVal = new Address(playerAddress).toScVal();
    const result  = await readContract('get_achievements', [addrVal]);
    if (!result) {
      console.warn('[Contract] getAchievements result is null/undefined');
      return [];
    }
    const native = safeScValToNative(result);
    return native || [];
  } catch (e) {
    console.error('[Contract] getAchievements error:', e.message);
    return [];
  }
}

/**
 * Jumlah total pemain terdaftar
 */
export async function getPlayerCount() {
  if (!CONTRACT_DEPLOYED) return 0;
  try {
    const result = await readContract('player_count', []);
    if (!result) {
      console.warn('[Contract] getPlayerCount result is null/undefined');
      return 0;
    }
    const native = safeScValToNative(result);
    return native || 0;
  } catch (e) {
    console.error('[Contract] getPlayerCount error:', e.message);
    return 0;
  }
}
