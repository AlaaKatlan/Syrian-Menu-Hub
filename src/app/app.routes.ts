// app.routes.ts (محدث ومحسن)
import { Routes } from '@angular/router';
import { RestaurantComponent } from './pages/restaurant/restaurant.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  {
    path: 'r/:id',
    component: RestaurantComponent,
    title: 'المطعم - Syrian Menu Hub'
  },
  {
    path: '',
    component: HomeComponent,
    title: 'Syrian Menu Hub - دليلك لمطاعم سوريا',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
