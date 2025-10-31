// // firestore.service.ts (محدث ومصحح)
// import { Injectable, inject } from '@angular/core';
// import {
//   Firestore,
//   doc,
//   getDoc,
//   collection,
//   getDocs,
//   query,
//   orderBy,
//   where
// } from '@angular/fire/firestore';
// import { Observable, from, forkJoin, of } from 'rxjs';
// import { map, catchError } from 'rxjs/operators';
// import { RestaurantDetails, RestaurantMenu, CombinedRestaurantData, MenuItem } from '../models/restaurant.model';

// @Injectable({
//   providedIn: 'root'
// })
// export class FirestoreService {
//   private firestore: Firestore = inject(Firestore);

//   getAllRestaurants(): Observable<RestaurantDetails[]> {
//     const restaurantsCol = collection(this.firestore, 'restaurants');
//     const q = query(restaurantsCol, orderBy('restaurantName'));

//     return from(getDocs(q)).pipe(
//       map(snapshot => {
//         console.log('📊 عدد المطاعم المستلمة:', snapshot.docs.length);

//         const restaurants = snapshot.docs.map(doc => {
//           const data = doc.data();
//           console.log('📄 بيانات المطعم:', doc.id, data);

//           return {
//             id: doc.id,
//             restaurantName: data['restaurantName'] || 'بدون اسم',
//             address: data['address'] || 'سوريا',
//             logoURL: data['logoURL'] || '',
//             category: data['category'] || 'مطعم سوري',
//             rating: data['rating'] || 4.0,
//             phone: data['phone'] || '',
//             facebook: data['facebook'] || '',
//             instagram: data['instagram'] || '',
//             website: data['website'] || '',
//             features: data['features'] || { delivery: true }
//           } as RestaurantDetails;
//         });

//         return restaurants;
//       }),
//       catchError(error => {
//         console.error('❌ خطأ في جلب المطاعم:', error);
//         return of([]); // إرجاع مصفوفة فارغة في حالة الخطأ
//       })
//     );
//   }

//   getRestaurantData(id: string): Observable<CombinedRestaurantData | null> {
//     if (!id) {
//       console.error('❌ معرّف المطعم غير موجود');
//       return of(null);
//     }

//     console.log('🔍 جلب بيانات المطعم:', id);

//     const detailsDocRef = doc(this.firestore, `restaurants/${id}`);
//     const menuDocRef = doc(this.firestore, `restaurantMenus/${id}`);

//     const details$ = from(getDoc(detailsDocRef)).pipe(
//       map(snap => {
//         if (snap.exists()) {
//           const data = snap.data();

//           console.log('✅ بيانات المطعم موجودة:', data);
//           return {
//             id: snap.id,
//             restaurantName: data['restaurantName'] || 'بدون اسم',
//             address: data['address'] || 'سوريا',
//             logoURL: data['logoURL'] || '',
//             category: data['category'] || 'مطعم سوري',
//             rating: data['rating'] || 4.0,
//             whatsAppNumber: data['whatsAppNumber'] || '',
//             facebookURL: data['facebookURL'] || '',
//             instagramURL: data['instagramURL'] || '',
//             websiteURL: data['websiteURL'] || '',
//             latitude: data['latitude'] || '',
//             longitude: data['longitude'] || '',
//             features: data['features'] || { delivery: true }
//           } as RestaurantDetails;
//         } else {
//           console.log('❌ بيانات المطعم غير موجودة');
//           return null;
//         }
//       }),
//       catchError(error => {
//         console.error('❌ خطأ في جلب بيانات المطعم:', error);
//         return of(null);
//       })
//     );

//     const menu$ = from(getDoc(menuDocRef)).pipe(
//       map(snap => {
//         if (snap.exists()) {
//           const data = snap.data();

//           // نقوم بفلترة مصفوفة "items"
//           const visibleItems = (data['items'] as MenuItem[] || []).filter(item => item.show === true);

//           console.log(`✅ قائمة الطعام موجودة، العناصر المعروضة: ${visibleItems.length}`);
//           console.log('✅ قائمة الطعام موجودة:', data);
//           return {
//             categories: data['categories'] || [],
//             items: visibleItems // نستخدم المصفوفة المفلترة
//           } as RestaurantMenu;
//         } else {
//           console.log('❌ قائمة الطعام غير موجودة');
//           return null;
//         }
//       }),
//       catchError(error => {
//         console.error('❌ خطأ في جلب قائمة الطعام:', error);
//         return of(null);
//       })
//     );

//     return forkJoin({ details: details$, menu: menu$ }).pipe(
//       map(result => {
//         if (result.details && result.menu) {
//           console.log('✅ بيانات كاملة للمطعم:', result.details.restaurantName);
//           return result as CombinedRestaurantData;
//         } else {
//           console.error('❌ بيانات ناقصة للمطعم:', {
//             details: !!result.details,
//             menu: !!result.menu
//           });
//           return null;
//         }
//       }),
//       catchError(error => {
//         console.error('❌ خطأ في دمج البيانات:', error);
//         return of(null);
//       })
//     );
//   }

//   // دالة مساعدة للتحقق من اتصال Firebase
//   testConnection(): Observable<boolean> {
//     const testDocRef = doc(this.firestore, 'restaurants/test');
//     return from(getDoc(testDocRef)).pipe(
//       map(() => {
//         console.log('✅ اتصال Firebase يعمل بشكل صحيح');
//         return true;
//       }),
//       catchError(error => {
//         console.error('❌ خطأ في اتصال Firebase:', error);
//         return of(false);
//       })
//     );
//   }
// }
