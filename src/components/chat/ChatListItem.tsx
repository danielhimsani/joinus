
"use client";

import Link from 'next/link';
import Image from 'next/image';
import type { EventChat } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns'; 
import { he } from 'date-fns/locale';
import { MessageSquareText, Hash, Contact as UserPlaceholderIcon, CheckCircle, XCircle, AlertTriangle, Radio, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatListItemProps {
  chat: EventChat;
  currentUserId: string;
}

const getChatStatusDisplay = (status: EventChat['status'], isOwner: boolean, guestName?: string): { text: string; variant: "default" | "destructive" | "outline" | "secondary" | "warning" | "success" } => {
  switch (status) {
    case 'pending_request':
      return { text: isOwner ? HEBREW_TEXT.chat.statusPendingDisplayOwner : HEBREW_TEXT.chat.statusPendingDisplayGuest, variant: 'warning' };
    case 'request_approved':
      return { text: HEBREW_TEXT.chat.statusApprovedDisplay, variant: 'success' };
    case 'request_rejected':
      return { text: HEBREW_TEXT.chat.statusRejectedDisplay, variant: 'destructive' };
    case 'active':
      return { text: HEBREW_TEXT.chat.statusActiveDisplay, variant: 'default' }; // Or 'outline' for less emphasis
    case 'closed':
      return { text: HEBREW_TEXT.chat.statusClosedDisplay, variant: 'outline' }; // 'outline' is usually gray-ish
    default:
      return { text: status, variant: 'default' };
  }
};


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
    ? format(new Date(chat.lastMessageTimestamp), 'HH:mm', { locale: he })
    : '';

  const statusDisplay = getChatStatusDisplay(chat.status, isCurrentUserOwner, chat.guestInfo?.name);

  return (
    <Link href={`/chat/${chat.id}`} className="block hover:bg-muted/50 transition-colors rounded-lg">
      <Card className="overflow-hidden shadow-sm hover:shadow-md">
        <CardContent className="p-4 flex items-start space-x-4 rtl:space-x-reverse">
          <Avatar className="h-12 w-12 border mt-1">
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
            <p className={cn("text-sm text-muted-foreground truncate", !chat.lastMessageText && "italic")}>
              {chat.lastMessageSenderId === currentUserId ? `${HEBREW_TEXT.chat.you}: ` : ''}
              {chat.lastMessageText || HEBREW_TEXT.chat.noMessagesYet}
            </p>
            <div className="flex justify-between items-center mt-1">
              <Badge
                variant={statusDisplay.variant as any} // Cast as 'any' because our custom variants might not perfectly match Badge's
                className={cn(
                  "text-xs px-2 py-0.5 leading-tight",
                  statusDisplay.variant === 'warning' && "bg-amber-500/20 text-amber-700 border-amber-500/50 dark:text-amber-400",
                  statusDisplay.variant === 'success' && "bg-green-500/20 text-green-700 border-green-500/50 dark:text-green-400"
                )}
              >
                {statusDisplay.text}
              </Badge>
              <p className="text-xs text-muted-foreground/80">
                {lastMessageTimestamp}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
