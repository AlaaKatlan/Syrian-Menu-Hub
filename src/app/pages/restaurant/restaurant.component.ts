import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirestoreService } from '../../services/firestore.service';
import { switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../models/restaurant.model';
import { CartService } from '../../services/cart.service';
import { CartDrawerComponent } from '../../components/cart-drawer/cart-drawer.component';

@Component({
  selector: 'app-restaurant',
  standalone: true,
  imports: [CommonModule, RouterLink, CartDrawerComponent],
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);
  cartService = inject(CartService); // Public ليتم الوصول لها

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
      console.log(this.restaurant());
    });

  }

  // ==================== دوال العربة (Cart) ====================

  /**
   * دالة إضافة عنصر للسلة
   * @param item العنصر المراد إضافته
   * @param selectedOption الخيار المحدد (اختياري)
   */
  addToCart(item: MenuItem, selectedOption?: any) {
    const isArabic = this.currentLanguage() === 'ar';

    // تجهيز كائن المنتج للسلة
    // ملاحظة: تأكد أن هيكل البيانات هنا يطابق ما يتوقعه CartService
    const cartItem = {
      id: item.name + (selectedOption ? '-' + selectedOption.name : ''), // توليد ID فريد
      name: this.getItemName(item),
      price: selectedOption ? selectedOption.price : item.price,
      image: item.image,
      quantity: 1,
      // إذا كان هناك خيار، نمرره كتفاصيل إضافية
      selectedOption: selectedOption ? {
        name: isArabic ? selectedOption.name : (selectedOption.name_en || selectedOption.name),
        price: selectedOption.price
      } : undefined
    };

    // إضافة للسلة
    this.cartService.addToCart(cartItem);

    // فتح السلة تلقائياً عند الإضافة (اختياري)
    this.cartService.toggleCart();
  }

  // ==================== منطق العرض واللغة ====================

  // التحقق إذا المطعم يدعم الإنجليزية
  hasEnglishSupport = computed(() => {
    const data = this.restaurant();
    if (!data?.menu?.items || data.menu.items.length === 0) {
      return false;
    }

    const hasEn = data.menu.items.some(item =>
      item.name_en && item.name_en.trim() !== ''
    );
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

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
  }

  toggleLanguage() {
    const current = this.currentLanguage();
    const newLang = current === 'ar' ? 'en' : 'ar';
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

  getImageURL(url?: string): string {
    if (!url) return '';

    if (url.includes('drive.google.com')) {
      const idMatch =
        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
        url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
        url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];

      if (idMatch) {
        return `https://lh3.googleusercontent.com/d/${idMatch}=w512`;
      }
      return '';
    }

    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    return url;
  }

  // ==================== دوال مساعدة للأفرع ====================

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

    return Math.round(distance * 10) / 10;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

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
   * فتح خرائط جوجل للملاحة إلى الفرع
   */
  openNavigation(lat: number, lon: number) {
    // تم استخدام رابط عالمي يعمل على كافة الأجهزة
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(url, '_blank');
  }

}
