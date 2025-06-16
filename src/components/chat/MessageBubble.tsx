
"use client";

import Link from 'next/link';
import type { EventChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { User as FirebaseUser } from 'firebase/auth';
import { Contact as UserPlaceholderIcon } from 'lucide-react';
import React from 'react'; // Import React

interface MessageBubbleProps {
  message: EventChatMessage;
  currentUser: FirebaseUser | null;
}

const MessageBubbleComponent = ({ message, currentUser }: MessageBubbleProps) => {
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
      dir="ltr" // Overall direction for layout purposes (avatar left/right of bubble)
      className={cn(
        "flex items-end gap-2 max-w-[85%] sm:max-w-[75%] my-2",
        isCurrentUserSender ? "self-end flex-row-reverse" : "self-start" // flex-row-reverse for sender places avatar to the right of bubble in LTR
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
        dir="rtl" // Text direction within the bubble content is RTL
        className={cn(
          "flex flex-col rounded-lg px-3 py-2 shadow-sm",
          isCurrentUserSender
            ? "bg-primary text-primary-foreground rounded-br-none" // Bottom-right corner not rounded for sender's bubble
            : "bg-muted text-muted-foreground rounded-bl-none"   // Bottom-left corner not rounded for other's bubble
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
            // In dir="rtl" bubble: text-left is visual right, text-right is visual left.
            // This seems to correctly place timestamp at the "end" of the last line of text.
          )}
        >
          {timestamp}
        </p>
      </div>
    </div>
  );
}

export const MessageBubble = React.memo(MessageBubbleComponent);
    
