// src/app/admin/dashboard/dashboard.ts

import { Component, OnInit,OnDestroy } from '@angular/core'; 
import { CommonModule } from '@angular/common'; 
import { User } from '../../models/user.model';
import { ChatService } from '../../services/chat';
import { Auth } from '../../services/auth';
import { FormsModule } from '@angular/forms';
import { Location } from '@angular/common'; 
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'] 
})
export class Dashboard implements OnInit, OnDestroy { 
  newGroupName: string = '';
  newChannelName: string = '';
  newUsername: string = '';
  newUserEmail: string = '';

  // properties to hold data from services
  allUsers: User[] = [];
  allSystemGroups: any[] =[];
  myOwnedGroups: any[] = []; // 
  private groupsSubscription: Subscription | undefined; 
  private usersSubscription: Subscription | undefined; 
  constructor(public authService: Auth, public chatService: ChatService,private location: Location) {
    console.log(`Dashboard is using ChatService instance: ${this.chatService.instanceId}`); // <-- ADD THIS LINE

  }

  ngOnInit(): void {
    this.usersSubscription = this.chatService.users$.subscribe(users => {
    this.allUsers = users;
  });
    //subscribe to the groups stream
    this.groupsSubscription = this.chatService.groups$.subscribe(groups => {
      console.log('%c[DASHBOARD] Received new groups:', 'color: green; font-weight: bold;', groups);

      console.log('%c[DEBUG] New data received from groups$ subscription.', 'color: blue; font-weight: bold;');

      const currentUserId = this.authService.currentUser?.id;
      if (currentUserId) {
        //for group admins
        this.myOwnedGroups = groups.filter(g => g.admins.includes(currentUserId));
        this.allSystemGroups = groups;
      }
    });
  }
  ngOnDestroy(): void{
    this.groupsSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe(); 

  }
  goBack(): void {
    this.location.back();
  }
  
  
  updateOwnedGroups(): void {
      const currentUserId = this.authService.currentUser?.id;
      if (currentUserId) {
        this.myOwnedGroups = this.chatService.getGroups().filter(g => g.admins.includes(currentUserId));
      }
    }
  superAdminDeleteGroup(groupId: string): void {
    if (confirm('As Super Admin, are you sure you want to delete this group?')) {
        this.chatService.superAdminRemoveGroup(groupId);
    }
  }
  superAdminRemoveUserFromGroup(userId: string, groupId: string): void {
  this.chatService.superAdminRemoveUserFromGroup(userId, groupId);
  alert(`User removed from group by Super Admin.`);
}
  superAdminCreateUser(): void {
    if(this.newUsername && this.newUserEmail){
      const success = this.chatService.superAdminCreateUser(this.newUsername, this.newUserEmail);

      if(success){
        alert('User was created successfully')
        this.newUsername = '';
        this.newUserEmail = '';

      }
    }else{
      alert('Error: Username already taken');
    }
  }


 approveRequest(userIdToApprove: string, groupId: string): void {
    const adminId = this.authService.currentUser?.id;
    if (adminId) {
      this.chatService.approveJoinRequest(adminId, userIdToApprove, groupId);
      alert('Request approved!');
      this.allUsers = this.chatService.getUsers(); 
      this.updateOwnedGroups(); 

    }
  }
  denyRequest(userIdToDeny: string, groupId: string): void {
    const adminId = this.authService.currentUser?.id;
    if(adminId){
      this.chatService.denyJoinRequest(adminId, userIdToDeny, groupId);
      alert('Request denied!');
      this.updateOwnedGroups(); 

    }

  }
  addMember(userId: string, groupId: string): void {
    if (userId && groupId) {
      this.chatService.addUserToGroup(userId, groupId);
      alert('Member added!');
    }
  }
  getNonMembers(groupId: string): User[] {
  return this.allUsers.filter(user => !user.groups.includes(groupId));
  }


  onCreateGroup(): void {
    if (this.newGroupName && this.authService.currentUser) {
      this.chatService.createGroup(this.newGroupName, this.authService.currentUser.id);
      this.newGroupName = '';
      this.updateOwnedGroups(); 
      alert('Group created!');
    } else {
      alert('You must be logged in to create a group.');
    }
  }
  
  onCreateChannel(groupId: string): void {
    if (this.newChannelName && groupId) {
      this.chatService.createChannel(this.newChannelName, groupId);
      this.newChannelName = '';
      alert('Channel created!');
    } else {
      alert('Please enter a channel name.');
    }
  }



  addAdmin(userId: string, groupId: string): void {
    if (userId && groupId) {
      this.chatService.addAdminToGroup(userId, groupId);
      alert('New admin added!');
   }
  }
  getNonAdminMembers(groupId: string): User[] {
    const group = this.myOwnedGroups.find(g => g.id === groupId);
    if (!group) return [];
    
    const members = this.getUsersInGroup(groupId);
    return members.filter(member => !group.admins.includes(member.id));
  }

  getUserById(userId: string): User | undefined {
    return this.allUsers.find(u => u.id === userId);
  }

  

  // super Admin User Management
  promoteToGroupAdmin(userId: string): void {
    this.chatService.promoteToGroupAdmin(userId);
    this.allUsers = this.chatService.getUsers();
  }

  promoteToSuperAdmin(userId: string): void {
    this.chatService.promoteToSuperAdmin(userId);
    this.allUsers = this.chatService.getUsers();
  }
  demoteFromGroupAdmin(userId: string): void {
  this.chatService.demoteFromGroupAdmin(userId);
  this.allUsers = this.chatService.getUsers();
  }

demoteFromSuperAdmin(userId: string): void {
  this.chatService.demoteFromSuperAdmin(userId);
  this.allUsers = this.chatService.getUsers();
  }

  removeUser(userId: string): void {
    if (confirm('Are you sure you want to remove this user completely?')) {
      this.chatService.removeUser(userId);
      this.allUsers = this.chatService.getUsers();
    }
  }

  // Group admin management methods
  removeGroup(groupId: string): void {
    if (confirm('Are you sure you want to delete this entire group?')) {
      const currentUserId = this.authService.currentUser?.id;
      if (currentUserId) {
        this.chatService.removeGroup(groupId, currentUserId);
        this.updateOwnedGroups();
      }
    }
  }

  removeChannel(channelId: string): void {
    if (confirm('Are you sure you want to delete this channel?')) {
      this.chatService.removeChannel(channelId);
    }
  }
  
  removeUserFromGroup(userId: string, groupId: string): void {
    this.chatService.removeUserFromGroup(userId, groupId);
    alert(`User removed from group.`);
  }
  
  
  getUsersInGroup(groupId: string): User[] {
    return this.allUsers.filter(u => u.groups.includes(groupId));
  }
  
  getChannelsForGroup(groupId: string): any[] {
    return this.chatService.getChannelsForGroup(groupId);
  }
  getChannelMembers(channelId: string): User[] {
    return this.allUsers.filter(user => user.channels.includes(channelId));
  }
  getNonChannelMembers(groupId: string, channelId: string): User[] {
  return this.getUsersInGroup(groupId).filter(user => !user.channels.includes(channelId));
  }

addUserToChannel(userId: string, channelId: string): void {
  if (userId && channelId) {
    this.chatService.addUserToChannel(userId, channelId);
    }
  }

removeUserFromChannel(userId: string, channelId: string): void {
  if (userId && channelId) {
    this.chatService.removeUserFromChannel(userId, channelId);
    }
  }


  
}