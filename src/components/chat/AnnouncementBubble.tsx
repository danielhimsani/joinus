
"use client";

import type { EventAnnouncement } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Megaphone, Contact as UserPlaceholderIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HEBREW_TEXT } from '@/constants/hebrew-text';

interface AnnouncementBubbleProps {
  announcement: EventAnnouncement;
}

export function AnnouncementBubble({ announcement }: AnnouncementBubbleProps) {
  const timestamp = announcement.timestamp
    ? format(new Date(announcement.timestamp), 'dd/MM/yy HH:mm', { locale: he })
    : '';

  const ownerName = announcement.ownerName || "בעל אירוע";

  return (
    <div className="my-4 w-full flex justify-center px-2">
      <Card className="w-full max-w-xl shadow-md bg-muted/30 dark:bg-card border-2 border-primary">
        <CardHeader className="p-3 flex justify-start  items-center">
          <div className="flex items-center flex-row-reverse space-x-2 rtl:space-x-reverse">
            <div className="p-2 bg-primary/10 rounded-full">
                <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary">הודעה לכל המוזמנים</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-sm text-foreground whitespace-pre-line" dir="rtl">{announcement.messageText}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/40">
            <div className='flex items-center text-xs text-muted-foreground'>
                <Avatar className="h-6 w-6 ml-2 border border-primary/50">
                    {announcement.ownerProfileImageUrl ? (
                        <AvatarImage src={announcement.ownerProfileImageUrl} alt={ownerName} data-ai-hint="owner avatar"/>
                    ) : (
                        <AvatarFallback className="text-xs bg-muted">
                           <UserPlaceholderIcon className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                    )}
                </Avatar>
                {ownerName}
            </div>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

