import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SiteService } from '../../core/services/site';
import { Site, HistoricalEntry } from '../../core/models/site.model';

interface LinePoint { x: number; y: number; value: number; month: string; }
interface LineSeries  { siteId: number; siteName: string; color: string; points: LinePoint[]; polyline: string; }

const CHART_W = 800;
const CHART_H = 260;
const PAD     = { top: 20, right: 20, bottom: 40, left: 70 };

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History implements OnInit {

  sites: Site[] = [];
  selectedIds: number[] = [];
  selectedMetric: 'co2Total' | 'co2Energy' | 'co2Materials' | 'co2Parking' = 'co2Total';
  selectedYear: 'all' | '2024' | '2025' = 'all';

  series: LineSeries[] = [];
  yTicks: { value: number; y: number }[]  = [];
  xLabels: { label: string; x: number }[] = [];
  tooltip: { visible: boolean; x: number; y: number; label: string; items: { name: string; value: string; color: string }[] } = {
    visible: false, x: 0, y: 0, label: '', items: []
  };

  readonly metricOptions = [
    { value: 'co2Total',    label: 'CO₂ Total' },
    { value: 'co2Energy',   label: 'Énergie' },
    { value: 'co2Materials',label: 'Matériaux' },
    { value: 'co2Parking',  label: 'Parking' },
  ];

  readonly COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
  readonly viewBox = `0 0 ${CHART_W} ${CHART_H + PAD.top + PAD.bottom}`;
  readonly innerW  = CHART_W - PAD.left - PAD.right;
  readonly innerH  = CHART_H;

  historyMap: Map<number, HistoricalEntry[]> = new Map();

  constructor(private siteService: SiteService) {}

  ngOnInit() {
    this.siteService.getSites().subscribe(sites => {
      this.sites = sites;
      this.selectedIds = sites.slice(0, 2).map(s => s.id);
      this.loadHistoryAndRebuild();
    });
  }

  private loadHistoryAndRebuild() {
    this.siteService.getHistoryForSites(this.selectedIds).subscribe(map => {
      this.historyMap = map;
      this.rebuild();
    });
  }

  toggleSite(id: number) {
    const wasSelected = this.selectedIds.includes(id);
    this.selectedIds = wasSelected
      ? this.selectedIds.filter(i => i !== id)
      : [...this.selectedIds, id];
    if (!wasSelected && !this.historyMap.has(id)) {
      this.loadHistoryAndRebuild();
    } else {
      this.rebuild();
    }
  }

  isSelected(id: number): boolean { return this.selectedIds.includes(id); }

  onMetricChange()  { this.rebuild(); }
  onYearChange()    { this.rebuild(); }

  rebuild() {
    if (!this.selectedIds.length) { this.series = []; return; }

    const allEntries: Map<number, HistoricalEntry[]> = new Map();
    for (const id of this.selectedIds) {
      let history = this.historyMap.get(id) ?? [];
      if (this.selectedYear !== 'all') {
        history = history.filter(e => e.month.startsWith(this.selectedYear));
      }
      allEntries.set(id, history);
    }

    // Toutes les étiquettes de mois (axe X)
    const firstEntries = allEntries.values().next().value ?? [];
    const months = firstEntries.map((e: HistoricalEntry) => e.month);

    // Calculer min/max global pour l'axe Y
    const allValues: number[] = [];
    for (const entries of allEntries.values()) {
      for (const e of entries) allValues.push(e[this.selectedMetric]);
    }
    const maxVal = Math.max(...allValues) * 1.1 || 1;
    const minVal = 0;

    // Axe Y : 5 graduations
    this.yTicks = Array.from({ length: 6 }, (_, i) => {
      const val = minVal + (maxVal - minVal) * (i / 5);
      const y   = PAD.top + this.innerH - (i / 5) * this.innerH;
      return { value: Math.round(val), y };
    });

    // Axe X : labels tous les 3 mois
    this.xLabels = months
      .map((m, i) => ({ label: m.slice(0, 7), x: PAD.left + (i / (months.length - 1 || 1)) * this.innerW }))
      .filter((_, i) => i % 3 === 0 || i === months.length - 1);

    // Construire les séries
    this.series = this.selectedIds.map((id, idx) => {
      const entries = allEntries.get(id) ?? [];
      const site    = this.sites.find(s => s.id === id)!;
      const points: LinePoint[] = entries.map((e, i) => {
        const val = e[this.selectedMetric];
        return {
          x: PAD.left + (i / (entries.length - 1 || 1)) * this.innerW,
          y: PAD.top  + this.innerH - ((val - minVal) / (maxVal - minVal)) * this.innerH,
          value: val,
          month: e.month
        };
      });
      const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
      return { siteId: id, siteName: site?.name ?? `Site ${id}`, color: this.COLORS[idx % this.COLORS.length], points, polyline };
    });
  }

  formatCO2(val: number): string {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(2) + ' MtCO₂e';
    if (val >= 1000)      return (val / 1000).toFixed(1) + ' tCO₂e';
    return val + ' kgCO₂e';
  }

  showTooltip(monthIdx: number, event: MouseEvent) {
    const mx = (event.target as SVGElement).getBoundingClientRect();
    this.tooltip = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      label: this.series[0]?.points[monthIdx]?.month ?? '',
      items: this.series.map(s => ({
        name:  s.siteName,
        color: s.color,
        value: this.formatCO2(s.points[monthIdx]?.value ?? 0)
      }))
    };
  }

  hideTooltip() { this.tooltip.visible = false; }

  // Calcul de la tendance (delta premier/dernier mois)
  getTrend(siteId: number): number {
    const s = this.series.find(s => s.siteId === siteId);
    if (!s || s.points.length < 2) return 0;
    const first = s.points[0].value;
    const last  = s.points[s.points.length - 1].value;
    return Math.round(((last - first) / first) * 100);
  }
}
