import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirestoreService } from '../../services/firestore.service';
import { switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../models/restaurant.model';

@Component({
  selector: 'app-restaurant',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);

  private restaurantData$ = this.route.params.pipe(
    switchMap(params => this.firestoreService.getRestaurantData(params['id']))
  );
  restaurant = toSignal(this.restaurantData$);

  selectedCategory = signal<string>('');

  filteredItems = computed<MenuItem[]>(() => {
    const data = this.restaurant();
    const category = this.selectedCategory();
    if (!data?.menu?.items) return [];
    if (!category) return data.menu.items;
    return data.menu.items.filter(item => item.category === category);
  });

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
  }

  /**
   * ✅ معالجة روابط الصور (Google Drive + باقي المصادر) - مُحدَّث
   */
getImageURL(url?: string): string {
  if (!url) return '';

  if (url.includes('drive.google.com')) {
    const idMatch =
      url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
      url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
      url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];

    if (idMatch) {
      return `https://lh3.googleusercontent.com/d/${idMatch}=w512?authuser=0`;
    }

    console.warn('⚠️ لم يتم العثور على ID صالح في رابط Google Drive:', url);
    return '';
  }

  if (url.includes('dropbox.com')) {
    return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
  }

  return url;
}


}
