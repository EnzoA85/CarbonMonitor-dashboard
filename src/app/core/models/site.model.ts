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
  month: string;      // 'YYYY-MM'
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