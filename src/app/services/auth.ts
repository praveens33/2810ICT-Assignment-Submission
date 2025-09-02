import { Injectable } from '@angular/core';
import { User } from '../models/user.model';
import { ChatService } from './chat'; // Import the ChatService

@Injectable({
  providedIn: 'root'
})
export class Auth {
  currentUser: User | null = null;

  constructor(private chatService: ChatService) {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  login(email: string, password: string): boolean {
    let userIdToFind: string | undefined;

    if (email === 'super' && password === '123') {
      userIdToFind = 'u0';
    } else if (email === 'groupadmin@chat.app' && password === '123') {
      userIdToFind = 'u1';
    } else if (email === 'user@chat.app' && password === 'password123') {
      userIdToFind = 'u2';
    }

    
    if (userIdToFind) {
      // find the user in the "database" 
      this.currentUser = this.chatService.getUsers().find(u => u.id === userIdToFind) || null;

      if (this.currentUser) {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        console.log(`${this.currentUser.username} logged in successfully.`);
        return true;
      }
    }

    this.currentUser = null;
    localStorage.removeItem('currentUser');
    return false;
  }

  register(username: string, email: string, password: string): boolean {
    console.log('Registering new user:', { username, email });
    return true;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    console.log('User logged out');
  }

  updateCurrentUser(updatedUser: User): void {
    console.log('3. [Auth Service] updateCurrentUser was called with:', updatedUser);

    this.currentUser = updatedUser;
    localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    console.log("current user session updated");
  }
}