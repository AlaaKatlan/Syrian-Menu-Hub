import { Injectable, signal, computed } from '@angular/core';
import { CartItem } from '../models/restaurant.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  isOpen = signal<boolean>(false);
  cartItems = signal<CartItem[]>([]);

  totalPrice = computed(() => {
    return this.cartItems().reduce((total, item) => total + (item.price * item.quantity), 0);
  });

  totalItemsCount = computed(() => {
    return this.cartItems().reduce((count, item) => count + item.quantity, 0);
  });

  toggleCart() {
    this.isOpen.update(v => !v);
  }

  openCart() {
    this.isOpen.set(true);
  }

  closeCart() {
    this.isOpen.set(false);
  }

  addToCart(product: any) {
    const currentItems = this.cartItems();
    const existingItem = currentItems.find(item => item.id === product.id);

    if (existingItem) {
      this.updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      this.cartItems.set([...currentItems, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: 1,
        selectedOption: product.selectedOption,
        notes: ''
      } as CartItem]);
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

  updateNotes(itemId: string, notes: string) {
    this.cartItems.update(items =>
      items.map(item => item.id === itemId ? { ...item, notes } : item)
    );
  }

  clearCart() {
    this.cartItems.set([]);
  }

  // ✅ دالة توليد الرسالة (تم إصلاح الرموز والأرقام)
  generateWhatsAppLink(restaurantPhone: string): string {
    const items = this.cartItems();
    if (items.length === 0) return '';

    // 1. التاريخ والوقت (بالإنكليزي en-GB ليظهر DD/MM/YYYY)
    const date = new Date().toLocaleDateString('en-GB');
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // ملاحظة: نستخدم \n بدلاً من %0A هنا لأننا سنقوم بعمل encodeURIComponent لاحقاً
    let message = `*🧾 طلب جديد من Syrian Menu Hub* \n`;
    message += `📅 التاريخ: ${date} - ${time} \n`;
    message += `ــــــــــــــــــــــــــــــــــــــــ\n`;

    // 2. تفاصيل الطلبات
    items.forEach(item => {
      // الكمية واسم الوجبة
      message += `▪️ *${item.quantity}x ${item.name}*\n`;

      // الخيار (إن وجد)
      if (item.selectedOption) {
        message += `   🔸 الحجم/النوع: ${item.selectedOption.name}\n`;
      }

      // الملاحظات (إن وجدت)
      if (item.notes) {
        message += `   📝 ملاحظة: ${item.notes}\n`;
      }

      // السعر (بالأرقام الإنكليزية)
      const lineTotal = item.price * item.quantity;
      message += `   💰 السعر: ${lineTotal.toLocaleString('en-US')} ل.س\n`;

      message += `\n`;
    });

    // 3. المجموع النهائي
    message += `ــــــــــــــــــــــــــــــــــــــــ\n`;
    message += `*💵 الإجمالي: ${this.totalPrice().toLocaleString('en-US')} ل.س* \n`;
    message += `ــــــــــــــــــــــــــــــــــــــــ\n\n`;

    // 4. تذييل الرسالة

    message += `شكراً! 🙏`;

    // ✅ الخطوة السحرية: تشفير النص بالكامل ليظهر بشكل صحيح في الرابط
    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${restaurantPhone}?text=${encodedMessage}`;
  }
}
