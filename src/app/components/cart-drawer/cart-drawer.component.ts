import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
  animations: [
    trigger('modalScale', [
      transition(':enter', [
        style({ transform: 'scale(0.9)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.9)', opacity: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class CartDrawerComponent {
  cartService = inject(CartService);
  @Input() restaurantDetails: any;

  closeCart() {
    this.cartService.closeCart();
  }

  checkout() {
    if (!this.restaurantDetails?.whatsAppNumber) {
      alert('رقم الواتساب غير متوفر لهذا الفرع!');
      return;
    }

    const phone = this.restaurantDetails.whatsAppNumber;
    const link = this.cartService.generateWhatsAppLink(phone);

    if (link) {
      window.open(link, '_blank');

      // 🆕 إعادة ضبط وضع التوصيل بعد إرسال الطلب
      this.cartService.closeCart();
      this.cartService.clearCart();

      // إرسال حدث لإعادة ضبط deliveryMode في مكون المطعم
      window.dispatchEvent(new CustomEvent('resetDeliveryMode'));

      // إشعار للمستخدم
      this.showOrderSentNotification();
    } else {
      alert('السلة فارغة!');
    }
  }

  private showOrderSentNotification() {
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #34d399); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div>
          <p style="font-weight: 700; color: #1f2937; margin: 0; font-size: 15px;">تم إرسال طلبك! 🎉</p>
          <p style="font-size: 13px; color: #6b7280; margin: 4px 0 0 0;">سيتم التواصل معك قريباً</p>
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
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toast-slide-out 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}
