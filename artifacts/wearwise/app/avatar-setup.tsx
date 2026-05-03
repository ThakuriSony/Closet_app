import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAvatar } from "@/contexts/AvatarContext";
import { useColors } from "@/hooks/useColors";

const TOTAL_STEPS = 7;
const ITEM_H = 56;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

const CM_LIST = Array.from({ length: 71 }, (_, i) => i + 140);
const FT_IN_LIST: string[] = [];
for (let ft = 4; ft <= 6; ft++) {
  const maxIn = ft === 6 ? 6 : 11;
  for (let inch = 0; inch <= maxIn; inch++) {
    FT_IN_LIST.push(`${ft}' ${inch}"`);
  }
}

const KG_LIST = Array.from({ length: 161 }, (_, i) => i + 40);
const LB_LIST = Array.from({ length: 351 }, (_, i) => i + 90);

const FACE_SHAPES = ["Oval", "Round", "Square", "Diamond", "Heart", "Rectangle"];

const SKIN_TONES = [
  { label: "Ivory", color: "#FDEBD6" },
  { label: "Sand", color: "#F0C99A" },
  { label: "Honey", color: "#D4956A" },
  { label: "Caramel", color: "#B5713E" },
  { label: "Bronze", color: "#8B4513" },
  { label: "Espresso", color: "#3D1F0D" },
];

