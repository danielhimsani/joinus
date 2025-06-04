"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { Apple, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להכיל לפחות 2 תווים." }),
  email: z.string().email({ message: "אנא הכנס כתובת אימייל תקינה." }),
  password: z.string().min(6, { message: "סיסמה חייבת להכיל לפחות 6 תווים." }),
});

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  // Mock sign up function
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("Sign up attempt:", values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: HEBREW_TEXT.general.success,
      description: "נרשמת בהצלחה! אנא התחבר.",
    });
    router.push("/auth/signin");
  };
  
  const handleGoogleSignIn = async () => {
    console.log("Attempting Google Sign In for Sign Up");
    toast({ title: "הרשמה עם גוגל", description: "תהליך הרשמה עם גוגל מופעל..." });
     // Simulate successful login
    await new Promise(resolve => setTimeout(resolve, 1000));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', 'משתמש גוגל חדש');
    router.push("/");
  };

  const handleAppleSignIn = async () => {
    console.log("Attempting Apple Sign In for Sign Up");
    toast({ title: "הרשמה עם אפל", description: "תהליך הרשמה עם אפל מופעל..." });
    // Simulate successful login
    await new Promise(resolve => setTimeout(resolve, 1000));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', 'משתמש אפל חדש');
    router.push("/");
  };


  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.auth.signUp}</CardTitle>
        <CardDescription>{HEBREW_TEXT.auth.signUp} {HEBREW_TEXT.general.to} {HEBREW_TEXT.appName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                  <FormControl>
                    <Input placeholder="שם מלא" {...field} />
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
                    <Input type="email" placeholder="your@email.com" {...field} />
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
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-body">
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
             <Button variant="outline" onClick={handleGoogleSignIn}>
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
            <Button variant="outline" onClick={handleAppleSignIn}>
              <Apple className="mr-2 h-4 w-4" />
              Apple
            </Button>
          </div>
        </div>
        <div className="mt-6 text-center text-sm">
          <Link href="/auth/signin" className="underline">
            {HEBREW_TEXT.auth.alreadyHaveAccount}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
