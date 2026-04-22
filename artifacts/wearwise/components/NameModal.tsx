import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  initialName: string | null;
  onClose: () => void;
  onSave: (next: string | null) => void;
}

export function NameModal({ visible, initialName, onClose, onSave }: Props) {
  const colors = useColors();
  const [value, setValue] = useState<string>(initialName ?? "");

  useEffect(() => {
    if (visible) setValue(initialName ?? "");
  }, [visible, initialName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            What should we call you?
          </Text>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>
            We’ll use this for your daily greeting.
          </Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Your name"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => {
              onSave(value);
              onClose();
            }}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
          />
          <View style={styles.actions}>
            {initialName ? (
              <Pressable
                onPress={() => {
                  onSave(null);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.secondary,
                  {
                    borderColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Clear
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                onSave(value);
                onClose();
              }}
              style={({ pressed }) => [
                styles.primary,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={[styles.primaryLabel, { color: colors.primaryForeground }]}
              >
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  body: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  secondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  primary: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
