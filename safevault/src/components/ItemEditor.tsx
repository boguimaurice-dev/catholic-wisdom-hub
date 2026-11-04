import { useEffect, useState } from "react";
import { useVault } from "../context/VaultContext";
import { DEFAULT_PASSWORD_OPTIONS, generatePassword, randomId } from "../lib/crypto";
import { toast } from "../lib/toast";
import type { CustomField, ItemInput, ItemType, VaultItem } from "../lib/types";
import { Dice, Plus, Tag, Trash, X } from "./icons";
import { Button, Field, Input, Modal, Segmented, StrengthMeter, Textarea } from "./ui";

const SECRET_LABEL: Record<ItemType, string> = {
  login: "Mot de passe",
  apikey: "Clé API / secret",
  note: "Contenu de la note",
};

const TITLE_PLACEHOLDER: Record<ItemType, string> = {
  login: "Ex. Banque, Gmail, Netflix…",
  apikey: "Ex. Stripe production, OpenAI…",
  note: "Ex. Codes de secours, phrase de récupération…",
};

function blankInput(type: ItemType): ItemInput {
  return {
    type,
    title: "",
    username: "",
    secret: "",
    url: "",
    notes: "",
    tags: [],
    favorite: false,
    customFields: [],
  };
}

function toInput(item: VaultItem): ItemInput {
  return {
    type: item.type,
    title: item.title,
    username: item.username,
    secret: item.secret,
    url: item.url,
    notes: item.notes,
    tags: item.tags,
    favorite: item.favorite,
    customFields: item.customFields,
  };
}

interface Props {
  open: boolean;
  item: VaultItem | null;
  initialType?: ItemType;
  onClose: () => void;
  onSaved?: (item: VaultItem) => void;
}

