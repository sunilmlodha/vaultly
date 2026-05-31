export const REGIONS = ['uk', 'india'] as const;

export type Region = 'uk' | 'india';

interface RegionConfig {
  currency: string;
  openBanking: string;
  propertyLookup: string;
  languages: string[];
  payments: string;
  notifications: string[];
  features: Record<string, boolean>;
}

const REGION_CONFIGS: Record<Region, RegionConfig> = {
  uk: {
    currency: 'GBP',
    openBanking: 'truelayer',
    propertyLookup: 'land-registry',
    languages: ['en', 'de', 'fr', 'hi'],
    payments: 'stripe',
    notifications: ['push', 'email'],
    features: {},
  },
  india: {
    currency: 'INR',
    openBanking: 'account-aggregator',
    propertyLookup: 'cersai',
    languages: ['en-IN', 'hi', 'ta', 'te', 'kn'],
    payments: 'razorpay',
    notifications: ['push', 'email', 'whatsapp'],
    features: {
      emiTracker: true,
      taxOptimiser: true,
      epfTracer: true,
      sipCalculator: true,
    },
  },
};

export function getRegion(): Region {
  const region = process.env.NEXT_PUBLIC_REGION;
  if (region === 'india') return 'india';
  return 'uk';
}

export function getConfig(): RegionConfig {
  return REGION_CONFIGS[getRegion()];
}

export function isFeatureEnabled(feature: string): boolean {
  const config = getConfig();
  return config.features[feature] === true;
}

export const REGION_LABELS: Record<Region, string> = {
  uk: 'United Kingdom',
  india: 'India',
};

export const APP_NAMES: Record<Region, string> = {
  uk: 'Hale',
  india: 'Tijori',
};

export const APP_TAGLINES: Record<Region, string> = {
  uk: 'Be financially hale.',
  india: "Apni Tijori. Your family's financial safe.",
};

export const APP_SUBTITLES: Record<Region, string> = {
  uk: 'Your complete financial health — tracked, scored and growing.',
  india: 'EPF, SIPs, property and bank accounts — all in one Tijori.',
};

export const BRAND_COLOURS: Record<Region, { primary: string; secondary: string }> = {
  uk: {
    primary: '#059669',   // emerald-600 — health, vitality, growth
    secondary: '#0d9488', // teal-600 — trust, calm
  },
  india: {
    primary: '#f97316',   // orange-500 — saffron, India
    secondary: '#dc2626', // red-600
  },
};
