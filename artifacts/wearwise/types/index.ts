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
  // Local file URI of a background-removed PNG. Falls back to imageUri when
  // unavailable (e.g. removal failed or hasn't completed yet).
  processedImageUri?: string | null;
  category: Category;
  color: string;
  tags: string[];
  createdAt: number;
  wearCount: number;
  status: ItemStatus;
  lastWorn: number | null;
  isFavorite: boolean;
}

export const DIRTY_THRESHOLD_MIN = 1;
export const DIRTY_THRESHOLD_MAX = 5;
export const DIRTY_THRESHOLD_DEFAULT = 2;

export interface Outfit {
  id: string;
  itemIds: string[];
  createdAt: number;
  isFavorite: boolean;
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
