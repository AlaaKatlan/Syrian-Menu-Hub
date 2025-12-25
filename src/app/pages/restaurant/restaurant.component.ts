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
 addToCart(item: MenuItem, selectedOption?: any, event?: Event) {
    const isArabic = this.currentLanguage() === 'ar';

    // تنفيذ أنيميشن الطيران
    if (event) {
      this.animateFlyingItem(event);
    }

    const cartItem = {
      id: item.name + (selectedOption ? '-' + selectedOption.name : ''),
      name: this.getItemName(item),
      price: selectedOption ? selectedOption.price : item.price,
      image: item.image,
      quantity: 1,
      selectedOption: selectedOption ? {
        name: isArabic ? selectedOption.name : (selectedOption.name_en || selectedOption.name),
        price: selectedOption.price
      } : undefined
    };

    this.cartService.addToCart(cartItem);
    // ⚠️ لاحظ: لم نعد نستدعي toggleCart() هنا
  }

  // ✅ دالة أنيميشن الطيران للسلة
  animateFlyingItem(event: Event) {
    const target = event.target as HTMLElement;
    // البحث عن أقرب زر تم الضغط عليه
    const button = target.closest('button');
    if (!button) return;

    // الحصول على إحداثيات الزر الذي تم ضغطه
    const rect = button.getBoundingClientRect();

    // إنشاء دائرة صغيرة تطير (أو صورة)
    const flyingObj = document.createElement('div');
    flyingObj.style.position = 'fixed';
    flyingObj.style.left = `${rect.left + rect.width / 2}px`;
    flyingObj.style.top = `${rect.top + rect.height / 2}px`;
    flyingObj.style.width = '20px';
    flyingObj.style.height = '20px';
    flyingObj.style.borderRadius = '50%';
    flyingObj.style.backgroundColor = '#0d9488'; // لون التيل (Teal)
    flyingObj.style.zIndex = '9999';
    flyingObj.style.pointerEvents = 'none';
    flyingObj.style.transition = 'all 0.8s cubic-bezier(0.19, 1, 0.22, 1)';
    flyingObj.style.boxShadow = '0 0 10px rgba(13, 148, 136, 0.5)';

    document.body.appendChild(flyingObj);

    // البحث عن أيقونة السلة (زر السلة العائم)
    // ملاحظة: تأكد أن زر السلة في cart-drawer يملك id="cart-fab"
    const cartBtn = document.getElementById('cart-fab');

    if (cartBtn) {
      const cartRect = cartBtn.getBoundingClientRect();

      // تأخير بسيط لتفعيل الترانزيشن
      requestAnimationFrame(() => {
        flyingObj.style.left = `${cartRect.left + cartRect.width / 2}px`;
        flyingObj.style.top = `${cartRect.top + cartRect.height / 2}px`;
        flyingObj.style.transform = 'scale(0.2)';
        flyingObj.style.opacity = '0.5';
      });
    } else {
       // في حال لم يجد الزر، يطير للأسفل اليمين
       requestAnimationFrame(() => {
        flyingObj.style.top = `${window.innerHeight - 50}px`;
        flyingObj.style.left = `${window.innerWidth - 50}px`;
        flyingObj.style.opacity = '0';
      });
    }

    // حذف العنصر بعد انتهاء الحركة
    setTimeout(() => {
      flyingObj.remove();
    }, 800);
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
