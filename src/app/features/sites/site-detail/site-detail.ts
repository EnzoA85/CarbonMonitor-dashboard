import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SiteService } from '../../../core/services/site';
import { ExportService } from '../../../core/services/export';
import { Site, CarbonResult } from '../../../core/models/site.model';

@Component({
  selector: 'app-site-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './site-detail.html',
  styleUrl: './site-detail.css'
})
export class SiteDetail implements OnInit {

  site: Site | undefined;
  carbon: CarbonResult | undefined;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private siteService: SiteService,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.site = this.siteService.getSiteById(id);
    if (this.site) {
      this.carbon = this.siteService.calculateCarbon(this.site);
    }
  }

  exportPDF() {
    if (this.site && this.carbon) {
      this.exportService.exportSitePDF(this.site, this.carbon);
    }
  }

  deleteSite() {
    if (!this.site) return;
    if (window.confirm(`Supprimer définitivement « ${this.site.name} » ?`)) {
      this.siteService.deleteSite(this.site.id);
      this.router.navigate(['/sites']);
    }
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  getMaterialBarPct(mat: { quantity: number; co2PerTon: number }): number {
    if (!this.carbon) return 0;
    const total = this.carbon.breakdown.materials;
    if (total === 0) return 0;
    return Math.round((mat.quantity * mat.co2PerTon / total) * 100);
  }
}
