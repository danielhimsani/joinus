
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
  ownerUids: string[];
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

// Represents a conversation between a guest and event owner(s)
export interface EventChat {
  id: string; // Firestore document ID (can be eventId_guestUid or auto-generated)
  eventId: string;
  guestUid: string;
  ownerUids: string[]; // UIDs of event owners involved in this chat
  participants: string[]; // Combined [guestUid, ...ownerUids] for easy querying/rules

  status: 'pending_request' | 'active' | 'request_approved' | 'request_rejected' | 'closed';

  lastMessageText?: string;
  lastMessageTimestamp?: Date; // Firestore Timestamp will be converted to Date
  lastMessageSenderId?: string;

  // Denormalized info for chat lists
  eventInfo?: {
    name: string;
    imageUrl?: string;
  };
  guestInfo?: {
    name: string;
    profileImageUrl?: string;
  };

  // Unread counts for each participant
  // e.g., { "guestUid1": 0, "ownerUidA": 2 }
  unreadCount?: { [userId: string]: number };

  createdAt: Date; // Firestore Timestamp will be converted to Date
  updatedAt: Date; // Firestore Timestamp will be converted to Date
}

// Represents a single message within an EventChat
export interface EventChatMessage {
  id: string; // Firestore document ID
  chatId: string; // ID of the parent EventChat document
  senderId: string; // UID of the guest or one of the owners
  text: string;
  timestamp: Date; // Firestore Timestamp will be converted to Date
  imageUrl?: string; // If supporting image messages

  // Denormalized sender info for quick display in message bubbles
  senderInfo?: {
    name: string;
    profileImageUrl?: string;
  };
  isReadBy?: { [userId: string]: boolean }; // Optional: track read status per participant
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

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  score: number; // e.g., number of events attended positively
  rank?: number;
}
