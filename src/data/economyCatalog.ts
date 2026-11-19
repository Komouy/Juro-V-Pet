import type { FoodItem, ToyItem } from "../types/pet";

export type CrystalId = "quartz" | "amber" | "emerald" | "amethyst";

export interface CrystalInfo {
  id: CrystalId;
  illustrationId: string;
  name: string;
  rarity: "Umum" | "Langka" | "Sangat Langka" | "Epik";
  rarityVariant: "default" | "orange" | "good" | "charcoal";
  sellPrice: number;
  minFloor: number;
  desc: string;
  accentColor: string;
}

export interface ShopFoodItem extends FoodItem {
  price: number;
}

export interface ShopToyItem extends ToyItem {
  price: number;
}

export interface PickaxeTier {
  level: number;
  illustrationId: string;
  name: string;
  power: number;
  bonusChance: number; // 0..1 chance to get +1 bonus crystal
  price: number;
  desc: string;
}

export interface JuroSkin {
  id: string;
  name: string;
  colorA: string;
  colorB: string;
  flavorDesc: string;
  crystalCost: {
    crystalId: CrystalId;
    amount: number;
  } | null;
  // 3D glossy jelly shader palette
  centerColor: string;
  midColor: string;
  edgeColor: string;
  limbColor: string;
  emissiveColor: string;
}

export const SKIN_CATALOG: JuroSkin[] = [
  {
    id: "classic-orange",
    name: "Classic Juro",
    colorA: "#F97316",
    colorB: "#FED7AA",
    flavorDesc: "Karakter slime jeli oranye orisinal dengan nuansa hangat.",
    crystalCost: null,
    centerColor: "#FFF3E8",
    midColor: "#FFBA75",
    edgeColor: "#FF8819",
    limbColor: "#FF9829",
    emissiveColor: "#FF7A00",
  },
  {
    id: "charcoal-night",
    name: "Charcoal Shadow",
    colorA: "#171717",
    colorB: "#F97316",
    flavorDesc: "Kombinasi tegas charcoal monokrom beraksen oranye menyala.",
    crystalCost: null,
    centerColor: "#78716C",
    midColor: "#3F3F46",
    edgeColor: "#18181B",
    limbColor: "#EA580C",
    emissiveColor: "#C2410C",
  },
  {
    id: "lilac-sunset",
    name: "Lilac Peach",
    colorA: "#C084FC",
    colorB: "#FDBA74",
    flavorDesc: "Gradasi pastel lembut terinspirasi senja musim semi.",
    crystalCost: null,
    centerColor: "#FDF4FF",
    midColor: "#E9D5FF",
    edgeColor: "#A855F7",
    limbColor: "#C084FC",
    emissiveColor: "#9333EA",
  },
  {
    id: "mint-lime",
    name: "Mint Sherbet",
    colorA: "#4ADE80",
    colorB: "#A7F3D0",
    flavorDesc: "Sensasi sejuk daun mint dan sorbet buah segar.",
    crystalCost: { crystalId: "emerald", amount: 2 },
    centerColor: "#ECFDF5",
    midColor: "#6EE7B7",
    edgeColor: "#10B981",
    limbColor: "#34D399",
    emissiveColor: "#059669",
  },
  {
    id: "sky-cyan",
    name: "Azure Breeze",
    colorA: "#38BDF8",
    colorB: "#E0F2FE",
    flavorDesc: "Warna langit pagi cerah di pesisir pantai.",
    crystalCost: { crystalId: "amethyst", amount: 2 },
    centerColor: "#F0F9FF",
    midColor: "#7DD3FC",
    edgeColor: "#0284C7",
    limbColor: "#38BDF8",
    emissiveColor: "#0369A1",
  },
];

export const DEFAULT_UNLOCKED_SKINS: string[] = [
  "classic-orange",
  "charcoal-night",
  "lilac-sunset",
];

export function getSkinById(id: string): JuroSkin {
  return SKIN_CATALOG.find((s) => s.id === id) ?? SKIN_CATALOG[0];
}

export const CRYSTAL_CATALOG: CrystalInfo[] = [
  {
    id: "quartz",
    illustrationId: "crystal-quartz",
    name: "Kristal Kuarsa",
    rarity: "Umum",
    rarityVariant: "default",
    sellPrice: 10,
    minFloor: 1,
    desc: "Kristal bening berkilau yang banyak ditemukan di lapisan atas tambang.",
    accentColor: "#38BDF8",
  },
  {
    id: "amber",
    illustrationId: "crystal-amber",
    name: "Kristal Amber",
    rarity: "Langka",
    rarityVariant: "orange",
    sellPrice: 24,
    minFloor: 1,
    desc: "Bongkahan kristal keemasan hangat sewarna tubuh jeli Juro.",
    accentColor: "#F59E0B",
  },
  {
    id: "emerald",
    illustrationId: "crystal-emerald",
    name: "Kristal Zamrud",
    rarity: "Sangat Langka",
    rarityVariant: "good",
    sellPrice: 52,
    minFloor: 2,
    desc: "Permata hijau terang yang tersembunyi di lapisan batu tambang dalam.",
    accentColor: "#10B981",
  },
  {
    id: "amethyst",
    illustrationId: "crystal-amethyst",
    name: "Kristal Ametis",
    rarity: "Epik",
    rarityVariant: "charcoal",
    sellPrice: 110,
    minFloor: 3,
    desc: "Kristal ungu langka bernilai tinggi dari kedalaman gua bawah tanah.",
    accentColor: "#A855F7",
  },
];

