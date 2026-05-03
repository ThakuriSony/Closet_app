import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const AVATAR_KEY = "wearwise:avatar:v2";

export interface AvatarConfig {
  skinToneHex: string;
  heightFactor: number;
  widthFactor: number;
  faceShape: string;
}

export interface AvatarData {
  height_value: number | null;
  height_unit: "cm" | "ft";
  weight_value: number | null;
  weight_unit: "kg" | "lb";
  face_shape: string | null;
  skin_tone: string | null;
  undertone: string | null;
  face_photo_url: string | null;
  avatar_status: "not_started" | "setup_complete" | "confirmed";
  avatar_config: AvatarConfig | null;
  // Photoreal avatar fields (populated once Avatar SDK credentials are added)
  avatar_provider: "demo" | "avatarsdk" | null;
  avatar_model_url: string | null;
  avatar_thumbnail_url: string | null;
  avatar_computation_id: string | null;
}

const DEFAULT: AvatarData = {
  height_value: null,
  height_unit: "cm",
  weight_value: null,
  weight_unit: "kg",
  face_shape: null,
  skin_tone: null,
  undertone: null,
  face_photo_url: null,
  avatar_status: "not_started",
  avatar_config: null,
  avatar_provider: null,
  avatar_model_url: null,
  avatar_thumbnail_url: null,
  avatar_computation_id: null,
};

interface AvatarContextValue {
  avatar: AvatarData;
  loading: boolean;
  updateAvatar: (changes: Partial<AvatarData>) => Promise<void>;
  clearFacePhoto: () => Promise<void>;
  resetAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [avatar, setAvatar] = useState<AvatarData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(AVATAR_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AvatarData>;
          setAvatar({ ...DEFAULT, ...parsed });
        }
      } catch {
        // ignore parse errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: AvatarData) => {
    setAvatar(next);
    await AsyncStorage.setItem(AVATAR_KEY, JSON.stringify(next));
  }, []);

  const updateAvatar = useCallback(
    async (changes: Partial<AvatarData>) => {
      const next = { ...avatar, ...changes };
      await persist(next);
    },
    [avatar, persist],
  );

  const clearFacePhoto = useCallback(async () => {
    const next = { ...avatar, face_photo_url: null };
    await persist(next);
  }, [avatar, persist]);

  const resetAvatar = useCallback(async () => {
    await persist(DEFAULT);
  }, [persist]);

  const value = useMemo<AvatarContextValue>(
    () => ({ avatar, loading, updateAvatar, clearFacePhoto, resetAvatar }),
    [avatar, loading, updateAvatar, clearFacePhoto, resetAvatar],
  );

  return (
    <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>
  );
}

export function useAvatar(): AvatarContextValue {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be used within AvatarProvider");
  return ctx;
}
