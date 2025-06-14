
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  birthday?: string;
  profileImageUrl?: string;
  bio?: string;
  phone?: string;
  isVerified?: boolean;
  // Firebase specific fields
  firebaseUid: string;
}

export type PaymentOption = 'fixed' | 'payWhatYouWant' | 'free';
export type FoodType = 'kosherMeat' | 'kosherDairy' | 'kosherParve' | 'notKosher';
export type ReligionStyle = 'secular' | 'traditional' | 'religious' | 'mixed'; // Example styles

export interface Event {
  id: string;
  coupleId: string; // Firebase UID of the couple
  name: string;
  numberOfGuests: number;
  pricePerGuest?: number;
  paymentOption: PaymentOption;
  location: string; // Formatted address
  locationDisplayName?: string; // User-friendly display name (e.g., business name)
  latitude?: number | null; // For map coordinates
  longitude?: number | null; // For map coordinates
  dateTime: Date;
  description: string;
  ageRange: [number, number];
  foodType: FoodType;
  religionStyle: ReligionStyle;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinRequest {
  id: string;
  eventId: string;
  guestId: string; // Firebase UID of the guest
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: Date;
  respondedAt?: Date;
}

export interface Review {
  id: string;
  reviewerId: string; // Firebase UID
  revieweeId: string; // Firebase UID
  eventId: string;
  rating: 'positive' | 'negative'; // or 'thumbsUp' | 'thumbsDown'
  comment?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  chatId: string; // eventId or direct chat ID
  senderId: string; // Firebase UID
  receiverId?: string; // For direct messages, or null for broadcast
  text: string;
  timestamp: Date;
  isRead?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number; // e.g., number of events attended positively
  rank?: number;
}

