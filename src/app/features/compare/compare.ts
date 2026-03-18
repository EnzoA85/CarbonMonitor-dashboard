import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SiteService } from '../../core/services/site';
import { Site, CarbonResult } from '../../core/models/site.model';

interface SiteWithCarbon {
  site: Site;
  carbon: CarbonResult;
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './compare.html',
  styleUrl: './compare.css',
})
export class Compare implements OnInit {
  allSitesData: SiteWithCarbon[] = [];
  selectedIds: number[] = [];
  selectedSites: SiteWithCarbon[] = [];
  loading = true;
  error = '';

  readonly metrics = [
    { key: 'co2Total', label: 'CO₂ Total', unit: '', color: '#22c55e' },
    { key: 'co2PerM2', label: 'CO₂ / m²', unit: 'kg/m²', color: '#3b82f6' },
    {
      key: 'co2PerEmployee',
      label: 'CO₂ / employé',
      unit: 'kg',
      color: '#8b5cf6',
    },
    {
      key: 'co2Construction',
      label: 'Construction',
      unit: '',
      color: '#f59e0b',
    },
    {
      key: 'co2Exploitation',
      label: 'Exploitation',
      unit: '',
      color: '#ef4444',
    },
  ];

  readonly barColors = [
    '#22c55e',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
  ];

  constructor(
    private siteService: SiteService,
    private cdr: ChangeDetectorRef
  ) {}

  async loadData() {
    this.loading = true;
    this.error = '';
    try {
      const sites = await this.siteService.loadSites();
      this.allSitesData = await Promise.all(
        sites.map(async (site) => ({
          site,
          carbon: await this.siteService.calculateCarbon(site),
        }))
      );
      this.selectedIds = this.allSitesData.slice(0, 2).map((d) => d.site.id);
      this.updateSelection();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors du chargement.';
      this.allSitesData = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async ngOnInit() {
    await this.loadData();
  }

  toggleSite(id: number) {
    const idx = this.selectedIds.indexOf(id);
    if (idx === -1) {
      this.selectedIds = [...this.selectedIds, id];
    } else {
      this.selectedIds = this.selectedIds.filter((i) => i !== id);
    }
    this.updateSelection();
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  updateSelection() {
    this.selectedSites = this.allSitesData.filter((d) =>
      this.selectedIds.includes(d.site.id)
    );
  }

  getMetricValue(carbon: CarbonResult, key: string): number {
    return (carbon as unknown as Record<string, number>)[key] as number;
  }

  getMaxForMetric(key: string): number {
    const values = this.selectedSites.map((d) =>
      this.getMetricValue(d.carbon, key)
    );
    return Math.max(...values) || 1;
  }

  getBarPct(carbon: CarbonResult, key: string): number {
    const max = this.getMaxForMetric(key);
    return Math.round((this.getMetricValue(carbon, key) / max) * 100);
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000)
      return (value / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  getBestForMetric(key: string): number {
    if (!this.selectedSites.length) return 0;
    return this.selectedSites.reduce((best, d) => {
      const val = this.getMetricValue(d.carbon, key);
      return val < this.getMetricValue(best.carbon, key) ? d : best;
    }).site.id;
  }
}
