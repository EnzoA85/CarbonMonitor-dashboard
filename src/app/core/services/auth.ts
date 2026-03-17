import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

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

// Comptes mock — à remplacer par un appel API + vrai JWT
const MOCK_USERS: (AuthUser & { password: string })[] = [
  { id: 1, name: 'Administrateur', email: 'admin@company.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Marie Dupont',   email: 'marie@company.com', password: 'marie123', role: 'user' }
];

const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // Signal réactif pour l'état de connexion (utilisé dans les templates)
  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(private router: Router) {}

  /**
   * Tente une connexion avec les identifiants fournis.
   * Retourne true en cas de succès, false sinon.
   * —— À remplacer : POST /api/auth/login → { access_token, user }
   */
  login(payload: LoginPayload): boolean {
    const match = MOCK_USERS.find(
      u => u.email === payload.email && u.password === payload.password
    );

    if (!match) return false;

    const { password: _pw, ...user } = match;

    // Mock JWT — à remplacer par le vrai token renvoyé par le backend
    const fakeToken = btoa(JSON.stringify({ sub: user.id, email: user.email, role: user.role, exp: Date.now() + 3600_000 }));

    localStorage.setItem(TOKEN_KEY, fakeToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    return true;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;

    // Vérification d'expiration du mock token
    try {
      const payload = JSON.parse(atob(token));
      if (payload.exp && payload.exp < Date.now()) {
        this.logout();
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
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
