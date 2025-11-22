import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout, tap } from 'rxjs/operators';
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
  // استخدام Proxy المحلي مباشرة
  private gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbx3TLyE-LTu4aot2ZpOztlseF5o2Hnd4Uo09zgxbdMmBQm5P7DGIlYukGrA-viR7iaRgA/exec';

  private fetchFromGAS<T>(action: string, params: Record<string, any> = {}): Observable<GasResponse<T>> {
    // إذا كان الرابط النسبي لا يعمل، استخدم الرابط المطلق
    let baseUrl = this.gasWebAppUrl;
    if (baseUrl.startsWith('/')) {
      baseUrl = window.location.origin + baseUrl;
    }

    const queryParams = new URLSearchParams({ action, ...params }).toString();
    const url = `${baseUrl}?${queryParams}`;

    console.log(`🌐 [GAS Request] ${url}`);

    return this.http.get<GasResponse<T>>(url).pipe(
      timeout(15000),
      catchError(error => {
        console.error(`❌ [GAS Error] (${action})`, error);

        // إذا فشل مع الرابط المطلق، جرب بدون النطاق
        if (url.includes('syrianmenuhub.com')) {
          const fallbackUrl = `https://script.google.com${this.gasWebAppUrl.replace('/gas/', '/macros/')}?${queryParams}`;
          console.log(`🔄 جرب رابط بديل: ${fallbackUrl}`);

          return this.http.get<GasResponse<T>>(fallbackUrl).pipe(
            catchError(fallbackError => {
              console.error(`❌ فشل الرابط البديل أيضًا:`, fallbackError);
              return of({
                status: 'error',
                message: 'فشل في الاتصال بالخادم',
                data: undefined
              } as GasResponse<T>);
            })
          );
        }

        return of({
          status: 'error',
          message: error.message || 'فشل في الاتصال بالخادم',
          data: undefined
        } as GasResponse<T>);
      })
    );
  }

  private handleGASResponse<T>(response: GasResponse<T>): T | null {
    if (response.status === 'success' && response.data !== undefined) {
      return response.data;
    } else {
      console.warn('⚠️ خطأ في استجابة GAS:', response.message);
      return null;
    }
  }

  getAllRestaurants(): Observable<RestaurantDetails[]> {
    console.log('🔄 جلب قائمة المطاعم من Apps Script...');
    return this.fetchFromGAS<RestaurantDetails[]>('getActiveRestaurants').pipe(
      map(response => {
        const data = this.handleGASResponse(response) || [];
        console.log(`✅ تم استلام ${data.length} مطعم`);
        return data;
      })
    );
  }

  getRestaurantData(id: string): Observable<CombinedRestaurantData | null> {
    if (!id) {
      return of(null);
    }
    console.log(`🔄 جلب بيانات المطعم (ID: ${id}) من Apps Script...`);
    return this.fetchFromGAS<any>('getRestaurantData', { id }).pipe(
      map(response => {
        console.log('📦 استجابة GAS الخام:', response);

        if (response.status === 'success' && response.data) {
          const restaurantData = this.transformFirestoreData(response.data);

          if (restaurantData) {
            console.log('✅ بيانات المطعم المحولة:', restaurantData);
            console.log(`📊 عدد العناصر في القائمة: ${restaurantData.menu.items.length}`);
            console.log(`🏷️ الفئات المتاحة: ${restaurantData.menu.categories.join(', ')}`);
          } else {
            console.error('❌ فشل في تحويل بيانات المطعم');
          }

          return restaurantData;
        } else {
          console.error('❌ خطأ في استجابة GAS:', response.message);
          return null;
        }
      }),
      catchError(error => {
        console.error('❌ خطأ في جلب بيانات المطعم:', error);
        return of(null);
      })
    );
  }

  private transformFirestoreData(firestoreData: any): CombinedRestaurantData | null {
    if (!firestoreData) return null;

    try {
      console.log('🔧 تحويل بيانات Firestore:', firestoreData);

      // استخراج التفاصيل من المستند الرئيسي
      const details = this.extractRestaurantDetails(firestoreData.details);

      // استخراج القائمة
      const menu = this.extractMenuData(firestoreData.menu);

      const result: CombinedRestaurantData = {
        details: details,
        menu: menu
      };

      console.log('✅ البيانات المحولة:', result);
      return result;
    } catch (error) {
      console.error('❌ خطأ في تحويل البيانات:', error);
      return null;
    }
  }

  private extractRestaurantDetails(detailsData: any): RestaurantDetails {
    if (!detailsData) {
      return this.getDefaultRestaurantDetails();
    }

    return {
      id: detailsData.id || '',
      restaurantName: detailsData.restaurantName || detailsData.name || 'غير محدد',
      address: detailsData.address || '',

      logoURL: detailsData.logoURL || detailsData.logo || '',

      whatsAppNumber: detailsData.whatsAppNumber?.toString() || detailsData.phone?.toString() || '',
      facebookURL: detailsData.facebookURL || detailsData.facebook || '',
      instagramURL: detailsData.instagramURL || detailsData.instagram || '',
      websiteURL: detailsData.websiteURL || detailsData.website || '',
      category: detailsData.category || '',
      rating: detailsData.rating || 0,
      longitude: detailsData.longitude || undefined,
      latitude: detailsData.latitude || undefined,
      features: detailsData.features || {
        delivery: detailsData.delivery || false,
        takeaway: detailsData.takeaway || false,
        reservation: detailsData.reservation || false
      }
    };
  }

  // private extractMenuData(menuData: any): RestaurantMenu {
  //   if (!menuData) {
  //     return { categories: [], items: [] };
  //   }

  //   // استخراج العناصر
  //   let items: MenuItem[] = [];

  //   // البحث عن العناصر في مختلف الأماكن المحتملة
  //   if (menuData.items && Array.isArray(menuData.items)) {
  //     items = menuData.items;
  //   } else if (menuData.menuItems && Array.isArray(menuData.menuItems)) {
  //     items = menuData.menuItems;
  //   } else {
  //     // إذا لم تكن العناصر في array، قد تكون في fields
  //     const fields = menuData.fields || menuData;
  //     for (const key in fields) {
  //       if (Array.isArray(fields[key])) {
  //         items = fields[key];
  //         break;
  //       }
  //     }
  //   }

  //   // تصفية العناصر النشطة فقط
  //   const activeItems = items.filter(item =>
  //     item && item.show !== false && item.name && item.category
  //   );

  //   // استخراج الفئات من العناصر
  //   const categories = this.extractCategories(activeItems);

  //   return {
  //     categories: categories,
  //     items: activeItems
  //   };
  // }

  private extractCategories(items: MenuItem[]): string[] {
    if (!items || !Array.isArray(items)) return [];

    const categories = [...new Set(
      items
        .map(item => item.category?.trim())
        .filter(category => category && category !== '')
    )];

    return categories;
  }

  private getDefaultRestaurantDetails(): RestaurantDetails {
    return {
      id: '',
      restaurantName: 'غير محدد',
      address: '',
      logoURL: '',

      whatsAppNumber: '',
      facebookURL: '',
      instagramURL: '',
      websiteURL: '',
      category: '',
      rating: 0,
      features: {
        delivery: false,
        takeaway: false,
        reservation: false
      }
    };
  }
  private extractMenuData(menuData: any): RestaurantMenu {
    if (!menuData) {
      return { categories: [], categories_en: [], items: [] };
    }

    let items: MenuItem[] = [];

    if (menuData.items && Array.isArray(menuData.items)) {
      items = menuData.items;
    } else if (menuData.menuItems && Array.isArray(menuData.menuItems)) {
      items = menuData.menuItems;
    } else {
      const fields = menuData.fields || menuData;
      for (const key in fields) {
        if (Array.isArray(fields[key])) {
          items = fields[key];
          break;
        }
      }
    }

    // تصفية العناصر النشطة فقط
    const activeItems = items.filter(item =>
      item && item.show !== false && item.name && item.category
    );

    // استخراج الفئات العربية
    const categories = [...new Set(
      activeItems
        .map(item => item.category?.trim())
        .filter(category => category && category !== '')
    )];

    // استخراج الفئات الإنجليزية
const categories_en = [...new Set(
  activeItems
    .map(item => item.category_en?.trim() ?? '')
    .filter(category => category !== '')
)];

    return {
      categories: categories,
      categories_en: categories_en,
      items: activeItems
    };
  }
}
