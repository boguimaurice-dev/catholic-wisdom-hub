import { useVault } from "../context/VaultContext";
import { ITEM_TYPE_LABEL, type VaultItem } from "../lib/types";
import { DeleteItemButton } from "./ItemEditor";
import {
  ChevronLeft,
  ExternalLink,
  FileText,
  Globe,
  Key,
  Pencil,
  Star,
  Tag,
} from "./icons";
import { Badge, CopyButton, IconButton, SecretValue } from "./ui";

function typeIcon(type: VaultItem["type"], size = 22) {
  if (type === "login") return <Globe size={size} />;
  if (type === "apikey") return <Key size={size} />;
  return <FileText size={size} />;
}

function safeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function relativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30) return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;
  return `il y a ${Math.floor(months / 12)} an(s)`;
}

interface Props {
  item: VaultItem;
  onEdit: () => void;
  onBack?: () => void;
}

export function ItemDetail({ item, onEdit, onBack }: Props) {
  const { toggleFavorite } = useVault();
  const link = safeUrl(item.url);
  const displayUrl = link ? new URL(link).hostname.replace(/^www\./, "") : "";

  return (
    <article className="detail">
      <div className="detail__topbar">
        {onBack ? (
          <IconButton label="Retour à la liste" onClick={onBack}>
            <ChevronLeft size={20} />
          </IconButton>
        ) : (
          <span />
        )}
        <div className="detail__topbar-actions">
          <IconButton
            label={item.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            tone="accent"
            onClick={() => void toggleFavorite(item.id)}
            className={item.favorite ? "is-favorite" : ""}
          >
            <Star size={18} />
          </IconButton>
          <IconButton label="Modifier" onClick={onEdit}>
            <Pencil size={18} />
          </IconButton>
        </div>
      </div>

      <header className="detail__head">
        <div className={`type-icon type-icon--${item.type}`}>{typeIcon(item.type, 24)}</div>
        <div className="detail__title-block">
          <h2>{item.title}</h2>
          <div className="detail__meta-line">
            <Badge tone="accent">{ITEM_TYPE_LABEL[item.type]}</Badge>
            <span className="muted small">Modifié {relativeDate(item.updatedAt)}</span>
          </div>
        </div>
      </header>

      <div className="detail__body">
        {item.type !== "note" && item.username ? (
          <section className="detail-field">
            <span className="detail-field__label">
              {item.type === "apikey" ? "Service / compte" : "Identifiant"}
            </span>
            <div className="detail-field__value">
              <span>{item.username}</span>
              <CopyButton value={item.username} label="Copier l'identifiant" />
            </div>
          </section>
        ) : null}

        <section className="detail-field detail-field--secret">
          <span className="detail-field__label">
            {item.type === "login" ? "Mot de passe" : item.type === "apikey" ? "Clé API" : "Contenu de la note"}
          </span>
          <SecretValue
            value={item.secret}
            label={item.type === "login" ? "Mot de passe" : item.type === "apikey" ? "Clé API" : "Note"}
            mono={item.type !== "note"}
            multiline={item.type === "note"}
          />
        </section>

        {item.type !== "note" && link ? (
          <section className="detail-field">
            <span className="detail-field__label">
              {item.type === "apikey" ? "Documentation" : "Site web"}
            </span>
            <div className="detail-field__value">
              <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="detail-link">
                {displayUrl}
                <ExternalLink size={15} />
              </a>
              <CopyButton value={link} label="Copier le lien" />
            </div>
          </section>
        ) : null}

        {item.customFields.length > 0 ? (
          <section className="detail-fields-group">
            <span className="detail-field__label">Champs personnalisés</span>
            <div className="stack stack--tight">
              {item.customFields.map((field) => (
                <div className="detail-field detail-field--inline" key={field.id}>
                  <span className="detail-field__label detail-field__label--small">{field.label}</span>
                  {field.secret ? (
                    <SecretValue value={field.value} label={field.label} />
                  ) : (
                    <div className="detail-field__value">
                      <span>{field.value}</span>
                      <CopyButton value={field.value} label={`Copier ${field.label}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {item.notes ? (
          <section className="detail-field">
            <span className="detail-field__label">Notes</span>
            <p className="detail-notes">{item.notes}</p>
          </section>
        ) : null}

        {item.tags.length > 0 ? (
          <div className="detail-tags">
            <Tag size={14} />
            {item.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <dl className="detail-dates">
          <div>
            <dt>Créé le</dt>
            <dd>{formatDate(item.createdAt)}</dd>
          </div>
          <div>
            <dt>Modifié le</dt>
            <dd>{formatDate(item.updatedAt)}</dd>
          </div>
          <div>
            <dt>Secret mis à jour</dt>
            <dd>{formatDate(item.secretUpdatedAt)}</dd>
          </div>
        </dl>
      </div>

      <footer className="detail__footer">
        <DeleteItemButton item={item} onDeleted={() => onBack?.()} />
      </footer>
    </article>
  );
}
