
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

export type PaymentOption = 'fixed' | 'payWhatYouWant';
export type FoodType = 'meat' | 'dairy' | 'meatAndDairy' | 'vegetarian' | 'vegan' | 'kosherParve';
export type KashrutType = 'kosher' | 'notKosher';
export type WeddingType = 'traditional' | 'civil' | 'harediWithSeparation';

export interface EventOwnerInfo {
  uid: string;
  name: string;
  profileImageUrl?: string;
}

export interface Event {
  id: string;
  ownerUids: string[];
  owners?: EventOwnerInfo[]; // Denormalized owner info for quick display if needed
  name: string;
  numberOfGuests: number;
  pricePerGuest?: number;
  paymentOption: PaymentOption;
  location: string; // Formatted address
  locationDisplayName?: string; // User-friendly display name (e.g., business name)
  placeId?: string; // Google Places ID
  latitude?: number | null; // For map coordinates
  longitude?: number | null; // For map coordinates
  dateTime: Date;
  description: string;
  ageRange: [number, number];
  foodType: FoodType;
  kashrut: KashrutType;
  weddingType: WeddingType;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Represents a conversation between a guest and event owner(s)
export interface EventChat {
  id: string; // Firestore document ID (can be {eventId}_{guestUid} or auto-generated)
  eventId: string;
  guestUid: string;
  ownerUids: string[]; // UIDs of event owners involved in this chat

  // Combined [guestUid, ...ownerUids] for easy querying/rules
  // This helps in Firestore rules to check if the authenticated user is part of this chat.
  participants: string[];

  // Status to manage the lifecycle of the chat, especially concerning event requests
  // 'pending_request': Guest initiated chat, owners need to review.
  // 'active': Owners have responded, general conversation.
  // 'request_approved': Owners approved the guest's (implicit) request to join the event.
  // 'request_rejected': Owners declined the guest's (implicit) request. Chat may be closed or read-only.
  // 'closed': Chat is archived/finished, possibly read-only.
  status: 'pending_request' | 'active' | 'request_approved' | 'request_rejected' | 'closed';

  lastMessageText?: string;
  lastMessageTimestamp?: Date; // Firestore Timestamp will be converted to Date
  lastMessageSenderId?: string; // UID of the guest or one of the owners

  // Denormalized info for chat lists to avoid extra reads
  eventInfo?: {
    name: string;
    imageUrl?: string;
  };
  guestInfo?: {
    name: string;
    profileImageUrl?: string;
  };

  // Unread counts for each participant
  // e.g., { "guestUid1": 0, "ownerUidA": 2, "ownerUidB": 0 }
  // Keys are participant UIDs.
  unreadCount?: { [userId: string]: number };

  createdAt: Date; // Firestore Timestamp will be converted to Date
  updatedAt: Date; // Firestore Timestamp will be converted to Date
}

// Represents a single message within an EventChat
export interface EventChatMessage {
  id: string; // Firestore document ID (auto-generated)
  chatId: string; // ID of the parent EventChat document
  senderId: string; // UID of the guest or one of the owners who sent the message
  text: string;
  timestamp: Date; // Firestore Timestamp will be converted to Date
  imageUrl?: string; // If supporting image messages

  // Denormalized sender info for quick display in message bubbles
  // This is useful to avoid fetching sender's profile for every message.
  // It should be populated when the message is created.
  senderInfo?: {
    name: string;
    profileImageUrl?: string;
  };

  // Optional: track read status per participant if more granular control than unreadCount is needed
  // isReadBy?: { [userId: string]: boolean };
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

export interface EventAnnouncement {
  id: string; // Firestore document ID
  eventId: string;
  ownerUid: string; // UID of the owner who sent the announcement
  ownerName?: string; // Denormalized for display
  ownerProfileImageUrl?: string; // Denormalized for display
  messageText: string;
  timestamp: Date; // Firestore Timestamp
}
    
