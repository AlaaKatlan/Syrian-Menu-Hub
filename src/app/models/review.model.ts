// models/review.model.ts
export interface Review {
  id: string;
  restaurantId: string;
  userName: string;
  rating: number;
  comment: string;
  date: Date;
}
