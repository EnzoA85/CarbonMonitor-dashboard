import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';
import { SiteService } from '../../core/services/site';
import { Site, CarbonResult } from '../../core/models/site.model';

interface SiteWithCarbon {
  site: Site;
  carbon?: CarbonResult;
  loading: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './compare.html',
  styleUrl: './compare.css'
})
export class Compare implements OnInit {

  allSitesData: SiteWithCarbon[] = [];
  selectedIds: number[] = [];
  selectedSites: SiteWithCarbon[] = [];
  
  loading = true;
  error = false;

  private destroyRef = inject(DestroyRef);

  readonly metrics = [
    { key: 'co2Total', label: 'CO₂ Total', unit: '', color: '#22c55e' },
    { key: 'co2PerM2', label: 'CO₂ / m²', unit: 'kg/m²', color: '#3b82f6' },
    { key: 'co2PerEmployee', label: 'CO₂ / employé', unit: 'kg', color: '#8b5cf6' },
    { key: 'co2Construction', label: 'Construction', unit: '', color: '#f59e0b' },
    { key: 'co2Exploitation', label: 'Exploitation', unit: '', color: '#ef4444' }
  ];

  readonly barColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    this.loading = true;
    this.error = false;

    // 1. Charger la liste des sites
    this.siteService.getSites().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading = false)
    ).subscribe({
      next: (sites) => {
        this.allSitesData = sites.map(site => ({
          site,
          loading: true
        }));

        // Sélectionner les 2 premiers par défaut
        if (sites.length >= 2) {
          this.selectedIds = sites.slice(0, 2).map(s => s.id);
        }
        this.updateSelection();

        // 2. Charger les données carbone pour chaque site individuellement
        this.allSitesData.forEach(item => {
          this.siteService.calculateCarbon(item.site.id).pipe(
            takeUntilDestroyed(this.destroyRef),
            catchError(() => {
              item.error = true;
              return of(item.carbon); // Return existing (undefined) or null
            }),
            finalize(() => {
              item.loading = false;
              this.updateSelection();
            })
          ).subscribe(carbon => {
            if (carbon) {
              item.carbon = carbon;
              this.updateSelection();
            }
          });
        });
      },
      error: (err) => {
        this.error = true;
        console.error('Failed to load sites list', err);
      }
    });
  }

  toggleSite(id: number) {
    const idx = this.selectedIds.indexOf(id);
    if (idx === -1) {
      this.selectedIds = [...this.selectedIds, id];
    } else {
      this.selectedIds = this.selectedIds.filter(i => i !== id);
    }
    this.updateSelection();
  }

  isSelected(id: number): boolean {
    return this.selectedIds.includes(id);
  }

  updateSelection() {
    this.selectedSites = this.allSitesData.filter(d => this.selectedIds.includes(d.site.id));
  }

  getMetricValue(carbon: CarbonResult | undefined, key: string): number {
    if (!carbon) return 0;
    return (carbon as any)[key] as number || 0;
  }

  getMaxForMetric(key: string): number {
    const values = this.selectedSites.map(d => this.getMetricValue(d.carbon, key));
    return Math.max(...values) || 1;
  }

  getBarPct(carbon: CarbonResult | undefined, key: string): number {
    if (!carbon) return 0;
    const max = this.getMaxForMetric(key);
    return Math.round((this.getMetricValue(carbon, key) / max) * 100);
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  getBestForMetric(key: string): number {
    const valid = this.selectedSites.filter(d => d.carbon);
    if (!valid.length) return 0;
    
    return valid.reduce((best, d) => {
      const val = this.getMetricValue(d.carbon, key);
      const bestVal = this.getMetricValue(best.carbon, key);
      return val < bestVal ? d : best;
    }).site.id;
  }
}
