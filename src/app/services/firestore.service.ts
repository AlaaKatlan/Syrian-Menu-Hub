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

  // تأكد من أن هذا الرابط هو رابط الـ Web App الخاص بك (Deployment ID)
  private gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbx3TLyE-LTu4aot2ZpOztlseF5o2Hnd4Uo09zgxbdMmBQm5P7DGIlYukGrA-viR7iaRgA/exec';

  /**
   * دالة الاتصال الأساسية بـ Google Apps Script
   */
  private fetchFromGAS<T>(action: string, params: Record<string, any> = {}): Observable<GasResponse<T>> {
    let baseUrl = this.gasWebAppUrl;

    // التعامل مع الروابط النسبية (Relative URLs)
    if (baseUrl.startsWith('/')) {
      baseUrl = window.location.origin + baseUrl;
    }

    const queryParams = new URLSearchParams({ action, ...params }).toString();
    const url = `${baseUrl}?${queryParams}`;

    console.log(`🌐 [GAS Request] ${url}`);

    return this.http.get<GasResponse<T>>(url).pipe(
      timeout(20000), // زيادة المهلة قليلاً لضمان تحميل البيانات
      catchError(error => {
        console.error(`❌ [GAS Error] (${action})`, error);

        // محاولة بديلة (Fallback) في حال فشل البروكسي
        if (url.includes('syrianmenuhub.com') || baseUrl.startsWith('/')) {
          const fallbackUrl = `https://script.google.com/macros/s/AKfycbx3TLyE-LTu4aot2ZpOztlseF5o2Hnd4Uo09zgxbdMmBQm5P7DGIlYukGrA-viR7iaRgA/exec?${queryParams}`;
          console.log(`🔄 محاولة رابط بديل مباشر: ${fallbackUrl}`);

          return this.http.get<GasResponse<T>>(fallbackUrl).pipe(
            catchError(() => of({
              status: 'error',
              message: 'فشل في الاتصال بالخادم، يرجى التحقق من الإنترنت',
              data: undefined
            } as GasResponse<T>))
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
      console.warn('⚠️ تنبيه من السيرفر:', response.message);
      return null;
    }
  }

  /**
   * جلب قائمة المطاعم (للصفحة الرئيسية مثلاً)
   */
  getAllRestaurants(): Observable<RestaurantDetails[]> {
    return this.fetchFromGAS<RestaurantDetails[]>('getActiveRestaurants').pipe(
      map(response => this.handleGASResponse(response) || [])
    );
  }

  /**
   * جلب بيانات مطعم محدد (التفاصيل + القائمة)
   */
  getRestaurantData(id: string): Observable<CombinedRestaurantData | null> {
    if (!id) return of(null);

    return this.fetchFromGAS<any>('getRestaurantData', { id }).pipe(
      map(response => {
        if (response.status === 'success' && response.data) {
          console.log();
          return this.transformFirestoreData(response.data);

        }
        return null;
      }),
      catchError(error => {
        console.error('❌ خطأ في جلب بيانات المطعم:', error);
        return of(null);
      })
    );
  }

  // =================================================================
  // ===================  TRANSFORMATION LOGIC   =====================
  // =================================================================

  private transformFirestoreData(firestoreData: any): CombinedRestaurantData | null {
    if (!firestoreData) return null;

    try {
      // 1. استخراج التفاصيل (بما فيها الفروع الآن)
      const details = this.extractRestaurantDetails(firestoreData.details);

      // 2. استخراج القائمة (Menu)
      const menu = this.extractMenuData(firestoreData.menu);

      return { details, menu };
    } catch (error) {
      console.error('❌ خطأ أثناء تحويل البيانات:', error);
      return null;
    }
  }

  private extractRestaurantDetails(detailsData: any): RestaurantDetails {
    if (!detailsData) {
      return this.getDefaultRestaurantDetails();
    }

    // التعامل مع بنية Firestore (fields) أو JSON عادي
    const fields = detailsData.fields || detailsData;

    // استخراج الفروع (الموجودة الآن داخل details)
    const rawBranches = fields.branches || detailsData.branches;

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

      longitude: detailsData.longitude || undefined,
      latitude: detailsData.latitude || undefined,
      // ✅ استدعاء الدالة الجديدة لمعالجة الفروع
      branches: this.extractBranches(rawBranches),

      features: {
        delivery: this.getBooleanValue(fields.delivery),
        takeaway: this.getBooleanValue(fields.takeaway),
        reservation: this.getBooleanValue(fields.reservation)
      }
    };
  }

  /**
   * دالة مخصصة لتحويل هيكلية الفروع من Backend إلى Frontend Model
   */
  private extractBranches(branchesData: any): any[] {
    if (!branchesData) return [];

    let branchesArray: any[] = [];

    // الحالة 1: بيانات قادمة بتنسيق Firestore ArrayValue
    if (branchesData.arrayValue && branchesData.arrayValue.values) {
      branchesArray = branchesData.arrayValue.values;
    }
    // الحالة 2: بيانات قادمة كمصفوفة JSON عادية
    else if (Array.isArray(branchesData)) {
      branchesArray = branchesData;
    }

    // التحويل (Mapping)
    return branchesArray.map(b => {
      // استخراج الحقول سواء كانت داخل mapValue.fields أو مباشرة
      const fields = b.mapValue?.fields || b;

      return {
        // نربط الحقول القادمة من السكريبت (branchId, lat, lng, whatsapp)
        // مع الحقول المطلوبة في المودل (id, latitude, longitude, whatsAppNumber)
        id: this.getStringValue(fields.branchId) || this.getStringValue(fields.id),
        address: this.getStringValue(fields.address),
        latitude: this.getNumberValue(fields.lat) || this.getNumberValue(fields.latitude),
        longitude: this.getNumberValue(fields.lng) || this.getNumberValue(fields.longitude),
        whatsAppNumber: this.getStringValue(fields.whatsapp) || this.getStringValue(fields.whatsAppNumber)
      };
    }).filter(b => b.address && b.address !== ''); // تصفية الفروع الفارغة
  }

  // private extractMenuData(menuData: any): RestaurantMenu {
  //   if (!menuData) {
  //     return { categories: [], categories_en: [], items: [] };
  //   }

  //   let items: MenuItem[] = [];

  //   // محاولة قراءة العناصر بناءً على شكل البيانات
  //   if (menuData.items && Array.isArray(menuData.items)) {
  //     items = menuData.items; // JSON بسيط
  //   } else if (menuData.fields?.items?.arrayValue?.values) {
  //      // Firestore Raw Structure
  //      items = menuData.fields.items.arrayValue.values.map((i: any) => {
  //        const f = i.mapValue?.fields || i;
  //        return {
  //          name: this.getStringValue(f.name),
  //          name_en: this.getStringValue(f.name_en),
  //          description: this.getStringValue(f.description),
  //          description_en: this.getStringValue(f.description_en),
  //          price: this.getNumberValue(f.price),
  //          category: this.getStringValue(f.category),
  //          category_en: this.getStringValue(f.category_en),
  //          image: this.getStringValue(f.image),
  //          show: this.getBooleanValue(f.show)
  //        };
  //      });
  //   }

  //   // تصفية العناصر المعروضة فقط
  //   const activeItems = items.filter(item => item && item.show !== false && item.name);

  //   // استخراج الفئات الفريدة (عربي)
  //   const categories = [...new Set(
  //     activeItems
  //       .map(i => i.category?.trim())
  //       .filter((c): c is string => !!c) // ✅ استخدام Type Predicate
  //   )];

  //   // استخراج الفئات الفريدة (إنجليزي) - وهنا كان الخطأ
  //   const categories_en = [...new Set(
  //     activeItems
  //       .map(i => i.category_en?.trim())
  //       .filter((c): c is string => !!c) // ✅ هذا السطر يخبر TS أن الناتج نص حصراً
  //   )];

  //   return {
  //     categories,
  //     categories_en,
  //     items: activeItems
  //   };
  // }
  private extractMenuData(menuData: any): RestaurantMenu {
    if (!menuData) {
      return { categories: [], categories_en: [], items: [] };
    }

    let items: MenuItem[] = [];

    // محاولة قراءة العناصر بناءً على شكل البيانات
    if (menuData.items && Array.isArray(menuData.items)) {
      items = menuData.items.map((item: any) => this.transformMenuItem(item));
    } else if (menuData.fields?.items?.arrayValue?.values) {
      // Firestore Raw Structure
      items = menuData.fields.items.arrayValue.values.map((i: any) => {
        const f = i.mapValue?.fields || i;
        return this.transformMenuItem(f);
      });
    }

    // تصفية العناصر المعروضة فقط
    const activeItems = items.filter(item => item && item.show !== false && item.name);

    // استخراج الفئات الفريدة (عربي)
    const categories = [...new Set(
      activeItems
        .map(i => i.category?.trim())
        .filter((c): c is string => !!c)
    )];

    // استخراج الفئات الفريدة (إنجليزي)
    const categories_en = [...new Set(
      activeItems
        .map(i => i.category_en?.trim())
        .filter((c): c is string => !!c)
    )];

    return {
      categories,
      categories_en,
      items: activeItems
    };
  }


  private transformMenuItem(itemData: any): MenuItem {
    const f = itemData.mapValue?.fields || itemData;

    const item: MenuItem = {
      id: this.getStringValue(f.id), // ✅ إضافة الـ ID
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

    // ✅ معالجة الـ options بشكل صحيح
    const extractedOptions = this.extractMenuItemOptions(f.options);
    if (extractedOptions.length > 0) {
      item.options = extractedOptions;
    }

    return item;
  }

  private extractMenuItemOptions(optionsData: any): any[] {
    if (!optionsData) return [];

    let optionsArray: any[] = [];

    // ✅ الحالة 1: بيانات Firestore ArrayValue
    if (optionsData.arrayValue && optionsData.arrayValue.values) {
      optionsArray = optionsData.arrayValue.values;
    }
    // ✅ الحالة 2: مصفوفة JSON عادية
    else if (Array.isArray(optionsData)) {
      optionsArray = optionsData;
    }

    const options = optionsArray.map(opt => {
      const fields = opt.mapValue?.fields || opt;
      return {
        name: this.getStringValue(fields.name),
        name_en: this.getStringValue(fields.name_en),
        price: this.getNumberValue(fields.price)
      };
    }).filter(opt => opt.name && opt.price > 0);

    if (options.length > 0) {
      console.log('✅ Options extracted:', options);
    }

    return options;
  }
  // =================================================================
  // ===================    DATA TYPE HELPERS    =====================
  // =================================================================

  private getStringValue(field: any): string {
    if (!field) return '';
    // التعامل مع { stringValue: "..." } أو القيمة المباشرة
    return field.stringValue !== undefined ? field.stringValue : String(field);
  }

  private getNumberValue(field: any): number {
    if (!field) return 0;
    // التعامل مع doubleValue, integerValue أو رقم مباشر
    if (field.doubleValue !== undefined) return Number(field.doubleValue);
    if (field.integerValue !== undefined) return Number(field.integerValue);
    return Number(field) || 0;
  }

  private getBooleanValue(field: any): boolean {
    if (!field) return false;
    // التعامل مع booleanValue أو قيمة مباشرة
    if (field.booleanValue !== undefined) return field.booleanValue;
    return Boolean(field);
  }

  private getDefaultRestaurantDetails(): RestaurantDetails {
    return {
      id: '',
      restaurantName: 'غير محدد',
      address: '',
      logoURL: '',
      rating: 0,
      features: {}
    };
  }
}
