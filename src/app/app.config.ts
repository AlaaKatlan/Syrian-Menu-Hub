// app.config.ts (مصحح)
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCP7Y7lkGhsqAZ-tVRkYbjWzAHLnC9Vtp4",
  authDomain: "syrian-menu-hub.firebaseapp.com",
  projectId: "syrian-menu-hub",
  storageBucket: "syrian-menu-hub.firebasestorage.app",
  messagingSenderId: "84154341146",
  appId: "1:84154341146:web:79c78f868ad758b2057ea3",
  measurementId: "G-H0X7EM4G2J"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
  ]
};
