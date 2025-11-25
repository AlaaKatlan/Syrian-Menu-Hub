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
  branches?: {
    id: string;
    address: string;
    latitude?: number;
    longitude?: number;
    whatsAppNumber?: string;
  }[];
}

export interface MenuItem {
 name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  price: number;
  category: string;
  category_en?: string;
  show: boolean;
  image?: string;
}

export interface RestaurantMenu {
  categories: string[];
  categories_en?: string[];
  items: MenuItem[];
}

export interface CombinedRestaurantData {
  details: RestaurantDetails;
  menu: RestaurantMenu;
}
