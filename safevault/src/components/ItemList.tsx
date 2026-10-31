import type { VaultItem } from "../lib/types";
import { FileText, Globe, Key, Plus, Search, Star } from "./icons";
import { Button, EmptyState } from "./ui";

function typeIcon(type: VaultItem["type"]) {
  if (type === "login") return <Globe size={18} />;
  if (type === "apikey") return <Key size={18} />;
  return <FileText size={18} />;
}

function subtitle(item: VaultItem): string {
  if (item.type === "note") {
    return item.secret.replace(/\s+/g, " ").slice(0, 64) || "Note vide";
  }
  return item.username || item.url.replace(/^https?:\/\//, "") || "Sans identifiant";
}

interface Props {
  items: VaultItem[];
  selectedId: string | null;
  onSelect: (item: VaultItem) => void;
  onNew: () => void;
  onClearSearch: () => void;
  emptyTitle: string;
  emptyDescription: string;
  query: string;
}

export function ItemList({
  items,
  selectedId,
  onSelect,
  onNew,
  onClearSearch,
  emptyTitle,
  emptyDescription,
  query,
}: Props) {
  if (items.length === 0) {
    return (
      <div className="list-empty">
        <EmptyState
          icon={query ? <Search size={26} /> : <Key size={26} />}
          title={query ? "Aucun résultat" : emptyTitle}
          description={query ? `Rien ne correspond à « ${query} ».` : emptyDescription}
          action={
            query ? (
              <Button variant="soft" onClick={onClearSearch}>
                Effacer la recherche
              </Button>
            ) : (
              <Button icon={<Plus size={16} />} onClick={onNew}>
                Ajouter un secret
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <ul className="item-list" role="listbox" aria-label="Secrets">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            role="option"
            aria-selected={selectedId === item.id}
            className={`item-row ${selectedId === item.id ? "is-selected" : ""}`.trim()}
            onClick={() => onSelect(item)}
          >
            <span className={`type-icon type-icon--${item.type} type-icon--sm`}>{typeIcon(item.type)}</span>
            <span className="item-row__text">
              <span className="item-row__title">
                {item.title}
                {item.favorite ? <Star size={13} className="item-row__star" /> : null}
              </span>
              <span className="item-row__subtitle">{subtitle(item)}</span>
            </span>
            {item.tags.length > 0 ? <span className="item-row__tag">{item.tags[0]}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
