import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [FormsModule,
    CommonModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  password = '';

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  onSubmit(): void {
    const success = this.authService.login(this.email, this.password);

    if (success) {
      this.router.navigate(['/chat']);
    } else {
      alert('Invalid email or password!');
    }
  }
}