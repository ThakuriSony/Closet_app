import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DIRTY_THRESHOLD_DEFAULT,
  DIRTY_THRESHOLD_MAX,
  DIRTY_THRESHOLD_MIN,
} from "@/types";

const PROFILE_KEY = "wearwise:profile:v1";

interface Profile {
  name: string | null;
  dirtyThreshold: number | null;
  notificationsEnabled: boolean;
}

interface ProfileContextValue {
  name: string | null;
  dirtyThreshold: number;
  hasDirtyThreshold: boolean;
  notificationsEnabled: boolean;
  loading: boolean;
  setName: (next: string | null) => Promise<void>;
  setDirtyThreshold: (n: number) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function clampThreshold(n: number): number {
  if (Number.isNaN(n)) return DIRTY_THRESHOLD_DEFAULT;
  return Math.min(DIRTY_THRESHOLD_MAX, Math.max(DIRTY_THRESHOLD_MIN, n));
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>({
    name: null,
    dirtyThreshold: null,
    notificationsEnabled: true,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Profile> & {
            stylePreference?: unknown;
            preferencesCompleted?: unknown;
          };
          setProfile({
            name: parsed.name ?? null,
            dirtyThreshold:
              typeof parsed.dirtyThreshold === "number"
                ? clampThreshold(parsed.dirtyThreshold)
                : null,
            notificationsEnabled:
              typeof parsed.notificationsEnabled === "boolean"
                ? parsed.notificationsEnabled
                : true,
          });
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: Profile) => {
    setProfile(next);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, []);

  const setName = useCallback<ProfileContextValue["setName"]>(
    async (next) => {
      const trimmed = next?.trim() ?? "";
      const value = trimmed.length > 0 ? trimmed : null;
      await persist({ ...profile, name: value });
    },
    [profile, persist],
  );

  const setDirtyThreshold = useCallback<
    ProfileContextValue["setDirtyThreshold"]
  >(
    async (n) => {
      await persist({ ...profile, dirtyThreshold: clampThreshold(n) });
    },
    [profile, persist],
  );

  const setNotificationsEnabled = useCallback<
    ProfileContextValue["setNotificationsEnabled"]
  >(
    async (enabled) => {
      await persist({ ...profile, notificationsEnabled: enabled });
    },
    [profile, persist],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      name: profile.name,
      dirtyThreshold: profile.dirtyThreshold ?? DIRTY_THRESHOLD_DEFAULT,
      hasDirtyThreshold: profile.dirtyThreshold !== null,
      notificationsEnabled: profile.notificationsEnabled,
      loading,
      setName,
      setDirtyThreshold,
      setNotificationsEnabled,
    }),
    [profile, loading, setName, setDirtyThreshold, setNotificationsEnabled],
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
