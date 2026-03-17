import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, switchMap, map, catchError } from 'rxjs';
import {
  Site, CarbonResult, HistoricalEntry, HeatmapCell, Material,
  SiteResponse, CarbonResultResponse, SiteHistoryResponse,
  SiteMaterialResponse, DashboardKpiResponse, MaterialResponse
} from '../models/site.model';

const API_BASE = 'https://carbonmonitorwebapp-b5fscgd8g8djb8dk.spaincentral-01.azurewebsites.net/api';

const ENERGY_FACTOR       = 0.0571;   // kgCO2/kWh
const PARKING_FACTOR      = 1500;     // kgCO2 par place (construction)
const PARKING_USAGE_FACTOR = 200;     // kgCO2/place/an

@Injectable({ providedIn: 'root' })
export class SiteService {

  constructor(private http: HttpClient) {}

  // â”€â”€â”€ Sites CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getSites(): Observable<Site[]> {
    return this.http.get<SiteResponse[]>(`${API_BASE}/sites`).pipe(
      map(sites => {
        if (!Array.isArray(sites)) {
          console.error('Expected array of sites, got:', sites);
          return [];
        }
        return sites.map(mapSiteResponse);
      })
    );
  }

  getSiteById(id: number): Observable<Site> {
    return this.http.get<SiteResponse>(`${API_BASE}/sites/${id}`).pipe(
      map(mapSiteResponse)
    );
  }

  addSite(req: { name: string; location: string; surface: number; employees: number; energyConsumption: number; parkingSpaces: number }): Observable<Site> {
    return this.http.post<SiteResponse>(`${API_BASE}/sites`, req).pipe(
      map(mapSiteResponse)
    );
  }

  updateSite(id: number, req: { name: string; location: string; surface: number; employees: number; energyConsumption: number; parkingSpaces: number }): Observable<Site> {
    return this.http.put<SiteResponse>(`${API_BASE}/sites/${id}`, req).pipe(
      map(mapSiteResponse)
    );
  }

  deleteSite(id: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/sites/${id}`);
  }

  // â”€â”€â”€ Carbon Calculation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  calculateCarbon(id: number): Observable<CarbonResult> {
    return this.getSiteById(id).pipe(
      switchMap(site => this.calculateCarbonForSite(site))
    );
  }

  getSiteReport(id: number): Observable<CarbonResult | null> {
    return this.getSiteById(id).pipe(
      switchMap(site =>
        this.http.get<CarbonResultResponse>(`${API_BASE}/sites/${id}/report`).pipe(
          map(r => mapCarbonResult(r, site)),
          catchError(() => of(null))
        )
      )
    );
  }

  // â”€â”€â”€ History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getSiteHistory(id: number): Observable<HistoricalEntry[]> {
    return this.http.get<SiteHistoryResponse[]>(`${API_BASE}/sites/${id}/history`).pipe(
      map(entries => entries.map(mapHistoryEntry))
    );
  }

  // â”€â”€â”€ Materials â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getSiteMaterials(id: number): Observable<Material[]> {
    return this.http.get<SiteMaterialResponse[]>(`${API_BASE}/sites/${id}/materials`).pipe(
      map(mats => mats.map(m => ({
        name: m.material.name,
        quantity: m.quantity,
        co2PerTon: m.material.emissionFactor
      })))
    );
  }

  addSiteMaterial(siteId: number, materialId: number, quantity: number): Observable<SiteMaterialResponse> {
    return this.http.post<SiteMaterialResponse>(
      `${API_BASE}/sites/${siteId}/materials`,
      { materialId, quantity }
    );
  }

  removeSiteMaterial(siteId: number, siteMaterialId: number): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/sites/${siteId}/materials/${siteMaterialId}`);
  }

  // â”€â”€â”€ Materials Catalogue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getAllMaterials(): Observable<MaterialResponse[]> {
    return this.http.get<MaterialResponse[]>(`${API_BASE}/materials`);
  }

  // â”€â”€â”€ Dashboard KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getDashboardKpis(): Observable<DashboardKpiResponse> {
    return this.http.get<DashboardKpiResponse>(`${API_BASE}/dashboard/kpis`);
  }

  // â”€â”€â”€ Sites avec donnÃ©es carbone (dashboard / compare / heatmap) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getSitesWithCarbon(): Observable<{ site: Site; carbon: CarbonResult }[]> {
    return this.getSites().pipe(
      switchMap(sites =>
        sites.length === 0
          ? of([])
          : forkJoin(
              sites.map(site =>
                this.calculateCarbonForSite(site).pipe(
                  map(carbon => ({ site, carbon })),
                  catchError(() => of({ site, carbon: defaultCarbon(site.id) }))
                )
              )
            )
      )
    );
  }

  // â”€â”€â”€ History pour plusieurs sites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getHistoryForSites(ids: number[]): Observable<Map<number, HistoricalEntry[]>> {
    if (!ids.length) return of(new Map());
    return forkJoin(
      ids.map(id =>
        this.getSiteHistory(id).pipe(
          map(entries => ({ id, entries })),
          catchError(() => of({ id, entries: [] as HistoricalEntry[] }))
        )
      )
    ).pipe(
      map(results => {
        const m = new Map<number, HistoricalEntry[]>();
        for (const r of results) m.set(r.id, r.entries);
        return m;
      })
    );
  }

  // â”€â”€â”€ Heatmap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  getHeatmapData(): Observable<HeatmapCell[][]> {
    return this.getSitesWithCarbon().pipe(
      map(buildHeatmapData)
    );
  }

  // â”€â”€â”€ Calcul local (utilisÃ© pour la prÃ©visualisation dans le formulaire) â”€â”€â”€â”€

  calculateCarbonLocal(site: Omit<Site, 'id' | 'createdAt' | 'materials'> & { id?: number }): CarbonResult {
    const co2Energy            = site.energyConsumption  * ENERGY_FACTOR;
    const co2ParkingUsage      = site.parkingSpaces * PARKING_USAGE_FACTOR;
    const co2ParkingConstruct  = (site.parkingSpaces * PARKING_FACTOR) / 50;
    const co2Construction      = co2ParkingConstruct;
    const co2Exploitation      = co2Energy + co2ParkingUsage;
    const co2Total             = co2Construction + co2Exploitation;
    return {
      siteId: site.id ?? 0,
      co2Total:        Math.round(co2Total),
      co2PerM2:        Math.round((co2Total / site.surface) * 10) / 10,
      co2PerEmployee:  Math.round(co2Total / site.employees),
      co2Construction: Math.round(co2Construction),
      co2Exploitation: Math.round(co2Exploitation),
      breakdown: {
        energy:    Math.round(co2Energy),
        parking:   Math.round(co2ParkingUsage + co2ParkingConstruct),
        materials: 0
      }
    };
  }

  // â”€â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  calculateCarbonForSite(site: Site): Observable<CarbonResult> {
    return this.http.post<CarbonResultResponse>(`${API_BASE}/sites/${site.id}/calculate`, {}).pipe(
      map(r => mapCarbonResult(r, site))
    );
  }
}

