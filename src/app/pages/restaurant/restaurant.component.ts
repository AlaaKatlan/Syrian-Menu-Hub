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
    console.log('Filtered Items:', category, data);
    if (!data?.menu?.items) return [];
    if (!category) return data.menu.items;
    return data.menu.items.filter(item => item.category === category);
  });

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
  }

getImageURL(url: string | undefined) {
  if (!url) return '';

  // 🔹 إذا الرابط من Google Drive (شكل: https://drive.google.com/file/d/ID/view?usp=sharing)
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=w500`; // حجم الصورة 500px
  }

  // 🔹 إذا الرابط من forms مثل uc?id=ID
  const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (ucMatch && ucMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${ucMatch[1]}=w500`;
  }

  // 🔹 روابط عادية (Firebase Storage, ImgBB, رابط مباشر..)
  return url;
}

}
