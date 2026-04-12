"use client";

import { useState } from "react";
import { Lock, ShieldCheck, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
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
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleCreateKeys() {
    if (password.length < 8) {
      setError(t("encryption.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("encryption.passwordsMustMatch"));
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
        err instanceof Error ? err.message : t("encryption.failedToCreate")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockKeys() {
    if (!password) {
      setError(t("encryption.enterPassword"));
      return;
    }
    if (!encryptedPrivateKey || !keySalt) {
      setError(t("encryption.noKeysFound"));
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
        setError(t("encryption.wrongPassword"));
        setLoading(false);
        return;
      }

      // Store decrypted secret key locally
      await storeSecretKeyLocally(userId, secretKey);

      onComplete();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("encryption.failedToUnlock")
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
              {t("encryption.unlockTitle")}
            </h2>
            <p className="text-fg mb-6 text-sm">
              {t("encryption.unlockDesc")}
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-fg mb-2">
              {t("encryption.setupTitle")}
            </h2>
            <p className="text-fg mb-4 text-sm">
              {t("encryption.setupDesc")}
            </p>
            <div className="info-box text-left mb-6">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-fg">
                    {t("encryption.endToEndEncrypted")}
                  </p>
                  <p className="text-xs text-fg mt-1">
                    {t("encryption.encryptionInfo")}
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
            <label className="label">{t("encryption.passwordLabel")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("encryption.passwordPlaceholder")}
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
              <label className="label">{t("encryption.confirmPasswordLabel")}</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("encryption.confirmPasswordPlaceholder")}
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
                ? t("encryption.decryptingButton")
                : t("encryption.unlockMessagesButton")
              : loading
              ? t("encryption.creatingKeysButton")
              : t("encryption.enableEncryptionButton")}
          </button>

          {!hasExistingKeys && (
            <div className="flex items-start gap-2 mt-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-fg-muted">
                {t("encryption.passwordReminder")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
