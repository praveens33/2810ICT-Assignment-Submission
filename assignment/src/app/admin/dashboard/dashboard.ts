// src/app/admin/dashboard/dashboard.ts

import { Component, OnInit,OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { User } from '../../models/user.model'; // Make sure this uses `_id`
import { ChatService, Group, Channel } from '../../services/chat';
import { Auth } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        style({ backgroundColor: '#fff5f5' }),
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(10px)', backgroundColor: '#fff5f5' }))
      ])
    ])
  ]
})
export class Dashboard implements OnInit { 
  newGroupName: string = '';
  newUsername: string = '';
  newUserEmail: string = '';
  userSearchTerm: string = '';
  groupSearchTerm: string = '';

  // properties to hold data from services
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  allSystemGroups: Group[] =[];
  myOwnedGroups: Group[] = [];
  displayGroups: Group[] = []; // The list of groups to show based on role
  filteredGroups: Group[] = [];
  channelsForSelectedGroup: Channel[] = [];
  selectedGroup: Group | null = null;
  activeTab: 'users' | 'groups' = 'groups'; // Default for Group Admin
  selectedGroupActiveTab: 'members' | 'channels' | 'requests' | 'settings' = 'members';

  // Pagination properties for users
  paginatedUsers: User[] = [];
  userCurrentPage: number = 1;
  userItemsPerPage: number = 10;
  userTotalPages: number = 0;
  userPages: number[] = [];

  // Pagination properties for groups
  paginatedGroups: Group[] = [];
  groupCurrentPage: number = 1;
  groupItemsPerPage: number = 15; // Can show more groups in a simple list
  groupTotalPages: number = 0;
  groupPages: number[] = [];

  constructor(public authService: Auth, public chatService: ChatService, private location: Location, private router: Router) {}

  ngOnInit(): void {
    if (this.authService.currentUser?.roles.includes('Super Admin')) {
      this.activeTab = 'users';
    }
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.chatService.getUsers().subscribe(users => {
      this.allUsers = users;
      this.onUserSearchChange();
    });

    this.chatService.getGroups().subscribe(groups => {
      const currentUser = this.authService.currentUser;
      if (!currentUser) return;

      if (currentUser.roles.includes('Super Admin')) {
        this.displayGroups = groups;
      } else {
        this.displayGroups = groups.filter(g => g.admins.includes(currentUser._id));
      }
      
      this.myOwnedGroups = groups.filter(g => g.admins.includes(currentUser._id));
      this.allSystemGroups = groups;
      this.onGroupSearchChange(); // Initialize group list and pagination
      if (this.filteredGroups.length > 0 && !this.selectedGroup) {
        this.selectGroup(this.filteredGroups[0]);
      }
    });
  }

  onUserSearchChange(): void {
    this.filteredUsers = this.allUsers.filter(user => 
      user.username.toLowerCase().includes(this.userSearchTerm.toLowerCase())
    );
    this.userCurrentPage = 1; // Reset to first page on new search
    this.updateUserPagination();
  }

  updateUserPagination(): void {
    this.userTotalPages = Math.ceil(this.filteredUsers.length / this.userItemsPerPage);
    const startIndex = (this.userCurrentPage - 1) * this.userItemsPerPage;
    const endIndex = startIndex + this.userItemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
    this.userPages = this.generatePageNumbers(this.userCurrentPage, this.userTotalPages);
  }

  goToUserPage(page: number): void {
    if (page >= 1 && page <= this.userTotalPages) {
      this.userCurrentPage = page;
      this.updateUserPagination();
    }
  }

  // Helper to generate page numbers for pagination control to avoid huge lists
  private generatePageNumbers(currentPage: number, totalPages: number): number[] {
    const maxPagesToShow = 5;
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    startPage = Math.max(1, endPage - maxPagesToShow + 1); // Adjust start page if end page is at the limit
    for (let i = startPage; i <= endPage; i++) { pages.push(i); }
    return pages;
  }

  onGroupSearchChange(): void {
    this.filteredGroups = this.displayGroups.filter(group =>
      group.name.toLowerCase().includes(this.groupSearchTerm.toLowerCase())
    );
    this.groupCurrentPage = 1;
    this.updateGroupPagination();
  }

  updateGroupPagination(): void {
    this.groupTotalPages = Math.ceil(this.filteredGroups.length / this.groupItemsPerPage);
    const startIndex = (this.groupCurrentPage - 1) * this.groupItemsPerPage;
    const endIndex = startIndex + this.groupItemsPerPage;
    this.paginatedGroups = this.filteredGroups.slice(startIndex, endIndex);
    this.groupPages = this.generatePageNumbers(this.groupCurrentPage, this.groupTotalPages);
  }

  goToGroupPage(page: number): void {
    if (page >= 1 && page <= this.groupTotalPages) {
      this.groupCurrentPage = page;
      this.updateGroupPagination();
    }
  }

  selectGroup(group: Group): void {
    this.selectedGroup = group;
    this.selectedGroupActiveTab = 'members'; // Reset to default tab on group change
    this.chatService.getChannelsForGroup(group._id).subscribe(channels => {
      this.channelsForSelectedGroup = channels;
    });
    // Potentially load group-specific details here if they aren't already loaded
    // For now, all data is pre-loaded, so we just set the selected group.
  }

