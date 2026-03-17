import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { Sidebar } from './layout/sidebar/sidebar';
import { Header } from './layout/header/header';
import { AuthService } from './core/services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Sidebar, Header, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly auth   = inject(AuthService);
  readonly router = inject(Router);

  get isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/register';
  }
}