import { Component, computed, inject, signal, effect } from '@angular/core';
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
  currentLanguage = signal<'ar' | 'en'>('ar');
  expandedItems = signal<Set<string>>(new Set());

  constructor() {
    // للتتبع والتأكد من عمل تبديل اللغة
    effect(() => {
      console.log('🌐 اللغة الحالية:', this.currentLanguage());
    });
  }

  // التحقق إذا المطعم يدعم الإنجليزية
  hasEnglishSupport = computed(() => {
    const data = this.restaurant();
    if (!data?.menu?.items || data.menu.items.length === 0) {
      console.log('❌ لا توجد عناصر في القائمة');
      return false;
    }

    const hasEn = data.menu.items.some(item =>
      item.name_en && item.name_en.trim() !== ''
    );
    console.log('🔍 هل يدعم الإنجليزية:', hasEn);
    return hasEn;
  });

  // الفئات حسب اللغة الحالية
  displayCategories = computed(() => {
    const data = this.restaurant();
    const lang = this.currentLanguage();
    if (!data?.menu?.items) return [];

    const categories = [...new Set(
      data.menu.items
        .map(item => {
          if (lang === 'en' && item.category_en && item.category_en.trim() !== '') {
            return item.category_en;
          }
          return item.category;
        })
        .filter(c => c && c.trim() !== '')
    )];

    console.log('📂 الفئات المعروضة:', categories);
    return categories;
  });

  filteredItems = computed<MenuItem[]>(() => {
    const data = this.restaurant();
    const category = this.selectedCategory();
    if (!data?.menu?.items) return [];

    let items = data.menu.items;

    if (category) {
      items = items.filter(item => {
        return item.category === category || item.category_en === category;
      });
    }

    return items;
  });

  // إحصائيات الأفرع
  branchesCount = computed(() => {
    return this.restaurant()?.details.branches?.length || 0;
  });

  branchesWithWhatsApp = computed(() => {
    return this.restaurant()?.details.branches?.filter(b => b.whatsAppNumber).length || 0;
  });

  branchesWithLocation = computed(() => {
    return this.restaurant()?.details.branches?.filter(b => b.latitude && b.longitude).length || 0;
  });

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
  }

  toggleLanguage() {
    const current = this.currentLanguage();
    const newLang = current === 'ar' ? 'en' : 'ar';
    console.log('🔄 تبديل اللغة من', current, 'إلى', newLang);
    this.currentLanguage.set(newLang);
    this.selectedCategory.set('');
  }

  toggleItemExpansion(item: MenuItem) {
    // فقط للعناصر التي لديها خيارات
    if (!item.options || item.options.length === 0) return;

    const expanded = this.expandedItems();
    const newExpanded = new Set(expanded);

    if (newExpanded.has(item.name)) {
      newExpanded.delete(item.name);
    } else {
      newExpanded.add(item.name);
    }

    this.expandedItems.set(newExpanded);
  }

  isItemExpanded(item: MenuItem): boolean {
    return this.expandedItems().has(item.name);
  }

  getItemName(item: MenuItem): string {
    const lang = this.currentLanguage();
    if (lang === 'en' && item.name_en && item.name_en.trim() !== '') {
      return item.name_en;
    }
    return item.name || '';
  }

  getItemDescription(item: MenuItem): string {
    const lang = this.currentLanguage();
    if (lang === 'en' && item.description_en && item.description_en.trim() !== '') {
      return item.description_en;
    }
    return item.description || '';
  }

  isEnglish(): boolean {
    return this.currentLanguage() === 'en';
  }

  isArabic(): boolean {
    return this.currentLanguage() === 'ar';
  }

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
      return '';
    }

    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    return url;
  }

  // ==================== دوال مساعدة للأفرع ====================

  /**
   * حساب المسافة بين نقطتين جغرافيتين باستخدام صيغة Haversine
   * @param lat1 خط العرض الأول
   * @param lon1 خط الطول الأول
   * @param lat2 خط العرض الثاني
   * @param lon2 خط الطول الثاني
   * @returns المسافة بالكيلومتر
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10; // تقريب لرقم عشري واحد
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * الحصول على موقع المستخدم الحالي
   */
  getUserLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  /**
   * ترتيب الأفرع حسب القرب من موقع المستخدم
   */
  async sortBranchesByDistance() {
    try {
      const position = await this.getUserLocation();
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      const data = this.restaurant();
      if (!data?.details.branches) return;

      const branchesWithDistance = data.details.branches.map(branch => {
        if (branch.latitude && branch.longitude) {
          const distance = this.calculateDistance(
            userLat,
            userLon,
            branch.latitude,
            branch.longitude
          );
          return { ...branch, distance };
        }
        return { ...branch, distance: Infinity };
      });

      // ترتيب الأفرع حسب المسافة
      branchesWithDistance.sort((a, b) =>
        (a.distance || Infinity) - (b.distance || Infinity)
      );

      console.log('الأفرع مرتبة حسب القرب:', branchesWithDistance);

    } catch (error) {
      console.log('لم يتم تفعيل خدمة الموقع:', error);
    }
  }

  /**
   * فتح خرائط جوجل للملاحة إلى الفرع
   */
openNavigation(lat: number, lon: number) {
    // ✅ تم تصحيح رابط Google Maps ليعمل بشكل سليم
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
    window.open(url, '_blank');
  }

  /**
   * نسخ عنوان الفرع إلى الحافظة
   */
  async copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      console.log('تم نسخ العنوان');
      // يمكنك إضافة إشعار للمستخدم هنا (مثل Toast notification)
    } catch (error) {
      console.error('فشل في نسخ العنوان:', error);
    }
  }

  /**
   * مشاركة معلومات الفرع عبر Web Share API
   */
  async shareBranch(branchId: string, address: string) {
    const data = this.restaurant();
    if (!data) return;

    const shareData = {
      title: `${data.details.restaurantName} - فرع ${branchId}`,
      text: `العنوان: ${address}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        console.log('تمت المشاركة بنجاح');
      } else {
        // fallback: نسخ الرابط
        await navigator.clipboard.writeText(window.location.href);
        console.log('تم نسخ الرابط');
      }
    } catch (error) {
      console.error('فشل في المشاركة:', error);
    }
  }
}
