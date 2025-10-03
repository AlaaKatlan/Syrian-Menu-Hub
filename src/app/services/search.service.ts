// services/search.service.ts
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchTerm = signal('');
  private searchFilters = signal({
    category: '',
    priceRange: { min: 0, max: 100000 },
    rating: 0
  });

  // ... دوال البحث المتقدمة
}
