// src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs'; 

  interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  groups: string[];
  channels: string[];
}

interface Group {
  id: string;
  name: string;
  admins: string[];
  requests: string[];
}

interface Channel {
  id: string;
  name: string;
  groupId: string;
}

interface Message {
  id: string;
  channelId: string;
  username: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  public instanceId: number;
  private users: User[] = [
    { id: 'u0', username: 'super', roles: ['Super Admin', 'User'], email: "email", groups: ['g1', 'g2'], channels: ['c1', 'c2', 'c3'] },
    { id: 'u1', username: 'GroupAdminUser', roles: ['Group Admin', 'User'], email: "email2" ,groups: ['g1'],channels: ['c1', 'c2']},
    { id: 'u2', username: 'NormalUser', roles: ['User'], email:"email3", groups: ['g1', 'g2'],channels: ['c2'] }
  ];

  private groups: Group[] = [
    { id: 'g1', name: 'General Discussion', admins: ['u1'], requests: [] }, 
    { id: 'g2', name: 'Group 1', admins: ['u0'], requests: [] },
    { id: 'g3', name: 'Group 2', admins: ['u0'], requests: [] },
    { id: 'g4', name: 'Group 3', admins: ['u0'], requests: [] }




  ];
  private channels: Channel[] = [
    { id: 'c1', name: 'announcements', groupId: 'g1' },
    { id: 'c2', name: 'general', groupId: 'g1' },
    { id: 'c3', name: 'planning', groupId: 'g2' }
  ];
  private bannedusers: User[] = [
    { id: 'u2', username: 'NormalUser', roles: ['User'],  email: "email4", groups: ['g1', 'g2'], channels: [] }
  ];
  private readonly usersSource = new BehaviorSubject<User[]>(this.users);
  private readonly groupsSource = new BehaviorSubject<Group[]>(this.groups);
  private readonly channelsSource = new BehaviorSubject<Channel[]>(this.channels);

  public readonly users$ = this.usersSource.asObservable();
  public readonly groups$ = this.groupsSource.asObservable();
  public readonly channels$ = this.channelsSource.asObservable();


  private messages: Message[] = [];
  constructor() {
    this.instanceId = Math.random();
    //debugging 
    console.log(`%cChatService INSTANCE CREATED: ${this.instanceId}`, 'background: yellow; color: black; font-weight: bold;'); 
    const savedUsers = localStorage.getItem('chat_users');
    if(savedUsers){
      let loadedUsers: User[] = JSON.parse(savedUsers);
      loadedUsers.forEach(users =>{
        console.warn('fixing user data');
        users.channels = []; //add missing property
      });
      this.users = loadedUsers;
    }

    this.usersSource.next(this.users);
    const savedGroups = localStorage.getItem('chat_groups');
    if (savedGroups) {
      this.groups = JSON.parse(savedGroups);
    }
    this.groupsSource.next(this.groups);
   }


  getGroups(): Group[] {
    return this.groupsSource.getValue();
  }

  getUsers(): User[] {
    return this.usersSource.getValue();
  }

  getChannelsForGroup(groupId: string): Channel[] {
    return this.channelsSource.getValue().filter(channel => channel.groupId === groupId);
  }
  superAdminRemoveGroup(groupId: string): void {
    // create filtered array
    const updatedGroups = this.getGroups().filter(g => g.id !== groupId);
    const updatedChannels = this.channels.filter(channel => channel.groupId !== groupId);
    //update all users
    const updatedUsers = this.getUsers().map(user => ({
      ...user,
      groups: user.groups.filter(gId => gId !== groupId)
    }));

    this.groups = updatedGroups;
    this.channels = updatedChannels;
    this.users = updatedUsers;
    //broadcast
    this.groupsSource.next(this.groups);
    this.channelsSource.next(this.channels);
    this.usersSource.next(this.users);

    // persit changes
    localStorage.setItem('chat_groups', JSON.stringify(this.groups));
    localStorage.setItem('chat_users', JSON.stringify(this.users));

    console.log(`Group ${groupId} removed by Super Admin.`);
  }

