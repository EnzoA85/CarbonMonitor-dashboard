import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { apiGetCurrentUser } from '../../../core/services/api';
import type { UserResponse } from '../../../core/services/api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  user: UserResponse | null = null;
  loading = true;
  error = '';

  constructor(
    public auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    this.loading = true;
    this.error = '';
    try {
      const token = this.auth.getToken();
      if (!token) {
        this.error = 'Non authentifié';
        return;
      }
      this.user = await apiGetCurrentUser(token);
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Impossible de charger le profil';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  roleLabel(role: string | undefined): string {
    if (!role) return '—';
    const labels: Record<string, string> = {
      USER: 'Utilisateur',
      ADMIN: 'Administrateur',
    };
    return labels[role] ?? role;
  }

  logout() {
    this.auth.logout();
  }
}
