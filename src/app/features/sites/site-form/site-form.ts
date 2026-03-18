import { ChangeDetectorRef, Component, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SiteService } from '../../../core/services/site';
import { CarbonResult, Site } from '../../../core/models/site.model';
import type { MaterialResponse } from '../../../core/services/api';
import { MaterialSearchSelect } from '../../../shared/components/material-search-select/material-search-select';

function buildLocation(address: string, postalCode: string, city: string): string {
  const parts: string[] = [];
  if (address?.trim()) parts.push(address.trim());
  if (postalCode?.trim() && city?.trim()) parts.push(`${postalCode.trim()} ${city.trim()}`);
  else if (postalCode?.trim()) parts.push(postalCode.trim());
  else if (city?.trim()) parts.push(city.trim());
  return parts.join(', ') || '';
}

function parseLocation(location: string): { address: string; postalCode: string; city: string } {
  if (!location?.trim()) return { address: '', postalCode: '', city: '' };
  const m = location.match(/^(.+),\s*(\d{5})\s+(.+)$/);
  if (m) return { address: m[1].trim(), postalCode: m[2], city: m[3].trim() };
  const m2 = location.match(/^(\d{5})\s+(.+)$/);
  if (m2) return { address: '', postalCode: m2[1], city: m2[2].trim() };
  return { address: location.trim(), postalCode: '', city: '' };
}

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, MaterialSearchSelect],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css',
})
export class SiteForm implements OnInit {
  form!: FormGroup;
  previewResult = signal<CarbonResult | null>(null);
  isEditMode = false;
  editingId: number | null = null;
  loading = true;
  saving = false;
  error = '';
  materialOptions = signal<MaterialResponse[]>([]);
  materialsLoadError = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private siteService: SiteService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      address: [''],
      postalCode: [''],
      city: [''],
      surface: [0, [Validators.required, Validators.min(1)]],
      workstations: [0, [Validators.min(0)]],
      employees: [0, [Validators.required, Validators.min(1)]],
      energyConsumption: [0, [Validators.required, Validators.min(0)]],
      parkingSpaces: [0, [Validators.required, Validators.min(0)]],
      materials: this.fb.array([]),
    });
  }

  async ngOnInit() {
    try {
      try {
        const mats = await this.withTimeout(this.siteService.listMaterials(), 8000);
        this.materialOptions.set(mats);
        this.materialsLoadError.set(mats.length === 0 ? 'Aucun matériau disponible. Vérifiez la connexion à l\'API.' : null);
      } catch {
        this.materialOptions.set([]);
        this.materialsLoadError.set('Impossible de charger les matériaux.');
      }

      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.isEditMode = true;
        this.editingId = Number(id);
        try {
          const site = await this.withTimeout(this.siteService.getSiteById(this.editingId), 8000);
          if (site) {
            const { address, postalCode, city } = parseLocation(site.location);
            this.form.patchValue({
              name: site.name,
              address,
              postalCode,
              city,
              surface: site.surface,
              employees: site.employees,
              energyConsumption: site.energyConsumption,
              parkingSpaces: site.parkingSpaces,
            });
            this.materialsArray.clear();
            for (const m of site.materials) {
              const opt = this.materialOptions().find((o) => o.name.toLowerCase() === m.name.toLowerCase());
              if (opt) {
                const qty = this.getQuantityInMaterialUnit(opt, m.quantity);
                this.materialsArray.push(
                  this.fb.group({
                    materialId: [opt.id, Validators.required],
                    quantity: [qty, [Validators.required, Validators.min(0)]],
                  })
                );
              }
            }
          }
        } catch {
          this.error = 'Impossible de charger le site.';
        }
      }
      if (this.materialsArray.length === 0 && this.materialOptions().length > 0) {
        this.addMaterial();
      }
      this.form.valueChanges.subscribe(() => this.updatePreview());
      this.updatePreview();
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Délai dépassé')), ms)
      ),
    ]);
  }

  private getQuantityInMaterialUnit(m: MaterialResponse, quantityTonnes: number): number {
    const u = (m.unit ?? 'kg').toLowerCase();
    return u.includes('tonne') || u.includes('ton') ? quantityTonnes : quantityTonnes * 1000;
  }

  get materialsArray(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  addMaterial() {
    const firstId = this.materialOptions()[0]?.id ?? 0;
    this.materialsArray.push(
      this.fb.group({
        materialId: [firstId, Validators.required],
        quantity: [0, [Validators.required, Validators.min(0)]],
      })
    );
    this.updatePreview();
  }

  removeMaterial(index: number) {
    this.materialsArray.removeAt(index);
    this.updatePreview();
  }

  getMaterialUnit(materialId: number): string {
    const m = this.materialOptions().find((o) => o.id === materialId);
    return m?.unit ?? 'kg';
  }

  getCo2PerKg(materialId: number): number {
    const m = this.materialOptions().find((o) => o.id === materialId);
    return m?.emissionFactor ?? 0;
  }

  updatePreview() {
    const materials = this.materialsArray.controls.map((c) => {
      const materialId = c.get('materialId')?.value;
      const quantity = c.get('quantity')?.value ?? 0;
      const opt = this.materialOptions().find((o) => o.id === materialId);
      const factor = opt?.emissionFactor ?? 0;
      const u = (opt?.unit ?? 'kg').toLowerCase();
      const qtyKg = u.includes('tonne') || u.includes('ton') ? quantity * 1000 : quantity;
      const co2PerTon = u.includes('tonne') || u.includes('ton') ? factor : factor * 1000;
      const quantityTonnes = u.includes('tonne') || u.includes('ton') ? quantity : quantity / 1000;
      return {
        name: opt?.name ?? '',
        quantity: quantityTonnes,
        co2PerTon,
      };
    });
    const tempSite: Site = {
      ...this.form.value,
      id: 0,
      location: buildLocation(
        this.form.value.address ?? '',
        this.form.value.postalCode ?? '',
        this.form.value.city ?? ''
      ),
      materials,
      createdAt: new Date(),
    };
    this.previewResult.set(this.siteService.calculateCarbonLocal(tempSite));
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  async submit() {
    if (this.form.invalid) return;

    this.saving = true;
    this.error = '';

    const location = buildLocation(
      this.form.value.address ?? '',
      this.form.value.postalCode ?? '',
      this.form.value.city ?? ''
    );

    const base = {
      name: this.form.value.name,
      location,
      surface: this.form.value.surface,
      employees: this.form.value.employees,
      energyConsumption: this.form.value.energyConsumption,
      parkingSpaces: this.form.value.parkingSpaces,
    };

    try {
      if (this.isEditMode && this.editingId !== null) {
        await this.siteService.updateSite(this.editingId, base);
        const existing = await this.siteService.getSiteMaterials(this.editingId);
        for (const sm of existing) {
          await this.siteService.removeSiteMaterial(this.editingId, sm.id);
        }
        for (const c of this.materialsArray.controls) {
          const materialId = c.get('materialId')?.value;
          const quantity = c.get('quantity')?.value ?? 0;
          if (materialId && quantity > 0) {
            await this.siteService.addSiteMaterial(this.editingId, materialId, quantity);
          }
        }
        await this.siteService.triggerCalculate(this.editingId);
        this.router.navigate(['/sites']);
      } else {
        const created = await this.siteService.createSite(base);
        for (const c of this.materialsArray.controls) {
          const materialId = c.get('materialId')?.value;
          const quantity = c.get('quantity')?.value ?? 0;
          if (materialId && quantity > 0) {
            await this.siteService.addSiteMaterial(created.id, materialId, quantity);
          }
        }
        await this.siteService.triggerCalculate(created.id);
        this.router.navigate(['/sites']);
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    } finally {
      this.saving = false;
    }
  }
}
