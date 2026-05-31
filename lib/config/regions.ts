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
  uk: 'Vaultly',
  india: 'Tijori',
};

export const APP_TAGLINES: Record<Region, string> = {
  uk: 'Your complete wealth picture',
  india: "Apni Tijori. Your family's financial safe.",
};

export const BRAND_COLOURS: Record<Region, { primary: string; secondary: string }> = {
  uk: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
  },
  india: {
    primary: '#f97316',
    secondary: '#dc2626',
  },
};
