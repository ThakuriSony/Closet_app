import { Image } from "expo-image";
import React, { useCallback, useRef } from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import type { ClothingItem } from "@/types";

export const CANVAS_ITEM_SIZE = 140;

interface Props {
  entryId: string;
  item: ClothingItem;
  initialX: number;
  initialY: number;
  initialScale: number;
  isSelected: boolean;
  onSelect: (entryId: string) => void;
  onMove: (entryId: string, x: number, y: number, scale: number) => void;
}

function displayUri(item: ClothingItem): string {
  return item.processedImageUri && item.processedImageUri.length > 0
    ? item.processedImageUri
    : item.imageUri;
}

export function CanvasItem({
  entryId,
  item,
  initialX,
  initialY,
  initialScale,
  isSelected,
  onSelect,
  onMove,
}: Props) {
  // Shared values own the live position/scale on the UI thread.
  const x = useSharedValue(initialX);
  const y = useSharedValue(initialY);
  const scale = useSharedValue(initialScale);

  // Snapshot values captured at gesture start (avoids jitter from accumulated
  // translation being applied on top of a stale base).
  const savedX = useSharedValue(initialX);
  const savedY = useSharedValue(initialY);
  const savedScale = useSharedValue(initialScale);

  // Stable refs so gesture callbacks always call the latest prop values even
  // if the parent re-renders between gesture start and end.
  const onMoveRef = useRef(onMove);
  const onSelectRef = useRef(onSelect);
  onMoveRef.current = onMove;
  onSelectRef.current = onSelect;

  const stableMove = useCallback(
    (eid: string, nx: number, ny: number, ns: number) => {
      onMoveRef.current(eid, nx, ny, ns);
    },
    [],
  );
  const stableSelect = useCallback((eid: string) => {
    onSelectRef.current(eid);
  }, []);

  // Capture entryId in a local const so worklets can access it as a primitive.
  const eid = entryId;

  const pan = Gesture.Pan()
    .minDistance(4)
    .onStart(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    })
    .onUpdate((e) => {
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = x.value;
      savedY.value = y.value;
      runOnJS(stableMove)(eid, x.value, y.value, scale.value);
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(0.2, Math.min(4, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(stableMove)(eid, x.value, y.value, scale.value);
    });

  const tap = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(6)
    .onEnd(() => {
      runOnJS(stableSelect)(eid);
    });

  // Pan and pinch can happen simultaneously (two-finger drag + pinch).
  // Tap races against them — if movement threshold is exceeded, pan wins first.
  const gesture = Gesture.Race(
    Gesture.Simultaneous(pan, pinch),
    tap,
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.item,
          animatedStyle,
          isSelected && styles.selected,
        ]}
      >
        <Image
          source={{ uri: displayUri(item) }}
          style={styles.image}
          contentFit="contain"
          transition={100}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CANVAS_ITEM_SIZE,
    height: CANVAS_ITEM_SIZE,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: "#000000",
    borderRadius: 6,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
