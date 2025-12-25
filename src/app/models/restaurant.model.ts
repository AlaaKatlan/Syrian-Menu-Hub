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
  delivery?: boolean;
  category?: string;
  rating?: number;
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
  id?: string;
 name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  price: number;
  category: string;
  category_en?: string;
  show: boolean;
  image?: string;
    options?: MenuItemOption[];

}
export interface MenuItemOption {
  name: string;
  name_en?: string;
  price: number;
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
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  selectedOption?: { name: string; price: number };
}
