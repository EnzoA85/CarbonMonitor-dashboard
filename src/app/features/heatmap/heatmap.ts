import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { SiteService } from '../../core/services/site';
import { HeatmapCell, Site, CarbonResult } from '../../core/models/site.model';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.css'
})
export class Heatmap implements OnInit {

  rows: HeatmapCell[][] = [];
  categories: string[] = [];
  
  // Data state
  private sites: Site[] = [];
  private carbonData = new Map<number, CarbonResult>();
  private destroyRef = inject(DestroyRef);

  tooltip: { visible: boolean; cell: HeatmapCell | null; x: number; y: number } = {
    visible: false, cell: null, x: 0, y: 0
  };

  readonly legendGradient = 'linear-gradient(to right, hsl(120,70%,90%), hsl(60,70%,75%), hsl(0,70%,60%))';

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    this.siteService.getSites().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(sites => {
      this.sites = sites;
      
      // Initialize with default carbon data
      this.sites.forEach(site => {
        if (!this.carbonData.has(site.id)) {
          this.carbonData.set(site.id, this.defaultCarbon(site.id));
        }
      });
      this.rebuildHeatmap();

      // Load real data progressively
      this.sites.forEach(site => {
        this.siteService.calculateCarbon(site.id).pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.rebuildHeatmap())
        ).subscribe({
          next: (carbon) => {
            this.carbonData.set(site.id, carbon);
          },
          error: () => {
             // Keep default (0) on error
             console.error(`Failed to load carbon for site ${site.id}`);
          }
        });
      });
    });
  }

  private defaultCarbon(siteId: number): CarbonResult {
    return {
      siteId,
      co2Total: 0, co2PerM2: 0, co2PerEmployee: 0,
      co2Construction: 0, co2Exploitation: 0,
      breakdown: { energy: 0, parking: 0, materials: 0 }
    };
  }

  private rebuildHeatmap() {
    const categoriesList = [
      { key: 'co2Total',        label: 'CO₂ Total' },
      { key: 'co2PerM2',        label: 'CO₂/m²' },
      { key: 'co2PerEmployee',  label: 'CO₂/employé' },
      { key: 'co2Construction', label: 'Construction' },
      { key: 'co2Exploitation', label: 'Exploitation' },
      { key: 'energy',          label: 'Énergie' },
      { key: 'materials',       label: 'Matériaux' },
      { key: 'parking',         label: 'Parking' }
    ];

    const pickValue = (carbon: CarbonResult, k: string): number => {
      if (k === 'energy')    return carbon.breakdown.energy;
      if (k === 'materials') return carbon.breakdown.materials;
      if (k === 'parking')   return carbon.breakdown.parking;
      return (carbon as any)[k] as number;
    };

    // Calculate max per column based on *currently loaded* data
    const currentData = this.sites.map(site => ({
      site,
      carbon: this.carbonData.get(site.id) || this.defaultCarbon(site.id)
    }));
    
    // Only calculate max if we have data, avoid division by zero
    const colMaxes = categoriesList.map(cat =>
      Math.max(...currentData.map(d => pickValue(d.carbon, cat.key)), 1)
    );

    this.rows = currentData.map(({ site, carbon }) =>
      categoriesList.map((cat, ci) => {
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

    if (this.rows.length) {
      this.categories = this.rows[0].map(c => c.category);
    }
  }

  /**
   * Retourne une couleur CSS en fonction de l'intensité (0 = vert, 1 = rouge).
   * Interpolation en HSL : 120° (vert) → 0° (rouge)
   */
  getCellColor(intensity: number): string {
    const hue = Math.round(120 * (1 - intensity));
    const sat = 70;
    const lig  = 90 - intensity * 30; // 90% (clair) → 60% (foncé)
    return `hsl(${hue}, ${sat}%, ${lig}%)`;
  }


  getTextColor(intensity: number): string {
    return intensity > 0.6 ? '#fff' : '#374151';
  }

  showTooltip(cell: HeatmapCell, event: MouseEvent) {
    this.tooltip = { visible: true, cell, x: event.clientX, y: event.clientY };
  }

  hideTooltip() { this.tooltip.visible = false; }

  formatCO2(val: number): string {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (val >= 1000)      return (val / 1000).toFixed(1) + ' tCO₂e';
    return val + ' kgCO₂e';
  }

  getIntensityLabel(intensity: number): string {
    if (intensity >= 0.8) return 'Très élevé';
    if (intensity >= 0.6) return 'Élevé';
    if (intensity >= 0.4) return 'Moyen';
    if (intensity >= 0.2) return 'Faible';
    return 'Très faible';
  }
}
