import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imageUrl',
  standalone: true,
})
export class ImageUrlPipe implements PipeTransform {
  private readonly serverBaseUrl = 'http://localhost:3000';

  transform(value: string | undefined | null, defaultImg: string = 'assets/default-avatar.png'): string {
    if (!value) {
      return defaultImg;
    }
    if (value.startsWith('http') || value.startsWith('data:')) {
      return value;
    }
    return this.serverBaseUrl + value;
  }
}