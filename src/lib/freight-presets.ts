/**
 * Entering a weight and a volume for every product is the single biggest piece
 * of friction in the catalogue, and vendors do not own scales. These are rough
 * reference figures for common import categories: close enough that the
 * apportioned shipping split stays fair, and far better than a blank field.
 */
export type FreightPreset = {
  label: string;
  weightGrams: number;
  volumeCm3: number;
};

export const FREIGHT_PRESETS: FreightPreset[] = [
  { label: "T-shirt", weightGrams: 200, volumeCm3: 1_500 },
  { label: "Hoodie", weightGrams: 600, volumeCm3: 4_500 },
  { label: "Jeans", weightGrams: 700, volumeCm3: 4_000 },
  { label: "Dress", weightGrams: 400, volumeCm3: 3_000 },
  { label: "Sneakers", weightGrams: 900, volumeCm3: 9_000 },
  { label: "Sandals", weightGrams: 500, volumeCm3: 5_000 },
  { label: "Handbag", weightGrams: 800, volumeCm3: 12_000 },
  { label: "Wig / bundle", weightGrams: 250, volumeCm3: 3_500 },
  { label: "Phone case", weightGrams: 60, volumeCm3: 400 },
  { label: "Watch", weightGrams: 150, volumeCm3: 800 },
];
