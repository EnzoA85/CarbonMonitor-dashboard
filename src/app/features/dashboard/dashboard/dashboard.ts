import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SiteService } from '../../../core/services/site';
import { Site, CarbonResult } from '../../../core/models/site.model';

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

  totalCO2 = 0;
  avgCO2PerM2 = 0;
  avgCO2PerEmployee = 0;
  totalSites = 0;

  // Pour le graphique en barres
  barChartData: { label: string; value: number; pct: number; color: string }[] = [];
  readonly barColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Pour le donut construction vs exploitation
  donutConstruction = 0;
  donutExploitation = 0;
  donutCircumference = 2 * Math.PI * 54;

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    const sites = this.siteService.getSites();
    this.sitesData = sites.map(site => ({
      site,
      carbon: this.siteService.calculateCarbon(site)
    }));

    this.totalSites = sites.length;
    this.totalCO2 = this.sitesData.reduce((s, d) => s + d.carbon.co2Total, 0);
    this.avgCO2PerM2 = +(this.sitesData.reduce((s, d) => s + d.carbon.co2PerM2, 0) / this.totalSites).toFixed(1);
    this.avgCO2PerEmployee = Math.round(this.sitesData.reduce((s, d) => s + d.carbon.co2PerEmployee, 0) / this.totalSites);

    // Graphique en barres (CO2 par site)
    const maxCO2 = Math.max(...this.sitesData.map(d => d.carbon.co2Total));
    this.barChartData = this.sitesData.map((d, i) => ({
      label: d.site.name,
      value: d.carbon.co2Total,
      pct: Math.round((d.carbon.co2Total / maxCO2) * 100),
      color: this.barColors[i % this.barColors.length]
    }));

    // Donut construction vs exploitation
    const totalConst = this.sitesData.reduce((s, d) => s + d.carbon.co2Construction, 0);
    const totalExpl = this.sitesData.reduce((s, d) => s + d.carbon.co2Exploitation, 0);
    const totalAll = totalConst + totalExpl;
    this.donutConstruction = totalAll > 0 ? Math.round((totalConst / totalAll) * 100) : 0;
    this.donutExploitation = 100 - this.donutConstruction;
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