import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const PROFILE_KEY = "wearwise:profile:v1";

interface Profile {
  name: string | null;
}

interface ProfileContextValue {
  name: string | null;
  loading: boolean;
  setName: (next: string | null) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [name, setNameState] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Profile;
          setNameState(parsed.name ?? null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setName = useCallback(async (next: string | null) => {
    const trimmed = next?.trim() ?? "";
    const value = trimmed.length > 0 ? trimmed : null;
    setNameState(value);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({ name: value }));
  }, []);

  const value = useMemo(
    () => ({ name, loading, setName }),
    [name, loading, setName],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
