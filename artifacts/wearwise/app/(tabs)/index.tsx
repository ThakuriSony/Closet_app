import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  generateOutfitOptions,
  occasionForEvent,
  type GenerateOutfitResult,
  type Occasion,
} from "@/services/outfitEngine";
import { explainOutfit } from "@/services/outfitExplain";
import { rescheduleNotifications } from "@/services/notificationService";
import {
  DEFAULT_LOCATION,
  FALLBACK_WEATHER,
  fetchWeather,
  weatherForEventTime,
  type WeatherInfo,
} from "@/services/weatherService";
import type { EventCategory, WearEvent } from "@/types";

const H_PADDING = 20;

const VIEWABILITY_CONFIG = { viewAreaCoveragePercentThreshold: 51 };

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { items, addOutfit, markItemsWorn } = useWardrobe();
  const {
    name,
    dirtyThreshold,
    hasDirtyThreshold,
    loading: profileLoading,
    setDirtyThreshold,
    notificationsEnabled,
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

  // Outfit carousel state
  const [outfits, setOutfits] = useState<GenerateOutfitResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [explanations, setExplanations] = useState<string[]>([]);
  const [explaining, setExplaining] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [wornIndices, setWornIndices] = useState<Set<number>>(new Set());
  const [prefsModalOpen, setPrefsModalOpen] = useState<boolean>(false);

  const carouselRef = useRef<FlatList<GenerateOutfitResult>>(null);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (weatherLoading) return;
    void rescheduleNotifications({
      events,
      weather,
      enabled: notificationsEnabled,
    });
  }, [events, weather, weatherLoading, notificationsEnabled]);

  const canGenerate = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return cats.has("Top") && cats.has("Bottom") && cats.has("Shoes");
  }, [items]);

  const upcomingEvent = useMemo<WearEvent | null>(() => {
    const list = getEventsWithinHours(events, 48).filter(
      (e) => e.reminderEnabled,
    );
    return list[0] ?? null;
  }, [events]);

  const effectiveOccasion: Occasion = eventOverride
    ? occasionForEvent(eventOverride.category)
    : occasion;

  // Fire parallel AI explanations for all generated outfits
  const triggerExplanations = useCallback(
    (results: GenerateOutfitResult[], occ: Occasion, w: WeatherInfo) => {
      const init = new Array<string>(results.length).fill("");
      setExplanations(init);
      setExplaining(true);
      let remaining = results.length;
      if (remaining === 0) { setExplaining(false); return; }
      results.forEach((result, i) => {
        const isComplete = result.top && result.shoes && result.missing.length === 0;
        if (!isComplete) {
          remaining--;
          if (remaining === 0) setExplaining(false);
          return;
        }
        explainOutfit(result, occ, w)
          .then((text) => {
            setExplanations((prev) => {
              const next = [...prev];
              next[i] = text;
              return next;
            });
          })
          .catch(() => {})
          .finally(() => {
            remaining--;
            if (remaining === 0) setExplaining(false);
          });
      });
    },
    [],
  );

  const generate = useCallback(
    async (overrideCategory?: EventCategory) => {
      if (!weather) return;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const eventForWeather =
        overrideCategory && eventOverride
          ? eventOverride.event
          : eventOverride?.event;
      const eventTimeMs = eventForWeather
        ? new Date(eventForWeather.dateTime).getTime()
        : NaN;
      const weatherForGen =
        eventForWeather && !Number.isNaN(eventTimeMs)
          ? weatherForEventTime(weather, eventTimeMs)
          : weather;

      const results = generateOutfitOptions(
        items,
        occasion,
        weatherForGen,
        overrideCategory ?? eventOverride?.category,
      );

      setOutfits(results);
      setSelectedIndex(0);
      setWornIndices(new Set());
      carouselRef.current?.scrollToIndex({ index: 0, animated: false });

      const occForExplain: Occasion = overrideCategory
        ? occasionForEvent(overrideCategory)
        : effectiveOccasion;

      triggerExplanations(results, occForExplain, weatherForGen);
    },
    [items, occasion, weather, eventOverride, effectiveOccasion, triggerExplanations],
  );

  const onGenerateForEvent = useCallback(() => {
    if (!upcomingEvent) return;
    setEventOverride({ category: upcomingEvent.category, event: upcomingEvent });
    void generate(upcomingEvent.category);
  }, [upcomingEvent, generate]);

  const clearEventOverride = useCallback(() => {
    setEventOverride(null);
  }, []);

  // Refresh when occasion changes (not in event-override mode)
  useEffect(() => {
    if (eventOverride) return;
    if (outfits.length > 0 && weather) {
      const results = generateOutfitOptions(items, occasion, weather);
      setOutfits(results);
      setSelectedIndex(0);
      setWornIndices(new Set());
      setExplanations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occasion]);

  const selectedOutfit = outfits[selectedIndex] ?? null;

  const outfitItemIds = useMemo(() => {
    if (!selectedOutfit) return [] as string[];
    return [
      selectedOutfit.top,
      selectedOutfit.bottom,
      selectedOutfit.shoes,
      selectedOutfit.outerwear,
    ]
      .filter((i): i is NonNullable<typeof i> => Boolean(i))
      .map((i) => i.id);
  }, [selectedOutfit]);

  const onSaveOutfit = async () => {
    if (!selectedOutfit) return;
    if (outfitItemIds.length < 2) return;
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
    const alreadyWorn = wornIndices.has(selectedIndex);
    if (alreadyWorn) return;
    if (outfitItemIds.length === 0) return;
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await markItemsWorn(outfitItemIds, dirtyThreshold);
    setWornIndices((prev) => new Set([...prev, selectedIndex]));
  };

  const isOutfitComplete =
    selectedOutfit &&
    selectedOutfit.top &&
    selectedOutfit.shoes &&
    selectedOutfit.missing.length === 0;

  const noCleanItems = outfits.length > 0 && selectedOutfit?.usedDirty === true;
  const isWorn = wornIndices.has(selectedIndex);

  // Stable viewable-items handler — must not change reference after FlatList mounts
  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems[0];
      if (first?.index != null) setSelectedIndex(first.index);
    },
  );

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

        <SectionLabel>Today's Outfit</SectionLabel>

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

        {/* ── Carousel ─────────────────────────────────────────────────── */}
        {outfits.length === 0 ? (
          <OutfitPreview outfit={null} />
        ) : (
          <View>
            {/* Break out of the parent ScrollView's horizontal padding so cards
                are full-bleed, then re-apply padding inside each item */}
            <FlatList
              ref={carouselRef}
              data={outfits}
              keyExtractor={(_, i) => String(i)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -H_PADDING }}
              onViewableItemsChanged={onViewableItemsChangedRef.current}
              viewabilityConfig={VIEWABILITY_CONFIG}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
              renderItem={({ item: outfitOption, index }) => (
                <View style={{ width: screenWidth, paddingHorizontal: H_PADDING }}>
                  {/* Option label */}
                  {outfits.length > 1 && (
                    <View style={styles.optionLabelRow}>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Option {index + 1} of {outfits.length}
                      </Text>
                    </View>
                  )}
                  <OutfitPreview outfit={outfitOption} />
                </View>
              )}
            />

            {/* Page dots */}
            {outfits.length > 1 && (
              <View style={styles.dotsRow}>
                {outfits.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === selectedIndex
                            ? colors.foreground
                            : colors.border,
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Dirty-items notice ───────────────────────────────────────── */}
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

        {selectedOutfit && selectedOutfit.missing.length > 0 ? (
          <Text style={[styles.missingText, { color: colors.mutedForeground }]}>
            Missing: {selectedOutfit.missing.join(", ")}. Add more items to
            your closet for a complete look.
          </Text>
        ) : null}

        {/* ── AI explanation ───────────────────────────────────────────── */}
        {(explaining || (explanations[selectedIndex] ?? "") !== "") &&
        isOutfitComplete ? (
          <View
            style={[
              styles.whyCard,
              { backgroundColor: colors.accent, borderColor: colors.border },
            ]}
          >
            <View style={styles.whyHeader}>
              <Feather name="zap" size={14} color={colors.accentForeground} />
              <Text
                style={[styles.whyTitle, { color: colors.accentForeground }]}
              >
                Why this works
              </Text>
            </View>
            {explaining && !(explanations[selectedIndex] ?? "") ? (
              <ActivityIndicator
                size="small"
                color={colors.accentForeground}
                style={{ marginTop: 8, alignSelf: "flex-start" }}
              />
            ) : (
              <Text
                style={[styles.whyBody, { color: colors.accentForeground }]}
              >
                {explanations[selectedIndex] ?? ""}
              </Text>
            )}
          </View>
        ) : null}

        {/* ── Action buttons ───────────────────────────────────────────── */}
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
          <Feather name="refresh-cw" size={16} color={colors.primaryForeground} />
          <Text
            style={[styles.generateLabel, { color: colors.primaryForeground }]}
          >
            {outfits.length > 0 ? "Regenerate Outfits" : "Generate Outfit"}
          </Text>
        </Pressable>

        {isOutfitComplete ? (
          <Pressable
            onPress={onWearOutfit}
            disabled={isWorn}
            style={({ pressed }) => [
              styles.wearBtn,
              {
                backgroundColor: isWorn ? colors.card : colors.foreground,
                borderColor: colors.foreground,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather
              name={isWorn ? "check" : "user-check"}
              size={16}
              color={isWorn ? colors.foreground : colors.background}
            />
            <Text
              style={[
                styles.wearLabel,
                { color: isWorn ? colors.foreground : colors.background },
              ]}
            >
              {isWorn ? "Marked as worn" : "Wear This Outfit"}
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
                <Feather name="bookmark" size={16} color={colors.foreground} />
                <Text style={[styles.saveLabel, { color: colors.foreground }]}>
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
  // Carousel
  optionLabelRow: {
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // AI explanation
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
  // Buttons
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
});
