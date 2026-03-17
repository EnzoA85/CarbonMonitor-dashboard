import { Injectable } from '@angular/core';
import { Site, CarbonResult } from '../models/site.model';

// Facteurs d'émission (kgCO2e)
const ENERGY_FACTOR = 0.0571;      // kgCO2/kWh (réseau FR moyen)
const PARKING_FACTOR = 1500;       // kgCO2 par place (construction béton)
const PARKING_USAGE_FACTOR = 200;  // kgCO2/place/an (usage voitures)

@Injectable({
  providedIn: 'root'
})
export class SiteService {

  private sites: Site[] = [
    {
      id: 1,
      name: 'Siège Social Paris',
      location: 'Paris, Île-de-France',
      surface: 15000,
      employees: 2500,
      energyConsumption: 2200000,
      parkingSpaces: 350,
      createdAt: new Date('2024-01-15'),
      materials: [
        { name: 'Béton', quantity: 850, co2PerTon: 210 },
        { name: 'Acier', quantity: 120, co2PerTon: 1850 },
        { name: 'Verre', quantity: 40, co2PerTon: 900 },
        { name: 'Bois', quantity: 60, co2PerTon: 50 }
      ]
    },
    {
      id: 2,
      name: 'Campus Rennes',
      location: 'Rennes, Bretagne',
      surface: 11771,
      employees: 1800,
      energyConsumption: 1840000,
      parkingSpaces: 200,
      createdAt: new Date('2024-03-10'),
      materials: [
        { name: 'Béton', quantity: 620, co2PerTon: 210 },
        { name: 'Acier', quantity: 85, co2PerTon: 1850 },
        { name: 'Bois', quantity: 120, co2PerTon: 50 },
        { name: 'Isolant', quantity: 25, co2PerTon: 400 }
      ]
    },
    {
      id: 3,
      name: 'Entrepôt Lyon',
      location: 'Lyon, Auvergne-Rhône-Alpes',
      surface: 8500,
      employees: 320,
      energyConsumption: 950000,
      parkingSpaces: 80,
      createdAt: new Date('2024-05-20'),
      materials: [
        { name: 'Béton', quantity: 400, co2PerTon: 210 },
        { name: 'Acier', quantity: 200, co2PerTon: 1850 },
        { name: 'Aluminium', quantity: 15, co2PerTon: 8900 }
      ]
    },
    {
      id: 4,
      name: 'Bureau Bordeaux',
      location: 'Bordeaux, Nouvelle-Aquitaine',
      surface: 3200,
      employees: 450,
      energyConsumption: 420000,
      parkingSpaces: 50,
      createdAt: new Date('2024-07-08'),
      materials: [
        { name: 'Béton', quantity: 150, co2PerTon: 210 },
        { name: 'Bois', quantity: 80, co2PerTon: 50 },
        { name: 'Verre', quantity: 20, co2PerTon: 900 }
      ]
    }
  ];

  getSites(): Site[] {
    return [...this.sites];
  }

  getSiteById(id: number): Site | undefined {
    return this.sites.find(s => s.id === id);
  }

  addSite(site: Omit<Site, 'id'>): Site {
    const newSite: Site = { ...site, id: Date.now() };
    this.sites.push(newSite);
    return newSite;
  }

  calculateCarbon(site: Site): CarbonResult {
    // CO2 exploitation (énergie annuelle)
    const co2Energy = site.energyConsumption * ENERGY_FACTOR;

    // CO2 parking usage annuel
    const co2ParkingUsage = site.parkingSpaces * PARKING_USAGE_FACTOR;

    // CO2 matériaux (construction)
    const co2Materials = site.materials.reduce(
      (sum, m) => sum + m.quantity * m.co2PerTon,
      0
    );

    // CO2 construction parking (amorti sur 50 ans)
    const co2ParkingConstruction = (site.parkingSpaces * PARKING_FACTOR) / 50;

    const co2Construction = co2Materials + co2ParkingConstruction;
    const co2Exploitation = co2Energy + co2ParkingUsage;
    const co2Total = co2Construction + co2Exploitation;

    return {
      siteId: site.id,
      co2Total: Math.round(co2Total),
      co2PerM2: Math.round((co2Total / site.surface) * 10) / 10,
      co2PerEmployee: Math.round(co2Total / site.employees),
      co2Construction: Math.round(co2Construction),
      co2Exploitation: Math.round(co2Exploitation),
      breakdown: {
        energy: Math.round(co2Energy),
        parking: Math.round(co2ParkingUsage + co2ParkingConstruction),
        materials: Math.round(co2Materials)
      }
    };
  }
}