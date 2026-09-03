import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "mn-registry-queue-v1";

export type QueueStatus = "pending" | "sending" | "failed" | "done";

export interface QueueItem {
  request_id: string;
  label: string;
  payload: Record<string, unknown>;
  status: QueueStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  registration_no?: string;
  person_id?: string;
}

export interface RegisterResult {
  person_id: string;
  registration_no: string;
  guardian_id: string | null;
  household_id: string | null;
  duplicates: { person_id: string; confidence: string; reasons: string[] }[];
  idempotent: boolean;
}

function read(): QueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueueItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("mn-queue-change"));
}

export function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function enqueue(item: Omit<QueueItem, "status" | "attempts" | "last_error" | "created_at">) {
  const items = read();
  if (items.some((i) => i.request_id === item.request_id)) return;
  items.push({ ...item, status: "pending", attempts: 0, last_error: null, created_at: new Date().toISOString() });
  write(items);
}

function patch(requestId: string, changes: Partial<QueueItem>) {
  write(read().map((i) => (i.request_id === requestId ? { ...i, ...changes } : i)));
}

export function removeItem(requestId: string) {
  write(read().filter((i) => i.request_id !== requestId));
}

/**
 * Submits one queued registration. The server keys on request_id, so a retry
 * after a dropped connection returns the original resident instead of creating
 * a second one.
 */
export async function submitItem(item: QueueItem): Promise<RegisterResult> {
  const { data, error } = await supabase.rpc("register_resident", {
    payload: { ...item.payload, request_id: item.request_id } as never,
  });
  if (error) throw new Error(error.message);
  return data as unknown as RegisterResult;
}

export function useRegistrationQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [online, setOnline] = useState(true);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("mn-queue-change", sync);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("mn-queue-change", sync);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const flush = useCallback(async () => {
    if (flushing || !navigator.onLine) return;
    const pending = read().filter((i) => i.status === "pending" || i.status === "failed");
    if (pending.length === 0) return;
    setFlushing(true);
    try {
      for (const item of pending) {
        patch(item.request_id, { status: "sending" });
        try {
          const res = await submitItem(item);
          patch(item.request_id, {
            status: "done",
            registration_no: res.registration_no,
            person_id: res.person_id,
            last_error: null,
          });
        } catch (err) {
          patch(item.request_id, {
            status: "failed",
            attempts: item.attempts + 1,
            last_error: err instanceof Error ? err.message : "Submission failed",
          });
        }
      }
    } finally {
      setFlushing(false);
    }
  }, [flushing]);

  useEffect(() => {
    if (online) void flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  return {
    items,
    online,
    flushing,
    flush,
    remove: removeItem,
    pendingCount: items.filter((i) => i.status === "pending" || i.status === "failed" || i.status === "sending").length,
  };
}
