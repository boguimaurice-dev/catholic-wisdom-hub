import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createKdf,
  decryptBytes,
  encryptBytes,
  decryptJson,
  deriveAesKey,
  encryptJson,
  exportRawKey,
  importRawKey,
  pinKdf,
  randomId,
} from "../lib/crypto";
import {
  clearEnvelope,
  detectStorageMode,
  readEnvelope,
  readSettings,
  writeEnvelope,
  writeSettings,
  type StorageMode,
} from "../lib/storage";
import type {
  AppSettings,
  EncryptedBlob,
  ItemInput,
  QuickUnlock,
  VaultData,
  VaultEnvelope,
  VaultItem,
} from "../lib/types";

export type VaultStatus = "loading" | "setup" | "locked" | "unlocked";

interface VaultContextValue {
  status: VaultStatus;
  items: VaultItem[];
  settings: AppSettings;
  storageMode: StorageMode;
  hasQuickUnlock: boolean;
  quickUnlockPinLength: number;
  createdAt: number | null;
  updatedAt: number | null;
  busy: boolean;
  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  lock: () => void;
  addItem: (input: ItemInput) => Promise<VaultItem>;
  updateItem: (id: string, input: ItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  changeMasterPassword: (current: string, next: string) => Promise<void>;
  setQuickUnlock: (pin: string) => Promise<void>;
  disableQuickUnlock: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => void;
  buildBackup: () => VaultEnvelope;
  restoreBackup: (envelope: VaultEnvelope, password: string) => Promise<void>;
  wipe: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>("loading");
  const [items, setItems] = useState<VaultItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => readSettings());
  const [storageMode, setStorageMode] = useState<StorageMode>("indexeddb");
  const [createdAt, setCreatedAt] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [hasQuickUnlock, setHasQuickUnlock] = useState(false);
  const [quickUnlockPinLength, setQuickUnlockPinLength] = useState(6);
  const [busy, setBusy] = useState(false);

  const keyRef = useRef<CryptoKey | null>(null);
  const envelopeRef = useRef<VaultEnvelope | null>(null);
  const itemsRef = useRef<VaultItem[]>([]);

