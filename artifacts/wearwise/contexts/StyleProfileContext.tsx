import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const PROFILE_KEY = "wearwise:styleprofile:v1";

export interface StyleProfileData {
  height_value: number | null;
  height_unit: "cm" | "ft";
  weight_value: number | null;
  weight_unit: "kg" | "lb";
  face_shape: string | null;
  skin_tone: string | null;
  undertone: string | null;
  is_complete: boolean;
}

const DEFAULT: StyleProfileData = {
  height_value: null,
  height_unit: "cm",
  weight_value: null,
  weight_unit: "kg",
  face_shape: null,
  skin_tone: null,
  undertone: null,
  is_complete: false,
};

interface StyleProfileContextValue {
  profile: StyleProfileData;
  loading: boolean;
  updateProfile: (changes: Partial<StyleProfileData>) => Promise<void>;
  resetProfile: () => Promise<void>;
}

const StyleProfileContext = createContext<StyleProfileContextValue | null>(null);

export function StyleProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<StyleProfileData>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Try new key first
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          setProfile({ ...DEFAULT, ...JSON.parse(raw) });
        } else {
          // Migrate from old AvatarContext v2 if it exists
          const legacy = await AsyncStorage.getItem("wearwise:avatar:v2");
          if (legacy) {
            const old = JSON.parse(legacy) as Record<string, unknown>;
            const migrated: StyleProfileData = {
              ...DEFAULT,
              height_value: (old.height_value as number | null) ?? null,
              height_unit:  (old.height_unit  as "cm" | "ft") ?? "cm",
              weight_value: (old.weight_value as number | null) ?? null,
              weight_unit:  (old.weight_unit  as "kg" | "lb") ?? "kg",
              face_shape:   (old.face_shape   as string | null) ?? null,
              skin_tone:    (old.skin_tone    as string | null) ?? null,
              undertone:    (old.undertone    as string | null) ?? null,
              is_complete:
                (old.avatar_status === "setup_complete" ||
                  old.avatar_status === "confirmed") ?? false,
            };
            setProfile(migrated);
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(migrated));
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: StyleProfileData) => {
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, []);

  const updateProfile = useCallback(
    async (changes: Partial<StyleProfileData>) => {
      await persist({ ...profile, ...changes });
    },
    [profile, persist],
  );

  const resetProfile = useCallback(async () => {
    await persist(DEFAULT);
  }, [persist]);

  const value = useMemo<StyleProfileContextValue>(
    () => ({ profile, loading, updateProfile, resetProfile }),
    [profile, loading, updateProfile, resetProfile],
  );

  return (
    <StyleProfileContext.Provider value={value}>
      {children}
    </StyleProfileContext.Provider>
  );
}

export function useStyleProfile(): StyleProfileContextValue {
  const ctx = useContext(StyleProfileContext);
  if (!ctx) throw new Error("useStyleProfile must be used within StyleProfileProvider");
  return ctx;
}
