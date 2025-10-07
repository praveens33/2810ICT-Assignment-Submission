import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { Message } from './chat'; 

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private serverUrl = 'http://localhost:3000'; 
  constructor() {
    this.socket = io(this.serverUrl);
  }

  // --- Emitters ---

  joinChannel(channelId: string, username: string) {
    //this.socket.emit('joinChannel', {channelId: channelId, username: username})
    this.socket.emit('joinChannel', { channelId, username });
  }

  sendMessage(channelId: string, username: string, text: string, imageUrl?: string) {
    this.socket.emit('sendMessage', { channelId, username, text, imageUrl });
  }

  // --- Listeners ---

  onNewMessage(): Observable<Message> {
    return new Observable(observer => {
      this.socket.on('newMessage', (message: Message) => {
        observer.next(message);
      });
    });
  }

  onUserNotification(): Observable<{ text: string }> {
    return new Observable(observer => {
      //whenever event called userNotification occurs executre this callback function
      this.socket.on('userNotification', (notification: { text: string }) => {
        observer.next(notification);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}