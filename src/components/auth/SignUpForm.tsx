
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; // Firestore imports

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import { Apple, Chrome, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase"; // Import your initialized auth and db instances
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להכיל לפחות 2 תווים." }),
  email: z.string().email({ message: "אנא הכנס כתובת אימייל תקינה." }),
  password: z.string().min(6, { message: "סיסמה חייבת להכיל לפחות 6 תווים." }),
});

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingApple, setIsSubmittingApple] = useState(false); // Apple sign-up remains mock

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const createUserDocument = async (user: User, name?: string, profileImageUrl?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userData = {
      firebaseUid: user.uid,
      name: name || user.displayName || "משתמש חדש",
      email: user.email,
      profileImageUrl: profileImageUrl || user.photoURL || `https://placehold.co/150x150.png?text=${(name || user.displayName || "U").charAt(0)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // You can add other default fields for a new user profile here
      // e.g., bio: "", phone: "", birthday: ""
    };
    try {
      await setDoc(userDocRef, userData);
      console.log("User document created/updated in Firestore for UID:", user.uid);
    } catch (error) {
      console.error("Error creating/updating user document in Firestore:", error);
      toast({
        title: "שגיאת שמירת פרופיל",
        description: "הייתה בעיה בשמירת פרטי הפרופיל שלך. ייתכן שתצטרך לעדכן אותם ידנית.",
        variant: "destructive",
      });
    }
  };


  const handleSignUpSuccess = async (user: User, formValues?: { name: string }) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', formValues?.name || user.displayName || user.email || 'משתמש חדש');
    
    await createUserDocument(user, formValues?.name);

    toast({
      title: HEBREW_TEXT.general.success,
      description: "נרשמת והתחברת בהצלחה!",
    });
    router.push("/events"); 
  };
  
  const handleAuthError = (error: any, method: string) => {
    console.error(`${method} Sign Up Error:`, error);
    let description = "שגיאה בהרשמה. נסה שוב.";
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          description = "כתובת אימייל זו כבר רשומה.";
          break;
        case 'auth/invalid-email':
          description = "כתובת האימייל אינה תקינה.";
          break;
        case 'auth/weak-password':
          description = "הסיסמה חלשה מדי. נסה סיסמה חזקה יותר.";
          break;
        case 'auth/popup-closed-by-user':
          description = "חלון ההרשמה נסגר לפני השלמת התהליך. אנא נסה שוב. אם הבעיה חוזרת, בדוק אם חוסם חלונות קופצים פעיל בדפדפן שלך.";
          break;
        case 'auth/cancelled-popup-request':
            description = "בקשת ההרשמה בוטלה מכיוון שנפתחה בקשה נוספת. אנא נסה שוב.";
            break;
        case 'auth/operation-not-allowed':
            description = "סוג הרשמה זה אינו מאופשר כרגע. פנה לתמיכה.";
            break;
        default:
          description = error.message || description;
      }
    }
    toast({
      title: HEBREW_TEXT.general.error,
      description: description,
      variant: "destructive",
    });
  };

  const onEmailPasswordSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmittingEmail(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.name });
      console.log("Email/Password Sign Up Success:", userCredential.user);
      await handleSignUpSuccess(userCredential.user, { name: values.name });
    } catch (error: any) {
      handleAuthError(error, "Email/Password");
    } finally {
      setIsSubmittingEmail(false);
    }
  };
  
  const handleGoogleSignUp = async () => {
    setIsSubmittingGoogle(true);
    const provider = new GoogleAuthProvider();
    console.log("Attempting Google Sign-Up with auth instance:", firebaseAuthInstance);
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      console.log("Google Sign Up/In Success:", result.user);
      await handleSignUpSuccess(result.user);
    } catch (error: any) {
      handleAuthError(error, "Google");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignUp = async () => { 
    setIsSubmittingApple(true);
    console.log("Attempting Apple Sign Up (Mock)");
    toast({ title: "הרשמה עם אפל", description: "תהליך הרשמה עם אפל מופעל (דמה)..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    const mockUser = { 
      uid: 'mock-apple-uid-' + Date.now(), 
      displayName: 'משתמש אפל', 
      email: 'apple-user@example.com',
      photoURL: `https://placehold.co/150x150.png?text=A`,
    } as User; 

    await handleSignUpSuccess(mockUser, { name: 'משתמש אפל' });
    setIsSubmittingApple(false);
  };

  const isLoading = isSubmittingEmail || isSubmittingGoogle || isSubmittingApple;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.auth.signUp}</CardTitle>
        <CardDescription>{HEBREW_TEXT.auth.signUp} {HEBREW_TEXT.general.to} {HEBREW_TEXT.appName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEmailPasswordSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                  <FormControl>
                    <Input placeholder="שם מלא" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.auth.email}</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="your@email.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.auth.password}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-body" disabled={isLoading}>
              {isSubmittingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {HEBREW_TEXT.auth.signUpButton}
            </Button>
          </form>
        </Form>
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                או הירשם עם
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={handleGoogleSignUp} disabled={isLoading}>
              {isSubmittingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            <Button variant="outline" onClick={handleAppleSignUp} disabled={isLoading}>
              {isSubmittingApple ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Apple className="mr-2 h-4 w-4" />}
              Apple
            </Button>
          </div>
        </div>
        <div className="mt-6 text-center text-sm">
          <Link href="/signin" className="underline">
            {HEBREW_TEXT.auth.alreadyHaveAccount}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
