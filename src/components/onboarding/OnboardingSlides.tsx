
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import { ArrowLeft, ArrowRight, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideContent {
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
  Icon?: React.ElementType;
}

const slides: SlideContent[] = [
  {
    title: `${HEBREW_TEXT.general.welcome} ${HEBREW_TEXT.appName}!`,
    description: HEBREW_TEXT.general.appDescription,
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "welcome party",
    Icon: PartyPopper,
  },
  {
    title: HEBREW_TEXT.general.forCouples,
    description: "יש לכם מקומות פנויים בחתונה? אל תתנו להם להתבזבז! פרסמו את האירוע שלכם במחוברים ומצאו אורחים שישמחו להצטרף ולכסות את העלויות.",
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "wedding couple",
  },
  {
    title: HEBREW_TEXT.general.forGuests,
    description: "מחפשים אירוע להצטרף אליו ברגע האחרון? גלו חתונות עם מקומות פנויים, הצטרפו לחגיגה ותהנו מערב בלתי נשכח במחיר משתלם.",
    imageUrl: "https://placehold.co/600x400.png",
    imageHint: "wedding guests",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (1/3)`,
    description: "זוגות מפרסמים: זוגות עם מקומות פנויים יוצרים אירוע בפלטפורמה, מציינים פרטים ומחיר.",
    imageUrl: "https://placehold.co/600x300.png",
    imageHint: "event creation",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (2/3)`,
    description: "אורחים מגלים: אורחים פוטנציאליים מחפשים ומסננים אירועים לפי העדפותיהם.",
    imageUrl: "https://placehold.co/600x300.png",
    imageHint: "event discovery",
  },
  {
    title: `${HEBREW_TEXT.general.howItWorks} (3/3)`,
    description: "מתחברים וחוגגים! בקשות מאושרות, אורחים מצטרפים, והחגיגה מתחילה. כולם מרוויחים!",
    imageUrl: "https://placehold.co/600x300.png",
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
      router.push('/auth/signin');
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slide = slides[currentSlide];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] py-8 md:py-12 px-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="text-center">
          {slide.Icon && <slide.Icon className="mx-auto h-12 w-12 text-primary mb-4" />}
          <CardTitle className="font-headline text-3xl md:text-4xl">{slide.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center">
          <div className="relative w-full h-48 md:h-64 mb-6 rounded-lg overflow-hidden">
            <Image
              src={slide.imageUrl}
              alt={slide.title}
              layout="fill"
              objectFit="cover"
              data-ai-hint={slide.imageHint}
            />
          </div>
          <CardDescription className="text-lg text-foreground/80 mb-8 leading-relaxed">
            {slide.description}
          </CardDescription>
          
          <div className="flex w-full justify-between items-center mt-4">
            <Button variant="outline" onClick={handlePrev} disabled={currentSlide === 0} className={cn(currentSlide === 0 && "opacity-0 pointer-events-none")}>
              <ArrowRight className="ml-2 h-4 w-4" /> {/* Icon appears to the left in RTL */}
              {HEBREW_TEXT.general.previous}
            </Button>

            <div className="flex space-x-2 rtl:space-x-reverse">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            currentSlide === index ? "bg-primary" : "bg-muted hover:bg-primary/50"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>

            <Button onClick={handleNext} className="font-body">
              {currentSlide === slides.length - 1 ? HEBREW_TEXT.general.getStarted : HEBREW_TEXT.general.next}
              <ArrowLeft className="mr-2 h-4 w-4" /> {/* Icon appears to the right in RTL */}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