export function ItemEditor({ open, item, initialType = "login", onClose, onSaved }: Props) {
  const { addItem, updateItem } = useVault();
  const [form, setForm] = useState<ItemInput>(blankInput(initialType));
  const [tagsText, setTagsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(item ? toInput(item) : blankInput(initialType));
    setTagsText(item ? item.tags.join(", ") : "");
    setError(null);
  }, [initialType, item, open]);

  const update = <K extends keyof ItemInput>(key: K, value: ItemInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setCustomField = (id: string, patch: Partial<CustomField>) => {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.map((field) =>
        field.id === id ? { ...field, ...patch } : field,
      ),
    }));
  };

  const addCustomField = () => {
    setForm((current) => ({
      ...current,
      customFields: [...current.customFields, { id: randomId(), label: "", value: "", secret: false }],
    }));
  };

  const removeCustomField = (id: string) => {
    setForm((current) => ({
      ...current,
      customFields: current.customFields.filter((field) => field.id !== id),
    }));
  };

  const generate = () => {
    const password = generatePassword(DEFAULT_PASSWORD_OPTIONS);
    update("secret", password);
    toast("Mot de passe fort généré");
  };

  const save = async () => {
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (!form.title.trim()) {
      setError("Donnez un titre à cet élément.");
      return;
    }
    if (!form.secret.trim()) {
      setError(
        form.type === "note" ? "La note ne peut pas être vide." : `Renseignez le champ « ${SECRET_LABEL[form.type]} ».`,
      );
      return;
    }

    const payload: ItemInput = {
      ...form,
      title: form.title.trim(),
      username: form.username.trim(),
      url: form.url.trim(),
      tags,
      customFields: form.customFields
        .filter((field) => field.label.trim() || field.value.trim())
        .map((field) => ({ ...field, label: field.label.trim() || "Champ" })),
    };

    setSaving(true);
    setError(null);
    try {
      if (item) {
        await updateItem(item.id, payload);
        toast("Modifications enregistrées");
        onSaved?.({ ...item, ...payload });
      } else {
        const created = await addItem(payload);
        toast("Secret ajouté au coffre");
        onSaved?.(created);
      }
      update("secret", "");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const secretLabel = SECRET_LABEL[form.type];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Modifier l'élément" : "Nouvel élément"}
      subtitle="Chiffré immédiatement après l'enregistrement"
      size="md"
      dismissible={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={save} loading={saving}>
            {item ? "Enregistrer" : "Ajouter au coffre"}
          </Button>
        </>
      }
    >
      <div className="stack">
        {!item ? (
          <Segmented<ItemType>
            value={form.type}
            onChange={(type) => update("type", type)}
            options={[
              { value: "login", label: "Connexion" },
              { value: "apikey", label: "Clé API" },
              { value: "note", label: "Note" },
            ]}
          />
        ) : null}

        <Field label="Titre">
          <Input
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder={TITLE_PLACEHOLDER[form.type]}
            autoFocus
          />
        </Field>

        {form.type !== "note" ? (
          <Field label={form.type === "apikey" ? "Service / compte" : "Identifiant"} hint={form.type === "apikey" ? "Nom du service ou du compte associé à la clé." : undefined}>
            <Input
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder={form.type === "apikey" ? "Ex. stripe-prod" : "Email ou nom d'utilisateur"}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
        ) : null}

        <Field label={secretLabel}>
          {form.type === "note" ? (
            <Textarea
              value={form.secret}
              onChange={(event) => update("secret", event.target.value)}
              aria-label={secretLabel}
              placeholder="Collez ici vos codes de secours, une phrase de récupération, un texte privé…"
              rows={6}
            />
          ) : (
            <div className="row">
              <Input
                value={form.secret}
                onChange={(event) => update("secret", event.target.value)}
                aria-label={secretLabel}
                placeholder="••••••••••••"
                className="mono"
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
              />
              <Button type="button" variant="soft" icon={<Dice size={16} />} onClick={generate}>
                Générer
              </Button>
            </div>
          )}
        </Field>

        {form.type !== "note" ? <StrengthMeter password={form.secret} showAdvice={form.type === "login"} /> : null}

        {form.type !== "note" ? (
          <Field label={form.type === "apikey" ? "Documentation (URL)" : "Site web"}>
            <Input
              type="url"
              value={form.url}
              onChange={(event) => update("url", event.target.value)}
              placeholder="https://…"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
        ) : null}

        {form.type !== "note" ? (
          <Field label="Notes" hint="Informations complémentaires (questions de sécurité, procédure…).">
            <Textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={3}
              placeholder="Facultatif"
            />
          </Field>
        ) : (
          <Field label="Notes complémentaires">
            <Textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={2}
              placeholder="Contexte, date d'expiration…"
            />
          </Field>
        )}

        <Field label="Étiquettes" hint="Séparées par des virgules.">
          <Input
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="travail, client, urgent"
          />
        </Field>

        <div className="custom-fields">
          <div className="custom-fields__head">
            <span className="field__label">Champs personnalisés</span>
            <Button type="button" variant="ghost" size="sm" icon={<Plus size={15} />} onClick={addCustomField}>
              Ajouter
            </Button>
          </div>
          {form.customFields.length === 0 ? (
            <p className="muted small">Ajoutez un champ pour stocker un identifiant secondaire, une URL, un code…</p>
          ) : (
            <div className="stack stack--tight">
              {form.customFields.map((field) => (
                <div className="custom-field-row" key={field.id}>
                  <Input
                    value={field.label}
                    onChange={(event) => setCustomField(field.id, { label: event.target.value })}
                    placeholder="Nom du champ"
                    className="custom-field-row__label"
                  />
                  <Input
                    value={field.value}
                    onChange={(event) => setCustomField(field.id, { value: event.target.value })}
                    placeholder="Valeur"
                    className="mono"
                  />
                  <label className="mini-toggle" title="Valeur sensible">
                    <input
                      type="checkbox"
                      checked={field.secret}
                      onChange={(event) => setCustomField(field.id, { secret: event.target.checked })}
                    />
                    <span>Secret</span>
                  </label>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label="Supprimer le champ"
                    onClick={() => removeCustomField(field.id)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.favorite}
            onChange={(event) => update("favorite", event.target.checked)}
          />
          <span>Ajouter aux favoris</span>
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <p className="muted small inline-with-icon">
          <Tag size={14} /> Les étiquettes facilitent la recherche ; elles ne sont jamais partagées.
        </p>
      </div>
    </Modal>
  );
}

export function DeleteItemButton({ item, onDeleted }: { item: VaultItem; onDeleted: () => void }) {
  const { deleteItem } = useVault();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteItem(item.id);
      toast("Élément supprimé");
      setConfirming(false);
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" icon={<Trash size={16} />} onClick={() => setConfirming(true)} className="btn--danger-text">
        Supprimer
      </Button>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Supprimer cet élément ?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button variant="danger" loading={busy} onClick={handleDelete}>
              Supprimer définitivement
            </Button>
          </>
        }
      >
        <p>
          « {item.title} » sera retiré du coffre chiffré. Cette action est irréversible (sauf restauration
          d'une sauvegarde antérieure).
        </p>
      </Modal>
    </>
  );
}
