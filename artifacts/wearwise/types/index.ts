export type Category = "Top" | "Bottom" | "Shoes" | "Outerwear" | "Accessories";

export const CATEGORIES: Category[] = [
  "Top",
  "Bottom",
  "Shoes",
  "Outerwear",
  "Accessories",
];

export interface ClothingItem {
  id: string;
  imageUri: string;
  category: Category;
  color: string;
  tags: string[];
  createdAt: number;
}

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
