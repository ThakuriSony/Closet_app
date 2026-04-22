import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Category, ClothingItem, Outfit } from "@/types";

const ITEMS_KEY = "wearwise:items:v1";
const OUTFITS_KEY = "wearwise:outfits:v1";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface WardrobeContextValue {
  items: ClothingItem[];
  outfits: Outfit[];
  loading: boolean;
  addItem: (input: {
    imageUri: string;
    category: Category;
    color: string;
    tags: string[];
  }) => Promise<ClothingItem>;
  removeItem: (id: string) => Promise<void>;
  getItem: (id: string) => ClothingItem | undefined;
  addOutfit: (itemIds: string[]) => Promise<Outfit>;
  removeOutfit: (id: string) => Promise<void>;
}

const WardrobeContext = createContext<WardrobeContextValue | null>(null);

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const [rawItems, rawOutfits] = await Promise.all([
          AsyncStorage.getItem(ITEMS_KEY),
          AsyncStorage.getItem(OUTFITS_KEY),
        ]);
        if (rawItems) setItems(JSON.parse(rawItems));
        if (rawOutfits) setOutfits(JSON.parse(rawOutfits));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistItems = useCallback(async (next: ClothingItem[]) => {
    setItems(next);
    await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
  }, []);

  const persistOutfits = useCallback(async (next: Outfit[]) => {
    setOutfits(next);
    await AsyncStorage.setItem(OUTFITS_KEY, JSON.stringify(next));
  }, []);

  const addItem = useCallback<WardrobeContextValue["addItem"]>(
    async (input) => {
      const item: ClothingItem = {
        id: genId(),
        imageUri: input.imageUri,
        category: input.category,
        color: input.color,
        tags: input.tags,
        createdAt: Date.now(),
      };
      const next = [item, ...items];
      await persistItems(next);
      return item;
    },
    [items, persistItems],
  );

  const removeItem = useCallback<WardrobeContextValue["removeItem"]>(
    async (id) => {
      const next = items.filter((i) => i.id !== id);
      await persistItems(next);
      const nextOutfits = outfits.filter((o) => !o.itemIds.includes(id));
      if (nextOutfits.length !== outfits.length) {
        await persistOutfits(nextOutfits);
      }
    },
    [items, outfits, persistItems, persistOutfits],
  );

  const getItem = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  );

  const addOutfit = useCallback<WardrobeContextValue["addOutfit"]>(
    async (itemIds) => {
      const outfit: Outfit = {
        id: genId(),
        itemIds,
        createdAt: Date.now(),
      };
      const next = [outfit, ...outfits];
      await persistOutfits(next);
      return outfit;
    },
    [outfits, persistOutfits],
  );

  const removeOutfit = useCallback<WardrobeContextValue["removeOutfit"]>(
    async (id) => {
      const next = outfits.filter((o) => o.id !== id);
      await persistOutfits(next);
    },
    [outfits, persistOutfits],
  );

  const value = useMemo<WardrobeContextValue>(
    () => ({
      items,
      outfits,
      loading,
      addItem,
      removeItem,
      getItem,
      addOutfit,
      removeOutfit,
    }),
    [items, outfits, loading, addItem, removeItem, getItem, addOutfit, removeOutfit],
  );

  return (
    <WardrobeContext.Provider value={value}>
      {children}
    </WardrobeContext.Provider>
  );
}

export function useWardrobe(): WardrobeContextValue {
  const ctx = useContext(WardrobeContext);
  if (!ctx) {
    throw new Error("useWardrobe must be used within WardrobeProvider");
  }
  return ctx;
}
