
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareText } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-2xl md:text-3xl flex items-center">
            <MessageSquareText className="ml-3 h-7 w-7 text-primary" />
            {HEBREW_TEXT.navigation.messages}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <MessageSquareText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">
              {HEBREW_TEXT.general.loading} תכונת ההודעות...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              בקרוב תוכלו לשלוח ולקבל הודעות ישירות כאן.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
