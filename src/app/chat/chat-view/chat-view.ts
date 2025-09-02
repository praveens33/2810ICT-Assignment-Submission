import { Component, OnInit,NgZone  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { ChatService } from '../../services/chat';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router'; 
import { User } from '../../models/user.model'

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule], 
  templateUrl: './chat-view.html',
  styleUrls: ['./chat-view.css']
})
export class ChatView implements OnInit {
  myGroups: any[] = [];
  channels: any[] = [];
  allGroups: any[] = [];
  messages: any[] = [];
  usersInChannel: any[] = [];
  selectedGroup: any = null;
  selectedChannel: any = null;


  newMessageText: string = '';

  constructor(public authService: Auth, private chatService: ChatService, private zone: NgZone, private router: Router) {
    console.log(`ChatView is using ChatService instance: ${this.chatService.instanceId}`); 

    
  }

  ngOnInit(): void {
    const currentUser = this.authService.currentUser;
    const totalGroups = this.chatService.getGroups();

    if (currentUser) {
      this.myGroups = this.chatService.getGroups().filter(g => currentUser.groups.includes(g.id));
      this.allGroups = this.chatService.getGroups().filter(g => !currentUser.groups.includes(g.id));

      // Select the first group by default
      if (this.myGroups.length > 0) {
        this.selectGroup(this.myGroups[0]);
      }
    }
    



  }
  public requestTojoinGroup(groupId: string): void {
    console.log('1. [Component] joinGroup method called with groupId:', groupId); 

    const currentUser = this.authService.currentUser;
    if (currentUser) {
        this.zone.run(() => {

        this.chatService.requestToJoinGroup(currentUser.id, groupId);

        alert("Request sent")
      
        });
     }
  }
  
  leaveGroup(groupId: string): void {
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      // The service now returns the updated user
      const updatedUser = this.chatService.leaveGroup(currentUser.id, groupId);
      
      // pass updated user to the AuthService to sync it
      if(updatedUser) {
        this.authService.updateCurrentUser(updatedUser);
      }

      // refreash list
      this.updateMyGroups();
      this.updateAllGroups();
      alert('left group');
    }

  }
  deleteMyAccount(): void {
    const currentUser = this.authService.currentUser;
    if(!currentUser) return;

    if(confirm('Are you sure you want to delete your account?')){
      //call service to delete
      this.chatService.deleteUserAccount(currentUser.id);
      //user logged out
      this.authService.logout();
      //redirect to login
      this.router.navigate(['/login']);
      alert('Your account has been deleted');
    }
  }

  updateMyGroups(): void {
    const currentUser = this.authService.currentUser;
    console.log("4. [Component] updateMyGroups is running. User's groups:", currentUser?.groups); // <-- ADD THIS

    if (currentUser){
      this.myGroups = this.chatService.getGroups().filter(g => currentUser.groups.includes(g.id));
      
    }

  }
  updateAllGroups(): void {
    const currentUser = this.authService.currentUser;
    if (currentUser){
      this.allGroups = this.chatService.getGroups().filter(g=> !currentUser.groups.includes(g.id));
    }


  }

  getUsersInChannel(channelId: string): User[] {
  return this.chatService.getUsers().filter(user => user.channels.includes(channelId));
  } 
  selectGroup(group: any): void {
    this.selectedGroup = group;
    // when a group is selected, load its channels
    
    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    this.channels = this.chatService.getChannelsForUserInGroup(currentUser.id, group.id);
    // select the first channel by default
    if (this.channels.length > 0) {
      this.selectChannel(this.channels[0]);
    } else {
      this.selectedChannel = null;
      this.messages = [];
    }
  }

  selectChannel(channel: any): void {
    this.selectedChannel = channel;
    // load msg when chanel is selected
    this.messages = this.chatService.getMessagesForChannel(channel.id);
    this.usersInChannel = this.chatService.getUsers(); 
  }

  sendMessage(): void {
    if (this.selectedChannel && this.authService.currentUser) {
      this.chatService.sendMessage(
        this.selectedChannel.id,
        this.authService.currentUser.username,
        this.newMessageText
      );
      this.newMessageText = '';
      this.messages = this.chatService.getMessagesForChannel(this.selectedChannel.id);
    }
  }
}