import { Injectable } from '@angular/core';
import { AuthService } from './auth';
import {
  apiAddSiteMaterial,
  apiCalculateSite,
  apiCreateSite,
  apiDeleteSite,
  apiGetSite,
  apiGetSiteHistory,
  apiGetSiteMaterials,
  apiGetSiteReport,
  apiListMaterials,
  apiListSites,
  apiRemoveSiteMaterial,
  apiUpdateSite,
  type CarbonResultResponse,
  type MaterialResponse,
  type SiteMaterialResponse,
  type SiteResponse,
} from './api';
import {
  CarbonResult,
  HeatmapCell,
  HistoricalEntry,
  Material,
  Site,
} from '../models/site.model';

const ENERGY_FACTOR = 0.0571;
const PARKING_USAGE_FACTOR = 200;

function toSite(sr: SiteResponse, materials: Material[] = []): Site {
  return {
    id: sr.id,
    name: sr.name ?? '',
    location: sr.location ?? '',
    surface: sr.surface ?? 0,
    employees: sr.employees ?? 0,
    energyConsumption: sr.energyConsumption ?? 0,
    parkingSpaces: sr.parkingSpaces ?? 0,
    materials,
    createdAt: sr.createdAt ? new Date(sr.createdAt) : new Date(),
  };
}

function toMaterial(sm: SiteMaterialResponse): Material {
  const u = sm.material?.unit?.toLowerCase() ?? 'kg';
  const co2PerTon = u.includes('tonne') || u.includes('ton')
    ? sm.material.emissionFactor
    : sm.material.emissionFactor * 1000;
  const quantityTonnes =
    u.includes('tonne') || u.includes('ton') ? sm.quantity : sm.quantity / 1000;
  return {
    name: sm.material?.name ?? '',
    quantity: quantityTonnes,
    co2PerTon,
  };
}

function toCarbonResult(
  cr: CarbonResultResponse,
  site: Site
): CarbonResult {
  const energy = (site.energyConsumption ?? 0) * ENERGY_FACTOR;
  const parking = (site.parkingSpaces ?? 0) * PARKING_USAGE_FACTOR;
  return {
    siteId: cr.siteId,
    co2Total: cr.totalEmission ?? 0,
    co2PerM2: cr.co2PerM2 ?? 0,
    co2PerEmployee: cr.co2PerEmployee ?? 0,
    co2Construction: cr.constructionEmission ?? 0,
    co2Exploitation: cr.exploitationEmission ?? 0,
    breakdown: {
      energy,
      parking,
      materials: cr.constructionEmission ?? 0,
    },
  };
}

@Injectable({ providedIn: 'root' })
export class SiteService {
  constructor(private auth: AuthService) {}

  private getToken(): string {
    const t = this.auth.getToken();
    if (!t) throw new Error('Non authentifié');
    return t;
  }

  async loadSites(): Promise<Site[]> {
    const token = this.getToken();
    const list = await apiListSites(token);
    const sites: Site[] = [];
    for (const sr of list) {
      const mats = await apiGetSiteMaterials(token, sr.id).catch(() => []);
      sites.push(toSite(sr, mats.map(toMaterial)));
    }
    return sites;
  }

  async getSiteById(id: number): Promise<Site | undefined> {
    const token = this.getToken();
    try {
      const sr = await apiGetSite(token, id);
      const mats = await apiGetSiteMaterials(token, id);
      return toSite(sr, mats.map(toMaterial));
    } catch {
      return undefined;
    }
  }

  async createSite(data: Omit<Site, 'id' | 'materials' | 'createdAt'>): Promise<Site> {
    const token = this.getToken();
    const sr = await apiCreateSite(token, {
      name: data.name,
      location: data.location,
      surface: data.surface,
      employees: data.employees,
      energyConsumption: data.energyConsumption,
      parkingSpaces: data.parkingSpaces,
    });
    return toSite(sr, []);
  }

  async updateSite(
    id: number,
    data: Omit<Site, 'id' | 'materials' | 'createdAt'>
  ): Promise<Site | undefined> {
    const token = this.getToken();
    try {
      const sr = await apiUpdateSite(token, id, {
        name: data.name,
        location: data.location,
        surface: data.surface,
        employees: data.employees,
        energyConsumption: data.energyConsumption,
        parkingSpaces: data.parkingSpaces,
      });
      const mats = await apiGetSiteMaterials(token, id);
      return toSite(sr, mats.map(toMaterial));
    } catch {
      return undefined;
    }
  }

  async deleteSite(id: number): Promise<void> {
    const token = this.getToken();
    await apiDeleteSite(token, id);
  }

  async triggerCalculate(siteId: number): Promise<void> {
    const token = this.getToken();
    await apiCalculateSite(token, siteId);
  }

  async calculateCarbon(site: Site): Promise<CarbonResult> {
    const token = this.getToken();
    const cr = await apiGetSiteReport(token, site.id);
    return toCarbonResult(cr, site);
  }

  async getCarbonReport(siteId: number, site: Site): Promise<CarbonResult> {
    const token = this.getToken();
    const cr = await apiGetSiteReport(token, siteId);
    return toCarbonResult(cr, site);
  }

  async listMaterials(): Promise<MaterialResponse[]> {
    const token = this.getToken();
    return apiListMaterials(token);
  }

  async getSiteMaterials(siteId: number): Promise<SiteMaterialResponse[]> {
    const token = this.getToken();
    return apiGetSiteMaterials(token, siteId);
  }

