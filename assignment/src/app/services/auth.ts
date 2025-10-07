// src/app/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/user.model';
import { Router } from '@angular/router';
import { ChatService } from './chat'; 


@Injectable({
  providedIn: 'root'
})
export class Auth {
  private serverUrl = 'http://localhost:3000/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public readonly currentUser$: Observable<User | null>;

  constructor(private http: HttpClient, private router: Router, private chatService: ChatService) {
    // Load user data from local storage on startup
    const storedUser = localStorage.getItem('chat_user');
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  register(username: string, email: string, password: string): Observable<any> {
    const userData = { username, email, password };
    return this.http.post(`${this.serverUrl}/auth/register`, userData);
  }
  

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.serverUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response && response.token && response.user) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('chat_user', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            this.chatService.connectSocket(response.token);

          }
        })
      );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('chat_user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  updateCurrentUser(updatedUser: User): void {
    this.currentUserSubject.next(updatedUser);
    localStorage.setItem('chat_user', JSON.stringify(updatedUser));
  }

  public isSuperAdmin(user: User | null): boolean {
    return user?.roles.includes('Super Admin') ?? false;
  }
}