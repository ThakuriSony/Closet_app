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
  onOpenProfile?: () => void;
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

export function GreetingHeader({
  name,
  location,
  locationLoading,
  date = new Date(),
  onOpenProfile,
}: Props) {
  const colors = useColors();
  const greeting = buildGreeting(name ?? null, date);
  const locationText = locationLoading
    ? "Locating…"
    : location ?? "Your location";
  const subtitle = `${formatDay(date)}, ${locationText}`;

  return (
    <View>
      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
          Wearwise
        </Text>
        {onOpenProfile ? (
          <Pressable
            onPress={onOpenProfile}
            hitSlop={10}
            accessibilityLabel="Open profile"
            style={({ pressed }) => [
              styles.profileBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Feather name="user" size={16} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      <Text
        style={[styles.greeting, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {greeting}
      </Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  greeting: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
