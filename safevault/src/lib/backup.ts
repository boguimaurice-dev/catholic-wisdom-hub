import { isVaultEnvelope } from "./storage";
import type { VaultEnvelope } from "./types";

export function downloadBackup(envelope: VaultEnvelope): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `coffre-sauvegarde-${stamp}.json`;
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}

export async function parseBackupFile(file: File): Promise<VaultEnvelope> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde valide (JSON illisible).");
  }
  if (!isVaultEnvelope(parsed)) {
    throw new Error("Ce fichier n'est pas une sauvegarde Coffre reconnue.");
  }
  return parsed;
}
