// =============================================================
// Stellar Wallet Integration (Freighter)
// Minimal & robust — hanya gunakan requestAccess + getPublicKey
// =============================================================
import {
  requestAccess,
  getPublicKey as freighterGetPublicKey,
  signTransaction as freighterSignTx,
} from '@stellar/freighter-api';

let walletAddress = null;
let _isConnected = false;

/**
 * Connect ke Freighter wallet.
 * Langsung panggil requestAccess() — Freighter akan handle
 * detection, popup, dan permission secara internal.
 * @returns {string} publicKey / alamat akun
 */
export async function connectWallet() {
  try {
    console.log('[Wallet] Calling requestAccess()...');

    // requestAccess() membuka popup Freighter.
    // v4 API: bisa return string (publicKey) atau object { publicKey }
    const accessResult = await requestAccess();
    console.log('[Wallet] requestAccess result:', accessResult, typeof accessResult);

    // Coba ambil address dari accessResult
    let address = null;
    if (typeof accessResult === 'string' && accessResult.length > 10) {
      // versi lama: return langsung string publicKey
      address = accessResult;
    } else if (accessResult && typeof accessResult === 'object') {
      if (accessResult.error) {
        throw new Error(String(accessResult.error));
      }
      address = accessResult.publicKey || accessResult.address || null;
    }

    // Fallback: coba getPublicKey() jika requestAccess tidak return key
    if (!address) {
      console.log('[Wallet] Trying getPublicKey() as fallback...');
      const keyResult = await freighterGetPublicKey();
      console.log('[Wallet] getPublicKey result:', keyResult, typeof keyResult);

      if (typeof keyResult === 'string' && keyResult.length > 10) {
        address = keyResult;
      } else if (keyResult && typeof keyResult === 'object') {
        if (keyResult.error) throw new Error(String(keyResult.error));
        address = keyResult.publicKey || keyResult.address || null;
      }
    }

    if (!address || typeof address !== 'string') {
      throw new Error('Public key tidak valid atau kosong dari Freighter.');
    }

    console.log('[Wallet] Connected! Address:', address);
    walletAddress = address;
    _isConnected = true;

    // ── Update UI wallet bar (diluar Phaser) ──
    const btn    = document.getElementById('connect-btn');
    const addrEl = document.getElementById('wallet-address');

    if (btn) {
      btn.textContent = 'CONNECTED ✓';
      btn.classList.add('connected');
      btn.disabled = false;
    }
    if (addrEl) {
      addrEl.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    return address;

  } catch (err) {
    console.error('[Wallet] Connect failed:', err);

    const msg = err?.message || String(err);

    // Pesan error yang ramah sesuai kondisi
    if (msg.includes('User declined') || msg.includes('rejected') ||
        msg.includes('cancel') || msg.includes('denied')) {
      throw new Error('Koneksi dibatalkan.\nKlik "Allow" saat popup Freighter muncul.');
    }
    if (msg.includes('not installed') || msg.includes('not found') ||
        msg.includes('Cannot read') || msg.includes('undefined')) {
      throw new Error(
        'Freighter extension tidak aktif.\n' +
        'Pastikan:\n1. Extension Freighter terinstall\n2. Izinkan akses ke localhost:3000'
      );
    }
    // Rethrow apa adanya dengan prefix
    throw new Error(`Freighter error: ${msg}`);
  }
}

/**
 * Sign transaksi menggunakan Freighter
 */
export async function signTransaction(xdr, network = 'TESTNET') {
  try {
    const networkPassphrase =
      network === 'TESTNET'
        ? 'Test SDF Network ; September 2015'
        : 'Public Global Stellar Network ; September 2015';

    const result = await freighterSignTx(xdr, { networkPassphrase });

    if (result && typeof result === 'object' && result.error) {
      throw new Error(result.error);
    }

    return result?.signedTxXdr || result;
  } catch (err) {
    console.error('[Wallet] Sign error:', err);
    throw err;
  }
}

export function getWalletAddress() { return walletAddress; }
export function getIsConnected()   { return _isConnected; }

/**
 * Diagnostic: Test wallet dapat sign transactions
 */
export async function diagnoseWallet() {
  console.log('%c=== WALLET DIAGNOSTICS ===', 'color: #0891b2; font-weight: bold');
  console.log('Wallet Address:', walletAddress);
  console.log('Is Connected:', _isConnected);
  
  if (!_isConnected) {
    console.warn('⚠️  Wallet not connected yet');
    return false;
  }
  
  console.log('✅ Wallet is connected');
  return true;
}
