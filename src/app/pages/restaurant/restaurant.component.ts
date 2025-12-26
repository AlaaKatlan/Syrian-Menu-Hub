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
  cartService = inject(CartService);

  private restaurantData$ = this.route.params.pipe(
    switchMap(params => this.firestoreService.getRestaurantData(params['id']))
  );
  restaurant = toSignal(this.restaurantData$);

  selectedCategory = signal<string>('');
  currentLanguage = signal<'ar' | 'en'>('ar');
  expandedItems = signal<Set<string>>(new Set());
  deliveryMode = signal<boolean>(false);

  constructor() {
    effect(() => {
      console.log('🌐 اللغة الحالية:', this.currentLanguage());
      console.log(this.restaurant());
    });

    window.addEventListener('resetDeliveryMode', () => {
      this.deliveryMode.set(false);
    });
  }

  toggleDeliveryMode() {
    this.deliveryMode.update(v => !v);
    if (this.deliveryMode()) {

      this.showDeliveryModeNotification();
    }
    this.cartService.clearCart();

  }

  private showDeliveryModeNotification() {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #34d399); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
        </div>
        <div>
          <p style="font-weight: 700; color: #1f2937; margin: 0; font-size: 15px;">وضع التوصيل مفعّل! </p>
          <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">يمكنك الآن إضافة الأصناف إلى سلتك</p>
        </div>
      </div>
    `;

    toast.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      animation: toast-slide-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      border: 2px solid #10b98120;
      min-width: 300px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-slide-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  addToCart(item: MenuItem, selectedOption?: any, event?: Event) {
    const isArabic = this.currentLanguage() === 'ar';

    if (event) {
      const button = (event.target as HTMLElement).closest('button');

      if (button) {
        // 🎨 إضافة كلاسات الأنيميشن للزر
        button.classList.add('button-clicked');

        // إزالة الكلاس بعد انتهاء الأنيميشن
        setTimeout(() => {
          button.classList.remove('button-clicked');
        }, 600);

        // تأثير الاهتزاز
        if ('vibrate' in navigator) {
          navigator.vibrate([20, 10, 20]);
        }

        // 🎆 تأثير الجزيئات المتطايرة من الزر
        this.createParticleExplosion(button);

        // 🌟 تأثير النجوم المتطايرة
        this.createStarBurst(button);
      }

      // الأنيميشن الأصلي (السلة الطائرة)
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
  }

  // 🎆 دالة إنشاء جزيئات متطايرة من الزر
  private createParticleExplosion(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // إنشاء 15 جزيء
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('div');
      const angle = (i / 15) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const size = 4 + Math.random() * 6;

      // ألوان عشوائية جميلة
      const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 10px ${color};
      `;

      document.body.appendChild(particle);

      // حساب الموقع النهائي
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;

      // أنيميشن الجزيء
      particle.animate([
        {
          transform: 'translate(-50%, -50%) scale(1)',
          opacity: 1
        },
        {
          transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`,
          opacity: 0
        }
      ], {
        duration: 800 + Math.random() * 400,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });

      setTimeout(() => particle.remove(), 1200);
    }
  }

  // 🌟 دالة إنشاء نجوم متطايرة
  private createStarBurst(button: HTMLElement) {
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // إنشاء 8 نجوم
    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      star.innerHTML = '';
      const angle = (i / 8) * Math.PI * 2;
      const distance = 50;

      star.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        font-size: 16px;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
      `;

      document.body.appendChild(star);

      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;

      star.animate([
        {
          transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
          opacity: 1
        },
        {
          transform: `translate(${endX - centerX}px, ${endY - centerY}px) scale(1.5) rotate(180deg)`,
          opacity: 0
        }
      ], {
        duration: 1000,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      });

      setTimeout(() => star.remove(), 1000);
    }
  }

  animateFlyingItem(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    if (!button) return;

    const rect = button.getBoundingClientRect();

    const flyingContainer = document.createElement('div');
    flyingContainer.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top + rect.height / 2}px;
      width: 60px;
      height: 60px;
      z-index: 9999;
      pointer-events: none;
      transform: translate(-50%, -50%);
    `;

    const mainIcon = document.createElement('div');
    mainIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5">
        <circle cx="9" cy="21" r="1" fill="#f97316"/>
        <circle cx="20" cy="21" r="1" fill="#f97316"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    mainIcon.style.cssText = `
      width: 100%;
      height: 100%;
      animation: rotate-and-scale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
      filter: drop-shadow(0 6px 12px rgba(249, 115, 22, 0.5));
    `;

    flyingContainer.appendChild(mainIcon);

    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      const angle = (i / 8) * Math.PI * 2;
      const distance = 40;

      particle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: linear-gradient(135deg, #f97316, #fb923c);
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: particle-burst-${i} 0.6s ease-out forwards;
        box-shadow: 0 0 10px rgba(249, 115, 22, 0.8);
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes particle-burst-${i} {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
      flyingContainer.appendChild(particle);
    }

    document.body.appendChild(flyingContainer);

    const rotateStyle = document.createElement('style');
    rotateStyle.textContent = `
      @keyframes rotate-and-scale {
        0% {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }
        50% {
          transform: rotate(180deg) scale(1.3);
        }
        100% {
          transform: rotate(360deg) scale(0.2);
          opacity: 0.9;
        }
      }
    `;
    document.head.appendChild(rotateStyle);

    const cartBtn = document.getElementById('cart-fab');

    if (cartBtn) {
      const cartRect = cartBtn.getBoundingClientRect();

      cartBtn.style.animation = 'cart-shake 0.5s ease-in-out';

      const shakeStyle = document.createElement('style');
      shakeStyle.textContent = `
        @keyframes cart-shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-15deg) scale(1.15); }
          50% { transform: rotate(15deg) scale(1.2); }
          75% { transform: rotate(-15deg) scale(1.15); }
        }
      `;
      document.head.appendChild(shakeStyle);

      setTimeout(() => {
        const endX = cartRect.left + cartRect.width / 2;
        const endY = cartRect.top + cartRect.height / 2;

        flyingContainer.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        flyingContainer.style.left = `${endX}px`;
        flyingContainer.style.top = `${endY}px`;
        flyingContainer.style.transform = 'translate(-50%, -50%) scale(0.1) rotate(720deg)';
        flyingContainer.style.opacity = '0';

        setTimeout(() => {
          const ripple = document.createElement('div');
          ripple.style.cssText = `
            position: fixed;
            left: ${endX}px;
            top: ${endY}px;
            width: 20px;
            height: 20px;
            border: 3px solid #f97316;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 9998;
            pointer-events: none;
            animation: ripple-effect 0.6s ease-out;
          `;

          const rippleStyle = document.createElement('style');
          rippleStyle.textContent = `
            @keyframes ripple-effect {
              0% {
                width: 20px;
                height: 20px;
                opacity: 1;
              }
              100% {
                width: 100px;
                height: 100px;
                opacity: 0;
                border-width: 1px;
              }
            }
          `;
          document.head.appendChild(rippleStyle);
          document.body.appendChild(ripple);

          setTimeout(() => ripple.remove(), 600);

          // this.showToastNotification();
        }, 800);
      }, 50);
    }

    setTimeout(() => {
      flyingContainer.remove();
      cartBtn && (cartBtn.style.animation = '');
    }, 1000);
  }

  private showToastNotification() {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316, #fb923c); border-radius: 50%; display: flex; align-items: center; justify-center; animation: toast-icon-bounce 0.5s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div>
          <p style="font-weight: 700; color: #1f2937; margin: 0; font-size: 15px;">تمت الإضافة بنجاح!</p>
          <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">تم إضافة المنتج إلى سلتك</p>
        </div>
      </div>
    `;

    toast.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 10000;
      animation: toast-slide-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      border: 2px solid #f9731620;
      min-width: 300px;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes toast-slide-in {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes toast-slide-out {
        from {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
        to {
          transform: translateX(400px) scale(0.8);
          opacity: 0;
        }
      }
      @keyframes toast-icon-bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-slide-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  hasEnglishSupport = computed(() => {
    const data = this.restaurant();
    if (!data?.menu?.items || data.menu.items.length === 0) {
      return false;
    }
    return data.menu.items.some(item => item.name_en && item.name_en.trim() !== '');
  });

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

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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

  openNavigation(lat: number, lon: number) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    window.open(url, '_blank');
  }
}
