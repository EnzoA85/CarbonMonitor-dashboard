import { Injectable } from '@angular/core';
import { Site, CarbonResult, HistoricalEntry, HeatmapCell } from '../models/site.model';

// Facteurs d'émission (kgCO2e)
const ENERGY_FACTOR = 0.0571;      // kgCO2/kWh (réseau FR moyen)
const PARKING_FACTOR = 1500;       // kgCO2 par place (construction béton)
const PARKING_USAGE_FACTOR = 200;  // kgCO2/place/an (usage voitures)

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  private sites: Site[] = [
    {
      id: 1,
      name: 'Siège Social Paris',
      location: 'Paris, Île-de-France',
      surface: 15000,
      employees: 2500,
      energyConsumption: 2200000,
      parkingSpaces: 350,
      createdAt: new Date('2024-01-15'),
      materials: [
        { name: 'Béton', quantity: 850, co2PerTon: 210 },
        { name: 'Acier', quantity: 120, co2PerTon: 1850 },
        { name: 'Verre', quantity: 40, co2PerTon: 900 },
        { name: 'Bois', quantity: 60, co2PerTon: 50 }
      ]
    },
    {
      id: 2,
      name: 'Campus Rennes',
      location: 'Rennes, Bretagne',
      surface: 11771,
      employees: 1800,
      energyConsumption: 1840000,
      parkingSpaces: 200,
      createdAt: new Date('2024-03-10'),
      materials: [
        { name: 'Béton', quantity: 620, co2PerTon: 210 },
        { name: 'Acier', quantity: 85, co2PerTon: 1850 },
        { name: 'Bois', quantity: 120, co2PerTon: 50 },
        { name: 'Isolant', quantity: 25, co2PerTon: 400 }
      ]
    },
    {
      id: 3,
      name: 'Entrepôt Lyon',
      location: 'Lyon, Auvergne-Rhône-Alpes',
      surface: 8500,
      employees: 320,
      energyConsumption: 950000,
      parkingSpaces: 80,
      createdAt: new Date('2024-05-20'),
      materials: [
        { name: 'Béton', quantity: 400, co2PerTon: 210 },
        { name: 'Acier', quantity: 200, co2PerTon: 1850 },
        { name: 'Aluminium', quantity: 15, co2PerTon: 8900 }
      ]
    },
    {
      id: 4,
      name: 'Bureau Bordeaux',
      location: 'Bordeaux, Nouvelle-Aquitaine',
      surface: 3200,
      employees: 450,
      energyConsumption: 420000,
      parkingSpaces: 50,
      createdAt: new Date('2024-07-08'),
      materials: [
        { name: 'Béton', quantity: 150, co2PerTon: 210 },
        { name: 'Bois', quantity: 80, co2PerTon: 50 },
        { name: 'Verre', quantity: 20, co2PerTon: 900 }
      ]
    }
  ];

  getSites(): Site[] {
    return [...this.sites];
  }

  getSiteById(id: number): Site | undefined {
    return this.sites.find(s => s.id === id);
  }

  addSite(site: Omit<Site, 'id'>): Site {
    const newSite: Site = { ...site, id: Date.now() };
    this.sites.push(newSite);
    return newSite;
  }

  updateSite(id: number, data: Omit<Site, 'id'>): Site | undefined {
    const idx = this.sites.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    this.sites[idx] = { ...data, id };
    return this.sites[idx];
  }

  deleteSite(id: number): void {
    this.sites = this.sites.filter(s => s.id !== id);
  }

  calculateCarbon(site: Site): CarbonResult {
    // CO2 exploitation (énergie annuelle)
    const co2Energy = site.energyConsumption * ENERGY_FACTOR;

    // CO2 parking usage annuel
    const co2ParkingUsage = site.parkingSpaces * PARKING_USAGE_FACTOR;

    // CO2 matériaux (construction)
    const co2Materials = site.materials.reduce(
      (sum, m) => sum + m.quantity * m.co2PerTon,
      0
    );

    // CO2 construction parking (amorti sur 50 ans)
    const co2ParkingConstruction = (site.parkingSpaces * PARKING_FACTOR) / 50;

    const co2Construction = co2Materials + co2ParkingConstruction;
    const co2Exploitation = co2Energy + co2ParkingUsage;
    const co2Total = co2Construction + co2Exploitation;

    return {
      siteId: site.id,
      co2Total: Math.round(co2Total),
      co2PerM2: Math.round((co2Total / site.surface) * 10) / 10,
      co2PerEmployee: Math.round(co2Total / site.employees),
      co2Construction: Math.round(co2Construction),
      co2Exploitation: Math.round(co2Exploitation),
      breakdown: {
        energy: Math.round(co2Energy),
        parking: Math.round(co2ParkingUsage + co2ParkingConstruction),
        materials: Math.round(co2Materials)
      }
    };
  }

  // ----------------------------------------------------------------
  // Historique mensuel mock  (24 mois : jan 2024 → déc 2025)
  // ----------------------------------------------------------------
  getHistory(siteId: number): HistoricalEntry[] {
    const site = this.getSiteById(siteId);
    if (!site) return [];

    const base = this.calculateCarbon(site);
    const months: HistoricalEntry[] = [];

    // Trend légèrement décroissant (+bruit aléatoire déterministe)
    for (let i = 0; i < 24; i++) {
      const year  = i < 12 ? 2024 : 2025;
      const month = (i % 12) + 1;
      const label = `${year}-${String(month).padStart(2, '0')}`;

      // Facteur saisonnier : hiver +15%, été -10%
      const seasonal = 1 + 0.15 * Math.cos(((month - 1) / 11) * Math.PI);
      // Tendance améliorative : -8% sur 2 ans
      const trend    = 1 - (i / 23) * 0.08;
      // Bruit pseudo-aléatoire déterministe basé sur siteId
      const noise    = 1 + (((siteId * 7 + i * 13) % 20) - 10) / 100;

      const factor   = seasonal * trend * noise;
      const energy   = Math.round(base.breakdown.energy   * factor);
      const materials = Math.round(base.breakdown.materials * (0.95 + i * 0.001)); // quasi-constant
      const parking  = Math.round(base.breakdown.parking  * factor * 0.9);

      months.push({
        siteId,
        month: label,
        co2Total:    energy + materials + parking,
        co2Energy:   energy,
        co2Materials: materials,
        co2Parking:  parking
      });
    }
    return months;
  }

  getAllHistory(): HistoricalEntry[] {
    return this.sites.flatMap(s => this.getHistory(s.id));
  }

  // ----------------------------------------------------------------
  // Heatmap : intensité CO₂ par site × catégorie
  // ----------------------------------------------------------------
  getHeatmapData(): HeatmapCell[][] {
    const categories = [
      { key: 'co2Total',        label: 'CO₂ Total' },
      { key: 'co2PerM2',        label: 'CO₂/m²' },
      { key: 'co2PerEmployee',  label: 'CO₂/employé' },
      { key: 'co2Construction', label: 'Construction' },
      { key: 'co2Exploitation', label: 'Exploitation' },
      { key: 'energy',          label: 'Énergie' },
      { key: 'materials',       label: 'Matériaux' },
      { key: 'parking',         label: 'Parking' }
    ];

    const results = this.sites.map(s => ({ site: s, carbon: this.calculateCarbon(s) }));

    const pickValue = (carbon: CarbonResult, k: string): number => {
      switch (k) {
        case 'co2Total':        return carbon.co2Total;
        case 'co2PerM2':        return carbon.co2PerM2;
        case 'co2PerEmployee':  return carbon.co2PerEmployee;
        case 'co2Construction': return carbon.co2Construction;
        case 'co2Exploitation': return carbon.co2Exploitation;
        case 'energy':          return carbon.breakdown.energy;
        case 'materials':       return carbon.breakdown.materials;
        case 'parking':         return carbon.breakdown.parking;
        default:                return 0;
      }
    };

    // Pour chaque catégorie, normaliser les valeurs 0→1
    return results.map(({ site, carbon }) =>
      categories.map(cat => {
        const colValues = results.map(r => pickValue(r.carbon, cat.key));
        const max = Math.max(...colValues) || 1;
        const value = pickValue(carbon, cat.key);

        return {
          siteId:    site.id,
          siteName:  site.name,
          category:  cat.label,
          value,
          intensity: value / max
        } as HeatmapCell;
      })
    );
  }
}