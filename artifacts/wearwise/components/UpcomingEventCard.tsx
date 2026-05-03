import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { formatEventDate } from "@/services/eventService";
import type { WearEvent } from "@/types";

interface Props {
  event: WearEvent;
  onGenerate: () => void;
}

export function UpcomingEventCard({ event, onGenerate }: Props) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.accent, borderColor: colors.primary },
      ]}
    >
      <View style={styles.headerRow}>
        <Feather name="calendar" size={14} color={colors.primary} />
        <Text style={[styles.tag, { color: colors.primary }]}>
          Upcoming · {event.category}
        </Text>
      </View>
      <Text
        style={[styles.title, { color: colors.accentForeground }]}
        numberOfLines={1}
      >
        {event.title}
      </Text>
      <Text style={[styles.date, { color: colors.accentForeground }]}>
        {formatEventDate(event.dateTime)}
      </Text>
      <Pressable
        onPress={onGenerate}
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Feather name="zap" size={14} color={colors.primaryForeground} />
        <Text style={[styles.btnLabel, { color: colors.primaryForeground }]}>
          Create looks
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tag: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 6,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  date: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    opacity: 0.85,
  },
  btn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btnLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
