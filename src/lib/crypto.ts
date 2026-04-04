// ============================================
// E2E ENCRYPTION UTILITIES — tweetnacl
// Pangea — Direct Messages
// ============================================
// Uses tweetnacl box (Curve25519-XSalsa20-Poly1305)
// Server NEVER sees plaintext messages.
// ============================================

import nacl from "tweetnacl";
import {
  encodeBase64,
  decodeBase64,
  encodeUTF8,
  decodeUTF8,
} from "tweetnacl-util";

// ----- Key Generation -----

export interface KeyPair {
  publicKey: string; // base64
  secretKey: string; // base64
}

/**
 * Generate a new Curve25519 key pair for E2E encryption
 */
export function generateKeyPair(): KeyPair {
  const pair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(pair.publicKey),
    secretKey: encodeBase64(pair.secretKey),
  };
}

// ----- Password-based key derivation (for encrypting the private key at rest) -----

/**
 * Derive a 32-byte symmetric key from a password + salt using PBKDF2 (Web Crypto API)
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256 // 32 bytes
  );
  return new Uint8Array(bits);
}

/**
 * Encrypt the secret key with the user's password so it can be stored server-side.
 * Returns { encrypted, salt } both as base64 strings.
 */
export async function encryptSecretKey(
  secretKeyBase64: string,
  password: string
): Promise<{ encrypted: string; salt: string }> {
  const salt = nacl.randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const secretKeyBytes = decodeBase64(secretKeyBase64);
  const encrypted = nacl.secretbox(secretKeyBytes, nonce, derivedKey);

  // Combine nonce + encrypted for storage
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);

  return {
    encrypted: encodeBase64(combined),
    salt: encodeBase64(salt),
  };
}

/**
 * Decrypt the secret key using the user's password.
 * Returns the secret key as base64 string, or null if wrong password.
 */
export async function decryptSecretKey(
  encryptedBase64: string,
  saltBase64: string,
  password: string
): Promise<string | null> {
  const salt = decodeBase64(saltBase64);
  const derivedKey = await deriveKey(password, salt);
  const combined = decodeBase64(encryptedBase64);

  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = combined.slice(nacl.secretbox.nonceLength);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, derivedKey);
  if (!decrypted) return null; // wrong password

  return encodeBase64(decrypted);
}

// ----- Message Encryption / Decryption -----

export interface EncryptedMessage {
  encrypted: string; // base64
  nonce: string; // base64
}

/**
 * Encrypt a message for a specific recipient.
 * Uses nacl.box (authenticated public-key encryption).
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKeyBase64: string,
  senderSecretKeyBase64: string
): EncryptedMessage {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageBytes = decodeUTF8(plaintext);
  const recipientPk = decodeBase64(recipientPublicKeyBase64);
  const senderSk = decodeBase64(senderSecretKeyBase64);

  const encrypted = nacl.box(messageBytes, nonce, recipientPk, senderSk);

  return {
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt a message from a specific sender.
 * Returns the plaintext string, or null if decryption fails.
 */
export function decryptMessage(
  encryptedBase64: string,
  nonceBase64: string,
  senderPublicKeyBase64: string,
  recipientSecretKeyBase64: string
): string | null {
  const encrypted = decodeBase64(encryptedBase64);
  const nonce = decodeBase64(nonceBase64);
  const senderPk = decodeBase64(senderPublicKeyBase64);
  const recipientSk = decodeBase64(recipientSecretKeyBase64);

  const decrypted = nacl.box.open(encrypted, nonce, senderPk, recipientSk);
  if (!decrypted) return null;

  return encodeUTF8(decrypted);
}

// ----- Secret Key Storage (IndexedDB) -----

const DB_NAME = "agora_keys";
const STORE_NAME = "secret_keys";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store the decrypted secret key in IndexedDB (session-only, not persisted to server)
 */
export async function storeSecretKeyLocally(
  userId: string,
  secretKeyBase64: string
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put({ userId, secretKey: secretKeyBase64 });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieve the secret key from IndexedDB
 */
export async function getLocalSecretKey(
  userId: string
): Promise<string | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const request = tx.objectStore(STORE_NAME).get(userId);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result?.secretKey ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove the secret key from IndexedDB (on logout)
 */
export async function clearLocalSecretKey(userId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(userId);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
