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
      <div className="container mx-auto px-4 py-12 md:py-16">
        <section className="text-center mb-16 md:mb-24">
          <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
            {HEBREW_TEXT.general.welcome} <span className="text-primary">{HEBREW_TEXT.appName}</span>!
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            {HEBREW_TEXT.general.appDescription}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="font-body py-3 px-6 text-lg">
              <Link href="/events/create">
                {HEBREW_TEXT.general.createYourEvent}
                <CalendarPlus className="mr-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="font-body py-3 px-6 text-lg">
              <Link href="/events">
                {HEBREW_TEXT.general.findOpenSpots}
                <Search className="mr-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-10 md:gap-12 items-center mb-16 md:mb-24">
          <div>
            <h2 className="font-headline text-3xl md:text-4xl font-semibold mb-4 tracking-tight">{HEBREW_TEXT.general.forCouples}</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              יש לכם מקומות פנויים בחתונה? אל תתנו להם להתבזבז! פרסמו את האירוע שלכם במחוברים ומצאו אורחים שישמחו להצטרף ולכסות את העלויות.
            </p>
            <Button variant="link" asChild className="text-lg text-primary p-0 font-medium">
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

        <section className="grid md:grid-cols-2 gap-10 md:gap-12 items-center mb-16 md:mb-24">
          <div className="md:order-2">
            <h2 className="font-headline text-3xl md:text-4xl font-semibold mb-4 tracking-tight">{HEBREW_TEXT.general.forGuests}</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              מחפשים אירוע להצטרף אליו ברגע האחרון? גלו חתונות עם מקומות פנויים, הצטרפו לחגיגה ותהנו מערב בלתי נשכח במחיר משתלם.
            </p>
            <Button variant="link" asChild className="text-lg text-primary p-0 font-medium">
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

        <section className="py-16 md:py-24 bg-secondary/50 rounded-lg">
          <h2 className="font-headline text-3xl md:text-4xl font-semibold text-center mb-12 tracking-tight">איך זה עובד?</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-2xl">
                  <span className="bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center text-xl font-bold ml-4">1</span>
                  זוגות מפרסמים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">זוגות עם מקומות פנויים יוצרים אירוע בפלטפורמה, מציינים פרטים ומחיר.</CardDescription>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-2xl">
                  <span className="bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center text-xl font-bold ml-4">2</span>
                  אורחים מגלים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">אורחים פוטנציאליים מחפשים ומסננים אירועים לפי העדפותיהם.</CardDescription>
              </CardContent>
            </Card>
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-2xl">
                  <span className="bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center text-xl font-bold ml-4">3</span>
                  מתחברים וחוגגים!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">בקשות מאושרות, אורחים מצטרפים, והחגיגה מתחילה. כולם מרוויחים!</CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