  /* -------------------------------------------------------------- */
  /*  Initialisation                                                */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [mode, envelope] = await Promise.all([detectStorageMode(), readEnvelope()]);
      if (cancelled) return;
      setStorageMode(mode);
      if (!envelope) {
        setStatus("setup");
        return;
      }
      envelopeRef.current = envelope;
      setCreatedAt(envelope.createdAt);
      setUpdatedAt(envelope.updatedAt);
      setHasQuickUnlock(Boolean(envelope.quickUnlock));
      setQuickUnlockPinLength(envelope.quickUnlock?.pinLength ?? 6);
      setStatus("locked");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------------- */
  /*  Thème                                                         */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", settings.theme === "light" ? "#f5f7f6" : "#080b10");
  }, [settings.theme]);

  const persist = useCallback(async (nextItems: VaultItem[]) => {
    const key = keyRef.current;
    const envelope = envelopeRef.current;
    if (!key || !envelope) return;
    const now = Date.now();
    const data: VaultData = { createdAt: envelope.createdAt, items: nextItems };
    const payload = await encryptJson(key, data);
    const nextEnvelope: VaultEnvelope = { ...envelope, payload, updatedAt: now };
    await writeEnvelope(nextEnvelope);
    envelopeRef.current = nextEnvelope;
    setUpdatedAt(now);
  }, []);

  const commit = useCallback(
    async (nextItems: VaultItem[]) => {
      itemsRef.current = nextItems;
      setItems(nextItems);
      await persist(nextItems);
    },
    [persist],
  );

  const applyKey = useCallback((key: CryptoKey, data: VaultData) => {
    keyRef.current = key;
    itemsRef.current = data.items;
    setItems(data.items);
    setCreatedAt(data.createdAt);
    setStatus("unlocked");
  }, []);

  const runBusy = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await task();
    } finally {
      setBusy(false);
    }
  }, []);

  /* -------------------------------------------------------------- */
  /*  Création / déverrouillage                                     */
  /* -------------------------------------------------------------- */
  const createVault = useCallback(
    async (password: string) => {
      await runBusy(async () => {
        const kdf = createKdf();
        const key = await deriveAesKey(password, kdf);
        const now = Date.now();
        const data: VaultData = { createdAt: now, items: [] };
        const payload = await encryptJson(key, data);
        const envelope: VaultEnvelope = {
          format: "coffre.vault",
          version: 1,
          kdf,
          payload,
          quickUnlock: null,
          createdAt: now,
          updatedAt: now,
        };
        await writeEnvelope(envelope);
        envelopeRef.current = envelope;
        setUpdatedAt(now);
        setHasQuickUnlock(false);
        applyKey(key, data);
      });
    },
    [applyKey, runBusy],
  );

  const unlock = useCallback(
    async (password: string) => {
      await runBusy(async () => {
        const envelope = envelopeRef.current ?? (await readEnvelope());
        if (!envelope) {
          setStatus("setup");
          return;
        }
        envelopeRef.current = envelope;
        const key = await deriveAesKey(password, envelope.kdf);
        let data: VaultData;
        try {
          data = await decryptJson<VaultData>(key, envelope.payload);
        } catch {
          throw new Error("Mot de passe maître incorrect.");
        }
        setCreatedAt(envelope.createdAt);
        setUpdatedAt(envelope.updatedAt);
        setHasQuickUnlock(Boolean(envelope.quickUnlock));
        applyKey(key, data);
      });
    },
    [applyKey, runBusy],
  );

  const unlockWithPin = useCallback(
    async (pin: string) => {
      await runBusy(async () => {
        const envelope = envelopeRef.current ?? (await readEnvelope());
        const quick: QuickUnlock | null = envelope?.quickUnlock ?? null;
        if (!envelope || !quick) throw new Error("Le déverrouillage rapide n'est pas activé.");
        const pinKey = await deriveAesKey(pin, quick.kdf);
        let raw: Uint8Array;
        try {
          raw = await decryptBytes(pinKey, quick.wrappedKey);
        } catch {
          throw new Error("Code PIN incorrect.");
        }
        const key = await importRawKey(raw);
        let data: VaultData;
        try {
          data = await decryptJson<VaultData>(key, envelope.payload);
        } catch {
          throw new Error("Coffre illisible : restaurez une sauvegarde.");
        }
        setCreatedAt(envelope.createdAt);
        setUpdatedAt(envelope.updatedAt);
        applyKey(key, data);
      });
    },
    [applyKey, runBusy],
  );

  const lock = useCallback(() => {
    keyRef.current = null;
    itemsRef.current = [];
    setItems([]);
    setStatus("locked");
  }, []);

  /* -------------------------------------------------------------- */
  /*  Verrouillage automatique                                      */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    if (status !== "unlocked") return;
    const minutes = settings.autoLockMinutes;
    if (!minutes) return;
    const timeout = minutes * 60_000;
    let lastActivity = Date.now();
    let hiddenAt: number | null = null;

    const bump = () => {
      lastActivity = Date.now();
    };
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt >= timeout) {
        lock();
      } else {
        bump();
      }
    };

    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "wheel"];
    events.forEach((event) => window.addEventListener(event, bump, { passive: true }));
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivity >= timeout) lock();
    }, 5000);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      events.forEach((event) => window.removeEventListener(event, bump));
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [lock, settings.autoLockMinutes, status]);

  /* -------------------------------------------------------------- */
  /*  Éléments                                                      */
  /* -------------------------------------------------------------- */
  const addItem = useCallback(
    async (input: ItemInput) => {
      const now = Date.now();
      const item: VaultItem = {
        ...input,
        id: randomId(),
        createdAt: now,
        updatedAt: now,
        secretUpdatedAt: now,
      };
      await commit([item, ...itemsRef.current]);
      return item;
    },
    [commit],
  );

  const updateItem = useCallback(
    async (id: string, input: ItemInput) => {
      const now = Date.now();
      const next = itemsRef.current.map((item) => {
        if (item.id !== id) return item;
        const secretChanged = item.secret !== input.secret;
        return {
          ...item,
          ...input,
          updatedAt: now,
          secretUpdatedAt: secretChanged ? now : item.secretUpdatedAt,
        };
      });
      await commit(next);
    },
    [commit],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await commit(itemsRef.current.filter((item) => item.id !== id));
    },
    [commit],
  );

  const toggleFavorite = useCallback(
    async (id: string) => {
      const next = itemsRef.current.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item,
      );
      await commit(next);
    },
    [commit],
  );

  /* -------------------------------------------------------------- */
  /*  Mot de passe maître & déverrouillage rapide                    */
  /* -------------------------------------------------------------- */
  const changeMasterPassword = useCallback(
    async (current: string, next: string) => {
      await runBusy(async () => {
        const envelope = envelopeRef.current;
        if (!envelope) throw new Error("Coffre indisponible.");
        const currentKey = await deriveAesKey(current, envelope.kdf);
        let data: VaultData;
        try {
          data = await decryptJson<VaultData>(currentKey, envelope.payload);
        } catch {
          throw new Error("Mot de passe actuel incorrect.");
        }
        const kdf = createKdf();
        const newKey = await deriveAesKey(next, kdf);
        const payload = await encryptJson(newKey, { ...data, items: itemsRef.current });
        const now = Date.now();
        const nextEnvelope: VaultEnvelope = {
          ...envelope,
          kdf,
          payload,
          quickUnlock: null,
          updatedAt: now,
        };
        await writeEnvelope(nextEnvelope);
        envelopeRef.current = nextEnvelope;
        keyRef.current = newKey;
        setHasQuickUnlock(false);
        setUpdatedAt(now);
      });
    },
    [runBusy],
  );

  const setQuickUnlock = useCallback(
    async (pin: string) => {
      await runBusy(async () => {
        const key = keyRef.current;
        const envelope = envelopeRef.current;
        if (!key || !envelope) throw new Error("Coffre verrouillé.");
        if (!/^\d{6,12}$/.test(pin)) throw new Error("Le code PIN doit contenir de 6 à 12 chiffres.");
        const kdf = pinKdf();
        const pinKey = await deriveAesKey(pin, kdf);
        const raw = await exportRawKey(key);
        const wrappedKey: EncryptedBlob = await encryptBytes(pinKey, raw);
        const nextEnvelope: VaultEnvelope = {
          ...envelope,
          quickUnlock: { wrappedKey, kdf, pinLength: pin.length },
        };
        await writeEnvelope(nextEnvelope);
        envelopeRef.current = nextEnvelope;
        setHasQuickUnlock(true);
        setQuickUnlockPinLength(pin.length);
      });
    },
    [runBusy],
  );

  const disableQuickUnlock = useCallback(async () => {
    const envelope = envelopeRef.current;
    if (!envelope) return;
    const nextEnvelope: VaultEnvelope = { ...envelope, quickUnlock: null };
    await writeEnvelope(nextEnvelope);
    envelopeRef.current = nextEnvelope;
    setHasQuickUnlock(false);
  }, []);

  /* -------------------------------------------------------------- */
  /*  Réglages & sauvegardes                                        */
  /* -------------------------------------------------------------- */
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  const buildBackup = useCallback(() => {
    const envelope = envelopeRef.current;
    if (!envelope) throw new Error("Coffre verrouillé.");
    // La sauvegarde ne contient jamais la clé emballée par le code PIN :
    // seul le mot de passe maître permet de la restaurer.
    return { ...envelope, quickUnlock: null };
  }, []);

  const restoreBackup = useCallback(
    async (envelope: VaultEnvelope, password: string) => {
      await runBusy(async () => {
        const key = await deriveAesKey(password, envelope.kdf);
        let data: VaultData;
        try {
          data = await decryptJson<VaultData>(key, envelope.payload);
        } catch {
          throw new Error("Mot de passe maître incorrect pour cette sauvegarde.");
        }
        const sanitized: VaultEnvelope = {
          ...envelope,
          quickUnlock: null,
          updatedAt: Date.now(),
        };
        await writeEnvelope(sanitized);
        envelopeRef.current = sanitized;
        setCreatedAt(sanitized.createdAt);
        setUpdatedAt(sanitized.updatedAt);
        setHasQuickUnlock(false);
        applyKey(key, data);
      });
    },
    [applyKey, runBusy],
  );

  const wipe = useCallback(async () => {
    await clearEnvelope();
    envelopeRef.current = null;
    keyRef.current = null;
    itemsRef.current = [];
    setItems([]);
    setCreatedAt(null);
    setUpdatedAt(null);
    setHasQuickUnlock(false);
    setStatus("setup");
  }, []);

  const value = useMemo<VaultContextValue>(
    () => ({
      status,
      items,
      settings,
      storageMode,
      hasQuickUnlock,
      quickUnlockPinLength,
      createdAt,
      updatedAt,
      busy,
      createVault,
      unlock,
      unlockWithPin,
      lock,
      addItem,
      updateItem,
      deleteItem,
      toggleFavorite,
      changeMasterPassword,
      setQuickUnlock,
      disableQuickUnlock,
      updateSettings,
      buildBackup,
      restoreBackup,
      wipe,
    }),
    [
      status,
      items,
      settings,
      storageMode,
      hasQuickUnlock,
      quickUnlockPinLength,
      createdAt,
      updatedAt,
      busy,
      createVault,
      unlock,
      unlockWithPin,
      lock,
      addItem,
      updateItem,
      deleteItem,
      toggleFavorite,
      changeMasterPassword,
      setQuickUnlock,
      disableQuickUnlock,
      updateSettings,
      buildBackup,
      restoreBackup,
      wipe,
    ],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const context = useContext(VaultContext);
  if (!context) throw new Error("useVault doit être utilisé dans VaultProvider");
  return context;
}
