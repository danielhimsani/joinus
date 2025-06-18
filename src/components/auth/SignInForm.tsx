
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore"; 

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
import { Apple, Chrome, Loader2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase"; 
import { useState, useEffect, useRef } from "react";

const emailPasswordSchema = z.object({
  email: z.string().email({ message: HEBREW_TEXT.auth.emailInvalid }),
  password: z.string().min(6, { message: HEBREW_TEXT.auth.passwordMinLengthError }),
});

const phoneSchema = z.object({
  phoneNumber: z.string().refine(val => /^\+972\d{9}$/.test(val), { message: HEBREW_TEXT.auth.invalidPhoneNumber }),
});

const otpSchema = z.object({
  otpCode: z.string().length(6, { message: HEBREW_TEXT.auth.invalidOtp }),
});


export function SignInForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [signInMethod, setSignInMethod] = useState<'email' | 'phone'>('email');

  // Email/Password states
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Social/Provider states
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingApple, setIsSubmittingApple] = useState(false); // Apple sign-in remains mock

  // Phone Auth states
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerId = "recaptcha-container-signin";

  const emailForm = useForm<z.infer<typeof emailPasswordSchema>>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { email: "", password: "" },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "+972" },
  });
  
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otpCode: "" },
  });

  useEffect(() => {
    // Cleanup reCAPTCHA on unmount
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current && typeof window !== 'undefined') {
      const verifier = new RecaptchaVerifier(firebaseAuthInstance, recaptchaContainerId, {
        size: 'invisible',
        'callback': (response: any) => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
          console.log("reCAPTCHA solved:", response);
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          console.log("reCAPTCHA expired");
          toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "אימות reCAPTCHA פג תוקף. אנא נסה לשלוח קוד שוב.", variant: "destructive" });
          if (recaptchaVerifierRef.current) { // Clear and allow re-initialization if needed
            recaptchaVerifierRef.current.clear();
            recaptchaVerifierRef.current = null; 
          }
          setIsSendingOtp(false);
        }
      });
      recaptchaVerifierRef.current = verifier;
    }
    return recaptchaVerifierRef.current;
  };

  const createUserOrUpdateDocument = async (user: User, name?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userData: any = { // Using `any` for conditional properties like createdAt
      firebaseUid: user.uid,
      name: name || user.displayName || user.phoneNumber || "משתמש חדש", // Use phone number if display name not set
      email: user.email, // Might be null for phone auth users
      profileImageUrl: user.photoURL || `https://placehold.co/150x150.png?text=${(name || user.displayName || "U").charAt(0)}`,
      updatedAt: serverTimestamp(),
    };
    if (user.phoneNumber) {
        userData.phone = user.phoneNumber;
    }

    try {
      const docSnap = await getDoc(userDocRef);
      if (!docSnap.exists()) {
        userData.createdAt = serverTimestamp();
        // For phone auth, email might not be available.
        // Name and birthday also not available initially.
        if (!userData.name && user.phoneNumber) userData.name = `משתמש ${user.phoneNumber.slice(-4)}`;
        if (!userData.email) userData.email = null; // Explicitly set to null if not present
      }
      await setDoc(userDocRef, userData, { merge: true });
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
    localStorage.setItem('userName', userNameFromForm || user.displayName || user.email || user.phoneNumber || HEBREW_TEXT.profile.verifiedBadge);
    
    await createUserOrUpdateDocument(user, userNameFromForm);
    
    toast({
      title: HEBREW_TEXT.general.success,
      description: HEBREW_TEXT.auth.phoneSignInSuccess,
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
          description = "פרטי התחברות שגויים.";
          break;
        case 'auth/invalid-email':
          description = HEBREW_TEXT.auth.emailInvalid;
          break;
        case 'auth/popup-closed-by-user':
          description = "חלון ההתחברות נסגר לפני השלמת התהליך. אנא נסה שוב.";
          break;
        case 'auth/cancelled-popup-request':
            description = "בקשת ההתחברות בוטלה. אנא נסה שוב.";
            break;
        case 'auth/operation-not-allowed':
            description = "סוג התחברות זה אינו מאופשר כרגע.";
            break;
        case 'auth/invalid-phone-number':
            description = HEBREW_TEXT.auth.invalidPhoneNumber;
            break;
        case 'auth/missing-phone-number':
            description = "מספר טלפון חסר.";
            break;
        case 'auth/captcha-check-failed':
            description = HEBREW_TEXT.auth.recaptchaError;
            break;
         case 'auth/network-request-failed':
            description = "שגיאת רשת. בדוק את חיבור האינטרנט שלך ונסה שוב.";
            break;
        case 'auth/too-many-requests':
            description = "נשלחו יותר מדי בקשות. אנא נסה שוב מאוחר יותר.";
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

  const onEmailPasswordSubmit = async (values: z.infer<typeof emailPasswordSchema>) => {
    setIsSubmittingEmail(true);
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, values.email, values.password);
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
    toast({ title: "התחברות עם אפל", description: "תהליך התחברות עם אפל מופעל (דמה)..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    const mockUser = { uid: 'mock-apple-uid-' + Date.now(), displayName: 'משתמש אפל', email: 'apple-user@example.com', photoURL: `https://placehold.co/150x150.png?text=A`} as User;
    await handleAuthSuccess(mockUser, 'משתמש אפל');
    setIsSubmittingApple(false);
  };

  const onSendOtp = async (data: z.infer<typeof phoneSchema>) => {
    setIsSendingOtp(true);
    try {
      firebaseAuthInstance.languageCode = 'he';
      const verifier = setupRecaptcha();
      if (!verifier) {
          throw new Error("RecaptchaVerifier not initialized");
      }
      const result = await signInWithPhoneNumber(firebaseAuthInstance, data.phoneNumber, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.auth.otpSent });
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Send");
      // Reset reCAPTCHA if it was rendered and caused an error, or if there's a persistent issue.
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null; // Allow re-initialization on next attempt
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onVerifyOtp = async (data: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) {
      toast({ title: HEBREW_TEXT.general.error, description: "שגיאה פנימית. אנא נסה לשלוח קוד שוב.", variant: "destructive" });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const userCredential = await confirmationResult.confirm(data.otpCode);
      await handleAuthSuccess(userCredential.user);
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Verify");
      if (error.code === 'auth/invalid-verification-code' || error.code === 'auth/code-expired') {
        otpForm.setError("otpCode", { type: "manual", message: HEBREW_TEXT.auth.invalidOtp });
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };
  
  const isLoading = isSubmittingEmail || isSubmittingGoogle || isSubmittingApple || isSendingOtp || isVerifyingOtp;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.auth.signIn}</CardTitle>
        <CardDescription>{HEBREW_TEXT.auth.signIn} {HEBREW_TEXT.general.to} {HEBREW_TEXT.appName}</CardDescription>
      </CardHeader>
      <CardContent>
        {signInMethod === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailPasswordSubmit)} className="space-y-6">
              <FormField
                control={emailForm.control}
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
                control={emailForm.control}
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
        )}

        {signInMethod === 'phone' && (
          <div className="space-y-6">
            {!isOtpSent ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.auth.phoneNumber}</FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="+972501234567" 
                            {...field} 
                            disabled={isLoading} 
                            dir="ltr"
                            value={phoneNumber}
                            onChange={(e) => {
                                setPhoneNumber(e.target.value);
                                field.onChange(e); // Ensure react-hook-form is also updated
                            }}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoading || !phoneNumber.match(/^\+972\d{9}$/)}>
                    {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {HEBREW_TEXT.auth.sendOtp}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
                   <FormField
                    control={otpForm.control}
                    name="otpCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.auth.otpCode}</FormLabel>
                        <FormControl>
                           <Input 
                            type="text" 
                            inputMode="numeric" 
                            maxLength={6} 
                            placeholder="123456" {...field} 
                            disabled={isLoading} 
                            dir="ltr" 
                            value={otpCode}
                            onChange={(e) => {
                                setOtpCode(e.target.value);
                                field.onChange(e); // Ensure react-hook-form is also updated
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoading || otpCode.length !== 6}>
                    {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {HEBREW_TEXT.auth.verifyOtp}
                  </Button>
                   <Button variant="link" onClick={() => { setIsOtpSent(false); setOtpCode(''); setConfirmationResult(null); }} className="w-full text-sm" disabled={isLoading}>
                    שנה מספר טלפון או שלח קוד מחדש
                </Button>
                </form>
              </Form>
            )}
          </div>
        )}
         {/* Container for reCAPTCHA, must be visible in the DOM for invisible reCAPTCHA */}
         <div id={recaptchaContainerId} className="my-2 flex justify-center"></div>


        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {HEBREW_TEXT.auth.phoneOrEmail}
              </span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3">
             {signInMethod === 'email' && (
                <Button variant="outline" onClick={() => setSignInMethod('phone')} disabled={isLoading}>
                    <Phone className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.switchToPhone}
                </Button>
            )}
            {signInMethod === 'phone' && (
                 <Button variant="outline" onClick={() => { setSignInMethod('email'); setIsOtpSent(false); setOtpCode(''); setConfirmationResult(null);}} disabled={isLoading}>
                    <Chrome className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.switchToEmail}
                </Button>
            )}
          </div>
           <div className="mt-3 grid grid-cols-2 gap-3">
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

