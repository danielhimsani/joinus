
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
import { Chrome, Loader2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge"; // Import Badge

const emailPasswordSchema = z.object({
  email: z.string().email({ message: HEBREW_TEXT.auth.emailInvalid }),
  password: z.string().min(6, { message: HEBREW_TEXT.auth.passwordMinLengthError }),
});

const phoneSchema = z.object({
  phoneNumber: z.string().refine(val => /^05\d{8}$/.test(val), { message: HEBREW_TEXT.auth.invalidIsraeliPhoneNumber }),
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
  const [isSubmittingApple, setIsSubmittingApple] = useState(false);

  // Phone Auth states
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
    defaultValues: { phoneNumber: "05" },
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
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (typeof window !== 'undefined') {
      // Clear any existing verifier and its container
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = ''; // Ensure container is empty before creating new verifier
      } else {
        console.error(`[reCAPTCHA Setup - SignIn] Container with ID '${recaptchaContainerId}' not found.`);
        toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "שגיאה פנימית בהגדרת reCAPTCHA.", variant: "destructive" });
        return null;
      }

      // Create a new verifier instance
      const verifier = new RecaptchaVerifier(firebaseAuthInstance, recaptchaContainerId, {
        size: 'invisible',
        'callback': (response: any) => {
          console.log("reCAPTCHA (signin) solved (callback):", response);
        },
        'expired-callback': () => {
          console.log("reCAPTCHA (signin) expired");
          toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "אימות reCAPTCHA פג תוקף. אנא נסה לשלוח קוד שוב.", variant: "destructive" });
          setIsSendingOtp(false); // Reset sending state
          // Old verifier is already cleared and nulled if this callback is triggered after a new setup.
        }
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    }
    console.error("[reCAPTCHA Setup - SignIn] Window is undefined, cannot setup reCAPTCHA.");
    return null;
  };

  const createUserOrUpdateDocument = async (user: User, name?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userData: any = {
      firebaseUid: user.uid,
      name: name || user.displayName || user.phoneNumber || "משתמש חדש",
      email: user.email,
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
        if (!userData.name && user.phoneNumber) userData.name = `משתמש ${user.phoneNumber.slice(-4)}`;
        if (!userData.email) userData.email = null;
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
    router.push("/events");
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
            description = HEBREW_TEXT.auth.invalidIsraeliPhoneNumber;
            break;
        case 'auth/missing-phone-number':
            description = "מספר טלפון חסר.";
            break;
        case 'auth/captcha-check-failed':
             description = HEBREW_TEXT.auth.recaptchaError + " (Auth Hostname). " + error.message;
            break;
        case 'auth/network-request-failed':
            description = "שגיאת רשת. בדוק את חיבור האינטרנט שלך ונסה שוב.";
            break;
        case 'auth/too-many-requests':
            description = "נשלחו יותר מדי בקשות. אנא נסה שוב מאוחר יותר.";
            break;
        case 'auth/invalid-verification-code':
             description = HEBREW_TEXT.auth.invalidOtp;
             break;
        case 'auth/code-expired':
              description = "הקוד פג תוקף. אנא שלח קוד חדש.";
              break;
        case 'auth/internal-error': // Catches 500 errors from Identity Toolkit
             description = "שגיאה פנימית של Firebase (קוד 500). בעיה זו נגרמת לרוב מהגדרות שגויות בפרויקט Firebase שלך. אנא ודא: 1) פרויקט Firebase שלך נמצא בתכנית חיוב (Blaze). 2) אימות באמצעות מספר טלפון (Phone sign-in provider) מאופשר ב-Firebase Console. 3) מפתח ה-API של הדפדפן שלך בתצורת Firebase תקין ואינו מוגבל באופן שמונע פעולה זו. 4) הדומיין שלך (או localhost) מורשה ב-Firebase Authentication. 5) אם App Check מופעל, ודא שהוא מוגדר כראוי. אם הבעיה נמשכת, פנה לתמיכה של Firebase.";
             break;
        default:
          description = error.message || description;
      }
    }
    toast({
      title: HEBREW_TEXT.general.error,
      description: description,
      variant: "destructive",
      duration: 10000, // Longer duration for detailed error messages
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
    } catch (error: any)
    {
      handleAuthError(error, "Google");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsSubmittingApple(true);
    const providerPackage = await import("firebase/auth"); // Dynamically import
    const provider = new providerPackage.OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      await handleAuthSuccess(result.user);
    } catch (error: any) {
      handleAuthError(error, "Apple");
    } finally {
      setIsSubmittingApple(false);
    }
  };

  const onSendOtp = async (data: z.infer<typeof phoneSchema>) => {
    setIsSendingOtp(true);
    try {
      firebaseAuthInstance.languageCode = 'he';
      const verifier = setupRecaptcha();
      if (!verifier) {
          setIsSendingOtp(false); // Reset loading state if verifier setup failed
          // Toast message for container not found is handled in setupRecaptcha
          return;
      }

      let firebasePhoneNumber = data.phoneNumber;
      if (firebasePhoneNumber.startsWith('0')) {
        firebasePhoneNumber = '+972' + firebasePhoneNumber.substring(1);
      }

      const result = await signInWithPhoneNumber(firebaseAuthInstance, firebasePhoneNumber, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      otpForm.reset(); // Clear previous OTP if any
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.auth.otpSent });
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Send");
      // No need to clear verifier here, setupRecaptcha will handle it on next attempt.
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

  const isLoadingOverall = isSubmittingEmail || isSubmittingGoogle || isSubmittingApple || isSendingOtp || isVerifyingOtp;

  const resetPhoneAuthFlow = () => {
    setIsOtpSent(false);
    otpForm.reset();
    phoneForm.reset({ phoneNumber: "05" });
    setConfirmationResult(null);
    if (recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current.clear();
      recaptchaVerifierRef.current = null;
    }
    const container = document.getElementById(recaptchaContainerId);
    if (container) container.innerHTML = '';
  };

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
                      <Input type="email" placeholder="your@email.com" {...field} disabled={isLoadingOverall} />
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
                      <Input type="password" placeholder="********" {...field} disabled={isLoadingOverall} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-body" disabled={isLoadingOverall}>
                {isSubmittingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {HEBREW_TEXT.auth.signInButton}
              </Button>
            </form>
          </Form>
        )}

        {signInMethod === 'phone' && (
          <div className="space-y-6">
            {!isOtpSent ? (
              <Form {...phoneForm} key="phone-input-signin">
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
                            placeholder={HEBREW_TEXT.auth.phoneNumberPlaceholderShort}
                            {...field}
                            disabled={isLoadingOverall}
                            dir="ltr"
                            maxLength={10}
                           />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoadingOverall || !phoneForm.formState.isValid}>
                    {isSendingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {HEBREW_TEXT.auth.sendOtp}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...otpForm} key="otp-input-signin">
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
                            placeholder="123456"
                            {...field}
                            disabled={isLoadingOverall}
                            dir="ltr"
                            autoComplete="one-time-code"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoadingOverall || !otpForm.formState.isValid}>
                    {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {HEBREW_TEXT.auth.verifyOtp}
                  </Button>
                   <Button
                    variant="link"
                    type="button"
                    onClick={resetPhoneAuthFlow}
                    className="w-full text-sm"
                    disabled={isLoadingOverall}
                  >
                    שנה מספר טלפון או שלח קוד מחדש
                </Button>
                </form>
              </Form>
            )}
          </div>
        )}
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
                <div className="relative">
                    <Button variant="outline" type="button" onClick={() => { setSignInMethod('phone'); resetPhoneAuthFlow(); }} disabled={isLoadingOverall} className="w-full">
                        <Phone className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.switchToPhone}
                    </Button>
                    <Badge variant="warning" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs">בטא</Badge>
                </div>
            )}
            {signInMethod === 'phone' && (
                 <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                        setSignInMethod('email');
                        resetPhoneAuthFlow();
                    }}
                    disabled={isLoadingOverall}
                >
                    <Chrome className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.switchToEmail}
                </Button>
            )}
          </div>
           <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="outline" type="button" onClick={handleGoogleSignIn} disabled={isLoadingOverall}>
              {isSubmittingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            <div className="relative">
                <Button variant="outline" type="button" onClick={handleAppleSignIn} disabled={isLoadingOverall} className="w-full">
                {isSubmittingApple ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                    <svg
                    version="1.1"
                    id="Capa_1"
                    xmlns="http://www.w3.org/2000/svg"
                    xmlnsXlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 22.773 22.773"
                    xmlSpace="preserve"
                    fill="currentColor"
                    className="mr-2 h-4 w-4"
                    >
                    <g>
                        <g>
                        <path d="M15.769,0c0.053,0,0.106,0,0.162,0c0.13,1.606-0.483,2.806-1.228,3.675c-0.731,0.863-1.732,1.7-3.351,1.573 c-0.108-1.583,0.506-2.694,1.25-3.561C13.292,0.879,14.557,0.16,15.769,0z"/>
                        <path d="M20.67,16.716c0,0.016,0,0.03,0,0.045c-0.455,1.378-1.104,2.559-1.896,3.655c-0.723,0.995-1.609,2.334-3.191,2.334 c-1.367,0-2.275-0.879-3.676-0.903c-1.482-0.024-2.297,0.735-3.652,0.926c-0.155,0-0.31,0-0.462,0 c-0.995-0.144-1.798-0.932-2.383-1.642c-1.725-2.098-3.058-4.808-3.306-8.276c0-0.34,0-0.679,0-1.019 c0.105-2.482,1.311-4.5,2.914-5.478c0.846-0.52,2.009-0.963,3.304-0.765c0.555,0.086,1.122,0.276,1.619,0.464 c0.471,0.181,1.06,0.502,1.618,0.485c0.378-0.011,0.754-0.208,1.135-0.347c1.116-0.403,2.21-0.865,3.652-0.648 c1.733,0.262,2.963,1.032,3.723,2.22c-1.466,0.933-2.625,2.339-2.427,4.74C17.818,14.688,19.086,15.964,20.67,16.716z"/>
                        </g>
                    </g>
                    </svg>
                )}
                Apple
                </Button>
                <Badge variant="warning" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs">בטא</Badge>
            </div>
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

