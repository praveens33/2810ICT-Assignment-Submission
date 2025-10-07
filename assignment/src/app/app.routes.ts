import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { ChatView } from './chat/chat-view/chat-view'; 
import { Dashboard } from './admin/dashboard/dashboard';
import { adminGuard } from './guards/admin-guard'; 
import { UserSettingsComponent } from './user-settings/user-settings';
import { VideoCall } from './video-call/video-call';
import {GroupDashboard} from './admin/group-dashboard/group-dashboard';
import { AuthInterceptor } from './services/auth-interceptor'
export const routes: Routes = [
    { path: 'login', component: Login},
    { path: 'register', component: Register},
    //redirect empty path to /login
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: 'chat', component: ChatView },
    { path: 'admin', component: Dashboard, canActivate: [adminGuard] },
    { path: 'group-admin', component: GroupDashboard, canActivate: [adminGuard] },
    { path: 'settings', component: UserSettingsComponent },
    { path: 'video-call', component: VideoCall },

];
