
"use client";

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Contact as UserPlaceholderIcon, MessageCircle } from "lucide-react";
import type { ApprovedGuestData } from '@/app/(main)/events/[id]/page'; // Import the shared type
import { HEBREW_TEXT } from '@/constants/hebrew-text';

interface ApprovedGuestListItemProps {
  guest: ApprovedGuestData;
}

export function ApprovedGuestListItem({ guest }: ApprovedGuestListItemProps) {
  const guestName = guest.guestInfo?.name || HEBREW_TEXT.chat.guest;
  const guestProfileImageUrl = guest.guestInfo?.profileImageUrl;

  return (
    <Card className="p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between space-x-3 rtl:space-x-reverse">
        <div className="flex items-center space-x-3 rtl:space-x-reverse flex-1 min-w-0">
          <Link href={`/profile/${guest.guestUid}`} passHref>
            <Avatar className="h-10 w-10 border cursor-pointer">
              {guestProfileImageUrl ? (
                <AvatarImage src={guestProfileImageUrl} alt={guestName} data-ai-hint="guest avatar"/>
              ) : (
                <AvatarFallback className="bg-muted">
                  <UserPlaceholderIcon className="h-6 w-6 text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          <Link href={`/profile/${guest.guestUid}`} passHref className="flex-1 min-w-0">
            <p className="font-medium truncate cursor-pointer hover:underline">{guestName}</p>
          </Link>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/chat/${guest.chatId}`}>
            <MessageCircle className="ml-1.5 h-4 w-4" />
            {HEBREW_TEXT.chat.title}
          </Link>
        </Button>
      </div>
    </Card>
  );
}
