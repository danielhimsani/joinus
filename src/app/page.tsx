import MainLayout from "@/app/(main)/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { ArrowLeft, CalendarPlus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h1 className="font-headline text-5xl md:text-6xl font-bold mb-6">
            {HEBREW_TEXT.general.welcome} <span className="text-primary">{HEBREW_TEXT.appName}</span>!
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            {HEBREW_TEXT.general.appDescription}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="font-body">
              <Link href="/events/create">
                {HEBREW_TEXT.general.createYourEvent}
                <CalendarPlus className="mr-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="font-body">
              <Link href="/events">
                {HEBREW_TEXT.general.findOpenSpots}
                <Search className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8 items-center mb-16">
          <div>
            <h2 className="font-headline text-4xl font-semibold mb-4">{HEBREW_TEXT.general.forCouples}</h2>
            <p className="text-lg text-muted-foreground mb-6">
              יש לכם מקומות פנויים בחתונה? אל תתנו להם להתבזבז! פרסמו את האירוע שלכם במחוברים ומצאו אורחים שישמחו להצטרף ולכסות את העלויות.
            </p>
            <Button variant="link" asChild className="text-lg text-primary p-0">
              <Link href="/events/create">
                {HEBREW_TEXT.navigation.createEvent}
                <ArrowLeft className="mr-2 h-5 w-5 transform scale-x-[-1]" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl">
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="זוג מאושר בחתונה" 
              width={600} 
              height={400} 
              className="w-full h-auto object-cover"
              data-ai-hint="wedding couple" 
            />
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-8 items-center">
          <div className="md:order-2">
            <h2 className="font-headline text-4xl font-semibold mb-4">{HEBREW_TEXT.general.forGuests}</h2>
            <p className="text-lg text-muted-foreground mb-6">
              מחפשים אירוע להצטרף אליו ברגע האחרון? גלו חתונות עם מקומות פנויים, הצטרפו לחגיגה ותהנו מערב בלתי נשכח במחיר משתלם.
            </p>
            <Button variant="link" asChild className="text-lg text-primary p-0">
              <Link href="/events">
                {HEBREW_TEXT.event.discoverEvents}
                <ArrowLeft className="mr-2 h-5 w-5 transform scale-x-[-1]" />
              </Link>
            </Button>
          </div>
          <div className="rounded-lg overflow-hidden shadow-xl md:order-1">
             <Image 
              src="https://placehold.co/600x400.png" 
              alt="אורחים שמחים בחתונה" 
              width={600} 
              height={400} 
              className="w-full h-auto object-cover"
              data-ai-hint="wedding guests"
            />
          </div>
        </section>

        <section className="py-16">
          <h2 className="font-headline text-4xl font-semibold text-center mb-10">איך זה עובד?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <span className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-lg font-bold ml-3">1</span>
                  זוגות מפרסמים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>זוגות עם מקומות פנויים יוצרים אירוע בפלטפורמה, מציינים פרטים ומחיר.</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <span className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-lg font-bold ml-3">2</span>
                  אורחים מגלים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>אורחים פוטנציאליים מחפשים ומסננים אירועים לפי העדפותיהם.</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center">
                  <span className="bg-primary text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center text-lg font-bold ml-3">3</span>
                  מתחברים וחוגגים!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>בקשות מאושרות, אורחים מצטרפים, והחגיגה מתחילה. כולם מרוויחים!</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
