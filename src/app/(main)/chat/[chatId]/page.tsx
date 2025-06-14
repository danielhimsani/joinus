
// src/app/(main)/chat/[chatId]/page.tsx
"use client";

import { useParams } from 'next/navigation';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  // Placeholder content - full implementation will follow
  const [isLoading, setIsLoading] = useState(true); // Simulate loading

  useEffect(() => {
    // Simulate data fetching
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [chatId]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline">
            {HEBREW_TEXT.chat.title} (ID: {chatId})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <p className="text-muted-foreground text-lg">
              {HEBREW_TEXT.general.loading} {HEBREW_TEXT.chat.title}...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              בקרוב תוכלו לנהל שיחות כאן.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Need to import useState and useEffect for the placeholder
import { useState, useEffect } from 'react';

    