  async addSiteMaterial(
    siteId: number,
    materialId: number,
    quantity: number
  ): Promise<void> {
    const token = this.getToken();
    await apiAddSiteMaterial(token, siteId, { materialId, quantity });
  }

  async removeSiteMaterial(siteId: number, siteMaterialId: number): Promise<void> {
    const token = this.getToken();
    await apiRemoveSiteMaterial(token, siteId, siteMaterialId);
  }

  /** Calcul local pour prévisualisation (sans appel API) */
  calculateCarbonLocal(site: Site): CarbonResult {
    const co2Energy = (site.energyConsumption ?? 0) * ENERGY_FACTOR;
    const co2Parking = (site.parkingSpaces ?? 0) * PARKING_USAGE_FACTOR;
    const co2Materials = site.materials.reduce(
      (s, m) => s + m.quantity * m.co2PerTon,
      0
    );
    const co2Construction = co2Materials;
    const co2Exploitation = co2Energy + co2Parking;
    const co2Total = co2Construction + co2Exploitation;
    const surface = site.surface ?? 1;
    const employees = site.employees ?? 1;
    return {
      siteId: site.id,
      co2Total,
      co2PerM2: co2Total / surface,
      co2PerEmployee: co2Total / employees,
      co2Construction,
      co2Exploitation,
      breakdown: {
        energy: co2Energy,
        parking: co2Parking,
        materials: co2Materials,
      },
    };
  }

  /** Historique : utilise l'API si disponible, sinon génère des données à partir du rapport carbone. */
  async getHistory(siteId: number): Promise<HistoricalEntry[]> {
    const token = this.getToken();
    const site = await this.getSiteById(siteId);
    if (!site) return [];

    try {
      const apiHistory = await apiGetSiteHistory(token, siteId);
      if (apiHistory.length > 0) {
        const months: HistoricalEntry[] = [];
        for (const h of apiHistory) {
          const total = h.totalEmission ?? 0;
          const energyShare = 0.6;
          const materialsShare = 0.25;
          const parkingShare = 0.15;
          for (let m = 1; m <= 12; m++) {
            const seasonal = 1 + 0.1 * Math.cos(((m - 1) / 11) * Math.PI);
            months.push({
              siteId,
              month: `${h.year}-${String(m).padStart(2, '0')}`,
              co2Total: Math.round((total / 12) * seasonal),
              co2Energy: Math.round((total * energyShare / 12) * seasonal),
              co2Materials: Math.round((total * materialsShare / 12)),
              co2Parking: Math.round((total * parkingShare / 12) * seasonal),
            });
          }
        }
        return months.sort((a, b) => a.month.localeCompare(b.month));
      }
    } catch {
      /* fallback ci-dessous */
    }

    const cr = await this.getCarbonReport(siteId, site);
    const months: HistoricalEntry[] = [];
    for (let i = 0; i < 24; i++) {
      const year = i < 12 ? 2024 : 2025;
      const month = (i % 12) + 1;
      const label = `${year}-${String(month).padStart(2, '0')}`;
      const seasonal = 1 + 0.15 * Math.cos(((month - 1) / 11) * Math.PI);
      const trend = 1 - (i / 23) * 0.08;
      const noise = 1 + (((siteId * 7 + i * 13) % 20) - 10) / 100;
      const factor = seasonal * trend * noise;
      const energy = Math.round((cr.breakdown.energy ?? 0) * factor);
      const materials = Math.round((cr.breakdown.materials ?? 0) * (0.95 + i * 0.001));
      const parking = Math.round((cr.breakdown.parking ?? 0) * factor * 0.9);
      months.push({
        siteId,
        month: label,
        co2Total: energy + materials + parking,
        co2Energy: energy,
        co2Materials: materials,
        co2Parking: parking,
      });
    }
    return months;
  }

  async getHeatmapData(): Promise<HeatmapCell[][]> {
    const sites = await this.loadSites();
    const categories = [
      { key: 'co2Total', label: 'CO₂ Total' },
      { key: 'co2PerM2', label: 'CO₂/m²' },
      { key: 'co2PerEmployee', label: 'CO₂/employé' },
      { key: 'co2Construction', label: 'Construction' },
      { key: 'co2Exploitation', label: 'Exploitation' },
      { key: 'energy', label: 'Énergie' },
      { key: 'materials', label: 'Matériaux' },
      { key: 'parking', label: 'Parking' },
    ];

    const results: { site: Site; carbon: CarbonResult }[] = [];
    for (const site of sites) {
      const carbon = await this.calculateCarbon(site);
      results.push({ site, carbon });
    }

    const pickValue = (carbon: CarbonResult, k: string): number => {
      switch (k) {
        case 'co2Total':
          return carbon.co2Total;
        case 'co2PerM2':
          return carbon.co2PerM2;
        case 'co2PerEmployee':
          return carbon.co2PerEmployee;
        case 'co2Construction':
          return carbon.co2Construction;
        case 'co2Exploitation':
          return carbon.co2Exploitation;
        case 'energy':
          return carbon.breakdown.energy;
        case 'materials':
          return carbon.breakdown.materials;
        case 'parking':
          return carbon.breakdown.parking;
        default:
          return 0;
      }
    };

    return results.map(({ site, carbon }) =>
      categories.map((cat) => {
        const colValues = results.map((r) => pickValue(r.carbon, cat.key));
        const max = Math.max(...colValues) || 1;
        const value = pickValue(carbon, cat.key);
        return {
          siteId: site.id,
          siteName: site.name,
          category: cat.label,
          value,
          intensity: value / max,
        } as HeatmapCell;
      })
    );
  }
}
