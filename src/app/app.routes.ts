import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ChatView } from './chat/chat-view/chat-view'; 
import { Dashboard } from './admin/dashboard/dashboard';
import { adminGuard } from './guards/admin-guard'; 

export const routes: Routes = [
    { path: 'login', component: Login},
    { path: 'register', component: Register},
    //redirect empty path to /login
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'chat', component: ChatView },
    { path: 'admin', component: Dashboard, canActivate: [adminGuard] }
    






];
