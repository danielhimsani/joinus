
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { EventChat } from '@/types';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format as formatDateFns, isToday, isYesterday } from 'date-fns';
import { he } from 'date-fns/locale';
import { MessageSquareText, Hash, Contact as UserPlaceholderIcon, CheckCircle, XCircle, AlertTriangle, Radio, CircleSlash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { getDisplayInitial } from '@/lib/textUtils';

interface ChatListItemProps {
  chat: EventChat;
  currentUserId: string;
}

const getChatStatusDisplay = (status: EventChat['status'], isOwner: boolean, guestName?: string): { text: string; variant: BadgeProps['variant'] } => {
  switch (status) {
    case 'pending_request':
      return { text: isOwner ? HEBREW_TEXT.chat.statusPendingDisplayOwner : HEBREW_TEXT.chat.statusPendingShortGuest, variant: 'warning' };
    case 'request_approved':
      return { text: HEBREW_TEXT.chat.statusApprovedDisplay, variant: 'success' };
    case 'request_rejected':
      return { text: HEBREW_TEXT.chat.statusRejectedDisplay, variant: 'destructive' };
    case 'active':
      return { text: HEBREW_TEXT.chat.statusActiveDisplay, variant: 'default' };
    case 'closed':
      return { text: HEBREW_TEXT.chat.statusClosedDisplay, variant: 'outline' };
    default:
      return { text: status, variant: 'default' };
  }
};


export function ChatListItem({ chat, currentUserId }: ChatListItemProps) {
  const router = useRouter();
  const isCurrentUserOwner = chat.ownerUids.includes(currentUserId);

  let avatarImageUrl: string | undefined;
  let avatarAltText: string;
  let primaryTitle: string;
  let secondaryTitle: string | undefined;
  let avatarHint: string;
  let avatarLink: string | undefined;

  if (isCurrentUserOwner) {
    avatarImageUrl = chat.guestInfo?.profileImageUrl;
    avatarAltText = chat.guestInfo?.name || HEBREW_TEXT.chat.guest;
    primaryTitle = chat.guestInfo?.name || HEBREW_TEXT.chat.guest;
    secondaryTitle = `${HEBREW_TEXT.event.eventName}: ${chat.eventInfo?.name || HEBREW_TEXT.event.eventNameGenericPlaceholder}`;
    avatarHint = "guest profile";
    avatarLink = `/profile/${chat.guestUid}`;
  } else {
    avatarImageUrl = chat.eventInfo?.imageUrl;
    avatarAltText = chat.eventInfo?.name || HEBREW_TEXT.event.eventNameGenericPlaceholder;
    primaryTitle = chat.eventInfo?.name || HEBREW_TEXT.event.eventNameGenericPlaceholder;
    avatarHint = "event image";
    avatarLink = `/events/${chat.eventId}`;
  }

  const unreadMessages = chat.unreadCount?.[currentUserId] || 0;
  const [displayTimestamp, setDisplayTimestamp] = useState<string>('');

  useEffect(() => {
    if (chat.lastMessageTimestamp) {
      const date = new Date(chat.lastMessageTimestamp);
      if (isToday(date)) {
        setDisplayTimestamp(formatDateFns(date, 'HH:mm', { locale: he }));
      } else if (isYesterday(date)) {
        setDisplayTimestamp(HEBREW_TEXT.general.yesterday);
      } else {
        setDisplayTimestamp(formatDateFns(date, 'dd/MM/yy', { locale: he }));
      }
    } else {
        setDisplayTimestamp('');
    }
  }, [chat.lastMessageTimestamp]);


  const statusDisplay = getChatStatusDisplay(chat.status, isCurrentUserOwner, chat.guestInfo?.name);

  const AvatarContent = () => (
    <Avatar className="h-12 w-12 border">
        {avatarImageUrl ? (
          <AvatarImage src={avatarImageUrl} alt={avatarAltText} data-ai-hint={avatarHint} />
        ) : (
          <AvatarFallback className="bg-muted flex items-center justify-center">
            <UserPlaceholderIcon className="h-7 w-7 text-muted-foreground" />
          </AvatarFallback>
        )}
    </Avatar>
  );

  const handleAvatarClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (avatarLink) {
      router.push(avatarLink);
    }
  };

  return (
    <Link href={`/chat/${chat.id}`} className="block hover:bg-muted/50 transition-colors rounded-lg">
      <Card className="overflow-hidden shadow-sm hover:shadow-md">
        <CardContent className="p-3 sm:p-4 flex flex-row-reverse items-start gap-3 sm:gap-4">
          {/* Avatar: Positioned on the far right */}
          <div
            onClick={avatarLink ? handleAvatarClick : undefined}
            onKeyDown={(e) => {
              if (avatarLink && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                handleAvatarClick(e);
              }
            }}
            className={cn(
              "flex-shrink-0 mt-1", 
              avatarLink && "cursor-pointer"
            )}
            role={avatarLink ? "link" : undefined}
            tabIndex={avatarLink ? 0 : undefined}
            aria-label={avatarLink ? `View profile of ${avatarAltText}` : undefined}
          >
            <AvatarContent />
          </div>

          {/* Details Wrapper: Contains all text, timestamp, and status badge. */}
          <div className="flex-1 min-w-0 flex flex-col text-right">
            {/* Primary Title and Unread Badge Row */}
            <div className="flex items-center justify-between"> {/* This container ensures title is right, badge is left */}
              <p className="text-md font-semibold truncate text-foreground" dir="rtl">{primaryTitle}</p>
              {unreadMessages > 0 && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5 leading-none h-5 shrink-0">
                  {unreadMessages}
                </Badge>
              )}
            </div>

            {/* Secondary Title (if exists) */}
            {secondaryTitle && (
              <p className="text-xs text-muted-foreground truncate mt-0.5" dir="rtl">{secondaryTitle}</p>
            )}

            {/* Last Message Text */}
            <p className={cn(
              "text-sm text-muted-foreground truncate",
              secondaryTitle ? "mt-1" : "mt-0.5",
              !chat.lastMessageText && "italic"
            )} dir="rtl">
              {chat.lastMessageSenderId === currentUserId ? `${HEBREW_TEXT.chat.you}: ` : ''}
              {chat.lastMessageText || HEBREW_TEXT.chat.noMessagesYet}
            </p>
            
            {/* Timestamp and Status Badge Row - REVERSED ORDER (Status first, then Timestamp for RTL) */}
            <div className="flex justify-between items-center mt-1.5">
                 <div className="flex-shrink-0">
                    <Badge
                        variant={statusDisplay.variant}
                        className={cn(
                        "text-xs px-2 py-0.5 leading-tight",
                        statusDisplay.variant === 'warning' && "bg-amber-500/20 text-amber-700 border-amber-500/50 dark:text-amber-400",
                        statusDisplay.variant === 'success' && "bg-green-500/20 text-green-700 border-green-500/50 dark:text-green-400"
                        )}
                    >
                        {statusDisplay.text}
                    </Badge>
                 </div>
                {displayTimestamp && (
                    <p className="text-xs text-muted-foreground/90 whitespace-nowrap">{displayTimestamp}</p>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
