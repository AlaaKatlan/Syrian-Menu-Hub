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
        notes: '' // ✅ تهيئة الملاحظات كنص فارغ
      } as CartItem]);
    }
    // ❌ حذفنا this.toggleCart() عشان ما تفتح السلة تلقائياً
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

  // ✅ دالة جديدة لتحديث ملاحظات عنصر محدد
  updateNotes(itemId: string, notes: string) {
    this.cartItems.update(items =>
      items.map(item => item.id === itemId ? { ...item, notes } : item)
    );
  }

  clearCart() {
    this.cartItems.set([]);
  }

  generateWhatsAppLink(restaurantPhone: string): string {
    const items = this.cartItems();
    if (items.length === 0) return '';

    let message = `*مرحباً، أود طلب ما يلي:*%0A%0A`;

    items.forEach(item => {
      const optionText = item.selectedOption ? ` [${item.selectedOption.name}]` : '';
      // ✅ إضافة الملاحظة للرسالة إن وجدت
      const notesText = item.notes ? `%0A   └ 📝 ملاحظة: ${item.notes}` : '';

      message += `- ${item.quantity}x ${item.name}${optionText} (${item.price * item.quantity} ل.س)${notesText}%0A`;
    });

    message += `%0A*------------------*`;
    message += `%0A*المجموع الكلي: ${this.totalPrice()} ل.س*`;
    message += `%0A*------------------*`;
    message += `%0Aشكراً!`;

    return `https://wa.me/${restaurantPhone}?text=${message}`;
  }
}