// â”€â”€ Mappers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mapSiteResponse(s: SiteResponse): Site {
  return {
    id: s.id,
    name: s.name,
    location: s.location ?? '',
    surface: s.surface,
    employees: s.employees,
    energyConsumption: s.energyConsumption ?? 0,
    parkingSpaces: s.parkingSpaces ?? 0,
    materials: [],
    createdAt: new Date(s.createdAt)
  };
}

function mapCarbonResult(r: CarbonResultResponse, site: Site): CarbonResult {
  const co2Energy           = site.energyConsumption * ENERGY_FACTOR;
  const co2ParkingUsage     = site.parkingSpaces * PARKING_USAGE_FACTOR;
  const co2ParkingConstruct = (site.parkingSpaces * PARKING_FACTOR) / 50;
  const co2Materials        = Math.max(0, Math.round(r.constructionEmission - co2ParkingConstruct));
  return {
    siteId: site.id,
    co2Total:        Math.round(r.totalEmission),
    co2PerM2:        r.co2PerM2,
    co2PerEmployee:  Math.round(r.co2PerEmployee),
    co2Construction: Math.round(r.constructionEmission),
    co2Exploitation: Math.round(r.exploitationEmission),
    breakdown: {
      energy:    Math.round(co2Energy),
      parking:   Math.round(co2ParkingUsage + co2ParkingConstruct),
      materials: co2Materials
    }
  };
}

function mapHistoryEntry(e: SiteHistoryResponse): HistoricalEntry {
  const co2Energy    = Math.round((e.energyConsumption ?? 0) * ENERGY_FACTOR);
  const co2Materials = Math.max(0, Math.round(e.totalEmission - co2Energy));
  return {
    siteId:       e.siteId,
    month:        String(e.year),
    co2Total:     Math.round(e.totalEmission),
    co2Energy,
    co2Materials,
    co2Parking:   0
  };
}

function defaultCarbon(siteId: number): CarbonResult {
  return {
    siteId,
    co2Total: 0, co2PerM2: 0, co2PerEmployee: 0,
    co2Construction: 0, co2Exploitation: 0,
    breakdown: { energy: 0, parking: 0, materials: 0 }
  };
}

function buildHeatmapData(data: { site: Site; carbon: CarbonResult }[]): HeatmapCell[][] {
  const categories = [
    { key: 'co2Total',        label: 'COâ‚‚ Total' },
    { key: 'co2PerM2',        label: 'COâ‚‚/mÂ²' },
    { key: 'co2PerEmployee',  label: 'COâ‚‚/employÃ©' },
    { key: 'co2Construction', label: 'Construction' },
    { key: 'co2Exploitation', label: 'Exploitation' },
    { key: 'energy',          label: 'Ã‰nergie' },
    { key: 'materials',       label: 'MatÃ©riaux' },
    { key: 'parking',         label: 'Parking' }
  ];

  const pickValue = (carbon: CarbonResult, k: string): number => {
    if (k === 'energy')    return carbon.breakdown.energy;
    if (k === 'materials') return carbon.breakdown.materials;
    if (k === 'parking')   return carbon.breakdown.parking;
    return (carbon as any)[k] as number;
  };

  const colMaxes = categories.map(cat =>
    Math.max(...data.map(d => pickValue(d.carbon, cat.key)), 1)
  );

  return data.map(({ site, carbon }) =>
    categories.map((cat, ci) => {
      const value = pickValue(carbon, cat.key);
      return {
        siteId:    site.id,
        siteName:  site.name,
        category:  cat.label,
        value,
        intensity: value / colMaxes[ci]
      } as HeatmapCell;
    })
  );
}
