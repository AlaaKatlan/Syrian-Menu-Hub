import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { FormsModule } from '@angular/forms'; // ✅ ضروري من أجل ngModel

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule], // ✅ أضفنا FormsModule
  templateUrl: './cart-drawer.component.html',
  styleUrls: ['./cart-drawer.component.scss'],
  animations: [
    // ✅ أنيميشن للمودال (Zoom In / Scale)
    trigger('modalScale', [
      transition(':enter', [
        style({ transform: 'scale(0.9)', opacity: 0 }),
        animate('200ms ease-out', style({ transform: 'scale(1)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ transform: 'scale(0.9)', opacity: 0 }))
      ])
    ]),
    // أنيميشن الخلفية
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

  // ... (باقي الدوال checkout و closeCart كما هي)

  closeCart() {
    this.cartService.closeCart();
  }

  checkout() {
      // نفس الكود السابق
      if (!this.restaurantDetails?.whatsAppNumber) {
      alert('رقم الواتساب غير متوفر لهذا الفرع!');
      return;
    }
    const phone = this.restaurantDetails.whatsAppNumber;
    const link = this.cartService.generateWhatsAppLink(phone);
    if (link) {
      window.open(link, '_blank');
    } else {
      alert('السلة فارغة!');
    }
  }
}
