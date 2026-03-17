import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of } from 'rxjs';

const API_BASE = 'https://carbonmonitorwebapp-b5fscgd8g8djb8dk.spaincentral-01.azurewebsites.net/api';
const TOKEN_KEY = 'auth_token';
const USER_KEY  = 'auth_user';

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

interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

interface UserResponse {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  readonly currentUser = signal<AuthUser | null>(this.loadUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(payload: LoginPayload): Observable<boolean> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login`, payload).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        const user: AuthUser = {
          id: 0,
          name: res.email.split('@')[0],
          email: res.email,
          role: res.role
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
        // Récupère les infos complètes en arrière-plan
        this.fetchCurrentUser().subscribe();
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  fetchCurrentUser(): Observable<AuthUser | null> {
    return this.http.get<UserResponse>(`${API_BASE}/auth/me`).pipe(
      tap(res => {
        const user: AuthUser = {
          id: res.id,
          name: res.email.split('@')[0],
          email: res.email,
          role: res.role
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
      map(res => ({
        id: res.id,
        name: res.email.split('@')[0],
        email: res.email,
        role: res.role
      })),
      catchError(() => of(null))
    );
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
    // Rejette les anciens faux tokens mock (format base64 JSON non-JWT)
    // Un vrai JWT contient exactement 2 points
    if ((token.match(/\./g) ?? []).length !== 2) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      this.currentUser.set(null);
      return false;
    }
    return true;
  }

  register(payload: { email: string; password: string }): Observable<void> {
    return this.http.post<AuthResponse>(`${API_BASE}/auth/register`, payload).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.token);
        const user: AuthUser = {
          id: 0,
          name: res.email.split('@')[0],
          email: res.email,
          role: res.role
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
        this.fetchCurrentUser().subscribe();
      }),
      map(() => void 0)
    );
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
