import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
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

  // تم إزالة isOpen المحلي، سنستخدم cartService.isOpen() في الـ HTML

  closeCart() {
    this.cartService.closeCart();
  }

  checkout() {
    if (!this.restaurantDetails?.whatsAppNumber) {
      alert('رقم الواتساب غير متوفر لهذا الفرع!');
      return;
    }

    const phone = this.restaurantDetails.whatsAppNumber;
    // توليد الرابط باستخدام الدالة الموجودة في السيرفس
    const link = this.cartService.generateWhatsAppLink(phone);

    // فتح الرابط في نافذة جديدة
    if (link) {
      window.open(link, '_blank');
    } else {
      alert('السلة فارغة!');
    }
  }
}
