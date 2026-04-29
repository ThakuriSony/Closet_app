export type Category = "Top" | "Bottom" | "Shoes" | "Outerwear" | "Accessories";

export const CATEGORIES: Category[] = [
  "Top",
  "Bottom",
  "Shoes",
  "Outerwear",
  "Accessories",
];

export type ItemStatus = "clean" | "dirty";

export interface ClothingItem {
  id: string;
  imageUri: string;
  category: Category;
  color: string;
  tags: string[];
  createdAt: number;
  wearCount: number;
  status: ItemStatus;
  lastWorn: number | null;
}

export type StylePreference =
  | "Casual"
  | "Formal"
  | "Streetwear"
  | "Minimalist";

export const STYLE_PREFERENCES: StylePreference[] = [
  "Casual",
  "Formal",
  "Streetwear",
  "Minimalist",
];

export const DIRTY_THRESHOLD_MIN = 1;
export const DIRTY_THRESHOLD_MAX = 5;
export const DIRTY_THRESHOLD_DEFAULT = 2;

export interface Outfit {
  id: string;
  itemIds: string[];
  createdAt: number;
}

export type EventCategory =
  | "Work"
  | "Casual"
  | "Party"
  | "Formal"
  | "Sporty";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Work",
  "Casual",
  "Party",
  "Formal",
  "Sporty",
];

export interface WearEvent {
  id: string;
  title: string;
  category: EventCategory;
  dateTime: number;
  reminderEnabled: boolean;
  createdAt: number;
}
