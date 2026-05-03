export type Category = "Top" | "Bottom" | "Dress" | "Shoes" | "Outerwear" | "Accessories";

export const CATEGORIES: Category[] = [
  "Top",
  "Bottom",
  "Dress",
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

/**
 * One clothing item placed on a Studio canvas, stored in normalised coords.
 *
 *   nx  = x / canvasW  (0 – 1)
 *   ny  = y / canvasH  (0 – 1)
 *   s   = scale  (unitless; 1 = CANVAS_ITEM_SIZE)
 *   z   = paint order  (higher = rendered on top)
 */
export interface LookbookItem {
  itemId: string;
  nx: number;
  ny: number;
  s: number;
  z: number;
}

/**
 * Canvas dimensions captured at save time, used to reconstruct absolute
 * pixel positions in both the Studio editor and the preview thumbnail.
 *
 *   baseSizeFactor = CANVAS_ITEM_SIZE / canvasW
 *     → item pixel size in any viewport = s × baseSizeFactor × viewportW
 */
export interface LookbookMeta {
  canvasW: number;
  canvasH: number;
  baseSizeFactor: number;
}

export interface Outfit {
  id: string;
  itemIds: string[];
  createdAt: number;
  isFavorite: boolean;
  type?: "generated" | "lookbook";
  layout?: LookbookItem[];
  layoutMeta?: LookbookMeta;
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