  goBack(): void {
    this.location.back();
  }
  
  
  superAdminDeleteGroup(groupId: string): void {
    if (confirm('As Super Admin, are you sure you want to delete this group?')) {
        this.chatService.superAdminRemoveGroup(groupId).subscribe(() => {
          alert('Group deleted.');
          this.loadInitialData();
        });
    }
  }
  superAdminRemoveUserFromGroup(userId: string, groupId: string): void {
    this.chatService.superAdminRemoveUserFromGroup(userId, groupId).subscribe(() => {
      alert(`User removed from group by Super Admin.`);
      this.loadInitialData();
    });
  }

  superAdminCreateUser(): void {
    if(this.newUsername && this.newUserEmail){
      this.chatService.superAdminCreateUser(this.newUsername, this.newUserEmail).subscribe({
        next: (newUser) => {
          alert('User was created successfully');
          this.newUsername = '';
          this.newUserEmail = '';
          this.allUsers.push(newUser);
          this.onUserSearchChange();
        },
        error: (err) => alert(err.error?.msg || 'Failed to create user.')
      });
    } else {
      alert('Username and email are required.');
    }
  }


    goToChat(): void{
    this.router.navigate(['/chat']);
   }

  addMember(userId: string, groupId: string): void {
    if (userId && groupId) {
      this.chatService.addUserToGroup(userId, groupId).subscribe(() => {
        alert('Member added!');
        this.loadInitialData();
      });
    }
  }
  getNonMembers(groupId: string): User[] {
  return this.allUsers.filter(user => !user.groups.includes(groupId));
  }

  onCreateGroup(): void {
    if (this.newGroupName && this.authService.currentUser) {
      this.chatService.createGroup(this.newGroupName, this.authService.currentUser._id).subscribe(() => {
        this.newGroupName = '';
        alert('Group created!');
        this.loadInitialData();
        this.selectedGroup = null; // Deselect to avoid confusion
      });
    } else {
      alert('You must be logged in to create a group.');
    }
  }
  
  onCreateChannel(groupId: string, channelName: string): void {
    if (channelName && groupId) {
      this.chatService.createChannel(channelName, groupId).subscribe(() => {
        alert('Channel created!');
        this.loadInitialData();
      });
    } else {
      alert('Please enter a channel name.');
    }
  }

  addAdmin(userId: string, groupId: string): void {
    if (userId && groupId) {
      this.chatService.addAdminToGroup(userId, groupId).subscribe(() => {
        alert('New admin added!');
        this.loadInitialData();
      });
   }
  }
  getNonAdminMembers(groupId: string): User[] {
    const group = this.myOwnedGroups.find(g => g._id === groupId);
    if (!group) return [];
    
    const members = this.getUsersInGroup(groupId);
    return members.filter(member => !group.admins.includes(member._id));
  }

  getUserById(userId: string): User | undefined {
    return this.allUsers.find(u => u._id === userId);
  }

  trackByUser(index: number, user: User): string {
    return user._id;
  }

  // super Admin User Management
  promoteToGroupAdmin(userId: string): void {
    this.chatService.promoteToGroupAdmin(userId).subscribe(() => this.loadInitialData());
  }

  promoteToSuperAdmin(userId: string): void {
    this.chatService.promoteToSuperAdmin(userId).subscribe(() => this.loadInitialData());
  }

  demoteFromGroupAdmin(userId: string): void {
    this.chatService.demoteFromGroupAdmin(userId).subscribe(() => this.loadInitialData());
  }

  demoteFromSuperAdmin(userId: string): void {
    this.chatService.demoteFromSuperAdmin(userId).subscribe(() => this.loadInitialData());
  } 

  removeUser(userId: string): void {
    if (confirm('Are you sure you want to remove this user completely?')) {
      this.chatService.removeUser(userId).subscribe(() => {
        const index = this.allUsers.findIndex(u => u._id === userId);
        if (index > -1) this.allUsers.splice(index, 1);
        this.onUserSearchChange();
      });
    }
  }

  // Group admin management methods

  removeChannel(channelId: string): void {
    if (confirm('Are you sure you want to delete this channel?')) {
      this.chatService.removeChannel(channelId).subscribe(() => {
        alert('Channel removed.');
        this.loadInitialData();
      });
    }
  }
  removeUserFromGroup(userId: string, groupId: string): void {
    this.chatService.removeUserFromGroup(userId, groupId).subscribe(() => {
      alert(`User removed from group.`);
      this.loadInitialData();
    });
  }
  
  getUsersInGroup(groupId: string): User[] {
    return this.allUsers.filter(u => u.groups.includes(groupId));
  }
  
  getChannelMembers(channelId: string): User[] {
    return this.allUsers.filter(user => user.channels.includes(channelId));
  }
  getNonChannelMembers(groupId: string, channelId: string): User[] {
  return this.getUsersInGroup(groupId).filter(user => !user.channels.includes(channelId));
  }

  addUserToChannel(userId: string, channelId: string): void {
    if (userId && channelId) {
      this.chatService.addUserToChannel(userId, channelId).subscribe(() => {
        this.loadInitialData();
      });
    }
  }
  goToGroupSettings(): void {
    this.router.navigate(['/group-admin']);
  }


  removeUserFromChannel(userId: string, channelId: string): void {
    if (userId && channelId) {
      this.chatService.removeUserFromChannel(userId, channelId).subscribe(() => {
        this.loadInitialData();
      });
    }
  }
}