// home.component.ts (مصحح نهائياً)
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirestoreService } from '../../services/firestore.service';
import { toSignal } from '@angular/core/rxjs-interop';
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
  restaurants = toSignal(this.firestoreService.getAllRestaurants(), { initialValue: [] });
  searchTerm = signal('');
  isLoading = signal(true);
  hasError = signal(false);
  errorMessage = signal('');

  ngOnInit() {
    console.log('🚀 Home Component initialized');

    // مراقبة تغييرات البيانات باستخدام setTimeout
    this.setupDataMonitoring();
  }

  // إعداد مراقبة البيانات بدون استخدام effect
  private setupDataMonitoring() {
    let checkCount = 0;
    const maxChecks = 10; // أقصى عدد محاولات

    const checkData = () => {
      const currentRestaurants = this.restaurants();
      console.log('📈 مراقبة البيانات - المحاولة:', checkCount + 1, {
        length: currentRestaurants.length,
        data: currentRestaurants
      });

      if (currentRestaurants.length > 0) {
        console.log('✅ تم تحميل المطاعم بنجاح:', currentRestaurants.length);
        this.updateDataStatus(false, false, '');
      } else if (checkCount < maxChecks) {
        checkCount++;
        setTimeout(checkData, 1000); // حاول مرة أخرى بعد ثانية
      } else {
        console.log('⚠️ انتهت المحاولات - لا توجد بيانات');
        this.updateDataStatus(false, true, 'لا توجد بيانات للمطاعم حالياً');
      }
    };

    // بدء المراقبة بعد تأخير بسيط
    setTimeout(checkData, 1000);
  }

  // دالة آمنة لتحديث حالة البيانات
  private updateDataStatus(loading: boolean, error: boolean, message: string) {
    setTimeout(() => {
      this.isLoading.set(loading);
      this.hasError.set(error);
      this.errorMessage.set(message);
    }, 0);
  }

  // تصفية المطاعم مع البحث - بدون تعديل signals
  filteredRestaurants = computed(() => {
    const allRestaurants = this.restaurants();
    const term = this.searchTerm().toLowerCase().trim();

    console.log('🔍 computed: تصفية المطاعم:', {
      total: allRestaurants.length,
      searchTerm: term
    });

    // إذا كان هناك بيانات حقيقية
    if (allRestaurants && allRestaurants.length > 0) {
      // تحديث حالة التحميل بعد نجاح التحميل
      if (this.isLoading()) {
        setTimeout(() => {
          this.isLoading.set(false);
          this.hasError.set(false);
        }, 0);
      }

      if (!term) {
        console.log('📋 computed: عرض جميع المطاعم:', allRestaurants.length);
        return allRestaurants;
      }

      const filtered = allRestaurants.filter(r => {
        const nameMatch = r.name?.toLowerCase().includes(term);
        const addressMatch = r.address?.toLowerCase().includes(term);
        const categoryMatch = r.category?.toLowerCase().includes(term);

        return nameMatch || addressMatch || categoryMatch;
      });

      console.log('🎯 computed: نتائج البحث:', filtered.length);
      return filtered;
    }

    // إذا لم تكن هناك بيانات
    console.log('❌ computed: لا توجد بيانات للمطاعم');
    return [];
  });

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    console.log('⌨️ بحث:', value);
    this.searchTerm.set(value);
  }

  clearSearch() {
    console.log('🧹 مسح البحث');
    this.searchTerm.set('');
  }

  retryLoadData() {
    console.log('🔄 إعادة تحميل البيانات');
    this.isLoading.set(true);
    this.hasError.set(false);

    // إعادة تحميل الصفحة
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  getImageURL(url: string | undefined): string {
    if (!url) {
      return '';
    }

    url = url.trim();
    if (!url) return '';

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
