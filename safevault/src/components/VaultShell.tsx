import { useEffect, useMemo, useRef, useState } from "react";
import { useVault } from "../context/VaultContext";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { ItemType, VaultItem } from "../lib/types";
import { toast } from "../lib/toast";
import { BrandMark } from "./Brand";
import { GeneratorPanel } from "./GeneratorPanel";
import { ItemDetail } from "./ItemDetail";
import { ItemEditor } from "./ItemEditor";
import { ItemList } from "./ItemList";
import { SecurityAudit } from "./SecurityAudit";
import { SettingsPanel } from "./SettingsPanel";
import {
  Dice,
  FileText,
  Globe,
  Grid,
  Key,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Star,
  X,
} from "./icons";
import { Button, IconButton } from "./ui";

type View = "all" | "favorites" | "login" | "apikey" | "note" | "audit" | "generator" | "settings";

const VIEW_META: Record<View, { label: string; emptyTitle: string; emptyDescription: string }> = {
  all: {
    label: "Tous les secrets",
    emptyTitle: "Votre coffre est vide",
    emptyDescription: "Commencez par ajouter un mot de passe, une clé API ou une note confidentielle.",
  },
  favorites: {
    label: "Favoris",
    emptyTitle: "Aucun favori",
    emptyDescription: "Marquez d'une étoile les éléments auxquels vous accédez souvent.",
  },
  login: {
    label: "Connexions",
    emptyTitle: "Aucune connexion",
    emptyDescription: "Ajoutez vos identifiants de sites et applications.",
  },
  apikey: {
    label: "Clés API",
    emptyTitle: "Aucune clé API",
    emptyDescription: "Stockez vos clés de service (Stripe, OpenAI, Supabase…).",
  },
  note: {
    label: "Notes sécurisées",
    emptyTitle: "Aucune note",
    emptyDescription: "Conservez codes de secours, phrases de récupération et textes privés.",
  },
  audit: { label: "Audit", emptyTitle: "", emptyDescription: "" },
  generator: { label: "Générateur", emptyTitle: "", emptyDescription: "" },
  settings: { label: "Réglages", emptyTitle: "", emptyDescription: "" },
};

