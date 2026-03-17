import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import { Site, CarbonResult } from '../models/site.model';

@Injectable({ providedIn: 'root' })
export class ExportService {

  exportSitePDF(site: Site, carbon: CarbonResult): void {
    const fmt = (v: number) =>
      v >= 1000 ? (v / 1000).toFixed(1) + ' tCO2e' : v.toFixed(0) + ' kgCO2e';

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 15;
    const col = margin;
    let y = margin;

    // ── Helpers ──────────────────────────────────────────────────────────
    const setFont = (style: 'normal' | 'bold', size: number, r = 31, g = 41, b = 55) => {
      doc.setFont('helvetica', style);
      doc.setFontSize(size);
      doc.setTextColor(r, g, b);
    };

    const drawBar = (label: string, value: string, pct: number,
                     barY: number, r: number, g: number, b: number) => {
      const barW = W - margin * 2;
      const fillW = Math.max(barW * pct / 100, 1);
      setFont('normal', 9, 107, 114, 128);
      doc.text(label, col, barY);
      setFont('bold', 9, r, g, b);
      doc.text(value, W - margin, barY, { align: 'right' });
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(col, barY + 2, barW, 4, 1, 1, 'F');
      doc.setFillColor(r, g, b);
      doc.roundedRect(col, barY + 2, fillW, 4, 1, 1, 'F');
    };

    const kpiBox = (x: number, bY: number, bW: number, title: string, value: string,
                    vr: number, vg: number, vb: number) => {
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(x, bY, bW, 18, 2, 2, 'F');
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(x, bY, bW, 18, 2, 2, 'S');
      setFont('bold', 10, vr, vg, vb);
      doc.text(value, x + bW / 2, bY + 7, { align: 'center' });
      setFont('normal', 7, 156, 163, 175);
      doc.text(title.toUpperCase(), x + bW / 2, bY + 13, { align: 'center' });
    };

    // ── HEADER ────────────────────────────────────────────────────────────
    doc.setFillColor(21, 128, 61);
    doc.rect(0, 0, W, 28, 'F');

    setFont('bold', 18, 255, 255, 255);
    doc.text('CarbonTrack', col, 12);
    setFont('normal', 9, 187, 247, 208);
    doc.text('Rapport d\'empreinte carbone', col, 19);

    setFont('normal', 8, 187, 247, 208);
    doc.text('Genere le ' + new Date().toLocaleDateString('fr-FR',
      { day: '2-digit', month: 'long', year: 'numeric' }), W - margin, 12, { align: 'right' });

    // ── SITE INFO ─────────────────────────────────────────────────────────
    y = 36;
    setFont('bold', 16, 31, 41, 55);
    doc.text(site.name, col, y);
    y += 6;
    setFont('normal', 9, 107, 114, 128);
    doc.text(`${site.location}   |   Cree le ${new Date(site.createdAt).toLocaleDateString('fr-FR')}`, col, y);
    y += 4;
    doc.setDrawColor(229, 231, 235);
    doc.line(col, y, W - margin, y);

    // ── KPIs (2×3) ────────────────────────────────────────────────────────
    y += 6;
    const kpiW = (W - margin * 2 - 8) / 3;
    const kpiRow2 = y + 22;

    kpiBox(col,              y, kpiW, 'CO2 Total',      fmt(carbon.co2Total),          21, 128, 61);
    kpiBox(col + kpiW + 4,   y, kpiW, 'CO2 par m2',     `${carbon.co2PerM2} kg/m2`,    29, 78, 216);
    kpiBox(col + (kpiW+4)*2, y, kpiW, 'CO2 / employe',  fmt(carbon.co2PerEmployee),    124, 58, 237);

    kpiBox(col,              kpiRow2, kpiW, 'Construction', fmt(carbon.co2Construction), 217, 119, 6);
    kpiBox(col + kpiW + 4,   kpiRow2, kpiW, 'Exploitation', fmt(carbon.co2Exploitation), 220, 38, 38);
    kpiBox(col + (kpiW+4)*2, kpiRow2, kpiW, 'Surface / Effectif',
           `${site.surface.toLocaleString('fr-FR')} m2 / ${site.employees} pers.`, 107, 114, 128);

    // ── RÉPARTITION ───────────────────────────────────────────────────────
    y = kpiRow2 + 25;
    setFont('bold', 10, 55, 65, 81);
    doc.text('REPARTITION DES EMISSIONS', col, y);
    y += 5;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(col, y, W - margin * 2, 42, 2, 2, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(col, y, W - margin * 2, 42, 2, 2, 'S');
    y += 8;

    const ptot = carbon.co2Total || 1;
    drawBar('Energie', fmt(carbon.breakdown.energy),
            carbon.breakdown.energy / ptot * 100, y, 59, 130, 246);
    y += 12;
    drawBar('Materiaux construction', fmt(carbon.breakdown.materials),
            carbon.breakdown.materials / ptot * 100, y, 245, 158, 11);
    y += 12;
    drawBar('Parking', fmt(carbon.breakdown.parking),
            carbon.breakdown.parking / ptot * 100, y, 239, 68, 68);
    y += 14;

    // ── MATÉRIAUX ─────────────────────────────────────────────────────────
    if (site.materials.length > 0) {
      setFont('bold', 10, 55, 65, 81);
      doc.text('DETAIL DES MATERIAUX', col, y);
      y += 5;

      // Table header
      doc.setFillColor(243, 244, 246);
      doc.rect(col, y, W - margin * 2, 7, 'F');
      setFont('bold', 8, 107, 114, 128);
      const cols = [col + 2, col + 65, col + 105, col + 145];
      doc.text('MATERIAU', cols[0], y + 5);
      doc.text('QUANTITE (t)', cols[1], y + 5);
      doc.text('kgCO2/t', cols[2], y + 5);
      doc.text('CO2 TOTAL', cols[3], y + 5);
      y += 8;

      doc.setDrawColor(243, 244, 246);
      for (const m of site.materials) {
        if (y > 270) { doc.addPage(); y = margin; }
        setFont('normal', 9, 31, 41, 55);
        doc.text(m.name, cols[0], y + 4);
        doc.text(m.quantity.toLocaleString('fr-FR'), cols[1], y + 4);
        doc.text(m.co2PerTon.toLocaleString('fr-FR'), cols[2], y + 4);
        setFont('bold', 9, 21, 128, 61);
        doc.text(fmt(m.quantity * m.co2PerTon), cols[3], y + 4);
        doc.line(col, y + 7, W - margin, y + 7);
        y += 8;
      }
    }

    // ── FOOTER ────────────────────────────────────────────────────────────
    const footerY = 287;
    doc.setFillColor(243, 244, 246);
    doc.rect(0, footerY - 4, W, 12, 'F');
    setFont('normal', 7, 156, 163, 175);
    doc.text('CarbonTrack — Rapport d\'empreinte carbone', col, footerY);
    doc.text(`${site.name} · ${new Date().toLocaleDateString('fr-FR')}`, W - margin, footerY, { align: 'right' });

    // ── Téléchargement + nouvel onglet ────────────────────────────────────
    const filename = `carbontrack_${site.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    const blobUrl = doc.output('bloburl');
    window.open(blobUrl.toString(), '_blank');
  }
}