export const SHOP_FOODS: ShopFoodItem[] = [
  {
    id: "honey-drop",
    name: "Tetes Madu Hangat",
    desc: "Sirup madu kental manis alami, cepat diserap jeli.",
    hungerRestore: 20,
    happinessGain: 8,
    energyGain: 5,
    xpReward: 15,
    price: 22,
  },
  {
    id: "biscuit",
    name: "Biskuit Gandum",
    desc: "Biskuit panggang gurih dan renyah favorit Juro.",
    hungerRestore: 24,
    happinessGain: 10,
    energyGain: 8,
    xpReward: 18,
    price: 28,
  },
  {
    id: "orange-slice",
    name: "Irisan Jeruk Manis",
    desc: "Camilan citrus segar kaya rasa oranye khas Juro.",
    hungerRestore: 30,
    happinessGain: 12,
    energyGain: 10,
    xpReward: 25,
    price: 40,
  },
  {
    id: "warm-milk",
    name: "Susu Hangat Murni",
    desc: "Susu creamy hangat untuk mengembalikan tenaga Juro.",
    hungerRestore: 34,
    happinessGain: 15,
    energyGain: 18,
    xpReward: 30,
    price: 52,
  },
  {
    id: "melon-cubes",
    name: "Potongan Melon Embun",
    desc: "Potongan melon segar penyejuk suasana penuh nutrisi.",
    hungerRestore: 42,
    happinessGain: 20,
    energyGain: 15,
    xpReward: 38,
    price: 68,
  },
];

export const SHOP_TOYS: ShopToyItem[] = [
  {
    id: "bounce-ball",
    name: "Bola Pantul Karet",
    desc: "Melompat tinggi saat dilempar, melatih refleks Juro.",
    happinessGain: 20,
    affectionGain: 8,
    energyCost: 12,
    xpReward: 20,
    price: 0,
  },
  {
    id: "bubble-blower",
    name: "Peniup Gelembung",
    desc: "Menciptakan gelembung pelangi yang bisa dikejar Juro.",
    happinessGain: 26,
    affectionGain: 12,
    energyCost: 14,
    xpReward: 30,
    price: 130,
  },
  {
    id: "music-box",
    name: "Radio Nostalgia",
    desc: "Memutar melodi chiptune riang yang bikin Juro bergoyang.",
    happinessGain: 34,
    affectionGain: 16,
    energyCost: 15,
    xpReward: 42,
    price: 240,
  },
];

export const PICKAXE_TIERS: PickaxeTier[] = [
  {
    level: 1,
    illustrationId: "pickaxe-wood",
    name: "Beliung Kayu",
    power: 1,
    bonusChance: 0,
    price: 0,
    desc: "Beliung standar untuk mulai menggali lapisan tanah dangkal.",
  },
  {
    level: 2,
    illustrationId: "pickaxe-stone",
    name: "Beliung Batu",
    power: 2,
    bonusChance: 0.15,
    price: 120,
    desc: "Memecah batu 2× lebih cepat dengan peluang +15% bonus kristal.",
  },
  {
    level: 3,
    illustrationId: "pickaxe-iron",
    name: "Beliung Besi",
    power: 3,
    bonusChance: 0.25,
    price: 260,
    desc: "Kuat menembus lapisan tambang dalam dengan +25% bonus kristal.",
  },
  {
    level: 4,
    illustrationId: "pickaxe-gold",
    name: "Beliung Emas",
    power: 4,
    bonusChance: 0.4,
    price: 520,
    desc: "Kilau emas menarik urat permata langka (+40% bonus kristal).",
  },
  {
    level: 5,
    illustrationId: "pickaxe-crystal",
    name: "Beliung Kristal",
    power: 6,
    bonusChance: 0.6,
    price: 960,
    desc: "Beliung legendaris penghancur batu keras seketika (+60% bonus kristal).",
  },
];

export const DEFAULT_FOOD_INVENTORY: Record<string, number> = {
  "honey-drop": 3,
  "biscuit": 0,
  "orange-slice": 2,
  "warm-milk": 0,
  "melon-cubes": 1,
};

export const DEFAULT_CRYSTALS: Record<CrystalId, number> = {
  quartz: 0,
  amber: 0,
  emerald: 0,
  amethyst: 0,
};

export const DEFAULT_OWNED_TOYS: string[] = ["bounce-ball"];

export function getCrystalById(id: CrystalId): CrystalInfo {
  return CRYSTAL_CATALOG.find((c) => c.id === id) ?? CRYSTAL_CATALOG[0];
}

export function getPickaxeTier(level: number): PickaxeTier {
  return PICKAXE_TIERS.find((p) => p.level === level) ?? PICKAXE_TIERS[0];
}
