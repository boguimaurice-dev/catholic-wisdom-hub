import { useState } from "react";
import { useVault } from "../context/VaultContext";
import { downloadBackup } from "../lib/backup";
import { toast } from "../lib/toast";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { RestoreBackupModal } from "./RestoreBackupModal";
import {
  AlertTriangle,
  Check,
  Download,
  Info,
  Key,
  Lock,
  Moon,
  Smartphone,
  Sun,
  Upload,
} from "./icons";
import { Badge, Button, Field, Input, Modal, PasswordInput, Segmented, StrengthMeter } from "./ui";

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: "Après 1 minute" },
  { value: 2, label: "Après 2 minutes" },
  { value: 5, label: "Après 5 minutes" },
  { value: 10, label: "Après 10 minutes" },
  { value: 15, label: "Après 15 minutes" },
  { value: 30, label: "Après 30 minutes" },
  { value: 60, label: "Après 1 heure" },
  { value: 0, label: "Jamais (déconseillé)" },
];

const COPY_OPTIONS = [
  { value: 15, label: "Après 15 secondes" },
  { value: 30, label: "Après 30 secondes" },
  { value: 60, label: "Après 1 minute" },
  { value: 120, label: "Après 2 minutes" },
  { value: 0, label: "Ne jamais effacer" },
];

