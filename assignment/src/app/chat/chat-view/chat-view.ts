import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ChatService, Group, Channel, Message } from '../../services/chat';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { SocketService } from '../../services/socket';
import { ImageUrlPipe } from './image-url.pipe';
import { trigger, transition, style, animate } from '@angular/animations';
import { PickerModule } from "@ctrl/ngx-emoji-mart";
@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chat-view.html',
  styleUrls: ['./chat-view.css'],
  animations: [
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
    ])
  ]
})
export class ChatView implements OnInit, OnDestroy {
  myGroups: Group[] = [];
  allGroups: Group[] = [];
  channels: Channel[] = [];
  messages: Message[] = [];
  
  selectedGroup: Group | null = null;
  selectedChannel: Channel | null = null;
  newMessageText: string = '';
  showEmojiPicker = false;
  serverBaseUrl = 'http://localhost:3000';

  constructor(
    public authService: Auth,
    private chatService: ChatService,
    private router: Router,
    private socketService: SocketService 
  ) {}

  ngOnInit(): void {
    this.loadInitialData();

    // connect the main chat service socket for real-time feature
    const token = localStorage.getItem('token'); 
    if (token) {
      this.chatService.connectSocket(token);
    }

    // Lsisten to new message emitter (subscribe)
    this.socketService.onNewMessage().subscribe((message: Message) => {
      // add the message if the selected chnnel and its id is equal to the message ch id
      if (this.selectedChannel && this.selectedChannel._id === message.channelId) {
        this.messages.push(message);
      }
    });
    //subscribe to usernotifcation

    this.socketService.onUserNotification().subscribe((notification) => {
      if (this.selectedChannel) {
        const notificationMessage: Message = {
          _id: `notif-${Date.now()}`,
          text: notification.text,
          username: 'System', 
          channelId: this.selectedChannel._id,
          createdAt: new Date().toISOString(),
          author: {} 
        };
        this.messages.push(notificationMessage);
      }
    });
  }

  loadInitialData(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) return;

    this.chatService.getGroups().subscribe({
      next: (totalGroups: Group[]) => {
        this.myGroups = totalGroups.filter(g => currentUser.groups.includes(g._id));
        this.allGroups = totalGroups.filter(g => 
            !currentUser.groups.includes(g._id) && 
            !g.requests.includes(currentUser._id)
        );

        if (this.myGroups.length > 0) {
          this.selectGroup(this.myGroups[0]);
        }
      },
      error: (err: any) => console.error('Failed to load groups', err)
    });
  }

  selectGroup(group: Group): void {
    this.selectedGroup = group;
    this.selectedChannel = null;
    this.messages = [];
    this.channels = []; 
    
    //  the service method gets ALL channels, so they are filtered
    //back end roue on channels.js filters
    this.chatService.getChannelsForGroup(group._id).subscribe({
      next: (groupChannels: Channel[]) => {
        this.channels = groupChannels;
        if (this.channels.length > 0) {
          this.selectChannel(this.channels[0]);
        }
      },
      error: (err: any) => console.error('Failed to load channels for group', err)
    });
  }

  selectChannel(channel: Channel): void {
    this.selectedChannel = channel;

    //when the user selects a channel, a joinChnnel event is emitted
    //to the server
    const currentUser = this.authService.currentUser;
    if (currentUser) {
      // channel._id, and the current users username is sent to socket.ts
      this.socketService.joinChannel(channel._id, currentUser.username);
    }

    this.chatService.getMessagesForChannel(channel._id).subscribe({
      next: (history: Message[]) => this.messages = history,
      error: (err: any) => console.error('Failed to load message history', err)
    });
  }

  requestToJoinGroup(groupId: string): void {
    this.chatService.requestToJoinGroup(groupId).subscribe({
      next: (updatedGroup) => {
        alert('Request sent successfully!');
        const index = this.allGroups.findIndex(g => g._id === groupId);
        if (index > -1) {
          this.allGroups.splice(index, 1);
        }
      },
      error: (err: any) => alert(err.error?.message || 'Failed to send request.')
    });
  }

  leaveGroup(groupId: string): void {
    if (confirm('Are you sure you want to leave this group?')) {
      this.chatService.leaveGroup(groupId).subscribe({
        next: (updatedGroup) => {
          alert('You have left the group.');
          const index = this.myGroups.findIndex(g => g._id === groupId);
          if (index > -1) {
            const group = this.myGroups[index];
            this.myGroups.splice(index, 1);
            this.allGroups.push(group); // Add it back to the discover list
          }

          if (this.selectedGroup?._id === groupId) {
            this.selectedGroup = null;
            this.selectedChannel = null;
            this.channels = [];
            this.messages = [];
          }
        },
        error: (err: any) => alert(err.error?.message || 'Failed to leave group.')
      });
    }
  }

  sendMessage(): void {
    if (!this.selectedChannel || !this.newMessageText.trim()) {
      return;
    }
    
    this.socketService.sendMessage(
      this.selectedChannel._id,
      this.authService.currentUser!.username,
      this.newMessageText,
    );

    this.newMessageText = '';
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('image', file);

    this.chatService.uploadMessageImage(formData).subscribe({
      next: (response) => {
        // Once image is uploaded and we have the URL, send the message via socket
        this.socketService.sendMessage(
          this.selectedChannel!._id,
          this.authService.currentUser!.username,
          this.newMessageText, // Send any accompanying text
          response.imageUrl
        );
        this.newMessageText = ''; // Clear text input
      },
      error: (err) => alert(err.error?.message || 'Failed to upload image.')
    });
  }

  ngOnDestroy(): void {
    // Disconnect the socket when the component is destroyed to prevent memory leaks
    this.socketService.disconnect();
  }

  goToUserSettings(): void {
    this.router.navigate(['/settings']);
  }

  goToVideoCall(): void {
    this.router.navigate(['/video-call']);
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  onEmojiSelected(event: any): void {
    // The emoji-picker-element library dispatches a custom event with the emoji in `event.detail.unicode`
    this.newMessageText += event.detail.unicode;
  }

  trackByGroup(index: number, group: Group): string {
    return group._id;
  }

  trackByChannel(index: number, channel: Channel): string {
    return channel._id;
  }

  trackByMessage(index: number, message: Message): string {
    return message._id;
  }
}