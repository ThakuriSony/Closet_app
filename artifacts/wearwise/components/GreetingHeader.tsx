import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  name?: string;
  location?: string;
  date?: Date;
}

function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 18) return "Good Afternoon";
  return "Good Evening";
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long" });
}

export function GreetingHeader({ name, location, date = new Date() }: Props) {
  const colors = useColors();
  const greeting = greetingFor(date.getHours());
  const who = name ? `${greeting}, ${name}` : greeting;
  const subtitle = [formatDay(date), location].filter(Boolean).join(", ");

  return (
    <View>
      <Text style={[styles.kicker, { color: colors.mutedForeground }]}>
        Wearwise
      </Text>
      <Text style={[styles.greeting, { color: colors.foreground }]}>
        {who}
      </Text>
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
