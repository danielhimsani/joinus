
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState, useEffect } from "react";
import Image from "next/image";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { UserProfile } from "@/types";
import { Camera, Edit3, ShieldCheck, UploadCloud, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth as firebaseAuthInstance } from "@/lib/firebase";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "שם חייב להכיל לפחות 2 תווים." }),
  email: z.string().email({ message: "אימייל לא תקין." }).optional(),
  birthday: z.string().optional(),
  bio: z.string().max(300, { message: "ביו יכול להכיל עד 300 תווים."}).optional(),
  phone: z.string().regex(/^0\d([\d]{0,1})([-]{0,1})\d{7}$/, { message: "מספר טלפון לא תקין."}).optional(),
});

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {},
  });
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuthInstance, (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const profileData: UserProfile = {
          id: fbUser.uid, // Use Firebase UID as ID
          firebaseUid: fbUser.uid,
          name: fbUser.displayName || "משתמש",
          email: fbUser.email || "לא סופק אימייל",
          profileImageUrl: fbUser.photoURL || "https://placehold.co/150x150.png",
          // Birthday, bio, phone, isVerified would come from your Firestore DB
          // For now, they remain user-editable or default
          bio: "", // Or fetch from your DB
          phone: "", // Or fetch from your DB
          isVerified: fbUser.emailVerified, // Use Firebase email verification status
        };
        setUser(profileData);
        form.reset({
          name: profileData.name,
          email: profileData.email,
          birthday: profileData.birthday || "", // Will be empty initially
          bio: profileData.bio || "",
          phone: profileData.phone || "",
        });
      } else {
        // No user is signed in.
        setUser(null);
        setFirebaseUser(null);
        router.push('/signin'); // Redirect to sign-in if not authenticated
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [form, router]);

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    setIsSubmitting(true);
    console.log("Profile update data:", values);
    // TODO: Implement actual profile update to Firestore
    // For example: await updateUserProfileInFirestore(firebaseUser.uid, values);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update local state to reflect changes. Ideally, re-fetch from Firestore.
    setUser(prevUser => prevUser ? { 
        ...prevUser, 
        name: values.name,
        // email is usually not updated here directly if managed by Firebase Auth
        birthday: values.birthday,
        bio: values.bio,
        phone: values.phone,
    } : null);

    toast({
      title: HEBREW_TEXT.general.success,
      description: "הפרופיל עודכן בהצלחה!",
    });
    setIsEditing(false);
    setIsSubmitting(false);
  };

  const handleIdUpload = () => {
    // This would involve uploading to Firebase Storage and updating a Firestore doc
    toast({ title: "העלאת תעודת זהות", description: "פונקציונליות העלאת תעודה תמומש כאן." });
  };

  const handleSignOut = async () => {
    try {
      await firebaseAuthInstance.signOut();
      // Clear any local mock auth state if still used elsewhere
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userName');
      toast({
        title: HEBREW_TEXT.auth.signOut,
        description: "התנתקת בהצלחה. הנך מועבר לדף הבית.",
      });
      router.push('/'); // Redirect to homepage
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: HEBREW_TEXT.general.error,
        description: "שגיאה בהתנתקות.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
         <Card className="max-w-3xl mx-auto">
            <CardHeader className="items-center text-center">
                <Skeleton className="h-32 w-32 rounded-full mb-4" />
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-5 w-64" />
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-6 w-3/4" />
                    </div>
                ))}
                <Skeleton className="h-10 w-full mt-6" />
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-grow text-center">
                <div className="relative inline-block mb-4">
                  <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
                    <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="profile picture" />
                    <AvatarFallback className="text-4xl">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                      <Button variant="outline" size="icon" className="absolute bottom-0 left-0 bg-background rounded-full">
                          <Camera className="h-5 w-5"/>
                          <span className="sr-only">{HEBREW_TEXT.profile.uploadProfileImage}</span>
                          {/* TODO: Implement image upload functionality */}
                      </Button>
                  )}
                </div>
                <CardTitle className="font-headline text-3xl">{user.name}</CardTitle>
                <CardDescription className="flex items-center justify-center">
                  {user.email} 
                  {user.isVerified && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{HEBREW_TEXT.profile.verifiedBadge}</p>
                        </TooltipContent>
                      </Tooltip>
                  )}
                </CardDescription>
              </div>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon">
                    <Edit3 className="h-5 w-5" />
                    <span className="sr-only">{HEBREW_TEXT.profile.editProfile}</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                        <FormLabel>{HEBREW_TEXT.profile.email}</FormLabel>
                        <FormControl>
                          <Input disabled {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.phone}</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.birthday} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.bio} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                          <Textarea rows={4} className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-4">
                      <Button type="submit" className="flex-1 font-body" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {HEBREW_TEXT.profile.saveChanges}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 font-body" disabled={isSubmitting}>
                          ביטול
                      </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.bio}</h3>
                  <p className="text-foreground/90 whitespace-pre-line">{user.bio || "לא סופק ביו."}</p>
                </div>
                <Separator/>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.phone}</h3>
                    <p className="text-foreground/90">{user.phone || "לא סופק"}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-muted-foreground">{HEBREW_TEXT.profile.birthday}</h3>
                    <p className="text-foreground/90">{user.birthday ? new Date(user.birthday).toLocaleDateString('he-IL') : "לא סופק"}</p>
                  </div>
                </div>
                
                <Separator/>
                
                {!user.isVerified && ( // Consider if firebaseUser.emailVerified is what you mean by "isVerified" for the ID upload section
                  <Card className="bg-accent/50 p-4">
                      <CardTitle className="text-lg mb-2 flex items-center">
                          <ShieldCheck className="ml-2 h-5 w-5 text-primary"/>
                          אימות פרופיל
                      </CardTitle>
                      <CardDescription className="mb-3">
                          העלאת תעודת זהות תעזור לאמת את הפרופיל שלך ותגביר את האמון בקהילה.
                      </CardDescription>
                      <Button onClick={handleIdUpload} variant="default">
                          <UploadCloud className="ml-2 h-4 w-4"/>
                          {HEBREW_TEXT.profile.uploadIdForVerification}
                      </Button>
                  </Card>
                )}

                {/* Placeholder for past events and reviews */}
                <div className="mt-6">
                  <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.profile.pastEventsAttended}</h3>
                  <p className="text-muted-foreground">רשימת אירועים תופיע כאן.</p>
                </div>
                <div className="mt-6">
                  <h3 className="font-headline text-xl font-semibold mb-2">{HEBREW_TEXT.profile.reviews}</h3>
                  <p className="text-muted-foreground">ביקורות ממשתמשים אחרים יופיעו כאן.</p>
                </div>

                <Separator className="my-8" />

                <Button 
                  variant="ghost" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-body text-base py-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="ml-2 h-5 w-5" />
                  {HEBREW_TEXT.auth.signOut}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

    