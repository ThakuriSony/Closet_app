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
