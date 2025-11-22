import { Component, computed, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirestoreService } from '../../services/firestore.service';
import { switchMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MenuItem } from '../../models/restaurant.model';

@Component({
  selector: 'app-restaurant',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './restaurant.component.html',
  styleUrls: ['./restaurant.component.scss']
})
export class RestaurantComponent {
  private route = inject(ActivatedRoute);
  private firestoreService = inject(FirestoreService);

  private restaurantData$ = this.route.params.pipe(
    switchMap(params => this.firestoreService.getRestaurantData(params['id']))
  );
  restaurant = toSignal(this.restaurantData$);

  selectedCategory = signal<string>('');
  currentLanguage = signal<'ar' | 'en'>('ar');

  constructor() {
    // للتتبع والتأكد من عمل تبديل اللغة
    effect(() => {
      console.log('🌐 اللغة الحالية:', this.currentLanguage());
    });
  }

  // التحقق إذا المطعم يدعم الإنجليزية
  hasEnglishSupport = computed(() => {
    const data = this.restaurant();
    if (!data?.menu?.items || data.menu.items.length === 0) {
      console.log('❌ لا توجد عناصر في القائمة');
      return false;
    }

    const hasEn = data.menu.items.some(item =>
      item.name_en && item.name_en.trim() !== ''
    );
    console.log('🔍 هل يدعم الإنجليزية:', hasEn);
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

    console.log('📂 الفئات المعروضة:', categories);
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

  filterByCategory(category: string) {
    this.selectedCategory.set(category);
  }

  toggleLanguage() {
    const current = this.currentLanguage();
    const newLang = current === 'ar' ? 'en' : 'ar';
    console.log('🔄 تبديل اللغة من', current, 'إلى', newLang);
    this.currentLanguage.set(newLang);
    this.selectedCategory.set('');
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

  isEnglish(): boolean {
    return this.currentLanguage() === 'en';
  }

  isArabic(): boolean {
    return this.currentLanguage() === 'ar';
  }

  getImageURL(url?: string): string {
    if (!url) return '';

    if (url.includes('drive.google.com')) {
      const idMatch =
        url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
        url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
        url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];

      if (idMatch) {
        return `https://lh3.googleusercontent.com/d/${idMatch}=w512?authuser=0`;
      }
      return '';
    }

    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    }

    return url;
  }
}
