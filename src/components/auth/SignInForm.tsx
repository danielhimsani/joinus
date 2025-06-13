
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth"; // Firebase imports

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
import { auth as firebaseAuthInstance } from "@/lib/firebase"; // Import your initialized auth instance
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
  const [isSubmittingApple, setIsSubmittingApple] = useState(false);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleAuthSuccess = (user: User | null, providerName: string) => {
    // Mock: Store auth status. Replace with actual session management (e.g., Firebase Auth listener)
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', user?.displayName || user?.email?.split('@')[0] || `משתמש ${providerName}`);
    
    toast({
      title: HEBREW_TEXT.general.success,
      description: "התחברת בהצלחה!",
    });
    router.push("/"); // Redirect to home page or dashboard
  };

  // Mock email/password sign in function
  const onEmailPasswordSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmittingEmail(true);
    console.log("Email/Password sign in attempt:", values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful login (mock)
    handleAuthSuccess({ email: values.email, displayName: values.email.split('@')[0] } as User, "אימייל");
    setIsSubmittingEmail(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmittingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      // This gives you a Google Access Token. You can use it to access the Google API.
      // const credential = GoogleAuthProvider.credentialFromResult(result);
      // const token = credential?.accessToken;
      const user = result.user;
      console.log("Google Sign In Success:", user);
      handleAuthSuccess(user, "Google");
    } catch (error: any) {
      console.error("Google Sign In Error:", error);
      toast({
        title: HEBREW_TEXT.general.error,
        description: error.message || "שגיאה בהתחברות עם גוגל.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSubmittingApple(true);
    console.log("Attempting Apple Sign In (Mock)");
    toast({ title: "התחברות עם אפל", description: "תהליך התחברות עם אפל מופעל (דמה)..." });
    // Simulate successful login (mock)
    await new Promise(resolve => setTimeout(resolve, 1000));
    handleAuthSuccess({ displayName: "משתמש אפל" } as User, "Apple");
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
          <Link href="/signup" className="underline"> {/* Changed from /auth/signup to /signup based on existing structure */}
            {HEBREW_TEXT.auth.noAccount}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
