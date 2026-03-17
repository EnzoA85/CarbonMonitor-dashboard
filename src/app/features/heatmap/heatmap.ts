import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SiteService } from '../../core/services/site';
import { HeatmapCell } from '../../core/models/site.model';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './heatmap.html',
  styleUrl: './heatmap.css'
})
export class Heatmap implements OnInit {

  // rows[i] = liste de cellules pour le site i (une par catégorie)
  rows: HeatmapCell[][] = [];
  categories: string[] = [];

  tooltip: { visible: boolean; cell: HeatmapCell | null; x: number; y: number } = {
    visible: false, cell: null, x: 0, y: 0
  };

  readonly legendGradient = 'linear-gradient(to right, hsl(120,70%,90%), hsl(60,70%,75%), hsl(0,70%,60%))';

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    this.rows = this.siteService.getHeatmapData();
    if (this.rows.length) {
      this.categories = this.rows[0].map(c => c.category);
    }
  }

  /**
   * Retourne une couleur CSS en fonction de l'intensité (0 = vert, 1 = rouge).
   * Interpolation en HSL : 120° (vert) → 0° (rouge)
   */
  getCellColor(intensity: number): string {
    const hue = Math.round(120 * (1 - intensity));
    const sat = 70;
    const lig  = 90 - intensity * 30; // 90% (clair) → 60% (foncé)
    return `hsl(${hue}, ${sat}%, ${lig}%)`;
  }

  getTextColor(intensity: number): string {
    return intensity > 0.6 ? '#fff' : '#374151';
  }

  showTooltip(cell: HeatmapCell, event: MouseEvent) {
    this.tooltip = { visible: true, cell, x: event.clientX, y: event.clientY };
  }

  hideTooltip() { this.tooltip.visible = false; }

  formatCO2(val: number): string {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (val >= 1000)      return (val / 1000).toFixed(1) + ' tCO₂e';
    return val + ' kgCO₂e';
  }

  getIntensityLabel(intensity: number): string {
    if (intensity >= 0.8) return 'Très élevé';
    if (intensity >= 0.6) return 'Élevé';
    if (intensity >= 0.4) return 'Moyen';
    if (intensity >= 0.2) return 'Faible';
    return 'Très faible';
  }
}
