import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SiteService } from '../../../core/services/site';
import { CarbonResult, Site } from '../../../core/models/site.model';

@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './site-form.html',
  styleUrl: './site-form.css'
})
export class SiteForm {

  form!: FormGroup;
  previewResult: CarbonResult | null = null;
  submitted = false;

  readonly materialOptions = [
    { label: 'Béton', co2PerTon: 210 },
    { label: 'Acier', co2PerTon: 1850 },
    { label: 'Bois', co2PerTon: 50 },
    { label: 'Verre', co2PerTon: 900 },
    { label: 'Aluminium', co2PerTon: 8900 },
    { label: 'Isolant', co2PerTon: 400 },
    { label: 'Autre', co2PerTon: 300 }
  ];

  constructor(
    private fb: FormBuilder,
    private siteService: SiteService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      location: ['', Validators.required],
      surface: [0, [Validators.required, Validators.min(1)]],
      employees: [0, [Validators.required, Validators.min(1)]],
      energyConsumption: [0, [Validators.required, Validators.min(0)]],
      parkingSpaces: [0, [Validators.required, Validators.min(0)]],
      materials: this.fb.array([])
    });
  }

  get materialsArray(): FormArray {
    return this.form.get('materials') as FormArray;
  }

  addMaterial() {
    const group = this.fb.group({
      name: ['Béton', Validators.required],
      quantity: [0, [Validators.required, Validators.min(0)]],
      co2PerTon: [210, Validators.required]
    });
    this.materialsArray.push(group);
  }

  removeMaterial(index: number) {
    this.materialsArray.removeAt(index);
  }

  onMaterialNameChange(index: number) {
    const name = this.materialsArray.at(index).get('name')?.value;
    const option = this.materialOptions.find(o => o.label === name);
    if (option) {
      this.materialsArray.at(index).get('co2PerTon')?.setValue(option.co2PerTon);
    }
  }

  previewCarbon() {
    if (this.form.invalid) return;
    const tempSite: Site = { ...this.form.value, id: 0, createdAt: new Date() };
    this.previewResult = this.siteService.calculateCarbon(tempSite);
  }

  formatCO2(value: number): string {
    if (value >= 1000) return (value / 1000).toFixed(1) + ' tCO₂e';
    return value + ' kgCO₂e';
  }

  submit() {
    if (this.form.valid) {
      const site: Omit<Site, 'id'> = { ...this.form.value, createdAt: new Date() };
      const created = this.siteService.addSite(site);
      this.router.navigate(['/sites', created.id]);
    }
  }
}