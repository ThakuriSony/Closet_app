import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useColors } from "@/hooks/useColors";
import { OCCASIONS, type Occasion } from "@/services/outfitEngine";

interface Props {
  value: Occasion;
  onChange: (next: Occasion) => void;
}

export function OccasionTabs({ value, onChange }: Props) {
  const colors = useColors();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {OCCASIONS.map((occ) => {
        const active = value === occ;
        return (
          <Pressable
            key={occ}
            onPress={() => onChange(occ)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active ? colors.primaryForeground : colors.mutedForeground,
                },
              ]}
            >
              {occ}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 20,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
