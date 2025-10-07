  import { Component } from '@angular/core';
  import { Router } from '@angular/router';
  import { FormsModule } from '@angular/forms';
  import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true, // standalone is needed for modern Angular component structure
  imports: [
    FormsModule,
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
    // The login method now returns an "Observable" from the HTTP request.
    this.authService.login(this.email, this.password).subscribe({
      next: (response) => {
        // This 'next' block runs if the server responds with a success status (200 OK)
        console.log('Login successful', response);
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        // This 'error' block runs if the server responds with an error (e.g., 400, 401)
        console.error('Login failed', err);
        // Show the specific error message from the server, or a generic one if none exists
        const errorMessage = err.error?.message || 'Invalid email or password!';
        alert(errorMessage);
      }
    });
  }
}
