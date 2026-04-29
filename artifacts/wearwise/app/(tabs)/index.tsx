import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GreetingHeader } from "@/components/GreetingHeader";
import { OccasionTabs } from "@/components/OccasionTabs";
import { OutfitPreview } from "@/components/OutfitPreview";
import { PreferencesModal } from "@/components/PreferencesModal";
import { UpcomingEventCard } from "@/components/UpcomingEventCard";
import { WeatherCard } from "@/components/WeatherCard";
import { useEvents } from "@/contexts/EventsContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useWardrobe } from "@/contexts/WardrobeContext";
import { useColors } from "@/hooks/useColors";
import { getEventsWithinHours } from "@/services/eventService";
import {
  getUserLocation,
  type UserLocation,
} from "@/services/locationService";
import {
  generateOutfit,
  occasionForEvent,
  type GenerateOutfitResult,
  type Occasion,
} from "@/services/outfitEngine";
import { explainOutfit } from "@/services/outfitExplain";
import {
  DEFAULT_LOCATION,
  FALLBACK_WEATHER,
  fetchWeather,
  type WeatherInfo,
} from "@/services/weatherService";
import type { EventCategory, WearEvent } from "@/types";

const H_PADDING = 20;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { items, addOutfit, markItemsWorn } = useWardrobe();
  const {
    name,
    dirtyThreshold,
    hasDirtyThreshold,
    loading: profileLoading,
    setDirtyThreshold,
  } = useProfile();
  const { events } = useEvents();

  const [occasion, setOccasion] = useState<Occasion>("Casual");
  const [eventOverride, setEventOverride] = useState<{
    category: EventCategory;
    event: WearEvent;
  } | null>(null);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [weatherFailed, setWeatherFailed] = useState<boolean>(false);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(true);
  const [outfit, setOutfit] = useState<GenerateOutfitResult | null>(null);
  const [explanation, setExplanation] = useState<string>("");
  const [explaining, setExplaining] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [worn, setWorn] = useState<boolean>(false);
  const [prefsModalOpen, setPrefsModalOpen] = useState<boolean>(false);

  // Show preferences setup the first time the user opens Home.
  useEffect(() => {
    if (!profileLoading && !hasDirtyThreshold) {
      setPrefsModalOpen(true);
    }
  }, [profileLoading, hasDirtyThreshold]);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarOffset = Platform.OS === "web" ? 100 : 110;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getUserLocation();
      if (cancelled) return;

      const loc = result.location;
      setLocationLabel(loc?.city ?? "Your location");
      setLocationLoading(false);

      const target = loc ?? DEFAULT_LOCATION;
      try {
        const w = await fetchWeather(target);
        if (!cancelled) {
          setWeather(w);
          setWeatherFailed(false);
        }
      } catch {
        if (!cancelled) {
          setWeather(FALLBACK_WEATHER);
          setWeatherFailed(true);
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canGenerate = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return cats.has("Top") && cats.has("Bottom") && cats.has("Shoes");
  }, [items]);

  // Show the next event happening within 48 hours (with reminder enabled).
  const upcomingEvent = useMemo<WearEvent | null>(() => {
    const list = getEventsWithinHours(events, 48).filter(
      (e) => e.reminderEnabled,
    );
    return list[0] ?? null;
  }, [events]);

  const effectiveOccasion: Occasion = eventOverride
    ? occasionForEvent(eventOverride.category)
    : occasion;

  const generate = useCallback(
    async (overrideCategory?: EventCategory) => {
      if (!weather) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const result = generateOutfit(
        items,
        occasion,
        weather.bucket,
        overrideCategory ?? eventOverride?.category,
      );
      setOutfit(result);
      setExplanation("");
      setWorn(false);
      if (
        result.top &&
        result.bottom &&
        result.shoes &&
        result.missing.length === 0
      ) {
        const occForExplain: Occasion = overrideCategory
          ? occasionForEvent(overrideCategory)
          : effectiveOccasion;
        setExplaining(true);
        try {
          const text = await explainOutfit(result, occForExplain, weather);
          setExplanation(text);
        } catch {
          setExplanation("");
        } finally {
          setExplaining(false);
        }
      }
    },
    [items, occasion, weather, eventOverride, effectiveOccasion],
  );

  const onGenerateForEvent = useCallback(() => {
    if (!upcomingEvent) return;
    setEventOverride({
      category: upcomingEvent.category,
      event: upcomingEvent,
    });
    void generate(upcomingEvent.category);
  }, [upcomingEvent, generate]);

  const clearEventOverride = useCallback(() => {
    setEventOverride(null);
  }, []);

  // When the user changes occasion (and is not in event-override mode), refresh
  useEffect(() => {
    if (eventOverride) return;
    if (outfit && weather) {
      const result = generateOutfit(items, occasion, weather.bucket);
      setOutfit(result);
      setExplanation("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion]);

  const outfitItemIds = useMemo(() => {
    if (!outfit) return [] as string[];
    return [outfit.top, outfit.bottom, outfit.shoes, outfit.outerwear]
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map((i) => i.id);
  }, [outfit]);

  const onSaveOutfit = async () => {
    if (!outfit) return;
    if (outfitItemIds.length < 3) return;
    setSaving(true);
    try {
      await addOutfit(outfitItemIds);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSaving(false);
    }
  };

  const onWearOutfit = async () => {
    if (worn) return;
    if (outfitItemIds.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await markItemsWorn(outfitItemIds, dirtyThreshold);
    setWorn(true);
  };

  const isOutfitComplete =
    outfit && outfit.top && outfit.bottom && outfit.shoes;
  const noCleanItems = outfit !== null && outfit.usedDirty;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: H_PADDING,
          paddingTop: insets.top + webTopInset + 12,
          paddingBottom: insets.bottom + tabBarOffset + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GreetingHeader
          name={name}
          location={locationLabel}
          locationLoading={locationLoading}
          onOpenProfile={() => router.push("/profile")}
        />

        <View style={{ height: 18 }} />
        <WeatherCard
          weather={weather}
          loading={weatherLoading}
          failed={weatherFailed}
        />

        {upcomingEvent ? (
          <UpcomingEventCard
            event={upcomingEvent}
            onGenerate={onGenerateForEvent}
          />
        ) : null}

        <SectionLabel>
          {eventOverride
            ? `Dressing for: ${eventOverride.event.title}`
            : "Occasion"}
        </SectionLabel>
        {eventOverride ? (
          <Pressable
            onPress={clearEventOverride}
            style={({ pressed }) => [
              styles.clearOverride,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="x" size={14} color={colors.mutedForeground} />
            <Text
              style={[styles.clearOverrideText, { color: colors.foreground }]}
            >
              {eventOverride.category} · tap to clear
            </Text>
          </Pressable>
        ) : (
          <OccasionTabs value={occasion} onChange={setOccasion} />
        )}

        <SectionLabel>Today’s Outfit</SectionLabel>

        {items.length < 3 ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={16} color={colors.mutedForeground} />
            <Text
              style={[styles.noticeText, { color: colors.mutedForeground }]}
            >
              Add more items to get better outfit suggestions.
            </Text>
          </View>
        ) : null}

        <OutfitPreview outfit={outfit} />

        {noCleanItems ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                marginTop: 12,
                marginBottom: 0,
              },
            ]}
          >
            <Feather name="droplet" size={16} color={colors.mutedForeground} />
            <Text
              style={[styles.noticeText, { color: colors.mutedForeground }]}
            >
              Some clean items were missing — we filled in from your laundry pile.
            </Text>
          </View>
        ) : null}

        {outfit && outfit.missing.length > 0 ? (
          <Text style={[styles.missingText, { color: colors.mutedForeground }]}>
            Missing: {outfit.missing.join(", ")}. Add more items to your closet
            for a complete look.
          </Text>
        ) : null}

        {(explaining || explanation) && isOutfitComplete ? (
          <View
            style={[
              styles.whyCard,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <View style={styles.whyHeader}>
              <Feather
                name="zap"
                size={14}
                color={colors.accentForeground}
              />
              <Text
                style={[styles.whyTitle, { color: colors.accentForeground }]}
              >
                Why this works
              </Text>
            </View>
            {explaining ? (
              <ActivityIndicator
                size="small"
                color={colors.accentForeground}
                style={{ marginTop: 8, alignSelf: "flex-start" }}
              />
            ) : (
              <Text
                style={[styles.whyBody, { color: colors.accentForeground }]}
              >
                {explanation}
              </Text>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={() => generate()}
          disabled={!canGenerate || weatherLoading}
          style={({ pressed }) => [
            styles.generateBtn,
            {
              backgroundColor: colors.primary,
              opacity:
                !canGenerate || weatherLoading
                  ? 0.5
                  : pressed
                    ? 0.85
                    : 1,
            },
          ]}
        >
          <Feather
            name="refresh-cw"
            size={16}
            color={colors.primaryForeground}
          />
          <Text
            style={[
              styles.generateLabel,
              { color: colors.primaryForeground },
            ]}
          >
            {outfit ? "Regenerate Outfit" : "Generate Outfit"}
          </Text>
        </Pressable>

        {isOutfitComplete ? (
          <Pressable
            onPress={onWearOutfit}
            disabled={worn}
            style={({ pressed }) => [
              styles.wearBtn,
              {
                backgroundColor: worn ? colors.card : colors.foreground,
                borderColor: colors.foreground,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={worn ? "check" : "user-check"}
              size={16}
              color={worn ? colors.foreground : colors.background}
            />
            <Text
              style={[
                styles.wearLabel,
                { color: worn ? colors.foreground : colors.background },
              ]}
            >
              {worn ? "Marked as worn" : "Wear This Outfit"}
            </Text>
          </Pressable>
        ) : null}

        {isOutfitComplete ? (
          <Pressable
            onPress={onSaveOutfit}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                borderColor: colors.border,
                opacity: saving ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.foreground} />
            ) : (
              <>
                <Feather
                  name="bookmark"
                  size={16}
                  color={colors.foreground}
                />
                <Text
                  style={[styles.saveLabel, { color: colors.foreground }]}
                >
                  Save to Outfits
                </Text>
              </>
            )}
          </Pressable>
        ) : null}

        {!canGenerate && items.length > 0 ? (
          <Pressable
            onPress={() => router.push("/add-item")}
            style={({ pressed }) => ({
              alignSelf: "center",
              marginTop: 16,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={[styles.linkText, { color: colors.primary }]}>
              Add a Top, Bottom, and Shoes to get started
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <PreferencesModal
        visible={prefsModalOpen}
        initialThreshold={hasDirtyThreshold ? dirtyThreshold : null}
        required={!hasDirtyThreshold}
        onClose={() => setPrefsModalOpen(false)}
        onSave={async (n) => {
          await setDirtyThreshold(n);
          setPrefsModalOpen(false);
        }}
      />
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  missingText: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  whyCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  whyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  whyTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  whyBody: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 20,
  },
  generateBtn: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  generateLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  wearBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  wearLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  saveBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  linkText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  clearOverride: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clearOverrideText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  favSection: {
    marginTop: 4,
  },
  favRow: {
    flexDirection: "row",
    gap: 12,
  },
  favTile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  favImg: {
    width: "100%",
    height: "100%",
  },
});
