export type ItemType = "login" | "apikey" | "note";

export interface CustomField {
  id: string;
  label: string;
  value: string;
  secret: boolean;
}

export interface VaultItem {
  id: string;
  type: ItemType;
  title: string;
  username: string;
  /** Mot de passe, clé API ou contenu de la note selon le type. */
  secret: string;
  url: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  customFields: CustomField[];
  createdAt: number;
  updatedAt: number;
  secretUpdatedAt: number;
}

export interface VaultData {
  createdAt: number;
  items: VaultItem[];
}

export interface KdfParams {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  /** Sel aléatoire en base64. */
  salt: string;
}

export interface EncryptedBlob {
  /** Vecteur d'initialisation en base64. */
  iv: string;
  /** Données chiffrées (AES-256-GCM) en base64. */
  data: string;
}

export interface QuickUnlock {
  /** Clé du coffre emballée par la clé dérivée du code PIN. */
  wrappedKey: EncryptedBlob;
  kdf: KdfParams;
  pinLength: number;
}

export interface VaultEnvelope {
  format: "coffre.vault";
  version: 1;
  kdf: KdfParams;
  payload: EncryptedBlob;
  quickUnlock: QuickUnlock | null;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  autoLockMinutes: number;
  copyClearSeconds: number;
  theme: "dark" | "light";
}

export interface ItemInput {
  type: ItemType;
  title: string;
  username: string;
  secret: string;
  url: string;
  notes: string;
  tags: string[];
  favorite: boolean;
  customFields: CustomField[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoLockMinutes: 5,
  copyClearSeconds: 30,
  theme: "dark",
};

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  login: "Connexion",
  apikey: "Clé API",
  note: "Note sécurisée",
};
