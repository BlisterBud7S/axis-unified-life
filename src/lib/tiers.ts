export type TierId = "free" | "plus" | "pro" | "elite";

export type AxisModel = {
  id: string;
  name: string;
  tagline: string;
  underlying: string;
  minTier: TierId;
  vision: boolean;
  family: string;
};

/**
 * All engines are unlocked on every tier — daily message limits still apply per tier.
 * AXIS Signature models use Google Gemini — users add a free Google AI key in Connections.
 * Sol (OpenAI), Apex (Anthropic), and Nova (Google) models need the matching API key.
 */
export const MODELS: AxisModel[] = [
  // ---- Signature AXIS line-up ----
  {
    id: "axis-swift",
    name: "AXIS Swift",
    tagline: "Fast everyday answers and quick logging help",
    underlying: "google/gemini-2.5-flash-lite",
    minTier: "free",
    vision: true,
    family: "AXIS Signature",
  },
  {
    id: "axis-core",
    name: "AXIS Core",
    tagline: "Balanced reasoning for planning and analysis",
    underlying: "google/gemini-2.5-flash",
    minTier: "free",
    vision: true,
    family: "AXIS Signature",
  },
  {
    id: "axis-scout",
    name: "AXIS Scout",
    tagline: "Long-context research and document work",
    underlying: "google/gemini-2.5-flash",
    minTier: "free",
    vision: true,
    family: "AXIS Signature",
  },
  {
    id: "axis-prime",
    name: "AXIS Prime",
    tagline: "Deepest reasoning — strategy, admissions, finance",
    underlying: "google/gemini-2.5-pro",
    minTier: "free",
    vision: true,
    family: "AXIS Signature",
  },
  {
    id: "axis-oracle",
    name: "AXIS Oracle",
    tagline: "Alternate frontier engine for second opinions",
    underlying: "google/gemini-2.5-pro",
    minTier: "free",
    vision: true,
    family: "AXIS Signature",
  },

  // ---- Sol line (OpenAI GPT-5.6 / 5.5 / 5.4 / 5.2 / 5) ----
  {
    id: "sol-5-5",
    name: "AXIS Sol 5.5",
    tagline: "Frontier coding, analysis and professional work",
    underlying: "openai/gpt-5.5",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-5-pro",
    name: "AXIS Sol 5.5 Pro",
    tagline: "Extended reasoning for the hardest problems",
    underlying: "openai/gpt-5.5-pro",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-4",
    name: "AXIS Sol 5.4",
    tagline: "Affordable frontier model for everyday depth",
    underlying: "openai/gpt-5.4",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-4-mini",
    name: "AXIS Sol 5.4 Mini",
    tagline: "Strong mini engine for high-volume work",
    underlying: "openai/gpt-5.4-mini",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-4-nano",
    name: "AXIS Sol 5.4 Nano",
    tagline: "Fastest, cheapest engine for quick calls",
    underlying: "openai/gpt-5.4-nano",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-4-pro",
    name: "AXIS Sol 5.4 Pro",
    tagline: "Premium 5.4 reasoning for complex tasks",
    underlying: "openai/gpt-5.4-pro",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-2",
    name: "AXIS Sol 5.2",
    tagline: "Complex reasoning and problem solving",
    underlying: "openai/gpt-5.2",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5",
    name: "AXIS Sol 5",
    tagline: "Accurate, nuanced all-rounder",
    underlying: "openai/gpt-5",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-mini",
    name: "AXIS Sol 5 Mini",
    tagline: "Lower-cost general performance",
    underlying: "openai/gpt-5-mini",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-5-nano",
    name: "AXIS Sol 5 Nano",
    tagline: "Fast and light for simple tasks",
    underlying: "openai/gpt-5-nano",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },
  {
    id: "sol-chat",
    name: "AXIS Converse",
    tagline: "Natural conversational chat engine",
    underlying: "openai/chat-latest",
    minTier: "free",
    vision: true,
    family: "Sol line",
  },

  // ---- Claude line (Anthropic) ----
  {
    id: "claude-opus-5",
    name: "AXIS Apex Opus",
    tagline: "Most capable — deep analysis, creative writing and complex reasoning",
    underlying: "anthropic/claude-opus-5",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },
  {
    id: "claude-sonnet-5",
    name: "AXIS Apex Sonnet",
    tagline: "Best balance of speed and intelligence for everyday work",
    underlying: "anthropic/claude-sonnet-5",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },
  {
    id: "claude-haiku-4-5",
    name: "AXIS Apex Haiku",
    tagline: "Fastest Claude engine — instant answers at low cost",
    underlying: "anthropic/claude-haiku-4-5-20251001",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },
  {
    id: "claude-fable-5",
    name: "AXIS Apex Fable",
    tagline: "Creative storytelling and nuanced content generation",
    underlying: "anthropic/claude-fable-5",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },
  {
    id: "claude-opus-4",
    name: "AXIS Apex Opus 4",
    tagline: "Previous-gen powerhouse for complex tasks",
    underlying: "anthropic/claude-opus-4-0-20250514",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },
  {
    id: "claude-sonnet-4",
    name: "AXIS Apex Sonnet 4",
    tagline: "Reliable balanced engine for code and analysis",
    underlying: "anthropic/claude-sonnet-4-0-20250514",
    minTier: "free",
    vision: true,
    family: "Apex line",
  },

  // ---- Gemini line ----
  {
    id: "gem-3-7-flash",
    name: "AXIS Nova 3.7",
    tagline: "Latest fast engine for coding and agentic work",
    underlying: "google/gemini-3.7-flash",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-3-5-flash",
    name: "AXIS Nova 3.5",
    tagline: "High-efficiency reasoning and coding",
    underlying: "google/gemini-3.5-flash",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-3-1-flash-lite",
    name: "AXIS Nova Lite",
    tagline: "Cost-efficient engine for high-volume chat",
    underlying: "google/gemini-3.1-flash-lite",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-3-flash-preview",
    name: "AXIS Nova Preview",
    tagline: "Preview engine balancing speed and capability",
    underlying: "google/gemini-3-flash-preview",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-2-5-pro",
    name: "AXIS Nova Pro 2.5",
    tagline: "Strong multimodal and large-context reasoning",
    underlying: "google/gemini-2.5-pro",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-2-5-flash",
    name: "AXIS Nova 2.5",
    tagline: "Balanced cost and latency with multimodal input",
    underlying: "google/gemini-2.5-flash",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
  {
    id: "gem-2-5-flash-lite",
    name: "AXIS Nova 2.5 Lite",
    tagline: "Cheapest engine for simple, high-volume tasks",
    underlying: "google/gemini-2.5-flash-lite",
    minTier: "free",
    vision: true,
    family: "Nova line",
  },
];

export const MODEL_FAMILIES = ["AXIS Signature", "Apex line", "Sol line", "Nova line"] as const;

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
  imageGen: boolean;
  videoGen: boolean;
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
      "All 28 AXIS AI engines",
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
    imageGen: false,
    videoGen: false,
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 9,
    blurb: "For daily drivers who want AI in the loop.",
    dailyMessages: 150,
    features: [
      "Everything in Free",
      "All 28 AXIS AI engines",
      "150 AI messages a day",
      "Meal photo scanning with calorie estimates",
      "Personal context in AI answers",
      "AXIS Code canvas — coding chat with saved files",
      "Can I afford it? — AI verdicts on your real money",
      "AXIS Vision — generate and edit images from a prompt",
    ],
    locked: ["AXIS Motion video generation", "AI admission roadmaps", "Bank statement import"],
    mealScan: true,
    schoolPath: false,
    lifeContext: true,
    codeMode: true,
    affordability: true,
    statementImport: false,
    imageGen: true,
    videoGen: false,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    blurb: "The full AXIS brain across every pillar.",
    dailyMessages: 600,
    features: [
      "Everything in Plus",
            "AI admission roadmaps per target school",
      "Bank statement import — upload a statement, AXIS logs every transaction",
      "AXIS Motion — generate short videos with sound from a prompt",
      "600 AI messages a day",
    ],
    locked: ["Unlimited messages"],
    mealScan: true,
    schoolPath: true,
    lifeContext: true,
    codeMode: true,
    affordability: true,
    statementImport: true,
    imageGen: true,
    videoGen: true,
  },
  {
    id: "elite",
    name: "Elite",
    priceMonthly: 39,
    blurb: "Every engine, no ceiling.",
    dailyMessages: null,
    features: [
      "Everything in Pro",
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
    imageGen: true,
    videoGen: true,
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
