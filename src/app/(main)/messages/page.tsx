
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // CardTitle removed
import { MessageSquareText } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center"> {/* Centering icon and text */}
          <MessageSquareText className="h-10 w-10 text-primary mb-2" /> 
          {/* CardTitle removed as per request */}
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
