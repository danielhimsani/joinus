
"use client";

import type { EventAnnouncement } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Megaphone, Contact as UserPlaceholderIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AnnouncementBubbleProps {
  announcement: EventAnnouncement;
}

export function AnnouncementBubble({ announcement }: AnnouncementBubbleProps) {
  const timestamp = announcement.timestamp
    ? format(new Date(announcement.timestamp), 'dd/MM/yy HH:mm', { locale: he })
    : '';

  const ownerName = announcement.ownerName || "בעל אירוע";

  return (
    <div className="my-3 w-full flex justify-center px-2">
      <Card className="w-full max-w-xl shadow-md bg-primary/10 border-primary/50 dark:bg-primary/20 dark:border-primary/60">
        <CardHeader className="p-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="p-2 bg-primary/20 dark:bg-primary/30 rounded-full">
                <Megaphone className="h-5 w-5 text-primary dark:text-primary-foreground/90" />
            </div>
            <CardTitle className="text-sm font-semibold text-primary dark:text-primary-foreground/90">הודעה מבעלי האירוע</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-sm text-foreground/90 dark:text-foreground/80 whitespace-pre-line" dir="rtl">{announcement.messageText}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/30 dark:border-primary/40">
            <div className='flex items-center text-xs text-muted-foreground dark:text-primary-foreground/70'>
                <Avatar className="h-6 w-6 ml-1.5 border border-primary/60 dark:border-primary/70">
                    {announcement.ownerProfileImageUrl ? (
                        <AvatarImage src={announcement.ownerProfileImageUrl} alt={ownerName} data-ai-hint="owner avatar"/>
                    ) : (
                        <AvatarFallback className="text-xs bg-primary/20 dark:bg-primary/30 text-primary dark:text-primary-foreground/90">
                            {ownerName?.charAt(0)?.toUpperCase() || 'A'}
                        </AvatarFallback>
                    )}
                </Avatar>
                {ownerName}
            </div>
            <span className="text-xs text-muted-foreground dark:text-primary-foreground/70">{timestamp}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

