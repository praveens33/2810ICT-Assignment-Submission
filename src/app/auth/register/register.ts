import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-register',
  imports: [
    FormsModule,
    CommonModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
    username = '';
    email = '';
    password = '';

    constructor(private authService: Auth, private router: Router){}

    onSubmit(): void {
      const success = this.authService.register(this.username,this.email,this.password);

      if (success){
        alert('Registration successful! Please log in.');
      } else {
        alert('Registration failed. Please try again');
      }
    }
}
