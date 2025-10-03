// shared/header/header.component.ts (محدث)
import { Component, signal, HostListener } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  isScrolled = signal(false);
  isMobileMenuOpen = signal(false);

  constructor(private router: Router) {}

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 50);
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
    this.isMobileMenuOpen.set(false);
  }

  // دالة للحصول على مسار اللوغو (المسار الصحيح)
  getLogoPath(): string {
    return '/images/logo.png'; // ⬅️ المسار من مجلد public
  }
}
