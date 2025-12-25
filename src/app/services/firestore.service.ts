import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import {
  RestaurantDetails,
  CombinedRestaurantData,
  RestaurantMenu,
  MenuItem
} from '../models/restaurant.model';

interface GasResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private http = inject(HttpClient);

  private gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbx3TLyE-LTu4aot2ZpOztlseF5o2Hnd4Uo09zgxbdMmBQm5P7DGIlYukGrA-viR7iaRgA/exec';

  private fetchFromGAS<T>(action: string, params: Record<string, any> = {}): Observable<GasResponse<T>> {
    let baseUrl = this.gasWebAppUrl;

    if (baseUrl.startsWith('/')) {
      baseUrl = window.location.origin + baseUrl;
    }

    const queryParams = new URLSearchParams({ action, ...params }).toString();
    const url = `${baseUrl}?${queryParams}`;

    return this.http.get<GasResponse<T>>(url).pipe(
      timeout(20000),
      catchError(error => {
        console.error(`❌ [GAS Error] (${action})`, error);

        if (url.includes('syrianmenuhub.com') || baseUrl.startsWith('/')) {
          const fallbackUrl = `https://script.google.com/macros/s/AKfycbx3TLyE-LTu4aot2ZpOztlseF5o2Hnd4Uo09zgxbdMmBQm5P7DGIlYukGrA-viR7iaRgA/exec?${queryParams}`;
          return this.http.get<GasResponse<T>>(fallbackUrl).pipe(
            catchError(() => of({ status: 'error', data: undefined } as GasResponse<T>))
          );
        }
        return of({ status: 'error', data: undefined } as GasResponse<T>);
      })
    );
  }

  private handleGASResponse<T>(response: GasResponse<T>): T | null {
    if (response.status === 'success' && response.data !== undefined) {
      return response.data;
    }
    return null;
  }

  getAllRestaurants(): Observable<RestaurantDetails[]> {
    return this.fetchFromGAS<RestaurantDetails[]>('getActiveRestaurants').pipe(
      map(response => this.handleGASResponse(response) || [])
    );
  }

  getRestaurantData(id: string): Observable<CombinedRestaurantData | null> {
    if (!id) return of(null);

    return this.fetchFromGAS<any>('getRestaurantData', { id }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          return this.transformFirestoreData(response.data);
        }
        return null;
      }),
      catchError(error => {
        console.error('❌ خطأ في الاتصال:', error);
        return of(null);
      })
    );
  }

  // =================================================================
  // ===================  LOGIC التحويل  =============================
  // =================================================================

  private transformFirestoreData(firestoreData: any): CombinedRestaurantData | null {
    if (!firestoreData) return null;
    try {
      const details = this.extractRestaurantDetails(firestoreData.details);
      const menu = this.extractMenuData(firestoreData.menu);
      return { details, menu };
    } catch (error) {
      console.error('❌ خطأ تحويل البيانات:', error);
      return null;
    }
  }

  private extractRestaurantDetails(detailsData: any): RestaurantDetails {
    if (!detailsData) return this.getDefaultRestaurantDetails();

    const fields = detailsData.fields || detailsData;
    const rawBranches = fields.branches || detailsData.branches;

    // ✅ طباعة قيم التوصيل في الكونسول للتأكد
    console.log('🔍 [Debug] Raw Delivery Field:', fields.delivery);

    const isDeliveryAvailable = this.getBooleanValue(fields.delivery);
    console.log('✅ [Debug] Parsed Delivery Value:', isDeliveryAvailable);

    return {
      id: this.getStringValue(fields.id) || '',
      restaurantName: this.getStringValue(fields.restaurantName) || this.getStringValue(fields.name) || 'غير محدد',
      address: this.getStringValue(fields.address) || '',
      logoURL: this.getStringValue(fields.logoURL) || this.getStringValue(fields.logo) || '',
      whatsAppNumber: this.getStringValue(fields.whatsAppNumber) || this.getStringValue(fields.phone) || '',
      facebookURL: this.getStringValue(fields.facebookURL) || this.getStringValue(fields.facebook) || '',
      instagramURL: this.getStringValue(fields.instagramURL) || this.getStringValue(fields.instagram) || '',
      websiteURL: this.getStringValue(fields.websiteURL) || this.getStringValue(fields.website) || '',
      category: this.getStringValue(fields.category) || '',
      rating: this.getNumberValue(fields.rating),

      currencySymbol: this.getStringValue(fields.currencySymbol) || 'ل.س',

      // ✅ هنا يتم تمرير القيمة المحسنة
      delivery: isDeliveryAvailable,

      longitude: detailsData.longitude || undefined,
      latitude: detailsData.latitude || undefined,
      branches: this.extractBranches(rawBranches),

      features: {
        delivery: isDeliveryAvailable,
        takeaway: this.getBooleanValue(fields.takeaway),
        reservation: this.getBooleanValue(fields.reservation)
      }
    };
  }

  private extractBranches(branchesData: any): any[] {
    if (!branchesData) return [];
    let branchesArray: any[] = [];

    if (branchesData.arrayValue && branchesData.arrayValue.values) {
      branchesArray = branchesData.arrayValue.values;
    } else if (Array.isArray(branchesData)) {
      branchesArray = branchesData;
    }

    return branchesArray.map(b => {
      const fields = b.mapValue?.fields || b;
      return {
        id: this.getStringValue(fields.branchId) || this.getStringValue(fields.id),
        address: this.getStringValue(fields.address),
        latitude: this.getNumberValue(fields.lat) || this.getNumberValue(fields.latitude),
        longitude: this.getNumberValue(fields.lng) || this.getNumberValue(fields.longitude),
        whatsAppNumber: this.getStringValue(fields.whatsapp) || this.getStringValue(fields.whatsAppNumber)
      };
    }).filter(b => b.address);
  }

  private extractMenuData(menuData: any): RestaurantMenu {
    if (!menuData) return { categories: [], items: [] };

    let items: MenuItem[] = [];

    if (menuData.items && Array.isArray(menuData.items)) {
      items = menuData.items.map((item: any) => this.transformMenuItem(item));
    } else if (menuData.fields?.items?.arrayValue?.values) {
      items = menuData.fields.items.arrayValue.values.map((i: any) => {
        const f = i.mapValue?.fields || i;
        return this.transformMenuItem(f);
      });
    }

    const activeItems = items.filter(item => item && item.show !== false && (item.name || item.name_en));

    activeItems.forEach(item => {
      if (!item.category && item.category_en) item.category = item.category_en;
    });

    const categories = [...new Set(activeItems.map(i => i.category?.trim()).filter((c): c is string => !!c))];
    const categories_en = [...new Set(activeItems.map(i => i.category_en?.trim()).filter((c): c is string => !!c))];

    return { categories, categories_en, items: activeItems };
  }

  private transformMenuItem(itemData: any): MenuItem {
    const f = itemData.mapValue?.fields || itemData;

    const item: MenuItem = {
      id: this.getStringValue(f.id),
      name: this.getStringValue(f.name),
      name_en: this.getStringValue(f.name_en),
      description: this.getStringValue(f.description),
      description_en: this.getStringValue(f.description_en),
      price: this.getNumberValue(f.price),
      category: this.getStringValue(f.category),
      category_en: this.getStringValue(f.category_en),
      image: this.getStringValue(f.image),
      show: this.getBooleanValue(f.show)
    };

    if (!item.name && item.name_en) item.name = item.name_en;

    const extractedOptions = this.extractMenuItemOptions(f.options);
    if (extractedOptions.length > 0) item.options = extractedOptions;

    return item;
  }

  private extractMenuItemOptions(optionsData: any): any[] {
    if (!optionsData) return [];
    let optionsArray: any[] = [];

    if (optionsData.arrayValue && optionsData.arrayValue.values) {
      optionsArray = optionsData.arrayValue.values;
    } else if (Array.isArray(optionsData)) {
      optionsArray = optionsData;
    }

    return optionsArray.map(opt => {
      const fields = opt.mapValue?.fields || opt;
      return {
        name: this.getStringValue(fields.name),
        name_en: this.getStringValue(fields.name_en),
        price: this.getNumberValue(fields.price)
      };
    }).filter(opt => (opt.name || opt.name_en) && opt.price > 0);
  }

  // ===================    MAPPERS (محسنة)    =====================

  private getStringValue(field: any): string {
    if (field === undefined || field === null) return '';
    return field.stringValue !== undefined ? field.stringValue : String(field);
  }

  private getNumberValue(field: any): number {
    if (field === undefined || field === null) return 0;
    if (field.doubleValue !== undefined) return Number(field.doubleValue);
    if (field.integerValue !== undefined) return Number(field.integerValue);
    return Number(field) || 0;
  }

  private getBooleanValue(field: any): boolean {
    // 1. فحص القيم الفارغة
    if (field === undefined || field === null) return false;

    // 2. إذا كانت القيمة boolean حقيقية (من JSON عادي)
    if (typeof field === 'boolean') return field;

    // 3. إذا كانت القيمة داخل كائن Firestore { booleanValue: true }
    if (field && typeof field === 'object' && field.booleanValue !== undefined) {
      return field.booleanValue;
    }

    // 4. التحويل من نص في حال كانت "true" كنص
    const stringVal = String(field).toLowerCase().trim();
    return stringVal === 'true';
  }

  private getDefaultRestaurantDetails(): RestaurantDetails {
    return {
      id: '',
      restaurantName: 'غير محدد',
      address: '',
      logoURL: '',
      delivery: false,
      features: {}
    };
  }
}
