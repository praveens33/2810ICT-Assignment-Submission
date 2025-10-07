// register.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth'; // Make sure this path is correct

@Component({
  selector: 'app-register',
  standalone: true, // Assuming this component is standalone
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
    username = '';
    email = '';
    password = '';

    constructor(private authService: Auth, private router: Router){}

    // -- THIS IS THE CORRECTED FUNCTION --
    onSubmit(): void {
      this.authService.register(this.username, this.email, this.password)
        .subscribe({
          next: (response) => {
            // This block runs when the server responds with a success status
            console.log('Registration successful', response);
            alert('Registration successful! Please log in.');
            this.router.navigate(['/login']); // Redirect to login page
          },
          error: (err) => {
            // This block runs when the server responds with an error
            console.error('Registration failed:', err);
            // Display a more helpful error message from the server if available
            alert(err.error?.msg || 'Registration failed. The email may already be in use.');
          }
        });
    }
}