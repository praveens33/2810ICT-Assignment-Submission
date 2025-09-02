// src/app/guards/admin.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  const user = authService.currentUser;
  console.log('Admin Guard is checking this user:', user); 


  // heck for both Super Admin OR Group Admin
  if (user && (user.roles.includes('Super Admin') || user.roles.includes('Group Admin'))) {
    // if user has either role, allow access
    return true;
  }

  // if not true rdirect them to the chat page and block access
  router.navigate(['/chat']);
  return false;
};