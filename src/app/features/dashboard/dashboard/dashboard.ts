import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteService } from '../../../core/services/site';
import { Site, CarbonResult, DashboardKpiResponse } from '../../../core/models/site.model';

interface SiteWithCarbon {
  site: Site;
  carbon: CarbonResult;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  sitesData: SiteWithCarbon[] = [];
  loading = true;

  totalCO2 = 0;
  avgCO2PerM2 = 0;
  avgCO2PerEmployee = 0;
  totalSites = 0;

  barChartData: { label: string; value: number; pct: number; color: string }[] = [];
  readonly barColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  donutConstruction = 0;
  donutExploitation = 0;
  donutCircumference = 2 * Math.PI * 54;

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    const destroyRef = inject(DestroyRef);

    // KPIs : chargement indépendant
    this.siteService.getDashboardKpis().pipe(
      takeUntilDestroyed(destroyRef),
      catchError(() => of(null))
    ).subscribe(kpis => {
      if (kpis) {
        this.totalSites        = kpis.totalSites;
        this.totalCO2          = Math.round(kpis.totalCarbonFootprint);
        this.avgCO2PerM2       = +kpis.averageCo2PerM2.toFixed(1);
        this.avgCO2PerEmployee = Math.round(kpis.averageCo2PerEmployee);
      }
    });

    // Sites + carbone : chargement en deux phases
    this.siteService.getSites().pipe(
      takeUntilDestroyed(destroyRef),
      catchError(() => of([]))
    ).subscribe(sites => {
      this.loading = false;
      if (!sites.length) return;

      const entries: SiteWithCarbon[] = [];
      let pending = sites.length;

      sites.forEach(site => {
        this.siteService.calculateCarbonForSite(site).pipe(
          takeUntilDestroyed(destroyRef),
          catchError(() => of(null))
        ).subscribe(carbon => {
          if (carbon) entries.push({ site, carbon });
          pending--;
          if (pending === 0) {
            this.sitesData = entries;
            const maxCO2 = Math.max(...entries.map(d => d.carbon.co2Total), 1);
            this.barChartData = entries.map((d, i) => ({
              label: d.site.name,
              value: d.carbon.co2Total,
              pct:   Math.round((d.carbon.co2Total / maxCO2) * 100),
              color: this.barColors[i % this.barColors.length]
            }));
            const totalConst = entries.reduce((s, d) => s + d.carbon.co2Construction, 0);
            const totalExpl  = entries.reduce((s, d) => s + d.carbon.co2Exploitation, 0);
            const totalAll   = totalConst + totalExpl;
            this.donutConstruction = totalAll > 0 ? Math.round((totalConst / totalAll) * 100) : 0;
            this.donutExploitation = 100 - this.donutConstruction;
          }
        });
      });
    });
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  getDonutOffset(pct: number): number {
    return this.donutCircumference * (1 - pct / 100);
  }

  getBestSite(): SiteWithCarbon | null {
    if (!this.sitesData.length) return null;
    return this.sitesData.reduce((best, d) =>
      d.carbon.co2PerM2 < best.carbon.co2PerM2 ? d : best
    );
  }
}