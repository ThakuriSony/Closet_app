import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { WeatherInfo } from "@/services/weatherService";

interface Props {
  weather: WeatherInfo | null;
  loading: boolean;
  failed: boolean;
}

function iconFor(condition: string): keyof typeof Feather.glyphMap {
  const c = condition.toLowerCase();
  if (c.includes("thunder")) return "cloud-lightning";
  if (c.includes("snow")) return "cloud-snow";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower"))
    return "cloud-rain";
  if (c.includes("fog")) return "cloud";
  if (c.includes("clear")) return "sun";
  return "cloud";
}

export function WeatherCard({ weather, loading, failed }: Props) {
  const colors = useColors();

  if (loading && !weather) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading weather…
        </Text>
      </View>
    );
  }

  if (!weather) return null;

  const icon = iconFor(weather.condition);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: colors.accent }]}
      >
        <Feather name={icon} size={22} color={colors.accentForeground} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.temp, { color: colors.foreground }]}>
          {weather.tempC}°C · {weather.condition}
        </Text>
        <Text style={[styles.recommendation, { color: colors.mutedForeground }]}>
          {weather.feelsLikeC !== weather.tempC
            ? `Feels like ${weather.feelsLikeC}°C · ${weather.recommendation}`
            : weather.recommendation}
          {failed ? " · estimate" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  temp: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  recommendation: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
