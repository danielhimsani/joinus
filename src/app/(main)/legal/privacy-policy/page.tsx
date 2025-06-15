
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShieldCheck } from 'lucide-react'; // Example Icon

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex flex-col items-center">
            <ShieldCheck className="h-12 w-12 text-primary mb-3" />
            <CardTitle className="font-headline text-3xl">{HEBREW_TEXT.legal.privacyPolicyTitle}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6 leading-relaxed text-right">
          <p>אפליקציית "{HEBREW_TEXT.appName}" (להלן: "האפליקציה", "אנחנו") מכבדת את פרטיות המשתמשים. במסמך זה תוכל להבין אילו נתונים אנו אוספים, איך אנו משתמשים בהם ומהן זכויותיך.</p>
          
          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">1. מידע שאנו אוספים</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li><strong>פרטים אישיים:</strong> שם, כתובת דוא"ל, מספר טלפון (אם נמסר), תאריך לידה (לצורך אימות גיל משתמשים מעל 18), תמונת פרופיל (לבחירת המשתמש).</li>
              <li><strong>מיקום גיאוגרפי:</strong> נאסף רק בעת חיפוש אירועים בקרבת מקום, לאחר קבלת אישור.</li>
              <li><strong>גישה לגלריה:</strong> מתבצעת רק כאשר המשתמש מעלה תמונה.</li>
              <li><strong>מידע טכני:</strong> דגם מכשיר, מערכת הפעלה, גרסת אפליקציה ועוד.</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">2. שימוש במידע</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>לאימות גיל המשתמשים (מעל 18).</li>
              <li>להצגת אירועים מתאימים על בסיס מיקום.</li>
              <li>לאפשר תקשורת בין משתמשים.</li>
              <li>לשיפור השירות והגנה על המשתמשים.</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">3. שיתוף מידע</h2>
            <p>לא נשתף מידע אישי עם גורמים חיצוניים, אלא אם כן:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 pr-5">
              <li>קיבלנו אישור מהמשתמש.</li>
              <li>נדרשנו לפי חוק.</li>
              <li>לצרכים טכניים של הפעלת השירות (למשל Firebase).</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">4. אבטחת מידע</h2>
            <p>שמירת מידע בשרתים מאובטחים, הכוללים אמצעים כמו הצפנה, בקרת גישה והגנה בענן של Firebase.</p>
          </div>
          
          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">5. זכויות המשתמש</h2>
            <p>ניתן לבקש לעיין, לעדכן או למחוק את המידע האישי שלך בפנייה למייל: <a href="mailto:steven.danishevski@gmail.com" className="text-primary hover:underline">steven.danishevski@gmail.com</a></p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">6. שירותי צד שלישי</h2>
            <ul className="list-disc list-inside space-y-2 pr-5">
              <li>Firebase (ניהול משתמשים ונתונים).</li>
              <li>Google Maps (הצגת אירועים על מפה).</li>
            </ul>
          </div>
          
          <Separator />

          <div>
            <h2 className="text-xl font-semibold mt-4 mb-3 font-headline">7. שינויים</h2>
            <p>נעדכן את המדיניות מעת לעת. הודעה תינתן באפליקציה בעת שינויים מהותיים.</p>
          </div>
          
          <Separator />
          
          <p className="text-sm text-muted-foreground pt-4">עודכן לאחרונה: 15.06.2025</p>
        </CardContent>
      </Card>
    </div>
  );
}
