import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    const sites = this.siteService.getSites();
    this.sitesData = sites.map(site => ({
      site,
      carbon: this.siteService.calculateCarbon(site)
    }));
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }
}
