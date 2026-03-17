import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
  loading = true;
  loadingCarbon = false;
  accessDenied = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private siteService: SiteService,
    private exportService: ExportService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    // 1re phase : charger le site + matériaux → affichage immédiat
    forkJoin({
      site:      this.siteService.getSiteById(id),
      materials: this.siteService.getSiteMaterials(id).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ site, materials }) => {
        site.materials = materials;
        this.site    = site;
        this.loading = false;

        // 2e phase : calcul carbone en arrière-plan
        this.loadingCarbon = true;
        this.siteService.calculateCarbonForSite(site).pipe(
          catchError(() => of(null))
        ).subscribe(carbon => {
          this.carbon        = carbon ?? undefined;
          this.loadingCarbon = false;
        });
      },
      error: (err) => {
        this.loading = false;
        if (err?.status === 403) {
          this.accessDenied = true;
        } else {
          this.router.navigate(['/sites']);
        }
      }
    });
  }

  exportPDF() {
    if (this.site && this.carbon) {
      this.exportService.exportSitePDF(this.site, this.carbon);
    }
  }

  deleteSite() {
    if (!this.site) return;
    if (window.confirm(`Supprimer définitivement  ${this.site.name}  ?`)) {
      this.siteService.deleteSite(this.site.id).subscribe(() => {
        this.router.navigate(['/sites']);
      });
    }
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' MtCO2e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO2e';
    return value + ' kgCO2e';
  }

  getMaterialBarPct(mat: { quantity: number; co2PerTon: number }): number {
    if (!this.carbon) return 0;
    const total = this.carbon.breakdown.materials;
    if (total === 0) return 0;
    return Math.round((mat.quantity * mat.co2PerTon / total) * 100);
  }
}
