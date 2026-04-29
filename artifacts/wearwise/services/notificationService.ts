import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { WearEvent } from "@/types";
import { tempAtTime, type WeatherInfo } from "@/services/weatherService";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const TAG_PREFIX = "wearwise:";
const MAX_PER_DAY = 3;
const SIGNATURE_KEY = "wearwise:notifications:signature";

// Quietly route foreground notifications to the system tray instead of an
// in-app modal — we only want gentle, ambient nudges.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // Older SDKs use shouldShowAlert; harmless on newer ones.
    shouldShowAlert: true,
  } as Notifications.NotificationBehavior),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain === false) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelOurNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((n) => {
        const data = n.content?.data as
          | Record<string, unknown>
          | undefined;
        const tag = data?.tag;
        return typeof tag === "string" && tag.startsWith(TAG_PREFIX);
      })
      .map((n) =>
        Notifications.cancelScheduledNotificationAsync(n.identifier),
      ),
  );
}

async function scheduleAt(args: {
  tag: string;
  title: string;
  body: string;
  triggerMs: number;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      data: { tag: TAG_PREFIX + args.tag },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(args.triggerMs),
    },
  });
}

function nextMorningEightAm(now: number): number {
  const d = new Date(now);
  d.setHours(8, 0, 0, 0);
  let trigger = d.getTime();
  // Push to tomorrow if the time today has already passed (or is too close).
  if (trigger <= now + 5 * 60 * 1000) trigger += DAY_MS;
  return trigger;
}

function weatherMessage(weather: WeatherInfo | null, now: number): string | null {
  if (!weather) return null;
  const c = weather.condition.toLowerCase();
  if (
    c.includes("rain") ||
    c.includes("drizzle") ||
    c.includes("shower") ||
    c.includes("thunder")
  ) {
    return "Hey, it might rain later—don’t forget an umbrella ☔";
  }

  // Evening cooldown — compare ~3pm vs ~8pm of today.
  const afternoon = new Date(now);
  afternoon.setHours(15, 0, 0, 0);
  const evening = new Date(now);
  evening.setHours(20, 0, 0, 0);
  const aTemp = tempAtTime(weather.hourly, afternoon.getTime());
  const eTemp = tempAtTime(weather.hourly, evening.getTime());
  if (aTemp != null && eTemp != null && aTemp - eTemp >= 6) {
    return "It’s getting chilly this evening, maybe grab a light jacket";
  }

  if (weather.tempRange > 10) {
    return "Warm afternoon, cool evening—layers might help today";
  }

  return null;
}

interface ScheduleArgs {
  events: WearEvent[];
  weather: WeatherInfo | null;
  enabled: boolean;
}

function dayStamp(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function buildSignature({ events, weather, enabled }: ScheduleArgs): string {
  const evtSig = events
    .filter((e) => e.reminderEnabled)
    .map((e) => `${e.id}@${e.dateTime}`)
    .sort()
    .join("|");
  const weatherSig = weather
    ? `${weather.minTemp}/${weather.maxTemp}/${weather.condition}`
    : "none";
  return `${dayStamp(Date.now())}|enabled=${enabled}|w=${weatherSig}|e=${evtSig}`;
}

// Cancels prior Wearwise notifications and reschedules a fresh, deduped set.
// Safe to call on every app open — internal signature dedupe avoids work
// when nothing meaningful has changed since the last schedule.
export async function rescheduleNotifications(
  args: ScheduleArgs,
): Promise<void> {
  if (Platform.OS === "web") return;

  const signature = buildSignature(args);
  const lastSignature = await AsyncStorage.getItem(SIGNATURE_KEY);
  if (lastSignature === signature) return;

  await cancelOurNotifications();

  if (!args.enabled) {
    await AsyncStorage.setItem(SIGNATURE_KEY, signature);
    return;
  }

  const granted = await ensureNotificationPermission();
  if (!granted) {
    // Persist the signature anyway so we don't loop on permission prompts.
    await AsyncStorage.setItem(SIGNATURE_KEY, signature);
    return;
  }

  const now = Date.now();
  let scheduled = 0;

  // 1. Daily 8 AM nudge.
  const nudgeAt = nextMorningEightAm(now);
  await scheduleAt({
    tag: "daily-nudge",
    title: "Wearwise",
    body: "Not sure what to wear? I’ve got something ready for you 👀",
    triggerMs: nudgeAt,
  });
  scheduled++;

  // 2. Weather nudge — at most one, sent at 7:30 AM so it lands before the
  // daily wardrobe nudge.
  const weatherBody = weatherMessage(args.weather, now);
  if (weatherBody && scheduled < MAX_PER_DAY) {
    const triggerMs = nudgeAt - 30 * 60 * 1000; // 7:30 AM same day as nudge
    if (triggerMs > now) {
      await scheduleAt({
        tag: "weather",
        title: "Today’s weather",
        body: weatherBody,
        triggerMs,
      });
      scheduled++;
    }
  }

  // 3. Event reminders — soonest first, capped by MAX_PER_DAY.
  const upcoming = [...args.events]
    .filter((e) => e.reminderEnabled && e.dateTime > now)
    .sort((a, b) => a.dateTime - b.dateTime);

  for (const ev of upcoming) {
    if (scheduled >= MAX_PER_DAY) break;

    const t24 = ev.dateTime - DAY_MS;
    if (t24 > now) {
      await scheduleAt({
        tag: `event-${ev.id}-24h`,
        title: "Event tomorrow",
        body: `You’ve got ${ev.title} tomorrow—want to plan your outfit?`,
        triggerMs: t24,
      });
      scheduled++;
      if (scheduled >= MAX_PER_DAY) break;
    }

    const t2 = ev.dateTime - 2 * HOUR_MS;
    if (t2 > now) {
      await scheduleAt({
        tag: `event-${ev.id}-2h`,
        title: "Coming up soon",
        body: "Your event is coming up—your outfit’s ready",
        triggerMs: t2,
      });
      scheduled++;
    }
  }

  await AsyncStorage.setItem(SIGNATURE_KEY, signature);
}

// Convenience for fully turning everything off (e.g. user toggles off).
export async function clearAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelOurNotifications();
  await AsyncStorage.removeItem(SIGNATURE_KEY);
}
