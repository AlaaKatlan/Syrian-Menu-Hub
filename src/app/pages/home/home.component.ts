import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../services/firestore.service';
import { RestaurantDetails } from '../../models/restaurant.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private firestoreService = inject(FirestoreService);

  // إشارات للإدارة الحالة
  restaurants = signal<RestaurantDetails[]>([]);
  searchTerm = signal('');
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');

  // تصفية المطاعم مع البحث
  filteredRestaurants = computed(() => {
    const allRestaurants = this.restaurants();
    const term = this.searchTerm().toLowerCase().trim();

    if (!term) {
      return allRestaurants;
    }

    return allRestaurants.filter(restaurant => {
      const nameMatch = restaurant.restaurantName?.toLowerCase().includes(term);
      const addressMatch = restaurant.address?.toLowerCase().includes(term);
      const categoryMatch = restaurant.category?.toLowerCase().includes(term);

      return nameMatch || addressMatch || categoryMatch;
    });
  });

  ngOnInit() {
    console.log('🚀 Home Component initialized');
    this.loadRestaurants();
  }

  private loadRestaurants() {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.firestoreService.getAllRestaurants().subscribe({
      next: (restaurants) => {
        console.log('✅ تم تحميل المطاعم بنجاح:', restaurants.length);
        this.restaurants.set(restaurants);
        this.isLoading.set(false);

        // إذا لم توجد مطاعم، لا نعتبر هذا خطأ
        if (restaurants.length === 0) {
          this.errorMessage.set('لا توجد مطاعم متاحة حالياً');
        }
      },
      error: (error) => {
        console.error('❌ خطأ في تحميل المطاعم:', error);
        this.hasError.set(true);
        this.errorMessage.set('فشل في تحميل البيانات: ' + error.message);
        this.isLoading.set(false);
      }
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  clearSearch() {
    this.searchTerm.set('');
  }

  retryLoadData() {
    this.loadRestaurants();
  }

  getImageURL(url: string | undefined): string {
    if (!url) {
      return '/assets/default-restaurant.jpg';
    }

    url = url.trim();
    if (!url) return '/assets/default-restaurant.jpg';

    // معالجة روابط Google Drive
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=w500`;
    }

    // معالجة روابط UC
    const ucMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${ucMatch[1]}=w500`;
    }

    // صور Base64
    if (url.startsWith('data:image')) {
      return url;
    }

    // روابط مباشرة
    return url;
  }

  // دالة مساعدة لعرض الميزات
  getFeaturesText(restaurant: RestaurantDetails): string {
    const features = [];
    if (restaurant.features?.delivery) features.push('توصيل');
    if (restaurant.features?.takeaway) features.push('استلام');
    if (restaurant.features?.reservation) features.push('حجز');
    return features.join(' • ') || 'خدمات متوفرة';
  }
}
