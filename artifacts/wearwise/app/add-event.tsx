import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useEvents } from "@/contexts/EventsContext";
import { useColors } from "@/hooks/useColors";
import { EVENT_CATEGORIES, type EventCategory } from "@/types";

function nextDefaultDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

export default function AddEventScreen() {
  const colors = useColors();
  const { addEvent } = useEvents();

  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<EventCategory>("Casual");
  const [date, setDate] = useState<Date>(nextDefaultDate);
  const [reminder, setReminder] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [iosShowDate, setIosShowDate] = useState<boolean>(false);
  const [iosShowTime, setIosShowTime] = useState<boolean>(false);

  const dateLabel = useMemo(
    () =>
      date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [date],
  );

  const timeLabel = useMemo(
    () =>
      date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    [date],
  );

  const canSave = title.trim().length > 0 && !saving;

  const updateDate = (next: Date, mode: "date" | "time") => {
    const merged = new Date(date);
    if (mode === "date") {
      merged.setFullYear(
        next.getFullYear(),
        next.getMonth(),
        next.getDate(),
      );
    } else {
      merged.setHours(next.getHours(), next.getMinutes(), 0, 0);
    }
    setDate(merged);
  };

  const openAndroidDate = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "date",
      onChange: (_, selected) => {
        if (selected) updateDate(selected, "date");
      },
    });
  };

  const openAndroidTime = () => {
    DateTimePickerAndroid.open({
      value: date,
      mode: "time",
      is24Hour: false,
      onChange: (_, selected) => {
        if (selected) updateDate(selected, "time");
      },
    });
  };

  const onPickDate = () => {
    if (Platform.OS === "android") openAndroidDate();
    else if (Platform.OS === "ios") setIosShowDate((v) => !v);
  };

  const onPickTime = () => {
    if (Platform.OS === "android") openAndroidTime();
    else if (Platform.OS === "ios") setIosShowTime((v) => !v);
  };

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await addEvent({
        title: title.trim(),
        category,
        dateTime: date.getTime(),
        reminderEnabled: reminder,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <FieldLabel>Title</FieldLabel>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. John's Wedding"
        placeholderTextColor={colors.mutedForeground}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
      />

      <FieldLabel>Event Type</FieldLabel>
      <View style={styles.chipRow}>
        {EVENT_CATEGORIES.map((cat) => {
          const active = cat === category;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: active
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                  },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FieldLabel>Date</FieldLabel>
      {Platform.OS === "web" ? (
        // Web: native HTML inputs render correctly inside RN Web
        // @ts-expect-error - web-only DOM element
        <input
          type="date"
          value={toDateInputValue(date)}
          onChange={(e: { target: { value: string } }) => {
            const [y, m, d] = e.target.value.split("-").map(Number);
            const next = new Date(date);
            next.setFullYear(y, (m || 1) - 1, d || 1);
            setDate(next);
          }}
          style={webInputStyle(colors)}
        />
      ) : (
        <Pressable
          onPress={onPickDate}
          style={({ pressed }) => [
            styles.input,
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
          <Text style={[styles.rowText, { color: colors.foreground }]}>
            {dateLabel}
          </Text>
        </Pressable>
      )}
      {Platform.OS === "ios" && iosShowDate ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          onChange={(_, selected) => {
            if (selected) updateDate(selected, "date");
          }}
        />
      ) : null}

      <FieldLabel>Time</FieldLabel>
      {Platform.OS === "web" ? (
        // @ts-expect-error - web-only DOM element
        <input
          type="time"
          value={toTimeInputValue(date)}
          onChange={(e: { target: { value: string } }) => {
            const [h, m] = e.target.value.split(":").map(Number);
            const next = new Date(date);
            next.setHours(h || 0, m || 0, 0, 0);
            setDate(next);
          }}
          style={webInputStyle(colors)}
        />
      ) : (
        <Pressable
          onPress={onPickTime}
          style={({ pressed }) => [
            styles.input,
            styles.row,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Feather name="clock" size={16} color={colors.mutedForeground} />
          <Text style={[styles.rowText, { color: colors.foreground }]}>
            {timeLabel}
          </Text>
        </Pressable>
      )}
      {Platform.OS === "ios" && iosShowTime ? (
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onChange={(_, selected) => {
            if (selected) updateDate(selected, "time");
          }}
        />
      ) : null}

      <View
        style={[
          styles.reminderRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.reminderTitle, { color: colors.foreground }]}>
            Remind me
          </Text>
          <Text
            style={[
              styles.reminderBody,
              { color: colors.mutedForeground },
            ]}
          >
            Show this on Home in the 48 hours before
          </Text>
        </View>
        <Switch
          value={reminder}
          onValueChange={setReminder}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={Platform.OS === "android" ? colors.background : undefined}
        />
      </View>

      <Pressable
        onPress={onSave}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.saveBtn,
          {
            backgroundColor: colors.primary,
            opacity: !canSave ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} />
        ) : (
          <Text
            style={[styles.saveLabel, { color: colors.primaryForeground }]}
          >
            Save Event
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function webInputStyle(colors: ReturnType<typeof useColors>) {
  return {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.foreground,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  } as unknown as object;
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  fieldLabel: {
    marginTop: 18,
    marginBottom: 8,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  reminderRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reminderTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  reminderBody: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  saveBtn: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveLabel: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
