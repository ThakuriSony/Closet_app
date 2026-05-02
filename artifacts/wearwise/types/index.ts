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

// Position/scale of a single item on a lookbook canvas.
export interface LookbookItem {
  itemId: string;
  x: number;
  y: number;
  scale: number;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  createdAt: number;
  isFavorite: boolean;
  // "generated" = created by the outfit engine / create-outfit screen (default)
  // "lookbook"  = created in the Studio canvas editor
  type?: "generated" | "lookbook";
  // Canvas layout — only present on lookbook outfits
  layout?: LookbookItem[];
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
