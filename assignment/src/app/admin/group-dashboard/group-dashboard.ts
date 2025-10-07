// src/app/admin/dashboard/groupdashboard.ts
import { Component, OnInit,OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { User } from '../../models/user.model'; 
import { ChatService, Group, Channel } from '../../services/chat';
import { Auth } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common'; 
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-group-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-dashboard.html',
  styleUrls: ['./group-dashboard.css'],
  animations: [
    //the fade in animation
    trigger('fadeIn',[
      transition(':enter',[
        style({opacity: 0, transform: 'translateY(10px)'}),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    //list animations
    trigger('listAnimation', [
      //when an item is added to a list
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      //when a item leaves from the list
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ]),
  ],
})
export class GroupDashboard implements OnInit { 
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
  membersOfSelectedGroup: User[] = [];
  
  activeTab: 'users' | 'groups' = 'groups'; // Default for Group Admin
  selectedGroupActiveTab: 'members' | 'channels' | 'requests' | 'settings' | 'banned' = 'members';

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
  
    this.loadInitialData();
  }

 loadInitialData(): void {
    // track  selected group's ID to re-select it after the refresh
    const selectedGroupId = this.selectedGroup?._id;

    forkJoin({
      users: this.chatService.getUsers(),
      groups: this.chatService.getGroups()
    }).subscribe(({ users, groups }) => { 
      console.log('Successfully fetched data!');
      console.log('Users received:', users);
      console.log('Groups received:', groups);
      //code runs after api call is complete, the ".subscribe()" method means that it executes when the observable emits 
      // the value
      // process user ensure all user is populated
      this.allUsers = users;

      const currentUser = this.authService.currentUser;
      if (!currentUser) return;

      this.allSystemGroups = groups; 

      if (currentUser.roles.includes('Super Admin')) {
        this.displayGroups = this.allSystemGroups;
      } else {
        this.displayGroups = this.allSystemGroups.filter(g => g.admins.includes(currentUser._id));
      }
      this.myOwnedGroups = this.allSystemGroups.filter(g => g.admins.includes(currentUser._id));
      
      if (selectedGroupId) {
        this.selectedGroup = this.allSystemGroups.find(g => g._id === selectedGroupId) || null;
      }
      // If a group is selected, populate its member list
      if (this.selectedGroup) {
        this.updateMembersForSelectedGroup();
      }

      this.onUserSearchChange();
      this.onGroupSearchChange();

      if (this.filteredGroups.length > 0 && !this.selectedGroup) {
        this.selectGroup(this.filteredGroups[0]);
      }
      error: (err: any) => {
        console.error('Failed to fetch initial data: ', err);
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
    this.selectedGroupActiveTab = 'members'; 
    this.chatService.getChannelsForGroup(group._id).subscribe(channels => {
      this.channelsForSelectedGroup = channels;
      this.updateMembersForSelectedGroup();
    });
  }

  goBack(): void {
    this.location.back();
  }
  
  deleteGroup(groupId: string): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    const group = this.allSystemGroups.find(g => g._id === groupId);
    if (!group) return;

    const isSuper = this.authService.isSuperAdmin(currentUser);
    const isSoleAdmin = group.admins.includes(currentUser._id) && group.admins.length === 1;

    if (confirm('Are you sure you want to permanently delete this group? This cannot be undone.')) {
      const deleteObservable = isSuper 
        ? this.chatService.superAdminRemoveGroup(groupId) 
        : this.chatService.groupAdminDeleteGroup(groupId);

      deleteObservable.subscribe(() => {
        alert('Group deleted.');
        this.loadInitialData();
        this.selectedGroup = null;
      });
    }
  }

  // update the dedicated member list property
  updateMembersForSelectedGroup(): void {
    if (this.selectedGroup) {
      this.membersOfSelectedGroup = this.getUsersInGroup(this.selectedGroup._id);
    }
  }
  trackByUserIdString(index: number, userId: string): string {
    return userId;

  }
  trackByGroup(index: number, group: Group): string {
    return group._id;
  }


  trackByUser(index: number, user: User): string {
    return user._id; 
  }
  superAdminDeleteGroup(groupId: string, channelName:string): void {
    this.chatService.createChannel(channelName, groupId).subscribe((newChannel) => {
      alert('Channel created!');
      this.channelsForSelectedGroup.push(newChannel);
    });
    if (confirm('As Super Admin, are you sure you want to delete this group?')) {
        this.chatService.superAdminRemoveGroup(groupId).subscribe(() => {
          alert('Group deleted.');
          this.loadInitialData();
        });
    }
  }

  trackByChannel(index: number, channel: Channel): string {
    return channel._id;
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
        next: () => {
          alert('User was created successfully');
          this.newUsername = '';
          this.newUserEmail = '';
          this.loadInitialData();
        },
        error: (err) => alert(err.error?.message || 'Failed to create user.')
      });
    } else {
      alert('Username and email are required.');
    }
  }

 approveRequest(userIdToApprove: string, groupId: string): void {
   this.chatService.approveJoinRequest(userIdToApprove,groupId).subscribe({
    next: (updatedGroup) => {
      alert('Request approved!');
      //this.loadInitialData();
      if(this.selectedGroup && this.selectedGroup._id === groupId){
        //remove request from request list
        const requestIndex = this.selectedGroup.requests.findIndex(id=> id === userIdToApprove);
        if (requestIndex> -1){
          this.selectedGroup.requests.splice(requestIndex,1);
        }
        this.membersOfSelectedGroup.push(this.allUsers.find(u => u._id === userIdToApprove)!);
      }
    },
    error: (err) => {
      console.error('Failed to approve join request:', err);
      alert(err.error?.message || 'An unexpected error occurred.');
    }
   });

  }
  addMember(userId: string, groupId: string): void {
    if (userId && groupId) {
      this.chatService.addUserToGroup(userId, groupId).subscribe(() => {
        alert('Member added!');
        //this.loadInitialData();
        if (this.selectedGroup && this.selectedGroup._id === groupId){
          const user = this.allUsers.find(u => u._id === userId);
          if (user) {
            this.membersOfSelectedGroup.push(user);
          }
        }


      });
    }
  }
  getNonMembers(groupId: string): User[] {
  return this.allUsers.filter(user => !user.groups.includes(groupId));
  }

  onCreateGroup(): void {
    if (this.newGroupName.trim() && this.authService.currentUser) {
      this.chatService.createGroup(this.newGroupName, this.authService.currentUser._id).subscribe((newGroup) => {
        this.newGroupName = '';
        alert('Group created!');
        this.allSystemGroups.push(newGroup);
        this.onGroupSearchChange(); 
        this.selectedGroup = null; 
      });
    } else {
      alert('You must be logged in to create a group.');
    }
  }
  
  onCreateChannel(groupId: string, channelName: string): void {
    if (channelName && groupId) {
      this.chatService.createChannel(channelName, groupId).subscribe(newChannel => {
        alert('Channel created!');
        this.channelsForSelectedGroup.push(newChannel);
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
   goToUserSettings(): void {
    this.router.navigate(['/admin']);
  }
   goToChat(): void{
    this.router.navigate(['/chat']);
   }

  getUserById(userId: string): User | undefined {
    return this.allUsers.find(u => u._id === userId);
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
      this.chatService.removeUser(userId).subscribe(() => this.loadInitialData());
    }
  }

  // Group admin management methods

  removeChannel(channelId: string): void {
    if (confirm('Are you sure you want to delete this channel?')) {
      this.chatService.removeChannel(channelId).subscribe(() => {
        alert('Channel removed.');
        const index = this.channelsForSelectedGroup.findIndex(c => c._id === channelId);
        //if index is -1, it means that nothing is foud
        //if index is not -1, item has been found
        if (index > -1) {
          this.channelsForSelectedGroup.splice(index, 1);
        }
      });
    }
  }
  removeUserFromGroup(userId: string, groupId: string): void {
    this.chatService.removeUserFromGroup(userId, groupId).subscribe(() => {
      alert('User removed from group.');
      if (this.selectedGroup && this.selectedGroup._id === groupId) {
        const index = this.membersOfSelectedGroup.findIndex(u => u._id === userId);
        if (index > -1) this.membersOfSelectedGroup.splice(index, 1);
      }
      // No need to call loadInitialData() as the user object itself doesn't change for others
    });
  }
  
  banUser(userId: string, groupId: string): void {
    if (confirm('are you sure you want to ban this user? this will  remove them from the group')) {
      this.chatService.banUserFromGroup(userId, groupId).subscribe({
        next: () => {
          alert('User has been banned.');
          if (this.selectedGroup && this.selectedGroup._id === groupId) {
            const index = this.membersOfSelectedGroup.findIndex(u => u._id === userId);
            if (index > -1) this.membersOfSelectedGroup.splice(index, 1);
            // Add to banned list if it exists
            if (this.selectedGroup.bannedUsers) this.selectedGroup.bannedUsers.push(userId);
            else this.selectedGroup.bannedUsers = [userId];
          }
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to ban user.');
        }
      });
    }
  }
  unban(userId: string, groupId: string): void {
    if(confirm('are you sure you want to unban this user. They can join the group again')){
      this.chatService.unbanUserFromGroup(userId, groupId).subscribe({
        next: () => {
          alert('User has been unbanned.');
          if (this.selectedGroup && this.selectedGroup._id === groupId) {
            const index = this.selectedGroup.bannedUsers.findIndex(id => id === userId);
            if (index > -1) this.selectedGroup.bannedUsers.splice(index, 1);
          }
        },
        error: (err) => {
          alert(err.error?.message || 'Failed to unban user.');
        }
      });
    }
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

  denyRequest(userIdToDeny: string, groupId: string): void {
   
      this.chatService.denyJoinRequest(userIdToDeny, groupId).subscribe(() => {
        alert('Request denied.');
        if (this.selectedGroup && this.selectedGroup._id === groupId) {
            const index = this.selectedGroup.requests.findIndex(id => id === userIdToDeny);
            if (index > -1) this.selectedGroup.requests.splice(index, 1);
        }
      });
    
  }



  removeUserFromChannel(userId: string, channelId: string): void {
    if (userId && channelId) {
      this.chatService.removeUserFromChannel(userId, channelId).subscribe(() => {
        this.loadInitialData();
      });
    }
  }
}