
"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { EventChat } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { MessageSquareText, Hash, Contact as UserPlaceholderIcon } from 'lucide-react';

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
              <AvatarFallback className="bg-muted flex items-center justify-center">
                <UserPlaceholderIcon className="h-7 w-7 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <p className="text-md font-semibold truncate text-foreground">{displayName}</p>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 leading-none h-5 shrink-0">
                  {unreadMessages}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {chat.lastMessageSenderId === currentUserId ? `${HEBREW_TEXT.chat.you}: ` : ''}
              {chat.lastMessageText || HEBREW_TEXT.chat.noMessagesYet}
            </p>
            <p className="text-xs text-muted-foreground/80 text-left">
              {lastMessageTimestamp}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
