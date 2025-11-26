import { useEffect, useState } from "react";

export type ErrorLogEntry = {
  id: string;
  timestamp: string;
  source: "edge_function" | "parser" | "gmail" | "client" | string;
  message: string;
  code?: string;
  details?: Record<string, any>;
};

const STORAGE_KEY = "error_logs";
const emitter = new EventTarget();

let logs: ErrorLogEntry[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ErrorLogEntry[]) : [];
  } catch {
    return [];
  }
})();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore persistence errors
  }
}

export function logError(entry: Omit<ErrorLogEntry, "id" | "timestamp">) {
  const newEntry: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs = [newEntry, ...logs].slice(0, 500); // keep last 500
  persist();
  emitter.dispatchEvent(new CustomEvent("error-log-updated"));
}

export function useErrorLog() {
  const [items, setItems] = useState<ErrorLogEntry[]>(logs);

  useEffect(() => {
    const handler = () => setItems([...logs]);
    emitter.addEventListener("error-log-updated", handler);
    return () => emitter.removeEventListener("error-log-updated", handler);
  }, []);

  return items;
}

export function clearErrors() {
  logs = [];
  persist();
  emitter.dispatchEvent(new CustomEvent("error-log-updated"));
}