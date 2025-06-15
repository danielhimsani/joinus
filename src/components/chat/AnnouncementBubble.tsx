
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
      <Card className="w-full max-w-xl shadow-md bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50">
        <CardHeader className="p-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-full">
                <Megaphone className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <CardTitle className="text-sm font-semibold text-amber-800 dark:text-amber-300">הודעה מבעלי האירוע</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line dir-rtl">{announcement.messageText}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-700/40">
            <div className='flex items-center text-xs text-gray-500 dark:text-gray-400'>
                <Avatar className="h-6 w-6 ml-1.5 border border-amber-300 dark:border-amber-600">
                    {announcement.ownerProfileImageUrl ? (
                        <AvatarImage src={announcement.ownerProfileImageUrl} alt={ownerName} data-ai-hint="owner avatar"/>
                    ) : (
                        <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300">
                            {ownerName?.charAt(0)?.toUpperCase() || 'A'}
                        </AvatarFallback>
                    )}
                </Avatar>
                {ownerName}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{timestamp}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
