import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  form: FormGroup;
  error = '';
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    // Rediriger si déjà connecté
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    this.form = this.fb.group({
      email:    ['admin@company.com', [Validators.required, Validators.email]],
      password: ['admin123',          Validators.required]
    });
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error   = '';

    // Simule un délai réseau (à retirer quand l'API sera branchée)
    setTimeout(() => {
      const success = this.auth.login(this.form.value);
      this.loading  = false;
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.error = 'Email ou mot de passe incorrect.';
      }
    }, 600);
  }
}