  superAdminRemoveUserFromGroup(userId: string, groupId: string): void {
    this.removeUserFromGroup(userId, groupId);
  }
  superAdminCreateUser(username: string, email: string): boolean {
    //check if username exists
    const usernameExists = this.getUsers().some(user => user.username.toLocaleLowerCase() === username.toLowerCase());
    if (usernameExists){
      console.error("username exists");
      return false;
    }
    const newUser: User = {
      id: `u${this.getUsers().length + 1}`, 
      username: username,
      email: email,
      roles: ['User'],
      groups: [],
      channels: []      
    };
    const updatedUsers = [...this.getUsers(), newUser];
    //update state and boradcaste
    this.users = updatedUsers;
    this.usersSource.next(this.users);
    localStorage.setItem('chat_users', JSON.stringify(this.users));

    console.log(`Super Admin created a new user: ${username}`);
    return true; 
  }
  getChannelsForUserInGroup(userId: string, groupId: string): Channel[] {
      const user = this.getUsers().find(u => u.id === userId);
      if (!user || !user.channels) return [];

      // filter  all channels to get only those that are in the specified group and the user is a member of
      return this.channelsSource.getValue().filter(channel => 
        channel.groupId === groupId && user.channels.includes(channel.id)
      );
  }
  addUserToChannel(userId: string, channelId: string): void {
    this.users = this.getUsers().map(user => {
      // find user and make sure user is not already in the channel.
      if (user.id === userId && !user.channels.includes(channelId)) {
        return { ...user, channels: [...user.channels, channelId] };
      }
      return user;
    });
    this.usersSource.next(this.users);
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User ${userId} added to channel ${channelId}`);
  }
  removeUserFromChannel(userId: string, channelId: string): void {
    this.users = this.getUsers().map(user => {
      if (user.id === userId) {
        // return new user object with the channel filtered out
        return { ...user, channels: user.channels.filter(cId => cId !== channelId) };
      }
      return user;
    });
    this.usersSource.next(this.users);
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User ${userId} removed from channel ${channelId}`);
  }



  promoteToGroupAdmin(userId: string): void {
    // .map() to create a new users array, .map() iterates through every item in the erray
    // and runs a function on it, a new array called 'updatedUsers' is being made here.
    const updatedUsers = this.getUsers().map(user => {
      // If this is the user to update, return a new user object
      if (user.id === userId && !user.roles.includes('Group Admin')) { //checks if the id of the user array equal to userID, and if the user isnt group admin
        return { ...user, roles: [...user.roles, 'Group Admin'] }; //makes a new array copies all the previous data but adds 'Group Admin' role.
      }
      return user;
    });

    this.users = updatedUsers;
    this.usersSource.next(this.users);
    console.log(`User ${userId} has been promoted to Group Admin.`);
  }

  createGroup(groupName: string, creatorId: string): void {
    const newGroup: Group = {
      id: `g${this.getGroups().length + 1}`,
      name: groupName,
      admins: [creatorId],
      requests: []
    };
    const updatedGroups = [...this.getGroups(), newGroup];
    
    this.groups = updatedGroups;
    localStorage.setItem('chat_groups', JSON.stringify(this.groups));

    this.groupsSource.next(this.groups);
    console.log('New group created:', newGroup);
  }

  requestToJoinGroup(userId: string, groupId: string): void {
    const updatedGroups = this.getGroups().map(group => {
      if (group.id === groupId && !group.requests.includes(userId)) {
        return { ...group, requests: [...group.requests, userId] };
      }
      return group;
    });


    this.groups = updatedGroups;
    this.groupsSource.next(this.groups);

    localStorage.setItem('chat_groups', JSON.stringify(this.groups));

    console.log('%c[SERVICE] Broadcasting updated groups:', 'color: red; font-weight: bold;', this.groups);

    console.log(`Request from ${userId} to join ${groupId} recorded.`);
  }

  approveJoinRequest(adminId: string, userIdToApprove: string, groupId: string): void {
    const group = this.getGroups().find(g => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) return;

    this.addUserToGroup(userIdToApprove, groupId);

    const updatedGroups = this.getGroups().map(g => {
      if (g.id === groupId) {
        return { ...g, requests: g.requests.filter(reqId => reqId !== userIdToApprove) };
      }
      return g;
    });

    this.groups = updatedGroups;
    this.groupsSource.next(this.groups);
    localStorage.setItem('chat_groups', JSON.stringify(this.groups));

    console.log(`User ${userIdToApprove} approved for group ${groupId}`);
  }

  denyJoinRequest(adminId: string, userIdToDeny: string, groupId: string): void {
    const group = this.getGroups().find(g => g.id === groupId);
    if (!group || !group.admins.includes(adminId)) return;

    const updatedGroups = this.getGroups().map(g => {
      if (g.id === groupId) {
        return { ...g, requests: g.requests.filter(reqId => reqId !== userIdToDeny) };
      }
      return g;
    });

    localStorage.setItem('chat_groups', JSON.stringify(this.groups));

    this.groups = updatedGroups;
    this.groupsSource.next(this.groups);

    console.log(`Request for ${userIdToDeny} denied for group ${groupId}`);
  }



  removeGroup(groupId: string, userId: string): void {
    const group = this.groups.find(g => g.id === groupId);
    if (group && group.admins.includes(userId)) {
      // create filtered arrays first
      const updatedGroups = this.groups.filter(g => g.id !== groupId);
      const updatedChannels = this.channels.filter(channel => channel.groupId !== groupId);

      this.groups = updatedGroups;
      this.channels = updatedChannels;
      //broadcast changes
      this.groupsSource.next(this.groups);
      this.channelsSource.next(this.channels);
      localStorage.setItem('chat_groups', JSON.stringify(this.groups));


      console.log(`Group ${groupId} removed.`);
    } else {
      console.log('You are not authorized to remove this group.');
    }
  }


  addAdminToGroup(userId: string, groupId: string): void {
    const user = this.users.find(u => u.id === userId);
    const group = this.groups.find(g => g.id === groupId);

    if (group && user && user.groups.includes(groupId) && !group.admins.includes(userId)) {
      this.groups = this.groups.map(g => {
        if (g.id === groupId) {
          return { ...g, admins: [...g.admins, userId] };
        }
        return g;
      });
      this.groupsSource.next(this.groups);
      localStorage.setItem('chat_groups', JSON.stringify(this.groups));

      console.log(`User ${userId} is now an admin of group ${groupId}.`);
    }
  }

  addUserToGroup(userId: string, groupId: string): void {
    this.users = this.users.map(user => {
      if (user.id === userId && !user.groups.includes(groupId)) {
        return { ...user, groups: [...user.groups, groupId] };
      }
      return user;
    });
    this.usersSource.next(this.users);
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    localStorage.setItem('chat_groups', JSON.stringify(this.groups));
    console.log(`User ${userId} is now a member of group ${groupId}.`);
  }

  createChannel(channelName: string, groupId: string) {
    const newChannel: Channel = {
      id: `c${this.channels.length + 1}`,
      name: channelName,
      groupId: groupId
    };
    this.channels = [...this.channels, newChannel];
    this.channelsSource.next(this.channels);
    console.log('New channel created:', newChannel);
  }

  removeChannel(channelId: string): void {
    this.channels = this.channels.filter(c => c.id !== channelId);
    this.channelsSource.next(this.channels);
    //update all users to remove all users from the deleted channel
    this.users = this.getUsers().map(user => ({
    ...user,
      channels: user.channels.filter(cId => cId !== channelId)

    }));
     this.usersSource.next(this.users);
    localStorage.setItem('chat_channels', JSON.stringify(this.channels)); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`Channel ${channelId} removed`); 
  }

  removeUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
    this.usersSource.next(this.users); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User ${userId} removed.`); 
  }

  joinGroup(userId: string, groupId: string): User | undefined {
    const userToUpdate = this.users.find(u => u.id === userId);
    if (userToUpdate && !userToUpdate.groups.includes(groupId)) {
        this.addUserToGroup(userId, groupId); 
    }
    return this.users.find(u => u.id === userId); 
  }

  leaveGroup(userId: string, groupId: string): User | undefined {
    this.removeUserFromGroup(userId, groupId); 
    return this.users.find(u => u.id === userId);
  }
  deleteUserAccount(userIdToDelete: string): void {
    //remove user from main user array
    const updatedUsers = this.getUsers().filter(user => user.id !== userIdToDelete);
    //remove the user from any group admin list or request list
    const updatedGroups = this.getGroups().map(group => {
      const newAdmins = group.admins.filter(adminId => adminId !== userIdToDelete);
      const newRequests = group.requests.filter(reqId => reqId !== userIdToDelete);
    return { ...group, admins: newAdmins, requests: newRequests };

    });
    this.users = updatedUsers;
    this.groups = updatedGroups;

    this.usersSource.next(this.users);
    this.groupsSource.next(this.groups);

    localStorage.setItem('chat_users', JSON.stringify(this.users));
    localStorage.setItem('chat_groups', JSON.stringify(this.groups));

    console.log(`User ${userIdToDelete} has been permanently deleted.`);
  }

  promoteToSuperAdmin(userId: string): void {
    this.users = this.users.map(user => {
      if (user.id === userId && !user.roles.includes('Super Admin')) {
        return { ...user, roles: [...user.roles, 'Super Admin'] };
      }
      return user;
    });
    this.usersSource.next(this.users); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User has been promoted to Super Admin.`);
  }

  getMessagesForChannel(channelId: string): Message[] {
    return this.messages.filter(m => m.channelId === channelId);
  }

  removeUserFromGroup(userId: string, groupId: string): void {
    this.users = this.users.map(user => {
      if (user.id === userId) {
        return { ...user, groups: user.groups.filter(gId => gId !== groupId) };
      }
      return user;
    });
    this.usersSource.next(this.users); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User ${userId} removed from group ${groupId}`);
  }

  demoteFromGroupAdmin(userId: string): void {
    this.users = this.users.map(user => {
      if (user.id === userId) {
        return { ...user, roles: user.roles.filter(role => role !== 'Group Admin') };
      }
      return user;
    });
    this.usersSource.next(this.users); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User has been demoted from Group Admin.`);
  }

  demoteFromSuperAdmin(userId: string): void {
    this.users = this.users.map(user => {
      if (user.id === userId) {
        return { ...user, roles: user.roles.filter(role => role !== 'Super Admin') };
      }
      return user;
    });
    this.usersSource.next(this.users); 
    localStorage.setItem('chat_users', JSON.stringify(this.users));
    console.log(`User has been demoted from Super Admin.`);
  }

  sendMessage(channelId: string, username: string, text: string) {
    if (!text) return;

    const newMessage: Message = {
      id: `m${this.messages.length + 1}`,
      channelId: channelId,
      username: username,
      text: text
    };
    this.messages = [...this.messages, newMessage];
  }
}