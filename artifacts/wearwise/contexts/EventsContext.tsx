import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { EventCategory, WearEvent } from "@/types";

const EVENTS_KEY = "wearwise:events:v1";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface EventsContextValue {
  events: WearEvent[];
  loading: boolean;
  addEvent: (input: {
    title: string;
    category: EventCategory;
    dateTime: number;
    reminderEnabled: boolean;
  }) => Promise<WearEvent>;
  removeEvent: (id: string) => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

export function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<WearEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EVENTS_KEY);
        if (raw) setEvents(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: WearEvent[]) => {
    setEvents(next);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  }, []);

  const addEvent = useCallback<EventsContextValue["addEvent"]>(
    async (input) => {
      const event: WearEvent = {
        id: genId(),
        title: input.title.trim(),
        category: input.category,
        dateTime: input.dateTime,
        reminderEnabled: input.reminderEnabled,
        createdAt: Date.now(),
      };
      const next = [event, ...events];
      await persist(next);
      return event;
    },
    [events, persist],
  );

  const removeEvent = useCallback<EventsContextValue["removeEvent"]>(
    async (id) => {
      const next = events.filter((e) => e.id !== id);
      await persist(next);
    },
    [events, persist],
  );

  const value = useMemo<EventsContextValue>(
    () => ({ events, loading, addEvent, removeEvent }),
    [events, loading, addEvent, removeEvent],
  );

  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
}

export function useEvents(): EventsContextValue {
  const ctx = useContext(EventsContext);
  if (!ctx) {
    throw new Error("useEvents must be used within EventsProvider");
  }
  return ctx;
}
