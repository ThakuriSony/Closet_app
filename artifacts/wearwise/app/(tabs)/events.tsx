import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useEvents } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";
import {
  formatEventDate,
  getNextUpcomingEvent,
  sortByDateAsc,
} from "@/services/eventService";
import type { WearEvent } from "@/types";

const H_PADDING = 20;

export default function EventsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { events, removeEvent } = useEvents();

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const tabBarOffset = Platform.OS === "web" ? 100 : 110;

  const sorted = useMemo(() => sortByDateAsc(events), [events]);
  const next = useMemo(() => getNextUpcomingEvent(events), [events]);

  const onLongPress = (e: WearEvent) => {
    Alert.alert(e.title, "Remove this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void removeEvent(e.id);
        },
      },
    ]);
  };

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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Your Events
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Plan ahead and dress for the moment
        </Text>

        <View style={{ height: 18 }} />

        {sorted.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Feather
              name="calendar"
              size={28}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No events yet
            </Text>
            <Text
              style={[styles.emptyBody, { color: colors.mutedForeground }]}
            >
              Add an event so we can suggest the right outfit when the day
              comes.
            </Text>
          </View>
        ) : (
          sorted.map((e) => {
            const isNext = next?.id === e.id;
            return (
              <Pressable
                key={e.id}
                onLongPress={() => onLongPress(e)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isNext ? colors.accent : colors.card,
                    borderColor: isNext ? colors.primary : colors.border,
                    borderWidth: isNext ? 1 : StyleSheet.hairlineWidth,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isNext ? (
                  <Text
                    style={[
                      styles.nextBadge,
                      { color: colors.primary },
                    ]}
                  >
                    Next up
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: isNext
                        ? colors.accentForeground
                        : colors.foreground,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {e.title}
                </Text>
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isNext
                          ? colors.background
                          : colors.accent,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isNext
                            ? colors.foreground
                            : colors.accentForeground,
                        },
                      ]}
                    >
                      {e.category}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dateText,
                      {
                        color: isNext
                          ? colors.accentForeground
                          : colors.mutedForeground,
                      },
                    ]}
                  >
                    {formatEventDate(e.dateTime)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push("/add-event")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: insets.bottom + tabBarOffset - 24,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="plus" size={20} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>
          Add Event
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  card: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  nextBadge: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dateText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  fab: {
    position: "absolute",
    right: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