function ScrollPicker({
  items,
  selectedIndex,
  onSelect,
  format,
  pickerKey,
}: {
  items: (number | string)[];
  selectedIndex: number;
  onSelect: (idx: number) => void;
  format?: (v: number | string) => string;
  pickerKey?: string;
}) {
  const colors = useColors();
  const scrollRef = useRef<ScrollView>(null);
  const [liveIdx, setLiveIdx] = useState(selectedIndex);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [pickerKey]);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    setLiveIdx(idx);
    onSelect(idx);
  };

  return (
    <View style={{ height: ITEM_H * VISIBLE }}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            top: ITEM_H * PAD,
            bottom: undefined,
            height: ITEM_H,
            borderTopWidth: 1.5,
            borderBottomWidth: 1.5,
            borderColor: colors.primary,
          },
        ]}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
          setLiveIdx(idx);
        }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{
          paddingTop: ITEM_H * PAD,
          paddingBottom: ITEM_H * PAD,
        }}
      >
        {items.map((item, i) => {
          const isSel = i === liveIdx;
          return (
            <View
              key={i}
              style={{ height: ITEM_H, justifyContent: "center", alignItems: "center" }}
            >
              <Text
                style={{
                  fontSize: isSel ? 26 : 18,
                  color: isSel ? colors.primary : colors.mutedForeground,
                  fontFamily: isSel ? "Inter_700Bold" : "Inter_400Regular",
                  opacity: isSel ? 1 : 0.55,
                }}
              >
                {format ? format(item) : String(item)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FaceShapeIcon({ shape, selected }: { shape: string; selected: boolean }) {
  const colors = useColors();
  const c = selected ? "rgba(255,255,255,0.9)" : colors.mutedForeground;
  const base = { backgroundColor: c, alignSelf: "center" as const };

  switch (shape) {
    case "Oval":
      return <View style={[base, { width: 30, height: 42, borderRadius: 15 }]} />;
    case "Round":
      return <View style={[base, { width: 38, height: 38, borderRadius: 19 }]} />;
    case "Square":
      return <View style={[base, { width: 36, height: 36, borderRadius: 4 }]} />;
    case "Diamond":
      return (
        <View
          style={[base, { width: 28, height: 28, borderRadius: 4, transform: [{ rotate: "45deg" }] }]}
        />
      );
    case "Heart":
      return (
        <Feather name="heart" size={32} color={c} />
      );
    case "Rectangle":
      return <View style={[base, { width: 26, height: 42, borderRadius: 4 }]} />;
    default:
      return null;
  }
}

export default function AvatarSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { avatar, updateAvatar } = useAvatar();

  const [step, setStep] = useState(1);

  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">(avatar.height_unit);
  const [heightCmIdx, setHeightCmIdx] = useState(() => {
    if (avatar.height_value && avatar.height_unit === "cm") {
      const i = CM_LIST.indexOf(avatar.height_value);
      return i >= 0 ? i : 20;
    }
    return 20;
  });
  const [heightFtIdx, setHeightFtIdx] = useState(10);

  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">(avatar.weight_unit);
  const [weightKgIdx, setWeightKgIdx] = useState(() => {
    if (avatar.weight_value && avatar.weight_unit === "kg") {
      const i = KG_LIST.indexOf(avatar.weight_value);
      return i >= 0 ? i : 30;
    }
    return 30;
  });
  const [weightLbIdx, setWeightLbIdx] = useState(64);

  const [faceShape, setFaceShape] = useState<string | null>(avatar.face_shape);
  const [undertone, setUndertone] = useState<string | null>(avatar.undertone);
  const [skinTone, setSkinTone] = useState<string | null>(avatar.skin_tone);
  const [facePhoto, setFacePhoto] = useState<string | null>(avatar.face_photo_url);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const goBack = () => {
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  };

  const saveHeight = async () => {
    if (heightUnit === "cm") {
      await updateAvatar({ height_value: CM_LIST[heightCmIdx], height_unit: "cm" });
    } else {
      await updateAvatar({ height_value: heightFtIdx, height_unit: "ft" });
    }
    goNext();
  };

  const saveWeight = async () => {
    if (weightUnit === "kg") {
      await updateAvatar({ weight_value: KG_LIST[weightKgIdx], weight_unit: "kg" });
    } else {
      await updateAvatar({ weight_value: LB_LIST[weightLbIdx], weight_unit: "lb" });
    }
    goNext();
  };

  const saveFaceShape = async () => {
    if (faceShape) await updateAvatar({ face_shape: faceShape });
    goNext();
  };

  const saveSkinTone = async () => {
    if (skinTone) await updateAvatar({ skin_tone: skinTone });
    goNext();
  };

  const saveFacePhoto = async () => {
    await updateAvatar({ face_photo_url: facePhoto });
    goNext();
  };

  useEffect(() => {
    if (step === 7) {
      (async () => {
        await new Promise((r) => setTimeout(r, 2500));
        await updateAvatar({ avatar_status: "setup_complete" });
        router.back();
      })();
    }
  }, [step]);

  const pickGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setFacePhoto(result.assets[0].uri);
    }
  };

  const pickCamera = async () => {
    if (Platform.OS === "web") return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setFacePhoto(result.assets[0].uri);
    }
  };

  const Header = () => (
    <View>
      <View style={styles.headerRow}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>
          Step {step} of {TOTAL_STEPS}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Text style={[styles.exitText, { color: colors.mutedForeground }]}>Exit</Text>
        </Pressable>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );

  const renderStep1 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select height</Text>
      <View style={styles.unitToggle}>
        {(["cm", "ft"] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => setHeightUnit(u)}
            style={({ pressed }) => [
              styles.unitBtn,
              {
                backgroundColor: heightUnit === u ? colors.primary : colors.card,
                borderColor: heightUnit === u ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: heightUnit === u ? colors.primaryForeground : colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {u === "cm" ? "Centimeter" : "Feet & inches"}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {heightUnit === "cm" ? (
          <ScrollPicker
            pickerKey="height-cm"
            items={CM_LIST}
            selectedIndex={heightCmIdx}
            onSelect={setHeightCmIdx}
            format={(v) => `${v} cm`}
          />
        ) : (
          <ScrollPicker
            pickerKey="height-ft"
            items={FT_IN_LIST}
            selectedIndex={heightFtIdx}
            onSelect={setHeightFtIdx}
          />
        )}
      </View>
      <Pressable
        onPress={saveHeight}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Save</Text>
      </Pressable>
    </>
  );

  const renderStep2 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select weight</Text>
      <View style={styles.unitToggle}>
        {(["kg", "lb"] as const).map((u) => (
          <Pressable
            key={u}
            onPress={() => setWeightUnit(u)}
            style={({ pressed }) => [
              styles.unitBtn,
              {
                backgroundColor: weightUnit === u ? colors.primary : colors.card,
                borderColor: weightUnit === u ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: weightUnit === u ? colors.primaryForeground : colors.mutedForeground,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              {u}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        {weightUnit === "kg" ? (
          <ScrollPicker
            pickerKey="weight-kg"
            items={KG_LIST}
            selectedIndex={weightKgIdx}
            onSelect={setWeightKgIdx}
            format={(v) => `${v} kg`}
          />
        ) : (
          <ScrollPicker
            pickerKey="weight-lb"
            items={LB_LIST}
            selectedIndex={weightLbIdx}
            onSelect={setWeightLbIdx}
            format={(v) => `${v} lb`}
          />
        )}
      </View>
      <Pressable
        onPress={saveWeight}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Save</Text>
      </Pressable>
    </>
  );

  const renderStep3 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select face shape</Text>
      <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
        Choose the shape that most closely resembles your face.
      </Text>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View style={styles.faceGrid}>
          {FACE_SHAPES.map((shape) => {
            const isSel = faceShape === shape;
            return (
              <Pressable
                key={shape}
                onPress={() => setFaceShape(shape)}
                style={({ pressed }) => [
                  styles.faceCard,
                  {
                    backgroundColor: isSel ? colors.primary : colors.card,
                    borderColor: isSel ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaceShapeIcon shape={shape} selected={isSel} />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontFamily: "Inter_600SemiBold",
                    color: isSel ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {shape}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable
        onPress={saveFaceShape}
        disabled={!faceShape}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: faceShape ? colors.primary : colors.muted,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.ctaText,
            { color: faceShape ? colors.primaryForeground : colors.mutedForeground },
          ]}
        >
          Save
        </Text>
      </Pressable>
    </>
  );

  const renderStep4 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Find your undertone</Text>
      <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
        Your undertone is the subtle hue beneath your skin — it helps us recommend colours that
        naturally complement you.
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {[
          {
            label: "Cool",
            emoji: "🔵",
            desc: "Blue, pink, or red hues beneath the skin. Suits silver jewellery, pastels, and jewel tones.",
            vein: "Veins appear bluish or purplish.",
          },
          {
            label: "Warm",
            emoji: "🟡",
            desc: "Yellow, peachy, or golden hues. Suits gold jewellery, earth tones, and warm reds.",
            vein: "Veins appear greenish.",
          },
          {
            label: "Neutral",
            emoji: "⚪",
            desc: "A balanced mix of cool and warm. Most colour palettes work well.",
            vein: "Veins appear blue-green.",
          },
        ].map(({ label, emoji, desc, vein }) => {
          const isSel = undertone === label;
          return (
            <Pressable
              key={label}
              onPress={() => setUndertone(label)}
              style={({ pressed }) => [
                styles.undertoneCard,
                {
                  backgroundColor: isSel ? colors.primary : colors.card,
                  borderColor: isSel ? colors.primary : colors.border,
                  borderWidth: isSel ? 1.5 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={styles.undertoneEmoji}>{emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.undertoneName, { color: isSel ? colors.primaryForeground : colors.foreground }]}>
                  {label}
                </Text>
                <Text style={[styles.undertoneDesc, { color: isSel ? colors.primaryForeground : colors.mutedForeground, opacity: isSel ? 0.9 : 1 }]}>
                  {desc}
                </Text>
                <Text style={[styles.undertoneVein, { color: isSel ? colors.primaryForeground : colors.mutedForeground, opacity: isSel ? 0.8 : 1 }]}>
                  💡 {vein}
                </Text>
              </View>
              {isSel ? (
                <Feather name="check-circle" size={20} color={colors.primaryForeground} />
              ) : null}
            </Pressable>
          );
        })}
        <View style={{ height: 16 }} />
      </ScrollView>
      <Pressable
        onPress={async () => {
          if (undertone) await updateAvatar({ undertone });
          goNext();
        }}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Continue</Text>
      </Pressable>
    </>
  );

  const renderStep5 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Select skin tone</Text>
      <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
        Pick the option closest to your complexion.
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.toneList}>
          {SKIN_TONES.map(({ label, color }) => {
            const isSel = skinTone === label;
            return (
              <Pressable
                key={label}
                onPress={() => setSkinTone(label)}
                style={({ pressed }) => [
                  styles.toneRow,
                  {
                    backgroundColor: isSel ? colors.primary : colors.card,
                    borderColor: isSel ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.toneSwatch, { backgroundColor: color }]} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontFamily: "Inter_600SemiBold",
                    color: isSel ? colors.primaryForeground : colors.foreground,
                  }}
                >
                  {label}
                </Text>
                {isSel ? (
                  <Feather name="check" size={18} color={colors.primaryForeground} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
      <View style={styles.ctaRow}>
        {skinTone ? (
          <Pressable
            onPress={() => setSkinTone(null)}
            style={({ pressed }) => [
              styles.ctaSecondary,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.ctaSecondaryText, { color: colors.foreground }]}>Clear</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={saveSkinTone}
          disabled={!skinTone}
          style={({ pressed }) => [
            styles.ctaFlex,
            {
              backgroundColor: skinTone ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              { color: skinTone ? colors.primaryForeground : colors.mutedForeground },
            ]}
          >
            Save
          </Text>
        </Pressable>
      </View>
    </>
  );

  const renderStep6 = () => (
    <>
      <Text style={[styles.stepTitle, { color: colors.foreground }]}>Upload face picture</Text>
      <Text style={[styles.stepSub, { color: colors.mutedForeground }]}>
        Used only to create your avatar. You can delete this anytime.
      </Text>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {facePhoto ? (
          <View style={{ alignItems: "center", gap: 16 }}>
            <View style={styles.photoWrap}>
              <Image
                source={{ uri: facePhoto }}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setFacePhoto(null)}
                style={[styles.photoDelete, { backgroundColor: colors.foreground }]}
              >
                <Feather name="x" size={14} color={colors.background} />
              </Pressable>
            </View>
            <Text style={[styles.photoSuccess, { color: colors.primary }]}>
              ✓ Photo uploaded successfully!
            </Text>
          </View>
        ) : (
          <View style={{ width: "100%", alignItems: "center", gap: 20 }}>
            <View
              style={[
                styles.uploadBox,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Feather name="user" size={44} color={colors.mutedForeground} />
              <Text style={[styles.uploadHint, { color: colors.mutedForeground }]}>
                Front-facing · Good lighting
              </Text>
            </View>
            <View style={styles.uploadBtns}>
              {Platform.OS !== "web" && (
                <Pressable
                  onPress={pickCamera}
                  style={({ pressed }) => [
                    styles.uploadBtn,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <Feather name="camera" size={18} color={colors.foreground} />
                  <Text style={[styles.uploadBtnText, { color: colors.foreground }]}>Camera</Text>
                </Pressable>
              )}
              <Pressable
                onPress={pickGallery}
                style={({ pressed }) => [
                  styles.uploadBtn,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Feather name="image" size={18} color={colors.foreground} />
                <Text style={[styles.uploadBtnText, { color: colors.foreground }]}>Gallery</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      <Pressable
        onPress={saveFacePhoto}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>Continue</Text>
      </Pressable>
    </>
  );

  const renderStep7 = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 24 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.stepTitle, { color: colors.foreground, textAlign: "center" }]}>
        Generating your virtual avatar
      </Text>
      <Text
        style={[
          styles.stepSub,
          { color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 24 },
        ]}
      >
        Please wait a moment while we prepare your avatar.{"\n"}Please don't close this screen.
      </Text>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 24,
        },
      ]}
    >
      {step < 7 && <Header />}
      <View style={styles.body}>{renderStep()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  exitText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  stepTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  stepSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 20,
  },
  unitToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  unitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  cta: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  ctaSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  ctaFlex: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
  faceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  faceCard: {
    width: "30%",
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  undertoneCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  undertoneEmoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  undertoneName: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  undertoneDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  undertoneVein: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    fontStyle: "italic",
  },
  toneList: { gap: 10 },
  toneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  toneSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.12)",
  },
  photoWrap: {
    position: "relative",
    alignItems: "center",
  },
  photoPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  photoDelete: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoSuccess: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  uploadBox: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  uploadHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  uploadBtns: {
    flexDirection: "row",
    gap: 12,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  uploadBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
