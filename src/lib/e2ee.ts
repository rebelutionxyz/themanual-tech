import _sodium from 'libsodium-wrappers-sumo';
import { supabase } from './supabase';

/**
 * COMMS end-to-end encryption (v1) — zero-knowledge.
 *
 *  - Each Bee holds an X25519 identity keypair. The PUBLIC key is published to
 *    `bee_keys`; the SECRET key never leaves the device (IndexedDB). A recovery
 *    code moves the identity to a new device.
 *  - Each conversation has a random 256-bit content key (CK), sealed
 *    (crypto_box_seal) to every member's public key and stored per-member in
 *    `comms_conversation_keys`. Only that member's secret key opens it.
 *  - Message bodies are XChaCha20-Poly1305 under the CK, stored as
 *    `e2ee:v1:` + base64(nonce||ciphertext); `comms_send` is called with
 *    is_encrypted=true.
 *
 * The server only ever sees public keys, sealed blobs, and ciphertext.
 *
 * Key-distribution contract (important):
 *  - The conversation CREATOR calls `establishConversationKey` exactly once at
 *    create time (mints the CK, seals to all members who have published a key).
 *  - To key members who published later (or were added), a member who ALREADY
 *    holds the CK calls `resealConversationKey` (never mints — cannot clobber).
 *  - `getConversationKey` only reads; it never mints. A member with no key row
 *    yet shows "setting up encryption" until a holder reseals to them.
 */

let sodiumReady: Promise<typeof _sodium> | null = null;
async function S() {
  if (!sodiumReady) sodiumReady = _sodium.ready.then(() => _sodium);
  return sodiumReady;
}
function db() {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase;
}
function uniq(ids: string[]) {
  return Array.from(new Set(ids));
}

