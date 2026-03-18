import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  apiGetCurrentUser,
  apiLogin,
  apiRegister,
  type AuthResponse,
  type UserResponse,
} from './api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

function displayNameFromEmail(email: string): string {
  if (!email?.trim()) return '';
  const local = email.split('@')[0]?.trim() || '';
  const first = local.split(/[._-]/)[0] || '';
  return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(private router: Router) {}

  private storeAuth(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    const user: AuthUser = {
      id: 0,
      name: displayNameFromEmail(res.email),
      email: res.email,
      role: res.role,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private async fetchAndStoreUser(token: string): Promise<void> {
    const u = await apiGetCurrentUser(token);
    const user: AuthUser = {
      id: u.id,
      name: displayNameFromEmail(u.email),
      email: u.email,
      role: u.role,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  async login(payload: LoginPayload): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await apiLogin({ email: payload.email, password: payload.password });
      this.storeAuth(res);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur de connexion';
      return { ok: false, error: msg.includes('401') ? 'Email ou mot de passe incorrect.' : msg };
    }
  }

  async register(payload: RegisterPayload): Promise<'ok' | 'email_taken' | { error: string }> {
    try {
      const res = await apiRegister({ email: payload.email, password: payload.password });
      this.storeAuth(res);
      return 'ok';
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.toLowerCase().includes('email') || msg.includes('409')) return 'email_taken';
      return { error: msg };
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  async refreshUser(): Promise<void> {
    const token = this.getToken();
    if (!token) return;
    try {
      await this.fetchAndStoreUser(token);
    } catch {
      this.logout();
    }
  }

  private loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
