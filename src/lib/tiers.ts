export type TierId = "free" | "plus" | "pro" | "elite";

export type AxisModel = {
  id: string;
  name: string;
  tagline: string;
  underlying: string;
  minTier: TierId;
  vision: boolean;
};

/** AXIS-branded engines. Each maps to a model on the Lovable AI Gateway. */
export const MODELS: AxisModel[] = [
  {
    id: "axis-swift",
    name: "AXIS Swift",
    tagline: "Fast everyday answers and quick logging help",
    underlying: "openai/gpt-5.6-luna",
    minTier: "free",
    vision: true,
  },
  {
    id: "axis-core",
    name: "AXIS Core",
    tagline: "Balanced reasoning for planning and analysis",
    underlying: "openai/gpt-5.6-terra",
    minTier: "plus",
    vision: true,
  },
  {
    id: "axis-scout",
    name: "AXIS Scout",
    tagline: "Long-context research and document work",
    underlying: "google/gemini-3.6-flash",
    minTier: "plus",
    vision: true,
  },
  {
    id: "axis-prime",
    name: "AXIS Prime",
    tagline: "Deepest reasoning — strategy, admissions, finance",
    underlying: "openai/gpt-5.6-sol",
    minTier: "pro",
    vision: true,
  },
  {
    id: "axis-oracle",
    name: "AXIS Oracle",
    tagline: "Alternate frontier engine for second opinions",
    underlying: "google/gemini-3.1-pro-preview",
    minTier: "elite",
    vision: true,
  },
];

export const DEFAULT_MODEL_ID = "axis-prime";

export type Tier = {
  id: TierId;
  name: string;
  priceMonthly: number;
  blurb: string;
  dailyMessages: number | null;
  features: string[];
  locked: string[];
  mealScan: boolean;
  schoolPath: boolean;
  lifeContext: boolean;
  codeMode: boolean;
  affordability: boolean;
  statementImport: boolean;
};

export const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "The core life OS with a taste of AXIS AI.",
    dailyMessages: 15,
    features: [
      "Tasks, habits, finance, health and school tracking",
      "AXIS Swift engine",
      "15 AI messages a day",
    ],
    locked: [
      "Meal photo scanning",
      "AI admission roadmaps",
      "AXIS Code canvas",
      "Can I afford it? engine",
      "Bank statement import",
    ],
    mealScan: false,
    schoolPath: false,
    lifeContext: false,
    codeMode: false,
    affordability: false,
    statementImport: false,
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 9,
    blurb: "For daily drivers who want AI in the loop.",
    dailyMessages: 150,
    features: [
      "Everything in Free",
      "AXIS Core and AXIS Scout engines",
      "150 AI messages a day",
      "Meal photo scanning with calorie estimates",
      "Personal context in AI answers",
      "AXIS Code canvas — coding chat with saved files",
      "Can I afford it? — AI verdicts on your real money",
    ],
    locked: ["AI admission roadmaps", "Bank statement import", "AXIS Prime engine"],
    mealScan: true,
    schoolPath: false,
    lifeContext: true,
    codeMode: true,
    affordability: true,
    statementImport: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    blurb: "The full AXIS brain across every pillar.",
    dailyMessages: 600,
    features: [
      "Everything in Plus",
      "AXIS Prime — deepest reasoning engine",
      "AI admission roadmaps per target school",
      "Bank statement import — upload a statement, AXIS logs every transaction",
      "600 AI messages a day",
    ],
    locked: ["AXIS Oracle engine", "Unlimited messages"],
    mealScan: true,
    schoolPath: true,
    lifeContext: true,
    codeMode: true,
    affordability: true,
    statementImport: true,
  },
  {
    id: "elite",
    name: "Elite",
    priceMonthly: 39,
    blurb: "Every engine, no ceiling.",
    dailyMessages: null,
    features: [
      "Everything in Pro",
      "AXIS Oracle — alternate frontier engine",
      "Unlimited AI messages",
      "Priority handling on long analyses",
    ],
    locked: [],
    mealScan: true,
    schoolPath: true,
    lifeContext: true,
    codeMode: true,
    affordability: true,
    statementImport: true,
  },
];

const ORDER: TierId[] = ["free", "plus", "pro", "elite"];

export function tierRank(tier: string) {
  const i = ORDER.indexOf(tier as TierId);
  return i < 0 ? 0 : i;
}

export function tierConfig(tier: string): Tier {
  return TIERS.find((t) => t.id === tier) ?? TIERS[0]!;
}

/** Effective tier: paid tiers expire, then fall back to free. */
export function effectiveTier(profile: {
  subscription_tier?: string | null;
  subscription_active_until?: string | null;
} | null | undefined): TierId {
  const tier = (profile?.subscription_tier ?? "free") as TierId;
  if (tier === "free" || !ORDER.includes(tier)) return "free";
  if (!profile?.subscription_active_until) return "free";
  return new Date(profile.subscription_active_until) > new Date() ? tier : "free";
}

export function canUseModel(tier: TierId, model: AxisModel) {
  return tierRank(tier) >= tierRank(model.minTier);
}

export function modelById(id: string) {
  return MODELS.find((m) => m.id === id);
}