export function SettingsPanel() {
  const {
    items,
    settings,
    updateSettings,
    hasQuickUnlock,
    storageMode,
    createdAt,
    updatedAt,
    buildBackup,
    wipe,
  } = useVault();
  const mode = storageMode;
  const { canInstall, isStandalone, isIos, install } = useInstallPrompt();

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);

  const handleExport = () => {
    try {
      const filename = downloadBackup(buildBackup());
      toast(`Sauvegarde téléchargée : ${filename}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export impossible.", "error");
    }
  };

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted") toast("Coffre est en cours d'installation");
    if (outcome === "dismissed") toast("Installation annulée", "info");
    if (outcome === "unavailable") toast("Utilisez le menu du navigateur → « Installer l'application »", "info");
  };

  const formatDate = (value: number | null) =>
    value
      ? new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
      : "—";

  return (
    <div className="panel">
      <header className="panel__head">
        <div>
          <span className="eyebrow">Réglages</span>
          <h2>Préférences & sécurité</h2>
          <p className="muted">Tous les réglages restent sur cet appareil.</p>
        </div>
      </header>

      <section className="settings-card">
        <h3>
          <Lock size={17} /> Verrouillage & presse-papiers
        </h3>
        <div className="settings-grid">
          <Field label="Verrouillage automatique" hint="Après une période d'inactivité.">
            <select
              className="input select"
              value={settings.autoLockMinutes}
              onChange={(event) => updateSettings({ autoLockMinutes: Number(event.target.value) })}
            >
              {AUTO_LOCK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effacer le presse-papiers" hint="Après la copie d'un secret.">
            <select
              className="input select"
              value={settings.copyClearSeconds}
              onChange={(event) => updateSettings({ copyClearSeconds: Number(event.target.value) })}
            >
              {COPY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="settings-row">
          <div>
            <strong>Déverrouillage rapide par code PIN</strong>
            <p className="muted small">
              {hasQuickUnlock
                ? "Activé : un code PIN déverrouille la session après le premier déverrouillage."
                : "Facultatif. Le code PIN ne remplace pas le mot de passe maître pour la sauvegarde."}
            </p>
          </div>
          {hasQuickUnlock ? (
            <div className="row">
              <Badge tone="accent">Activé</Badge>
              <Button variant="soft" size="sm" onClick={() => setPinOpen(true)}>
                Modifier / désactiver
              </Button>
            </div>
          ) : (
            <Button variant="soft" size="sm" icon={<Key size={15} />} onClick={() => setPinOpen(true)}>
              Activer
            </Button>
          )}
        </div>
      </section>

      <section className="settings-card">
        <h3>
          <Key size={17} /> Sécurité du coffre
        </h3>
        <div className="settings-row">
          <div>
            <strong>Changer le mot de passe maître</strong>
            <p className="muted small">
              Le coffre est re-chiffré avec une nouvelle clé dérivée (PBKDF2-SHA256). Le déverrouillage
              rapide sera désactivé.
            </p>
          </div>
          <Button variant="soft" size="sm" onClick={() => setPasswordOpen(true)}>
            Modifier
          </Button>
        </div>
        <div className="settings-row settings-row--danger">
          <div>
            <strong>Supprimer le coffre de cet appareil</strong>
            <p className="muted small">
              Efface le coffre chiffré local. Sans sauvegarde, les données sont définitivement perdues.
            </p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setWipeOpen(true)}>
            Supprimer
          </Button>
        </div>
      </section>

      <section className="settings-card">
        <h3>
          <Sun size={17} /> Apparence
        </h3>
        <div className="settings-row">
          <div>
            <strong>Thème</strong>
            <p className="muted small">Le mode sombre réduit la visibilité de l'écran.</p>
          </div>
          <Segmented
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: "dark", label: "Sombre" },
              { value: "light", label: "Clair" },
            ]}
          />
        </div>
        <div className="settings-icons">
          <Moon size={14} /> <span className="muted small">Préférence enregistrée localement.</span>
        </div>
      </section>

      <section className="settings-card">
        <h3>
          <Download size={17} /> Sauvegarde chiffrée
        </h3>
        <div className="settings-row">
          <div>
            <strong>Exporter le coffre</strong>
            <p className="muted small">
              Fichier JSON déjà chiffré : il ne s'ouvre qu'avec votre mot de passe maître. C'est le moyen de
              transférer vos secrets vers un autre appareil.
            </p>
          </div>
          <Button variant="soft" size="sm" icon={<Download size={15} />} onClick={handleExport}>
            Exporter
          </Button>
        </div>
        <div className="settings-row">
          <div>
            <strong>Restaurer une sauvegarde</strong>
            <p className="muted small">Remplace le coffre actuel après vérification du mot de passe.</p>
          </div>
          <Button variant="soft" size="sm" icon={<Upload size={15} />} onClick={() => setRestoreOpen(true)}>
            Importer
          </Button>
        </div>
        <div className="settings-stats">
          <span>{items.length} secret(s)</span>
          <span>Créé le {formatDate(createdAt)}</span>
          <span>Dernière écriture {formatDate(updatedAt)}</span>
          <span>Stockage : {mode === "indexeddb" ? "IndexedDB" : "localStorage"}</span>
        </div>
        {storageMode === "localstorage" ? (
          <div className="callout callout--warn">
            <AlertTriangle size={16} />
            <div>
              Le stockage IndexedDB est indisponible (navigation privée ?). Le coffre est conservé dans un
              stockage de secours, plus limité en taille.
            </div>
          </div>
        ) : null}
      </section>

      <section className="settings-card">
        <h3>
          <Smartphone size={17} /> Installer l'application
        </h3>
        {isStandalone ? (
          <div className="callout callout--success">
            <Check size={18} />
            <div>
              <strong>Coffre est installé sur cet appareil.</strong>
              <p>Il fonctionne hors ligne et s'ouvre comme une application native.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="settings-row">
              <div>
                <strong>Ajouter à l'écran d'accueil</strong>
                <p className="muted small">Android, iPhone, iPad, Windows, macOS et ChromeOS.</p>
              </div>
              {canInstall ? (
                <Button size="sm" icon={<Smartphone size={15} />} onClick={() => void handleInstall()}>
                  Installer
                </Button>
              ) : null}
            </div>
            <ol className="bullets">
              {isIos ? (
                <>
                  <li>Ouvrez Coffre dans Safari.</li>
                  <li>
                    Touchez le bouton Partager <em>(carré avec une flèche)</em>.
                  </li>
                  <li>Choisissez « Sur l'écran d'accueil ».</li>
                </>
              ) : canInstall ? (
                <>
                  <li>Touchez « Installer » ci-dessus.</li>
                  <li>Confirmez l'installation dans l'invite du navigateur.</li>
                  <li>L'icône Coffre apparaît sur votre écran d'accueil.</li>
                </>
              ) : (
                <>
                  <li>Ouvrez le menu du navigateur (⋮ ou •••).</li>
                  <li>Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil ».</li>
                  <li>Confirmez : Coffre s'ouvrira en plein écran, même hors ligne.</li>
                </>
              )}
            </ol>
          </>
        )}
      </section>

      <section className="settings-card settings-card--about">
        <h3>
          <Info size={17} /> À propos
        </h3>
        <p className="muted small">
          <strong>Coffre</strong> — version 1.0.0. Chiffrement AES-256-GCM, clé dérivée par PBKDF2-SHA256
          (600 000 itérations) et sel unique. Aucune donnée ne quitte l'appareil, aucune requête réseau
          n'est nécessaire au fonctionnement. Code source de l'application disponible dans le dépôt.
        </p>
        <p className="muted small">
          Rappel : un gestionnaire de mots de passe ne protège que si l'appareil est lui-même protégé
          (code de déverrouillage, mises à jour, pas de root/jailbreak).
        </p>
      </section>

      <RestoreBackupModal open={restoreOpen} onClose={() => setRestoreOpen(false)} />
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <PinModal open={pinOpen} onClose={() => setPinOpen(false)} />
      <WipeModal open={wipeOpen} onClose={() => setWipeOpen(false)} onWipe={wipe} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modales                                                            */
/* ------------------------------------------------------------------ */

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changeMasterPassword, busy } = useVault();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirmation("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (next.length < 10) {
      setError("Le nouveau mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    if (next !== confirmation) {
      setError("La confirmation ne correspond pas.");
      return;
    }
    try {
      await changeMasterPassword(current, next);
      toast("Mot de passe maître mis à jour");
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification impossible.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Changer le mot de passe maître"
      subtitle="Le coffre sera re-chiffré immédiatement"
      size="sm"
      dismissible={false}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button onClick={submit} loading={busy} disabled={!current || !next}>
            Mettre à jour
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Mot de passe actuel">
          <PasswordInput
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
          />
        </Field>
        <Field label="Nouveau mot de passe">
          <PasswordInput
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
        <StrengthMeter password={next} showAdvice={false} />
        <Field label="Confirmation">
          <PasswordInput
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
          />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="callout callout--warn">
          <AlertTriangle size={16} />
          <div>
            Pensez à ré-exporter une sauvegarde après cette opération : les anciennes sauvegardes restent
            liées à l'ancien mot de passe.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PinModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setQuickUnlock, disableQuickUnlock, hasQuickUnlock, busy } = useVault();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPin("");
    setConfirmation("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!/^\d{6,12}$/.test(pin)) {
      setError("Le code PIN doit contenir de 6 à 12 chiffres.");
      return;
    }
    if (pin !== confirmation) {
      setError("Les deux codes PIN ne correspondent pas.");
      return;
    }
    try {
      await setQuickUnlock(pin);
      toast("Déverrouillage rapide activé");
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Activation impossible.");
    }
  };

  const disable = async () => {
    await disableQuickUnlock();
    toast("Déverrouillage rapide désactivé");
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={hasQuickUnlock ? "Code PIN de déverrouillage" : "Activer le déverrouillage rapide"}
      subtitle="La clé du coffre est emballée par votre code PIN"
      size="sm"
      dismissible={false}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          {hasQuickUnlock ? (
            <>
              <Button variant="danger" onClick={disable}>
                Désactiver
              </Button>
              <Button onClick={submit} loading={busy}>
                Remplacer le PIN
              </Button>
            </>
          ) : (
            <Button onClick={submit} loading={busy}>
              Activer
            </Button>
          )}
        </>
      }
    >
      <div className="stack">
        <Field label="Code PIN" hint="6 à 12 chiffres, uniquement sur cet appareil.">
          <Input
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 12))}
            inputMode="numeric"
            autoComplete="off"
            className="pin-input"
            placeholder="••••••"
          />
        </Field>
        <Field label="Confirmation">
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 12))}
            inputMode="numeric"
            autoComplete="off"
            className="pin-input"
            placeholder="••••••"
          />
        </Field>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="callout callout--info">
          <Info size={16} />
          <div>
            Le PIN est une commodité : un code court reste plus facile à deviner qu'un long mot de passe.
            Utilisez au moins 6 chiffres et gardez votre sauvegarde chiffrée à portée de main.
          </div>
        </div>
      </div>
    </Modal>
  );
}

function WipeModal({
  open,
  onClose,
  onWipe,
}: {
  open: boolean;
  onClose: () => void;
  onWipe: () => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const close = () => {
    setText("");
    onClose();
  };

  const submit = async () => {
    if (text.trim().toUpperCase() !== "SUPPRIMER") return;
    setBusy(true);
    try {
      await onWipe();
      toast("Coffre supprimé de cet appareil", "info");
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Supprimer le coffre"
      size="sm"
      dismissible={false}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button
            variant="danger"
            onClick={submit}
            loading={busy}
            disabled={text.trim().toUpperCase() !== "SUPPRIMER"}
          >
            Supprimer définitivement
          </Button>
        </>
      }
    >
      <div className="stack">
        <div className="callout callout--warn">
          <AlertTriangle size={17} />
          <div>
            Cette action efface le coffre chiffré de cet appareil, y compris le code PIN de déverrouillage
            rapide. Sans sauvegarde, aucune récupération n'est possible.
          </div>
        </div>
        <Field label="Tapez SUPPRIMER pour confirmer">
          <Input value={text} onChange={(event) => setText(event.target.value)} autoFocus />
        </Field>
      </div>
    </Modal>
  );
}
