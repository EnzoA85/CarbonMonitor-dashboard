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
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  async submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error = '';

    const result = await this.auth.login(this.form.value);
    this.loading = false;

    if (result.ok) {
      this.router.navigate(['/']);
    } else {
      this.error = result.error ?? 'Email ou mot de passe incorrect.';
    }
  }
}
