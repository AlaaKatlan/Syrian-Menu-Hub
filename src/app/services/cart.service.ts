import { Injectable, signal, computed } from '@angular/core';
import { CartItem } from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // ==================== حالة السلة ====================
  // signal للتحكم بظهور السلة (مفتوحة/مغلقة)
  isOpen = signal<boolean>(false);

  // signal لقائمة العناصر
  cartItems = signal<CartItem[]>([]);

  // ==================== الحسابات ====================

  // حساب السعر الكلي
  totalPrice = computed(() => {
    return this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  });

  // حساب عدد العناصر الكلي
  totalItemsCount = computed(() => {
    return this.cartItems().reduce((count, item) => count + item.quantity, 0);
  });

  // ==================== التحكم بالواجهة ====================

  // تبديل حالة السلة (فتح/إغلاق)
  toggleCart() {
    this.isOpen.update(v => !v);
  }

  // فتح السلة
  openCart() {
    this.isOpen.set(true);
  }

  // إغلاق السلة
  closeCart() {
    this.isOpen.set(false);
  }

  // ==================== إدارة المنتجات ====================

  addToCart(product: any) {
    const currentItems = this.cartItems();
    // المنتج يعتبر فريداً بناءً على الـ ID الذي قمنا بتوليده في الكومبوننت (يتضمن اسم الخيار)
    const existingItem = currentItems.find(item => item.id === product.id);

    if (existingItem) {
      // إذا المنتج موجود، نزيد الكمية
      this.updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // إضافة منتج جديد
      this.cartItems.set([...currentItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        // نقوم بتخزين تفاصيل الخيار إذا وجدت لاستخدامها في رسالة الواتساب
        selectedOption: product.selectedOption
      } as CartItem]); // تأكد من تحديث مودل CartItem ليقبل selectedOption اختياري
    }
  }

  removeFromCart(itemId: string) {
    this.cartItems.set(this.cartItems().filter(item => item.id !== itemId));
  }

  updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeFromCart(itemId);
      return;
    }

    this.cartItems.update(items =>
      items.map(item => item.id === itemId ? { ...item, quantity } : item)
    );
  }

  clearCart() {
    this.cartItems.set([]);
  }

  // ==================== واتساب ====================

  generateWhatsAppLink(restaurantPhone: string): string {
    const items = this.cartItems();
    if (items.length === 0) return '';

    let message = `*مرحباً، أود طلب ما يلي:*%0A%0A`;

    items.forEach(item => {
      // إضافة اسم الخيار للرسالة إذا وجد (مثال: شاورما [كبير])
      const optionText = item.selectedOption ? ` [${item.selectedOption.name}]` : '';

      message += `- ${item.quantity}x ${item.name}${optionText} (${item.price * item.quantity} ل.س)%0A`;
    });

    message += `%0A*------------------*`;
    message += `%0A*المجموع الكلي: ${this.totalPrice()} ل.س*`;
    message += `%0A*------------------*`;
    message += `%0Aشكراً!`;

    // استخدام encodeURIComponent لضمان عدم تكسر الرابط بسبب الرموز الخاصة
    return `https://wa.me/${restaurantPhone}?text=${message}`;
  }
}
