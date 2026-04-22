import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { buildGreeting } from "@/utils/greeting";

interface Props {
  name?: string | null;
  location?: string | null;
  locationLoading?: boolean;
  date?: Date;
  onEditName?: () => void;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

export function GreetingHeader({
  name,
  location,
  locationLoading,
  date = new Date(),
  onEditName,
}: Props) {
  const colors = useColors();
  const greeting = buildGreeting(name ?? null, date);
  const locationText = locationLoading
    ? "Locating…"
    : location ?? "Your location";
  const subtitle = `${formatDay(date)}, ${locationText}`;

  return (
    <View>
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
        Wearwise
      </Text>
      <View style={styles.greetingRow}>
        <Text
          style={[styles.greeting, { color: colors.foreground }]}
          numberOfLines={2}
        >
          {greeting}
        </Text>
        {onEditName ? (
          <Pressable
            onPress={onEditName}
            hitSlop={10}
            style={({ pressed }) => [
              styles.editBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Feather
              name={name ? "edit-2" : "user-plus"}
              size={14}
              color={colors.mutedForeground}
            />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greeting: {
    flex: 1,
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
