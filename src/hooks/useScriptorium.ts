import { useCallback, useEffect, useState } from "react";

export interface ScriptoriumNote {
  id: string;
  text: string;
  source?: string;
  createdAt: number;
}

const NOTES_KEY = "scriptorium_notes";
const OPEN_KEY = "scriptorium_open";
const EVENT = "scriptorium:update";

function readNotes(): ScriptoriumNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as ScriptoriumNote[]) : [];
  } catch {
    return [];
  }
}

function writeNotes(notes: ScriptoriumNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Ajoute un extrait au Scriptorium (utilisable hors composant React). */
export function addToScriptorium(text: string, source?: string) {
  const notes = readNotes();
  notes.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    source,
    createdAt: Date.now(),
  });
  writeNotes(notes);
  localStorage.setItem(OPEN_KEY, "true");
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useScriptorium() {
  const [notes, setNotes] = useState<ScriptoriumNote[]>(() =>
    typeof window === "undefined" ? [] : readNotes()
  );
  const [open, setOpen] = useState<boolean>(() =>
    typeof window === "undefined" ? true : localStorage.getItem(OPEN_KEY) !== "false"
  );

  useEffect(() => {
    const sync = () => {
      setNotes(readNotes());
      setOpen(localStorage.getItem(OPEN_KEY) !== "false");
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      localStorage.setItem(OPEN_KEY, String(!prev));
      window.dispatchEvent(new CustomEvent(EVENT));
      return !prev;
    });
  }, []);

  const remove = useCallback((id: string) => {
    writeNotes(readNotes().filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => writeNotes([]), []);

  const update = useCallback((id: string, text: string) => {
    writeNotes(readNotes().map((n) => (n.id === id ? { ...n, text } : n)));
  }, []);

  const add = useCallback((text: string, source?: string) => addToScriptorium(text, source), []);

  return { notes, open, toggle, add, remove, clear, update };
}
