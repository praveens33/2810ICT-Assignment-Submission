import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../services/auth';
import { ChatService } from '../services/chat';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '../models/user.model';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent {
  selectedFile: File | null = null;
  serverBaseUrl = 'http://localhost:3000';

  constructor(
    public authService: Auth, 
    private chatService: ChatService,
    private router: Router
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  onUpload(): void {
    if (!this.selectedFile) {
      alert('Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', this.selectedFile, this.selectedFile.name);

    this.chatService.uploadProfilePicture(formData).subscribe({
      next: (updatedUser: User) => {
        this.authService.updateCurrentUser(updatedUser);
        alert('Profile picture updated successfully!');
        this.selectedFile = null; 
      },
      error: (err: any) => alert(err.error?.message || 'Failed to upload picture.')
    });
  }

  deleteMyAccount(): void {
    if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
      this.chatService.deleteOwnAccount().subscribe({
        next: () => {
          alert('Your account has been successfully deleted.');
          this.authService.logout();
          this.router.navigate(['/login']);
        },
        error: (err: any) => alert(err.error?.message || 'Failed to delete account.')
      });
    }
  }
}