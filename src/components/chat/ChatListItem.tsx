
"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { EventChat } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card'; // Added Card for better structure
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { MessageSquareText, Hash } from 'lucide-react'; // Icons

interface ChatListItemProps {
  chat: EventChat;
  currentUserId: string;
}

export function ChatListItem({ chat, currentUserId }: ChatListItemProps) {
  const isCurrentUserOwner = chat.ownerUids.includes(currentUserId);
  
  const displayName = isCurrentUserOwner 
    ? chat.guestInfo?.name || HEBREW_TEXT.chat.guest
    : chat.eventInfo?.name || HEBREW_TEXT.event.eventName;

  const displayImageUrl = isCurrentUserOwner 
    ? chat.guestInfo?.profileImageUrl
    : chat.eventInfo?.imageUrl;
  
  const fallbackInitial = (isCurrentUserOwner
    ? chat.guestInfo?.name?.charAt(0)
    : chat.eventInfo?.name?.charAt(0)
  ) || '?';

  const unreadMessages = chat.unreadCount?.[currentUserId] || 0;

  const lastMessageTimestamp = chat.lastMessageTimestamp 
    ? formatDistanceToNow(new Date(chat.lastMessageTimestamp), { addSuffix: true, locale: he }) 
    : '';

  return (
    <Link href={`/chat/${chat.id}`} className="block hover:bg-muted/50 transition-colors rounded-lg">
      <Card className="overflow-hidden shadow-sm hover:shadow-md">
        <CardContent className="p-4 flex items-center space-x-4 rtl:space-x-reverse">
          <Avatar className="h-12 w-12 border">
            {displayImageUrl ? (
              <AvatarImage src={displayImageUrl} alt={displayName} data-ai-hint={isCurrentUserOwner ? "guest profile" : "event image"}/>
            ) : (
              isCurrentUserOwner ? <MessageSquareText className="h-6 w-6 text-muted-foreground"/> : <Hash className="h-6 w-6 text-muted-foreground"/>
            )}
            <AvatarFallback className="text-lg">{fallbackInitial.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <p className="text-md font-semibold truncate text-foreground">{displayName}</p>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 leading-none h-5 shrink-0">
                  {unreadMessages}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {chat.lastMessageSenderId === currentUserId ? `${HEBREW_TEXT.chat.you}: ` : ''}
              {chat.lastMessageText || HEBREW_TEXT.chat.noMessagesYet}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1 text-left">
              {lastMessageTimestamp}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
