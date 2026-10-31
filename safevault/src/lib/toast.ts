import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (toast: ToastMessage) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(message: string, kind: ToastKind = "success"): void {
  counter += 1;
  const payload: ToastMessage = { id: counter, message, kind };
  listeners.forEach((listener) => listener(payload));
}

export function useToastFeed(): ToastMessage[] {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener: Listener = (entry) => {
      setMessages((current) => [...current.slice(-2), entry]);
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== entry.id));
      }, 3200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return messages;
}
