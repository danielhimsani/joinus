
"use client";

import type { EventChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import type { User as FirebaseUser } from 'firebase/auth';

interface MessageBubbleProps {
  message: EventChatMessage;
  currentUser: FirebaseUser | null;
}

export function MessageBubble({ message, currentUser }: MessageBubbleProps) {
  const isCurrentUserSender = currentUser?.uid === message.senderId;
  const senderName = message.senderInfo?.name || "משתמש";
  const senderInitial = senderName.charAt(0).toUpperCase();
  const timestamp = message.timestamp 
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true, locale: he })
    : '';

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[85%] sm:max-w-[75%] my-2",
        isCurrentUserSender ? "self-end flex-row-reverse" : "self-start"
      )}
    >
      <Avatar className={cn("h-8 w-8", isCurrentUserSender ? "ml-2" : "mr-2")}>
        {message.senderInfo?.profileImageUrl ? (
          <AvatarImage src={message.senderInfo.profileImageUrl} alt={senderName} data-ai-hint="sender avatar"/>
        ) : (
          <AvatarFallback className="text-xs">{senderInitial}</AvatarFallback>
        )}
      </Avatar>
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
