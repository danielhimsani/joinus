
"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link'; // Import Link
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { ArrowLeft, ArrowRight, LogIn, PartyPopper } from 'lucide-react'; // Added LogIn
import { cn } from '@/lib/utils';

interface SlideContent {
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  Icon?: React.ElementType;
  isLogo?: boolean; // Flag to indicate if this slide uses the logo
}

const slides: SlideContent[] = [
  {
    title: `${HEBREW_TEXT.general.welcome} ${HEBREW_TEXT.appName}!`,
    description: HEBREW_TEXT.general.appDescription,
    imageUrl: "/app_logo.png", // Remains as app logo
    imageHint: "app logo",
    Icon: PartyPopper,
    isLogo: true,
  },
  {
    title: HEBREW_TEXT.general.forCouples,
    description: "יש לכם מקומות פנויים בחתונה? אל תתנו להם להתבזבז! פרסמו את האירוע שלכם במחוברים ומצאו אורחים שישמחו להצטרף ולכסות את העלויות.",
    imageUrl: "/onboarding/slide-2.png",
    imageHint: "wedding couple",
  },
  {
    title: HEBREW_TEXT.general.forGuests,
    description: "מחפשים אירוע להצטרף אליו ברגע האחרון? גלו חתונות עם מקומות פנויים, הצטרפו לחגיגה ותהנו מערב בלתי נשכח במחיר משתלם.",
    imageUrl: "/onboarding/slide-3.png",
    imageHint: "wedding guests",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (1/3)`,
    description: "זוגות מפרסמים: זוגות עם מקומות פנויים יוצרים אירוע בפלטפורמה, מציינים פרטים ומחיר.",
    imageUrl: "/onboarding/slide-4.png",
    imageHint: "event creation",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (2/3)`,
    description: "אורחים מגלים: אורחים פוטנציאליים מחפשים ומסננים אירועים לפי העדפותיהם.",
    imageUrl: "/onboarding/slide-5.png",
    imageHint: "event discovery",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (3/3)`,
    description: "מתחברים וחוגגים! בקשות מאושרות, אורחים מצטרפים, והחגיגה מתחילה. כולם מרוויחים!",
    imageUrl: "/onboarding/slide-6.png",
    imageHint: "celebration connection",
  },
];

export function OnboardingSlides() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/signin');
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];
  const isFinalSlide = currentSlide === slides.length - 1;

  return (
    <div className="relative flex flex-col min-h-screen items-center justify-between bg-background text-foreground p-4 md:p-6 overflow-y-auto">
      {/* Skip to Login Button */}
      <Button
        variant="ghost"
        asChild
        className="absolute top-4 left-4 md:top-6 md:left-6 z-20 text-sm"
      >
        <Link href="/signin">
          <LogIn className="ml-2 h-4 w-4" /> {/* Using ml-2 for RTL spacing */}
          {HEBREW_TEXT.auth.signIn}
        </Link>
      </Button>

      {isFinalSlide && !isFinalSlide && ( // This condition was contradictory, fixed to show back button if NOT final slide AND not first slide
        <Button variant="ghost" size="icon" onClick={handlePrev} className="absolute top-6 right-6 z-20">
          <ArrowRight className="h-5 w-5" /> {/* Visually points left in RTL for "back" */}
        </Button>
      )}

      <div className="flex flex-col items-center text-center flex-grow justify-center w-full max-w-2xl pt-10 md:pt-16">
        {slide.Icon && <slide.Icon className="mx-auto h-10 w-10 md:h-12 md:w-12 text-primary mb-4" />}
        <h1 className="font-headline text-2xl md:text-4xl font-bold mb-3">{slide.title}</h1>

        <div className={cn(
            "relative w-full my-4 md:my-6 rounded-lg overflow-hidden",
            slide.isLogo ? "h-32 md:h-40" : "h-40 md:h-64" // Adjusted height for logo
        )}>
          <Image
            src={slide.imageUrl}
            alt={slide.title}
            layout="fill"
            objectFit={slide.isLogo ? "contain" : "cover"} // Use "contain" for logo
            data-ai-hint={slide.imageHint}
            priority={currentSlide === 0} // Prioritize first image
          />
        </div>
        <p className="text-base md:text-lg text-foreground/80 mb-6 md:mb-8 leading-relaxed px-2">
          {slide.description}
        </p>
      </div>

      <div className="flex space-x-2 rtl:space-x-reverse my-6 md:my-8 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={cn(
              "h-2.5 w-2.5 rounded-full transition-all duration-300 ease-in-out",
              currentSlide === index ? "bg-primary w-6" : "bg-muted hover:bg-primary/50"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <div className="w-full pb-6 pt-2 z-10">
        {isFinalSlide ? (
          <Button onClick={() => router.push('/signin')} className="font-body text-lg py-3 w-full max-w-xs mx-auto block">
            {HEBREW_TEXT.auth.signInButton}
          </Button>
        ) : (
          <div className="flex w-full justify-between items-center max-w-md mx-auto">
            <Button variant="outline" onClick={handlePrev} disabled={currentSlide === 0} className={cn(currentSlide === 0 && "opacity-0 pointer-events-none")}>
              <ArrowRight className="ml-2 h-4 w-4" /> {/* Points left in RTL */}
              {HEBREW_TEXT.general.previous}
            </Button>
            <Button onClick={handleNext} className="font-body">
              {HEBREW_TEXT.general.next}
              <ArrowLeft className="mr-2 h-4 w-4" /> {/* Points right in RTL */}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
