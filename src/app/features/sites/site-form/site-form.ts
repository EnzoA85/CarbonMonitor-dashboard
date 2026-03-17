import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormGroup, FormArray, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { SiteService } from '../../../core/services/site';
import { CarbonResult, MaterialResponse } from '../../../core/models/site.model';

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css'
})
export class SiteForm implements OnInit {

  form!: FormGroup;
  previewResult: CarbonResult | null = null;
  submitted = false;
  isEditMode = false;
  editingId: number | null = null;
  loading = false;
  errorMsg = '';

  allMaterials: MaterialResponse[] = [];

  readonly materialOptions = [
    { label: 'Béton',     emissionFactor: 210 },
    { label: 'Acier',     emissionFactor: 1850 },
    { label: 'Bois',      emissionFactor: 50 },
    { label: 'Verre',     emissionFactor: 900 },
    { label: 'Aluminium', emissionFactor: 8900 },
    { label: 'Isolant',   emissionFactor: 400 },
    { label: 'Autre',     emissionFactor: 300 }
  ];

  constructor(
    private fb: FormBuilder,
    private siteService: SiteService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      name:              ['', Validators.required],
      location:          ['', Validators.required],
      surface:           [0, [Validators.required, Validators.min(1)]],
      employees:         [0, [Validators.required, Validators.min(1)]],
      energyConsumption: [0, [Validators.required, Validators.min(0)]],
      parkingSpaces:     [0, [Validators.required, Validators.min(0)]],
      materials: this.fb.array([])
    });
  }

  ngOnInit() {
    // Charge le catalogue de matÃ©riaux depuis l'API
    this.siteService.getAllMaterials().subscribe(mats => {
      this.allMaterials = mats;
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.editingId  = Number(id);
      forkJoin({
        site: this.siteService.getSiteById(this.editingId),
        materials: this.siteService.getSiteMaterials(this.editingId)
      }).subscribe(({ site, materials }) => {
        this.form.patchValue({
          name:              site.name,
          location:          site.location,
          surface:           site.surface,
          employees:         site.employees,
          energyConsumption: site.energyConsumption,
          parkingSpaces:     site.parkingSpaces
        });
        materials.forEach(m => {
          this.materialsArray.push(this.fb.group({
            name:       [m.name, Validators.required],
            quantity:   [m.quantity, [Validators.required, Validators.min(0)]],
            co2PerTon:  [m.co2PerTon, Validators.required]
          }));
        });
      });
    }
  }

  get materialsArray(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  addMaterial() {
    const group = this.fb.group({
      name:      ['Béton', Validators.required],
      quantity:  [0, [Validators.required, Validators.min(0)]],
      co2PerTon: [210, Validators.required]
    });
    this.materialsArray.push(group);
  }

  removeMaterial(index: number) {
    this.materialsArray.removeAt(index);
  }

  onMaterialNameChange(index: number) {
    const name   = this.materialsArray.at(index).get('name')?.value;
    const option = this.materialOptions.find(o => o.label === name);
    if (option) {
      this.materialsArray.at(index).get('co2PerTon')?.setValue(option.emissionFactor);
    }
  }

  previewCarbon() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.previewResult = this.siteService.calculateCarbonLocal(v);
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  submit() {
    this.submitted = true;
    this.errorMsg  = '';
    if (this.form.invalid) return;
    this.loading = true;
    const v = this.form.value;
    const req = {
      name:              v.name,
      location:          v.location,
      surface:           v.surface,
      employees:         v.employees,
      energyConsumption: v.energyConsumption,
      parkingSpaces:     v.parkingSpaces
    };

    const siteObs = this.isEditMode && this.editingId !== null
      ? this.siteService.updateSite(this.editingId, req)
      : this.siteService.addSite(req);

    siteObs.subscribe({
      next: createdSite => {
        // Associe les matÃ©riaux dans une seconde passe
        const materialObs = (v.materials as { name: string; quantity: number }[])
          .map(m => {
            const found = this.allMaterials.find(am => am.name === m.name);
            return found
              ? this.siteService.addSiteMaterial(createdSite.id, found.id, m.quantity)
              : null;
          })
          .filter((obs): obs is NonNullable<typeof obs> => obs !== null);

        if (materialObs.length > 0) {
          forkJoin(materialObs).subscribe({
            next: () => this.router.navigate(['/sites', createdSite.id]),
            error: () => this.router.navigate(['/sites', createdSite.id])
          });
        } else {
          this.router.navigate(['/sites', createdSite.id]);
        }
      },
      error: (err) => {
        this.loading  = false;
        this.errorMsg = err?.error?.message ?? 'Une erreur est survenue lors de la création du site.';
      }
    });
  }
}