const VIEW_ICONS: Record<View, JSX.Element> = {
  all: <Grid size={18} />,
  favorites: <Star size={18} />,
  login: <Globe size={18} />,
  apikey: <Key size={18} />,
  note: <FileText size={18} />,
  audit: <ShieldCheck size={18} />,
  generator: <Dice size={18} />,
  settings: <Shield size={18} />,
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function VaultShell() {
  const { items, lock, updatedAt } = useVault();
  const isMobile = useMediaQuery("(max-width: 900px)");
  const { canInstall, install } = useInstallPrompt();

  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorItem, setEditorItem] = useState<VaultItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  /* Actions rapides depuis les raccourcis PWA (?action=new / ?action=generator) */
  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "new") {
      setEditorItem(null);
      setEditorOpen(true);
    } else if (action === "generator") {
      setView("generator");
    }
    if (action) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  /* Raccourcis clavier */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (meta && event.key.toLowerCase() === "l") {
        event.preventDefault();
        lock();
        toast("Coffre verrouillé", "info");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lock]);

  const counts = useMemo(
    () => ({
      all: items.length,
      favorites: items.filter((item) => item.favorite).length,
      login: items.filter((item) => item.type === "login").length,
      apikey: items.filter((item) => item.type === "apikey").length,
      note: items.filter((item) => item.type === "note").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return items
      .filter((item) => {
        if (view === "favorites" && !item.favorite) return false;
        if ((view === "login" || view === "apikey" || view === "note") && item.type !== view) return false;
        if (!needle) return true;
        const haystack = [
          item.title,
          item.username,
          item.url,
          item.notes,
          item.tags.join(" "),
          item.customFields.map((field) => `${field.label} ${field.value}`).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return normalize(haystack).includes(needle);
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt - a.updatedAt);
  }, [items, query, view]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && filtered.some((item) => item.id === selectedId)) return;
    if (!isMobile && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    } else if (selectedId && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, isMobile, selectedId]);

  const defaultType: ItemType =
    view === "apikey" ? "apikey" : view === "note" ? "note" : "login";
  const [editorType, setEditorType] = useState<ItemType>(defaultType);

  const openNew = (type?: ItemType) => {
    setEditorItem(null);
    setEditorType(type ?? defaultType);
    setEditorOpen(true);
  };

  const openEdit = (item: VaultItem) => {
    setEditorItem(item);
    setEditorType(item.type);
    setEditorOpen(true);
  };

  const handleLock = () => {
    lock();
    toast("Coffre verrouillé", "info");
  };

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted") toast("Installation lancée");
    else if (outcome === "dismissed") toast("Installation annulée", "info");
    else toast("Menu du navigateur → « Installer l'application »", "info");
  };

  const isVaultView = view !== "audit" && view !== "generator" && view !== "settings";

  const navSections: Array<{ title: string; views: View[] }> = [
    { title: "Coffre", views: ["all", "favorites", "login", "apikey", "note"] },
    { title: "Outils", views: ["generator", "audit", "settings"] },
  ];

  const lastSaved = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <BrandMark size={30} />
          <span className="topbar__name">Coffre</span>
        </div>

        <div className="topbar__search">
          <Search size={17} />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!isVaultView) setView("all");
            }}
            placeholder="Rechercher un titre, un identifiant, une étiquette…"
            aria-label="Rechercher dans le coffre"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className="topbar__search-clear" onClick={() => setQuery("")} aria-label="Effacer">
              <X size={15} />
            </button>
          ) : (
            <kbd className="topbar__kbd">⌘K</kbd>
          )}
        </div>

        <div className="topbar__actions">
          {canInstall ? (
            <Button variant="soft" size="sm" icon={<Smartphone size={15} />} onClick={() => void handleInstall()}>
              <span className="hide-sm">Installer</span>
            </Button>
          ) : null}
          <Button
            variant="soft"
            size="sm"
            icon={<Plus size={16} />}
            onClick={() => openNew(isVaultView ? defaultType : undefined)}
            className="hide-sm"
          >
            Nouveau
          </Button>
          <IconButton label="Verrouiller le coffre (Ctrl+L)" onClick={handleLock}>
            <Lock size={18} />
          </IconButton>
        </div>
      </header>

      <div className="shell__body">
        <aside className="sidebar">
          {navSections.map((section) => (
            <div className="sidebar__section" key={section.title}>
              <span className="sidebar__title">{section.title}</span>
              <nav>
                {section.views.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    className={`nav-item ${view === entry ? "is-active" : ""}`.trim()}
                    onClick={() => setView(entry)}
                  >
                    {VIEW_ICONS[entry]}
                    <span>{VIEW_META[entry].label}</span>
                    {entry in counts ? (
                      <span className="nav-item__count">{counts[entry as keyof typeof counts]}</span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
          ))}

          <div className="sidebar__footer">
            <div className="sidebar__status">
              <span className="dot" />
              {lastSaved ? `Enregistré à ${lastSaved}` : "Coffre déverrouillé"}
            </div>
            <Button variant="soft" size="sm" full icon={<Lock size={15} />} onClick={handleLock}>
              Verrouiller
            </Button>
          </div>
        </aside>

        <main className={`main ${isVaultView ? "main--split" : "main--panel"}`}>
          {isVaultView ? (
            <>
              <section className={`list-pane ${isMobile && selected ? "is-hidden" : ""}`.trim()}>
                <div className="list-pane__head">
                  <h1>{VIEW_META[view].label}</h1>
                  <span className="list-pane__count">{filtered.length}</span>
                  {isMobile ? (
                    <IconButton label="Nouveau secret" onClick={() => openNew(defaultType)} tone="accent">
                      <Plus size={20} />
                    </IconButton>
                  ) : null}
                </div>
                <div className="mobile-filters" role="tablist" aria-label="Filtrer">
                  {(
                    [
                      { id: "all", label: "Tous" },
                      { id: "favorites", label: "Favoris" },
                      { id: "login", label: "Connexions" },
                      { id: "apikey", label: "Clés API" },
                      { id: "note", label: "Notes" },
                    ] as Array<{ id: View; label: string }>
                  ).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={view === entry.id}
                      className={`chip ${view === entry.id ? "is-active" : ""}`.trim()}
                      onClick={() => setView(entry.id)}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
                <ItemList
                  items={filtered}
                  selectedId={selectedId}
                  onSelect={(item) => setSelectedId(item.id)}
                  onNew={() => openNew(defaultType)}
                  onClearSearch={() => setQuery("")}
                  emptyTitle={VIEW_META[view].emptyTitle}
                  emptyDescription={VIEW_META[view].emptyDescription}
                  query={query}
                />
              </section>

              <section className={`detail-pane ${isMobile ? (selected ? "is-open" : "") : ""}`.trim()}>
                {selected ? (
                  <ItemDetail
                    item={selected}
                    onEdit={() => openEdit(selected)}
                    onBack={isMobile ? () => setSelectedId(null) : undefined}
                  />
                ) : (
                  <div className="detail-empty">
                    <div className="detail-empty__art">
                      <ShieldCheck size={40} />
                    </div>
                    <h2>Sélectionnez un secret</h2>
                    <p className="muted">
                      Vos mots de passe, clés API et notes sont chiffrés localement. Copiez un secret en un
                      geste, il sera effacé du presse-papiers automatiquement.
                    </p>
                    {!isMobile ? (
                      <Button icon={<Plus size={16} />} onClick={() => openNew(defaultType)}>
                        Ajouter un secret
                      </Button>
                    ) : null}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="panel-pane">
              {view === "generator" ? <GeneratorPanel /> : null}
              {view === "audit" ? <SecurityAudit onOpenItem={openEdit} /> : null}
              {view === "settings" ? <SettingsPanel /> : null}
            </section>
          )}
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navigation principale">
        {(["all", "favorites", "generator", "audit", "settings"] as View[]).map((entry) => (
          <button
            key={entry}
            type="button"
            className={`bottom-nav__item ${view === entry ? "is-active" : ""}`.trim()}
            onClick={() => setView(entry)}
          >
            {VIEW_ICONS[entry]}
            <span>
              {entry === "all"
                ? "Coffre"
                : entry === "favorites"
                  ? "Favoris"
                  : entry === "generator"
                    ? "Générer"
                    : entry === "audit"
                      ? "Audit"
                      : "Réglages"}
            </span>
          </button>
        ))}
      </nav>

      <button type="button" className="fab" onClick={() => openNew(defaultType)} aria-label="Nouveau secret">
        <Plus size={24} />
      </button>

      <ItemEditor
        open={editorOpen}
        item={editorItem}
        initialType={editorType}
        onClose={() => setEditorOpen(false)}
        onSaved={(saved) => {
          setSelectedId(saved.id);
          if (!isVaultView) setView("all");
        }}
      />
    </div>
  );
}
