export interface User {
  _id: string;
  username: string;
  email: string;
  roles: string[];
  groups: string[];
  channels: string[];
  profilePicture?: string;
    version?: number;
}