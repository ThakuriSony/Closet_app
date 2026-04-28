import type { EventCategory, WearEvent } from "@/types";

export function sortByDateAsc(events: WearEvent[]): WearEvent[] {
  return [...events].sort((a, b) => a.dateTime - b.dateTime);
}

export function getUpcomingEvents(events: WearEvent[]): WearEvent[] {
  const now = Date.now();
  return sortByDateAsc(events).filter((e) => e.dateTime >= now);
}

export function getNextUpcomingEvent(
  events: WearEvent[],
): WearEvent | undefined {
  return getUpcomingEvents(events)[0];
}

const HOUR_MS = 60 * 60 * 1000;

export function getEventsWithinHours(
  events: WearEvent[],
  hours: number,
): WearEvent[] {
  const now = Date.now();
  const horizon = now + hours * HOUR_MS;
  return sortByDateAsc(events).filter(
    (e) => e.dateTime >= now && e.dateTime <= horizon,
  );
}

export function formatEventDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const dayMs = 24 * HOUR_MS;
  const dayDiff = Math.floor(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() -
      startToday) /
      dayMs,
  );

  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (dayDiff === 0) return `Today · ${time}`;
  if (dayDiff === 1) return `Tomorrow · ${time}`;
  if (dayDiff === -1) return `Yesterday · ${time}`;
  if (dayDiff > 1 && dayDiff < 7) {
    const weekday = d.toLocaleDateString(undefined, { weekday: "long" });
    return `${weekday} · ${time}`;
  }
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `${date} · ${time}`;
}

export const EVENT_CATEGORY_DESCRIPTIONS: Record<EventCategory, string> = {
  Work: "Office or business setting",
  Casual: "Everyday relaxed look",
  Party: "Bold, stylish evening look",
  Formal: "Dressed-up, elegant attire",
  Sporty: "Active, athletic wear",
};
