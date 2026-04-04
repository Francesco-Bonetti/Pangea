"use client";

import { useState } from "react";
import { Lock, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  generateKeyPair,
  encryptSecretKey,
  decryptSecretKey,
  storeSecretKeyLocally,
} from "@/lib/crypto";

interface KeySetupProps {
  userId: string;
  hasExistingKeys: boolean;
  encryptedPrivateKey?: string;
  keySalt?: string;
  onComplete: () => void;
}

export default function KeySetup({
  userId,
  hasExistingKeys,
  encryptedPrivateKey,
  keySalt,
  onComplete,
}: KeySetupProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleCreateKeys() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Generate new key pair
      const keyPair = generateKeyPair();

      // Encrypt secret key with password
      const { encrypted, salt } = await encryptSecretKey(
        keyPair.secretKey,
        password
      );

      // Store public key + encrypted private key in Supabase
      const { error: dbError } = await supabase.from("user_keys").upsert({
        user_id: userId,
        public_key: keyPair.publicKey,
        encrypted_private_key: encrypted,
        key_salt: salt,
        updated_at: new Date().toISOString(),
      });

      if (dbError) throw dbError;

      // Store decrypted secret key locally in IndexedDB
      await storeSecretKeyLocally(userId, keyPair.secretKey);

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create encryption keys."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockKeys() {
    if (!password) {
      setError("Please enter your encryption password.");
      return;
    }
    if (!encryptedPrivateKey || !keySalt) {
      setError("No encryption keys found. Please create new keys.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const secretKey = await decryptSecretKey(
        encryptedPrivateKey,
        keySalt,
        password
      );

      if (!secretKey) {
        setError("Wrong password. Please try again.");
        setLoading(false);
        return;
      }

      // Store decrypted secret key locally
      await storeSecretKeyLocally(userId, secretKey);

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to unlock encryption keys."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="card-static p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>

        {hasExistingKeys ? (
          <>
            <h2 className="text-xl font-bold text-fg mb-2">
              Unlock Your Messages
            </h2>
            <p className="text-fg mb-6 text-sm">
              Enter your encryption password to decrypt your messages.
              This password never leaves your device.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-fg mb-2">
              Set Up Encrypted Messaging
            </h2>
            <p className="text-fg mb-4 text-sm">
              Create an encryption password to protect your private messages.
              Messages are encrypted on your device before being sent — no one,
              not even the server, can read them.
            </p>
            <div className="info-box text-left mb-6">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-fg">
                    End-to-end encrypted
                  </p>
                  <p className="text-xs text-fg mt-1">
                    Your messages are encrypted with Curve25519-XSalsa20-Poly1305.
                    Only you and the recipient can read them. For example, if you
                    send &quot;Hello!&quot; to another citizen, the server only sees
                    random encrypted data like &quot;a8f3x9...&quot;.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-danger-tint border border-theme rounded-lg p-3 mb-4 text-left">
            <AlertTriangle className="w-4 h-4 text-fg-danger shrink-0" />
            <p className="text-sm text-fg-danger">{error}</p>
          </div>
        )}

        <div className="space-y-4 text-left">
          <div>
            <label className="label">Encryption Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="input-field pr-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    hasExistingKeys ? handleUnlockKeys() : undefined;
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {!hasExistingKeys && (
            <div>
              <label className="label">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="input-field"
              />
            </div>
          )}

          <button
            onClick={hasExistingKeys ? handleUnlockKeys : handleCreateKeys}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {hasExistingKeys
              ? loading
                ? "Decrypting..."
                : "Unlock Messages"
              : loading
              ? "Creating keys..."
              : "Enable Encrypted Messaging"}
          </button>

          {!hasExistingKeys && (
            <div className="flex items-start gap-2 mt-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-fg-muted">
                Remember this password. If you forget it, you will need to create
                new keys and old messages will become unreadable.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
