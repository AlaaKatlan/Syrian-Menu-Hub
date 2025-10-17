export interface RestaurantDetails {
  id: string;
  restaurantName: string;
  address: string;
  logoURL: string;
  whatsAppNumber?: string;
  facebookURL?: string;
  instagramURL?: string;
  websiteURL?: string;
  longitude?: number;
  latitude?: number;
  category?: string; // ⬅️ أضفنا هذا
  rating?: number;   // ⬅️ وأضفنا التقييم أيضاً
  features?: {
    delivery?: boolean;
    takeaway?: boolean;
    reservation?: boolean;
  };
}

export interface MenuItem {
  name: string;
  description: string;
  price: number;
  category: string;
  show: boolean;
  image?: string;
}

export interface RestaurantMenu {
  categories: string[];
  items: MenuItem[];
}

export interface CombinedRestaurantData {
  details: RestaurantDetails;
  menu: RestaurantMenu;
}
