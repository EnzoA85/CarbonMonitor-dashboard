import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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

  sitesData: { site: Site; carbon: CarbonResult | null; loadingCarbon: boolean }[] = [];
  loading = true;

  constructor(private siteService: SiteService, private router: Router) {}

  ngOnInit() {
    this.loadSites();
  }

  loadSites() {
    const destroyRef = inject(DestroyRef);
    this.loading = true;
    this.siteService.getSites().pipe(
      takeUntilDestroyed(destroyRef),
      catchError(() => of([]))
    ).subscribe(sites => {
      this.sitesData = sites.map(site => ({ site, carbon: null, loadingCarbon: true }));
      this.loading = false;

      this.sitesData.forEach((d, i) => {
        this.siteService.calculateCarbonForSite(d.site).pipe(
          takeUntilDestroyed(destroyRef),
          catchError(() => of(null))
        ).subscribe(carbon => {
          this.sitesData[i] = { ...this.sitesData[i], carbon, loadingCarbon: false };
        });
      });
    });
  }

  editSite(id: number) {
    this.router.navigate(['/sites', id, 'edit']);
  }

  deleteSite(site: Site) {
    if (window.confirm(`Supprimer définitivement  ${site.name}  ?`)) {
      this.siteService.deleteSite(site.id).subscribe(() => this.loadSites());
    }
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO\u2082e';
    return value + ' kgCO\u2082e';
  }
}
