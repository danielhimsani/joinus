
"use client";

import Link from 'next/link';
import type { EventChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { User as FirebaseUser } from 'firebase/auth';
import { Contact as UserPlaceholderIcon } from 'lucide-react';

interface MessageBubbleProps {
  message: EventChatMessage;
  currentUser: FirebaseUser | null;
}

export function MessageBubble({ message, currentUser }: MessageBubbleProps) {
  const isCurrentUserSender = currentUser?.uid === message.senderId;
  const senderName = message.senderInfo?.name || "משתמש";
  const timestamp = message.timestamp
    ? format(new Date(message.timestamp), 'HH:mm', { locale: he })
    : '';

  const AvatarComponent = () => (
    <Avatar className={cn("h-8 w-8 border", isCurrentUserSender ? "ml-2" : "mr-2")}>
      {message.senderInfo?.profileImageUrl ? (
        <AvatarImage src={message.senderInfo.profileImageUrl} alt={senderName} data-ai-hint="sender avatar"/>
      ) : (
        <AvatarFallback className="bg-muted flex items-center justify-center">
          <UserPlaceholderIcon className="h-5 w-5 text-muted-foreground" />
        </AvatarFallback>
      )}
    </Avatar>
  );

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[85%] sm:max-w-[75%] my-2",
        isCurrentUserSender ? "self-end flex-row-reverse" : "self-start"
      )}
    >
      {isCurrentUserSender ? (
        <AvatarComponent />
      ) : (
        <Link href={`/profile/${message.senderId}`} className="cursor-pointer">
            <AvatarComponent />
        </Link>
      )}
      <div
        className={cn(
          "flex flex-col rounded-lg px-3 py-2 shadow-sm",
          isCurrentUserSender
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted text-muted-foreground rounded-bl-none"
        )}
      >
        {!isCurrentUserSender && (
            <p className="text-xs font-medium mb-0.5 text-foreground/80">{senderName}</p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className={cn(
            "text-xs mt-1",
            isCurrentUserSender ? "text-primary-foreground/70 text-left" : "text-muted-foreground/70 text-right"
          )}
        >
          {timestamp}
        </p>
      </div>
    </div>
  );
}

    