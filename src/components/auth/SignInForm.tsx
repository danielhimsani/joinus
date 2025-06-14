
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, type User } from "firebase/auth";
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
  email: z.string().email({ message: "אנא הכנס כתובת אימייל תקינה." }),
  password: z.string().min(6, { message: "סיסמה חייבת להכיל לפחות 6 תווים." }),
});

export function SignInForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingApple, setIsSubmittingApple] = useState(false); // Apple sign-in remains mock

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const createUserOrUpdateDocument = async (user: User, name?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userData = {
      firebaseUid: user.uid,
      name: name || user.displayName || "משתמש", // Use provided name, then auth display name, then default
      email: user.email,
      profileImageUrl: user.photoURL || `https://placehold.co/150x150.png?text=${(name || user.displayName || "U").charAt(0)}`,
      updatedAt: serverTimestamp(),
      // For creation, you might want a `createdAt` field conditionally.
      // Using merge:true handles both create and update.
      // If you want 'createdAt' only on actual creation:
      // const docSnap = await getDoc(userDocRef);
      // if (!docSnap.exists()) {
      //   userData.createdAt = serverTimestamp();
      // }
    };
    try {
      // Using { merge: true } will create the document if it doesn't exist,
      // or update it if it does, only changing the fields provided.
      // If you want `createdAt` only on new docs, you need a getDoc check first.
      // For simplicity, just setDoc with merge is often fine.
      await setDoc(userDocRef, { ...userData, createdAt: serverTimestamp() }, { merge: true });
      // If you want to be more specific about setting createdAt only on new docs:
      // const docSnap = await getDoc(userDocRef);
      // if (!docSnap.exists()) {
      //   await setDoc(userDocRef, { ...userData, createdAt: serverTimestamp() });
      // } else {
      //   await setDoc(userDocRef, userData, { merge: true });
      // }
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

  const handleAuthSuccess = async (user: User, userNameFromForm?: string) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', userNameFromForm || user.displayName || user.email || 'משתמש מאומת');
    
    await createUserOrUpdateDocument(user, userNameFromForm);
    
    toast({
      title: HEBREW_TEXT.general.success,
      description: "התחברת בהצלחה!",
    });
    router.push("/"); 
  };

  const handleAuthError = (error: any, method: string) => {
    console.error(`${method} Sign In Error:`, error);
    let description = "שגיאה בהתחברות. נסה שוב.";
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          description = "אימייל או סיסמה שגויים.";
          break;
        case 'auth/invalid-email':
          description = "כתובת האימייל אינה תקינה.";
          break;
        case 'auth/popup-closed-by-user':
          description = "חלון ההתחברות נסגר לפני השלמת התהליך. אנא נסה שוב. אם הבעיה חוזרת, בדוק אם חוסם חלונות קופצים פעיל בדפדפן שלך.";
          break;
        case 'auth/cancelled-popup-request':
            description = "בקשת ההתחברות בוטלה מכיוון שנפתחה בקשה נוספת. אנא נסה שוב.";
            break;
        case 'auth/operation-not-allowed':
            description = "סוג התחברות זה אינו מאופשר כרגע. פנה לתמיכה.";
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
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, values.email, values.password);
      // For email/password, displayName might not be set in Firebase Auth directly on sign-in
      // We'll rely on the Firestore document to have the name, or use email if not.
      await handleAuthSuccess(userCredential.user, userCredential.user.displayName || values.email); 
    } catch (error: any) {
      handleAuthError(error, "Email/Password");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmittingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      await handleAuthSuccess(result.user);
    } catch (error: any) {
      handleAuthError(error, "Google");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => { 
    setIsSubmittingApple(true);
    console.log("Attempting Apple Sign In (Mock)");
    toast({ title: "התחברות עם אפל", description: "תהליך התחברות עם אפל מופעל (דמה)..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    
    const mockUser = { 
        uid: 'mock-apple-uid-' + Date.now(), 
        displayName: 'משתמש אפל', 
        email: 'apple-user@example.com',
        photoURL: `https://placehold.co/150x150.png?text=A`,
    } as User;

    await handleAuthSuccess(mockUser, 'משתמש אפל');
    setIsSubmittingApple(false);
  };

  const isLoading = isSubmittingEmail || isSubmittingGoogle || isSubmittingApple;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.auth.signIn}</CardTitle>
        <CardDescription>{HEBREW_TEXT.auth.signIn} {HEBREW_TEXT.general.to} {HEBREW_TEXT.appName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onEmailPasswordSubmit)} className="space-y-6">
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
              {HEBREW_TEXT.auth.signInButton}
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
                או המשך עם
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isSubmittingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            <Button variant="outline" onClick={handleAppleSignIn} disabled={isLoading}>
              {isSubmittingApple ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Apple className="mr-2 h-4 w-4" />}
              Apple
            </Button>
          </div>
        </div>
        <div className="mt-6 text-center text-sm">
          <Link href="/signup" className="underline">
            {HEBREW_TEXT.auth.noAccount}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
