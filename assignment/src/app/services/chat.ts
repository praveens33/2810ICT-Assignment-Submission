import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { User } from '../models/user.model';

export interface Group {
  _id: string;
  name: string;
  admins: string[];
  members: string[];
  requests: string[];
  bannedUsers: string[];
  channels: string[];
}

export interface Channel {
  _id: string;
  name: string;
  groupId: string;
}

export interface Message {
  _id: string;
  text: string;
  username: string;
  channelId: string;
  imageUrl?: string;
  createdAt: string;
  author?: {
    profilePicture?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private serverUrl = 'http://localhost:3000/api';
  private socket!: Socket;

  constructor(private http: HttpClient) {}

  connectSocket(token: string): void {
    this.socket = io(this.serverUrl.replace('/api', ''), { auth: { token } });
  }


  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.serverUrl}/groups`);
  }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.serverUrl}/users`);
  }
  
  getAllChannels(): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.serverUrl}/channels`);
  }

  getChannelsForGroup(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.serverUrl}/channels/for-group/${groupId}`);
  }

  
leaveGroup(groupId: string): Observable<any> {
  return this.http.post(`${this.serverUrl}/groups/${groupId}/leave`, {});
}
  
  deleteOwnAccount(): Observable<any> {
    return this.http.delete(`${this.serverUrl}/users`);
  }
  
  requestToJoinGroup(groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/requests`, {});
  }

  uploadProfilePicture(formData: FormData): Observable<User> {
    return this.http.post<User>(`${this.serverUrl}/users/profile-picture`, formData);
  }

  uploadMessageImage(formData: FormData): Observable<{ imageUrl: string }> {
    return this.http.post<{ imageUrl: string }>(`${this.serverUrl}/messages/upload-image`, formData);
  }

  approveJoinRequest(userIdToApprove: string, groupId: string): Observable<Group> {
    return this.http.post<Group>(`${this.serverUrl}/groups/${groupId}/approve`, { userIdToApprove });
  }

  addUserToGroup(userId: string, groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/members`, { userIdToAdd: userId });
  }

  denyJoinRequest(userIdToDeny: string, groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/deny`, { userIdToDeny });
  }
  
  removeUserFromGroup(userId: string, groupId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/groups/${groupId}/members/${userId}`);
  }

  banUserFromGroup(userIdToBan: string, groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/ban`, { userIdToBan });
  }
  unbanUserFromGroup(userIdToUnban: string, groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/unban`, { userIdToUnban });
  }

  createGroup(groupName: string, creatorId: string): Observable<Group> {
    return this.http.post<Group>(`${this.serverUrl}/groups`, { name: groupName });
  }

  addAdminToGroup(userId: string, groupId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/groups/${groupId}/admins`, { userId });
  }

  createChannel(channelName: string, groupId: string): Observable<Channel> {
    return this.http.post<Channel>(`${this.serverUrl}/channels/${groupId}`, { name: channelName });
  }

  removeChannel(channelId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/channels/${channelId}`);
  }

  addUserToChannel(userId: string, channelId: string): Observable<any> {
    return this.http.post(`${this.serverUrl}/channels/${channelId}/members`, { userIdToAdd: userId });
  }

  removeUserFromChannel(userId: string, channelId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/channels/${channelId}/members/${userId}`);
  }

  
  promoteToGroupAdmin(userId: string): Observable<User> {
    return this.http.put<User>(`${this.serverUrl}/users/${userId}/roles`, { roles: ['User', 'Group Admin'] });
  }

  promoteToSuperAdmin(userId: string): Observable<User> {
    return this.http.put<User>(`${this.serverUrl}/users/${userId}/roles`, { roles: ['User', 'Super Admin'] });
  }

  demoteFromGroupAdmin(userId: string): Observable<User> {
    return this.http.put<User>(`${this.serverUrl}/users/${userId}/roles`, { roles: ['User'] });
  }

  demoteFromSuperAdmin(userId: string): Observable<User> {
    return this.http.put<User>(`${this.serverUrl}/users/${userId}/roles`, { roles: ['User'] });
  }

  removeUser(userId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/users/${userId}`);
  }

  superAdminCreateUser(username: string, email: string): Observable<User> {
    return this.http.post<User>(`${this.serverUrl}/users`, { username, email });
  }

  superAdminRemoveGroup(groupId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/groups/${groupId}`);
  }
  
  groupAdminDeleteGroup(groupId: string): Observable<any> {
    return this.http.delete(`${this.serverUrl}/groups/${groupId}`);
  }
  superAdminRemoveUserFromGroup(userId: string, groupId: string): Observable<any> {
    return this.removeUserFromGroup(userId, groupId);
  }

  
  getMessagesForChannel(channelId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.serverUrl}/channels/${channelId}/history`);
  }

  sendMessage(channelId: string, username: string, text: string, imageUrl?: string): void {
    if (this.socket) {
      this.socket.emit('sendMessage', { channelId, username, text, imageUrl });
    } else {
      console.error('Socket not connected');
    }
  }
  


 

  onUserLeftVideo(): Observable<{ peerId: string }> {
    return new Observable(observer => {
      this.socket?.on('user-left-video', (data) => observer.next(data));
    });
  }

  announceJoinCall(channelId: string, peerId: string): void {
    this.socket?.emit('video-join-call', { channelId, peerId });
  }

  announceLeaveCall(channelId: string, peerId: string): void {
    this.socket?.emit('video-leave-call', { channelId, peerId });
  }

  onUserJoinedCall(): Observable<{ peerId: string }> {
    return new Observable(observer => {
      this.socket?.on('user-joined-call', (data) => observer.next(data));
    });
  }

  onUserLeftCall(): Observable<{ peerId: string }> {
    return new Observable(observer => {
      this.socket?.on('user-left-call', (data) => observer.next(data));
    });
  }
}
