import { Component, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common'; 
import { Auth } from './services/auth'; 
import 'zone.js';
@Component({
  selector: 'app-root',
  standalone: true, 
  imports: [CommonModule,RouterLink, RouterOutlet], 
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('assignment');

  constructor(public authService: Auth, private router: Router) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']); 
  }
}