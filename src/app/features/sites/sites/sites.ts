import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { SiteService } from '../../../core/services/site';
import { Site, CarbonResult } from '../../../core/models/site.model';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sites.html',
  styleUrl: './sites.css',
})
export class Sites implements OnInit {
  sitesData: { site: Site; carbon: CarbonResult }[] = [];
  loading = true;
  error = '';
  deleteModalSite: Site | null = null;

  constructor(
    private siteService: SiteService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadSites();
  }

  async loadSites() {
    this.loading = true;
    this.error = '';
    try {
      const sites = await this.siteService.loadSites();
      this.sitesData = await Promise.all(
        sites.map(async (site) => {
          let carbon: CarbonResult;
          try {
            carbon = await this.siteService.calculateCarbon(site);
          } catch {
            carbon = this.siteService.calculateCarbonLocal(site);
          }
          return { site, carbon };
        })
      );
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors du chargement';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  editSite(id: number) {
    this.router.navigate(['/sites', id, 'edit']);
  }

  openDeleteModal(site: Site) {
    this.deleteModalSite = site;
  }

  closeDeleteModal() {
    this.deleteModalSite = null;
  }

  async confirmDelete() {
    if (!this.deleteModalSite) return;
    const site = this.deleteModalSite;
    this.closeDeleteModal();
    try {
      await this.siteService.deleteSite(site.id);
      await this.loadSites();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur lors de la suppression';
      this.cdr.detectChanges();
    }
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return Math.round(value) + ' kgCO₂e';
  }

  formatDensity(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' t/m²';
    return Math.round(value * 10) / 10 + ' kg/m²';
  }
}
