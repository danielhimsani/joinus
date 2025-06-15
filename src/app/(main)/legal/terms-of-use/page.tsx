
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Gavel } from 'lucide-react'; // Example Icon

export default function TermsOfUsePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex flex-col items-center">
            <Gavel className="h-12 w-12 text-primary mb-3" />
            <CardTitle className="font-headline text-3xl">{HEBREW_TEXT.legal.termsOfUseTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6 leading-relaxed text-right">
          <p>ברוכים הבאים ל-{HEBREW_TEXT.appName}, אפליקציה המחברת בין בעלי אירועים לבין אורחים פוטנציאליים. השימוש באפליקציה כפוף לתנאים שלהלן.</p>
          
          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">1. גיל מינימלי</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>השימוש מותר רק למשתמשים בני 18 ומעלה.</li>
              <li>אנו מבקשים תאריך לידה כחלק מתהליך ההרשמה לצורך אימות זהות.</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">2. הרשמה</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>יש להזדהות בפרטים אמיתיים בלבד.</li>
              <li>משתמשים רשאים להזדהות גם באמצעות חשבון Apple/Google או מספר טלפון.</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">3. תקשורת בין משתמשים</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>משתמשים יכולים לשלוח הודעות אישיות באפליקציה.</li>
              <li>יש לנהוג בכבוד, ולשמור על שיח תרבותי.</li>
              <li>דיווחים על שימוש לרעה יטופלו בהתאם לשיקול דעתנו, כולל חסימת המשתמש.</li>
            </ul>
          </div>
          
          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">4. התנהגות אסורה</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>התחזות, פרסום שקר, הונאה או פגיעה במשתמשים אחרים.</li>
              <li>שליחת תכנים מטרידים, גזעניים או שיווקיים לא מורשים.</li>
              <li>כל שימוש שאינו תואם את מטרת האפליקציה.</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">5. אחריות ושירות</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>{HEBREW_TEXT.appName} היא פלטפורמה טכנולוגית בלבד ואינה אחראית לאירועים עצמם או להתנהגות המשתמשים.</li>
              <li>השירות ניתן "כמו שהוא" (AS IS) ללא התחייבות לזמינות מלאה.</li>
            </ul>
          </div>

          <Separator />
          
          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">6. הפרת תנאים</h2>
            <p>הפרת תנאים עלולה לגרור חסימת פרופיל, מחיקת חשבון או מניעת גישה.</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">7. שינויים בתנאים</h2>
            <p>נוכל לעדכן את תנאי השימוש בכל עת. הודעה תימסר באפליקציה.</p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">8. יצירת קשר</h2>
            <p>לשאלות או פניות, ניתן ליצור קשר במייל: <a href="mailto:steven.danishevski@gmail.com" className="text-primary hover:underline">steven.danishevski@gmail.com</a></p>
          </div>
          
          <Separator />
          
          <p className="text-sm text-muted-foreground pt-4">עודכן לאחרונה: 15.06.2025</p>
        </CardContent>
      </Card>
    </div>
  );
}
