import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SiteService } from '../../../core/services/site';
import { ExportService } from '../../../core/services/export';
import { Site, CarbonResult } from '../../../core/models/site.model';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-site-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './site-detail.html',
  styleUrl: './site-detail.css',
})
export class SiteDetail implements OnInit, OnDestroy {
  site: Site | undefined;
  carbon: CarbonResult | undefined;
  loading = true;
  error = '';
  showDeleteModal = false;
  exportingPdf = false;
  currentId = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private siteService: SiteService,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = Number(params.get('id'));
      if (!Number.isFinite(id)) {
        this.error = 'Identifiant de site invalide';
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }
      this.loadSite(id);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadSite(id: number) {
    this.currentId = id;
    this.loading = true;
    this.error = '';
    try {
      this.site = await this.siteService.getSiteById(id);
      if (this.site) {
        try {
          this.carbon = await this.siteService.calculateCarbon(this.site);
        } catch {
          this.carbon = this.siteService.calculateCarbonLocal(this.site);
        }
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors du chargement';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async exportPDF() {
    if (!this.site || !this.carbon || this.exportingPdf) return;
    this.exportingPdf = true;
    try {
      this.exportService.exportSitePDF(this.site, this.carbon);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors de l\'export PDF';
      this.cdr.detectChanges();
    } finally {
      this.exportingPdf = false;
      this.cdr.detectChanges();
    }
  }

  openDeleteModal() {
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  async confirmDelete() {
    if (!this.site) return;
    try {
      await this.siteService.deleteSite(this.site.id);
      this.closeDeleteModal();
      this.router.navigate(['/sites']);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors de la suppression';
      this.closeDeleteModal();
      this.cdr.detectChanges();
    }
  }

  formatCO2(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return Math.round(value) + ' kgCO₂e';
  }

  formatDensity(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' t/m²';
    return Math.round(value * 10) / 10 + ' kg/m²';
  }

  getMaterialBarPct(mat: { quantity: number; co2PerTon: number }): number {
    if (!this.carbon) return 0;
    const total = this.carbon.breakdown.materials;
    if (total === 0) return 0;
    return Math.round((mat.quantity * mat.co2PerTon) / total * 100);
  }

  getBreakdownPct(value: number): number {
    if (!this.carbon?.co2Total) return 0;
    return (value / this.carbon.co2Total) * 100;
  }
}
