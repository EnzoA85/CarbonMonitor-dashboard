export interface Material {
  name: string;
  quantity: number; // en tonnes
  co2PerTon: number; // kgCO2/tonne
}

export interface Site {
  id: number;
  name: string;
  location: string;
  surface: number;          // m²
  employees: number;
  energyConsumption: number; // kWh/an
  parkingSpaces: number;
  materials: Material[];
  createdAt: Date;
}

export interface CarbonResult {
  siteId: number;
  co2Total: number;         // kgCO2e
  co2PerM2: number;         // kgCO2e/m²
  co2PerEmployee: number;   // kgCO2e/employé
  co2Construction: number;  // kgCO2e
  co2Exploitation: number;  // kgCO2e
  breakdown: {
    energy: number;
    parking: number;
    materials: number;
  };
}

export interface HistoricalEntry {
  siteId: number;
  month: string;      // 'YYYY' ou 'YYYY-MM'
  co2Total: number;
  co2Energy: number;
  co2Materials: number;
  co2Parking: number;
}

export interface HeatmapCell {
  siteId: number;
  siteName: string;
  category: string;
  value: number;
  intensity: number;  // 0 → 1 (normalisé par colonne)
}

// ── Types réponse API ────────────────────────────────────────────

export interface SiteResponse {
  id: number;
  name: string;
  location: string;
  surface: number;
  parkingSpaces: number;
  employees: number;
  energyConsumption: number;
  createdAt: string;
  createdBy: string;
}

export interface MaterialResponse {
  id: number;
  name: string;
  emissionFactor: number;
  unit: string;
}

export interface SiteMaterialResponse {
  id: number;
  siteId: number;
  material: MaterialResponse;
  quantity: number;
  calculatedEmission: number;
}

export interface SiteHistoryResponse {
  id: number;
  siteId: number;
  year: number;
  energyConsumption: number;
  employees: number;
  totalEmission: number;
}

export interface CarbonResultResponse {
  id: number;
  siteId: number;
  constructionEmission: number;
  exploitationEmission: number;
  totalEmission: number;
  co2PerM2: number;
  co2PerEmployee: number;
  calculatedAt: string;
}

export interface DashboardKpiResponse {
  totalSites: number;
  totalCarbonFootprint: number;
  averageCo2PerM2: number;
  averageCo2PerEmployee: number;
}