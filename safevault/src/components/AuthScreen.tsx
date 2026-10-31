import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useVault } from "../context/VaultContext";
import { generatePassphrase } from "../lib/crypto";
import { copyText } from "../lib/clipboard";
import { toast } from "../lib/toast";
import { Brand, BrandMark } from "./Brand";
import { RestoreBackupModal } from "./RestoreBackupModal";
import {
  AlertTriangle,
  Copy,
  Dice,
  Eye,
  Info,
  Key,
  Lock,
  ShieldCheck,
  Sparkles,
} from "./icons";
import { Button, Field, Input, PasswordInput, Segmented, StrengthMeter } from "./ui";

type UnlockMode = "password" | "pin";

export function AuthScreen() {
  const { status } = useVault();
  return status === "setup" ? <SetupScreen /> : <UnlockScreen />;
}

/* ------------------------------------------------------------------ */
/*  Première utilisation                                               */
/* ------------------------------------------------------------------ */

function SetupScreen() {
  const { createVault, busy } = useVault();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const tooShort = password.length < 10;
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const canSubmit = password.length >= 10 && confirmation === password && accepted && !busy;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);
    try {
      await createVault(password);
      toast("Coffre créé — bienvenue !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible.");
    }
  };

  const suggest = () => {
    const phrase = generatePassphrase(5);
    setPassword(phrase);
    setConfirmation(phrase);
    setSuggestion(phrase);
  };

  const copySuggestion = async () => {
    if (!suggestion) return;
    await copyText(suggestion, 0);
    toast("Phrase de passe copiée — conservez-la en lieu sûr");
  };

  return (
    <div className="auth">
      <div className="auth__aurora" aria-hidden="true" />
      <div className="auth__shell">
        <section className="auth__pitch">
          <Brand tagline="Mots de passe · Clés API · Notes" />
          <h1>
            Un seul coffre.
            <br />
            <span className="accent-text">Zéro connaissance.</span>
          </h1>
          <p className="auth__lead">
            Vos identifiants, clés API et notes confidentielles sont chiffrés sur votre appareil avec
            AES-256-GCM. Rien n'est envoyé sur Internet, aucun serveur ne détient votre clé.
          </p>
          <ul className="auth__features">
            <li>
              <ShieldCheck size={18} /> Chiffrement local, dérivé de votre mot de passe maître
            </li>
            <li>
              <Sparkles size={18} /> Générateur de mots de passe et d'audit de sécurité
            </li>
            <li>
              <Key size={18} /> Installable en application sur mobile et ordinateur
            </li>
          </ul>
          <button type="button" className="link-btn" onClick={() => setRestoreOpen(true)}>
            J'ai déjà une sauvegarde chiffrée →
          </button>
        </section>

        <section className="auth__card">
          <div className="auth__card-head">
            <span className="eyebrow">Première utilisation</span>
            <h2>Créez votre mot de passe maître</h2>
            <p>
              Il protège l'ensemble du coffre. Il n'est stocké nulle part et ne peut{" "}
              <strong>pas</strong> être récupéré.
            </p>
          </div>

          <form onSubmit={submit} className="stack">
            <Field label="Mot de passe maître">
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Au moins 10 caractères"
                autoComplete="new-password"
                autoFocus
              />
            </Field>

            <StrengthMeter password={password} />

            <Field
              label="Confirmation"
              error={mismatch ? "Les deux mots de passe ne correspondent pas." : null}
            >
              <PasswordInput
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
              />
            </Field>

            <div className="auth__actions">
              <Button type="button" variant="soft" size="sm" icon={<Dice size={16} />} onClick={suggest}>
                Proposer une phrase de passe
              </Button>
              {suggestion ? (
                <Button type="button" variant="ghost" size="sm" icon={<Copy size={15} />} onClick={copySuggestion}>
                  Copier la phrase
                </Button>
              ) : null}
            </div>

            {suggestion ? (
              <div className="callout callout--accent">
                <Info size={16} />
                <div>
                  <strong>Notez cette phrase maintenant :</strong>
                  <code className="passphrase">{suggestion}</code>
                  <button type="button" className="link-btn" onClick={() => setSuggestion(null)}>
                    Je l'ai notée
                  </button>
                </div>
              </div>
            ) : null}

            <label className="checkbox">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
              />
              <span>
                Je comprends que sans ce mot de passe (ou une sauvegarde), mes données sont définitivement
                inaccessibles.
              </span>
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <Button type="submit" size="lg" full loading={busy} disabled={!canSubmit} icon={<Lock size={18} />}>
              {busy ? "Chiffrement…" : "Créer mon coffre"}
            </Button>

            <p className="muted small center">
              {tooShort && password.length > 0
                ? "Encore un peu : 10 caractères minimum."
                : "Chiffrement AES-256-GCM · PBKDF2-SHA256 · 100 % local"}
            </p>
          </form>
        </section>
      </div>
      <RestoreBackupModal open={restoreOpen} onClose={() => setRestoreOpen(false)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Déverrouillage                                                     */
/* ------------------------------------------------------------------ */

function UnlockScreen() {
  const {
    unlock,
    unlockWithPin,
    busy,
    hasQuickUnlock,
    quickUnlockPinLength,
    updatedAt,
    storageMode,
  } = useVault();
  const [mode, setMode] = useState<UnlockMode>(hasQuickUnlock ? "pin" : "password");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  useEffect(() => {
    setMode(hasQuickUnlock ? "pin" : "password");
  }, [hasQuickUnlock]);

  const lastUpdate = useMemo(() => {
    if (!updatedAt) return null;
    return new Date(updatedAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }, [updatedAt]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      if (mode === "pin") {
        await unlockWithPin(pin);
      } else {
        await unlock(password);
      }
      setPassword("");
      setPin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Déverrouillage impossible.");
      setPin("");
    }
  };

  const onPinChange = async (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    setPin(digits);
    setError(null);
    if (digits.length === quickUnlockPinLength) {
      try {
        await unlockWithPin(digits);
        setPin("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Code PIN incorrect.");
        setPin("");
      }
    }
  };

  return (
    <div className="auth auth--center">
      <div className="auth__aurora" aria-hidden="true" />
      <div className="auth__unlock-card">
        <BrandMark size={64} />
        <h1 className="auth__unlock-title">Coffre verrouillé</h1>
        <p className="auth__unlock-sub">
          {lastUpdate ? `Dernière modification : ${lastUpdate}` : "Vos secrets restent chiffrés sur cet appareil."}
        </p>

        {hasQuickUnlock ? (
          <Segmented
            value={mode}
            onChange={(value) => {
              setMode(value);
              setError(null);
              setPin("");
              setPassword("");
            }}
            options={[
              { value: "pin", label: "Code PIN" },
              { value: "password", label: "Mot de passe maître" },
            ]}
          />
        ) : null}

        <form onSubmit={submit} className="stack">
          {mode === "pin" ? (
            <Field>
              <Input
                value={pin}
                onChange={(event) => void onPinChange(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                type="password"
                placeholder="••••••"
                className="pin-input"
                autoFocus
                aria-label="Code PIN"
              />
            </Field>
          ) : (
            <Field>
              <PasswordInput
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe maître"
                aria-label="Mot de passe maître"
                autoComplete="current-password"
                autoFocus
              />
            </Field>
          )}

          {error ? <p className="form-error">{error}</p> : null}

          <Button
            type="submit"
            size="lg"
            full
            loading={busy}
            icon={mode === "pin" ? <Key size={18} /> : <Lock size={18} />}
            disabled={mode === "pin" ? pin.length < 4 : password.length === 0}
          >
            {busy ? "Déchiffrement…" : "Déverrouiller"}
          </Button>
        </form>

        <div className="auth__links">
          <button type="button" className="link-btn" onClick={() => setForgotOpen(true)}>
            Mot de passe oublié ?
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" className="link-btn" onClick={() => setRestoreOpen(true)}>
            Restaurer une sauvegarde
          </button>
        </div>

        <div className="auth__meta">
          <span className={`pill ${storageMode === "indexeddb" ? "pill--ok" : "pill--warn"}`}>
            {storageMode === "indexeddb" ? "Stockage IndexedDB" : "Stockage de secours"}
          </span>
          <span className="pill">AES-256-GCM</span>
          <span className="pill">100 % hors ligne</span>
        </div>
      </div>

      {forgotOpen ? (
        <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setForgotOpen(false)}>
          <div className="modal__panel modal__panel--sm" role="dialog" aria-modal="true">
            <header className="modal__header">
              <div>
                <h2>Mot de passe oublié</h2>
                <p>Par conception, personne ne peut le récupérer.</p>
              </div>
            </header>
            <div className="modal__body stack">
              <div className="callout callout--warn">
                <AlertTriangle size={17} />
                <div>
                  Coffre applique un chiffrement à zéro connaissance : sans le mot de passe maître, les
                  données sont mathématiquement illisibles — y compris pour nous.
                </div>
              </div>
              <ul className="bullets">
                <li>Si vous avez exporté une sauvegarde, restaurez-la : elle s'ouvre avec son mot de passe.</li>
                <li>Sinon, utilisez « Code PIN » si le déverrouillage rapide est activé sur cet appareil.</li>
                <li>En dernier recours, créez un nouveau coffre : les données précédentes resteront chiffrées.</li>
              </ul>
              <div className="row row--end">
                <Button variant="ghost" onClick={() => setForgotOpen(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={() => {
                    setForgotOpen(false);
                    setRestoreOpen(true);
                  }}
                >
                  Restaurer une sauvegarde
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <RestoreBackupModal open={restoreOpen} onClose={() => setRestoreOpen(false)} />

      <p className="auth__footer">
        <Eye size={14} /> Aucune donnée ne quitte votre appareil — l'application fonctionne même sans
        connexion.
      </p>
    </div>
  );
}
