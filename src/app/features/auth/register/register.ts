import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm  = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {

  form: FormGroup;
  error   = '';
  success = '';
  loading = false;
  showPassword        = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/']);
    }

    this.form = this.fb.group(
      {
        name:            ['', [Validators.required, Validators.minLength(2)]],
        email:           ['', [Validators.required, Validators.email]],
        password:        ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
      },
      { validators: passwordMatchValidator }
    );
  }

  submit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.error   = '';
    this.success = '';

    setTimeout(() => {
      const result = this.auth.register({
        name:     this.form.value.name,
        email:    this.form.value.email,
        password: this.form.value.password
      });

      this.loading = false;

      if (result === 'email_taken') {
        this.error = 'Cette adresse e-mail est déjà utilisée.';
      } else {
        this.router.navigate(['/']);
      }
    }, 600);
  }
}