// ── device-local secret store (IndexedDB) ────────────────────────────────
const IDB_NAME = 'hc_comms_e2ee';
const IDB_STORE = 'identity';
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet(key: string): Promise<Uint8Array | null> {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const req = d.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(key: string, val: Uint8Array): Promise<void> {
  const d = await idb();
  return new Promise((resolve, reject) => {
    const req = d.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(val, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── identity ──────────────────────────────────────────────────────────────
export interface Identity {
  beeId: string;
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}
const identityCache = new Map<string, Identity>();

/** Load this Bee's identity, generating + publishing one on first use. Idempotent. */
export async function ensureIdentity(beeId: string): Promise<Identity> {
  const cached = identityCache.get(beeId);
  if (cached) return cached;
  const sodium = await S();
  let sk = await idbGet(`sk:${beeId}`);
  let pk = await idbGet(`pk:${beeId}`);
  if (!sk || !pk) {
    const kp = sodium.crypto_box_keypair();
    sk = kp.privateKey;
    pk = kp.publicKey;
    await idbPut(`sk:${beeId}`, sk);
    await idbPut(`pk:${beeId}`, pk);
  }
  const id: Identity = { beeId, publicKey: pk, privateKey: sk };
  identityCache.set(beeId, id);
  await ensurePublished(id); // self-healing: registry always has our current key
  return id;
}

async function ensurePublished(id: Identity) {
  const sodium = await S();
  const b64 = sodium.to_base64(id.publicKey, sodium.base64_variants.ORIGINAL);
  const { data } = await db().from('bee_keys').select('public_key').eq('bee_id', id.beeId).maybeSingle();
  if (!data || data.public_key !== b64) {
    await db().rpc('bee_publish_key', { p_public_key: b64, p_key_algo: 'x25519' });
  }
}

async function fetchPublicKeys(beeIds: string[]): Promise<Map<string, Uint8Array>> {
  const sodium = await S();
  const { data, error } = await db().from('bee_keys').select('bee_id, public_key').in('bee_id', beeIds);
  if (error) throw error;
  const m = new Map<string, Uint8Array>();
  for (const r of data ?? []) {
    m.set(r.bee_id, sodium.from_base64(r.public_key, sodium.base64_variants.ORIGINAL));
  }
  return m;
}

// ── per-conversation content key ────────────────────────────────────────────
const ckCache = new Map<string, Uint8Array>();

/** Read + unwrap my content key for a conversation. null if I have no key yet. */
export async function getConversationKey(beeId: string, conversationId: string): Promise<Uint8Array | null> {
  const cached = ckCache.get(conversationId);
  if (cached) return cached;
  const sodium = await S();
  const id = await ensureIdentity(beeId);
  const { data, error } = await db()
    .from('comms_conversation_keys')
    .select('wrapped_key, epoch')
    .eq('bee_id', beeId)
    .eq('conversation_id', conversationId)
    .order('epoch', { ascending: false })
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  const sealed = sodium.from_base64(row.wrapped_key, sodium.base64_variants.ORIGINAL);
  const ck = sodium.crypto_box_seal_open(sealed, id.publicKey, id.privateKey);
  if (!ck) throw new Error('could not open conversation key');
  ckCache.set(conversationId, ck);
  return ck;
}

async function sealToMembers(beeId: string, conversationId: string, memberBeeIds: string[], ck: Uint8Array) {
  const sodium = await S();
  const keys = await fetchPublicKeys(uniq([beeId, ...memberBeeIds]));
  const wrapped: { bee_id: string; wrapped_key: string }[] = [];
  for (const [id, pub] of keys) {
    const sealed = sodium.crypto_box_seal(ck, pub);
    wrapped.push({ bee_id: id, wrapped_key: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL) });
  }
  if (wrapped.length) {
    await db().rpc('comms_put_conversation_keys', {
      p_conversation_id: conversationId,
      p_epoch: 1,
      p_wrapped: wrapped,
    });
  }
  ckCache.set(conversationId, ck);
}

/** CREATE-TIME ONLY: mint a CK for a brand-new conversation and seal to members. */
export async function establishConversationKey(beeId: string, conversationId: string, memberBeeIds: string[]) {
  const sodium = await S();
  await ensureIdentity(beeId);
  const existing = await getConversationKey(beeId, conversationId);
  const ck = existing ?? sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES);
  await sealToMembers(beeId, conversationId, memberBeeIds, ck);
  return ck;
}

/** Re-seal the EXISTING CK to members (adds / late publishers). Never mints. */
export async function resealConversationKey(beeId: string, conversationId: string, memberBeeIds: string[]) {
  const ck = await getConversationKey(beeId, conversationId);
  if (!ck) throw new Error('no conversation key held; cannot reseal');
  await sealToMembers(beeId, conversationId, memberBeeIds, ck);
  return ck;
}

// ── call media key (LiveKit SFrame E2EE) ────────────────────────────────────
/**
 * Derive a deterministic LiveKit E2EE key (a shared-passphrase string) from the
 * conversation content key. Both members compute the same value locally from the
 * CK they already hold, so the media key is never transmitted and the LiveKit SFU
 * stays blind to the audio/video. Returns null when this device has no conversation
 * key yet — the call then falls back to transport-only (DTLS-SRTP), exactly as before.
 */
export async function deriveCallKey(
  beeId: string,
  conversationId: string,
  roomId: string,
): Promise<string | null> {
  const sodium = await S();
  const ck = await getConversationKey(beeId, conversationId);
  if (!ck) return null;
  const material = sodium.crypto_generichash(32, sodium.from_string(`livekit-e2ee:${roomId}`), ck);
  return sodium.to_base64(material, sodium.base64_variants.ORIGINAL);
}

// ── message body encrypt / decrypt ──────────────────────────────────────────
const ENC_PREFIX = 'e2ee:v1:';

export function isEncryptedBody(body: string): boolean {
  return typeof body === 'string' && body.startsWith(ENC_PREFIX);
}

export async function encryptBody(ck: Uint8Array, plaintext: string): Promise<string> {
  const sodium = await S();
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(sodium.from_string(plaintext), null, null, nonce, ck);
  const packed = new Uint8Array(nonce.length + ct.length);
  packed.set(nonce, 0);
  packed.set(ct, nonce.length);
  return ENC_PREFIX + sodium.to_base64(packed, sodium.base64_variants.ORIGINAL);
}

export async function decryptBody(ck: Uint8Array, body: string): Promise<string> {
  const sodium = await S();
  const packed = sodium.from_base64(body.slice(ENC_PREFIX.length), sodium.base64_variants.ORIGINAL);
  const npub = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = packed.slice(0, npub);
  const ct = packed.slice(npub);
  const pt = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ct, null, nonce, ck);
  return sodium.to_string(pt);
}

// ── recovery code (move identity to a new device) ───────────────────────────
/** Export the secret key as an offline recovery code. Show once; user stores it. */
export async function exportRecoveryCode(beeId: string): Promise<string> {
  const sodium = await S();
  const id = await ensureIdentity(beeId);
  return sodium.to_base64(id.privateKey, sodium.base64_variants.URLSAFE_NO_PADDING);
}

/** Restore an identity on a new device from a recovery code. */
export async function importRecoveryCode(beeId: string, code: string): Promise<void> {
  const sodium = await S();
  const sk = sodium.from_base64(code.trim(), sodium.base64_variants.URLSAFE_NO_PADDING);
  const pk = sodium.crypto_scalarmult_base(sk); // X25519 public from secret
  await idbPut(`sk:${beeId}`, sk);
  await idbPut(`pk:${beeId}`, pk);
  identityCache.delete(beeId);
  ckCache.clear();
  await ensurePublished({ beeId, publicKey: pk, privateKey: sk });
}
