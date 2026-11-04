import { useRef, useState } from "react";
import { useVault } from "../context/VaultContext";
import { parseBackupFile } from "../lib/backup";
import { toast } from "../lib/toast";
import type { VaultEnvelope } from "../lib/types";
import { Info, Upload } from "./icons";
import { Button, Field, Input, Modal } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RestoreBackupModal({ open, onClose }: Props) {
  const { restoreBackup, busy } = useVault();
  const inputRef = useRef<HTMLInputElement>(null);
  const [envelope, setEnvelope] = useState<VaultEnvelope | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setEnvelope(null);
    setFileName("");
    setPassword("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const parsed = await parseBackupFile(file);
      setEnvelope(parsed);
      setFileName(file.name);
    } catch (err) {
      setEnvelope(null);
      setFileName("");
      setError(err instanceof Error ? err.message : "Fichier illisible.");
    }
  };

  const handleRestore = async () => {
    if (!envelope) return;
    setError(null);
    try {
      await restoreBackup(envelope, password);
      toast("Coffre restauré");
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restauration impossible.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Restaurer une sauvegarde"
      subtitle="Fichier chiffré .json exporté depuis Coffre"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button onClick={handleRestore} loading={busy} disabled={!envelope || password.length === 0}>
            Restaurer
          </Button>
        </>
      }
    >
      <div className="stack">
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <button type="button" className="dropzone" onClick={() => inputRef.current?.click()}>
          <Upload size={22} />
          <span>{fileName || "Choisir un fichier de sauvegarde"}</span>
          <small>{envelope ? "Fichier reconnu — saisissez le mot de passe maître associé." : "Format .json"}</small>
        </button>

        {envelope ? (
          <div className="callout callout--info">
            <Info size={16} />
            <div>
              Sauvegarde du{" "}
              {new Date(envelope.updatedAt).toLocaleString("fr-FR", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              . Le mot de passe maître est celui utilisé lors de l'export.
            </div>
          </div>
        ) : null}

        <Field label="Mot de passe maître de la sauvegarde" error={error}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="••••••••••••"
          />
        </Field>

        <p className="muted small">
          Attention : restaurer une sauvegarde remplace le coffre actuellement présent sur cet appareil.
        </p>
      </div>
    </Modal>
  );
}
