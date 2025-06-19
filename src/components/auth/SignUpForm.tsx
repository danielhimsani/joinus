
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User } from "firebase/auth";
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
import { Badge } from "@/components/ui/badge";

const emailPasswordSchema = z.object({
  name: z.string().min(2, { message: HEBREW_TEXT.profile.nameMinLengthError }),
  email: z.string().email({ message: HEBREW_TEXT.auth.emailInvalid }),
  password: z.string().min(6, { message: HEBREW_TEXT.auth.passwordMinLengthError }),
  birthday: z.string().min(1, { message: HEBREW_TEXT.profile.birthdayRequiredError }),
});

const phoneSchema = z.object({
  phoneNumber: z.string().refine(val => /^05\d{8}$/.test(val), { message: HEBREW_TEXT.auth.invalidIsraeliPhoneNumber }),
  name: z.string().min(2, { message: HEBREW_TEXT.profile.nameMinLengthError }),
  birthday: z.string().min(1, { message: HEBREW_TEXT.profile.birthdayRequiredError }),
});

const otpSchema = z.object({
  otpCode: z.string().length(6, { message: HEBREW_TEXT.auth.invalidOtp }),
});


export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [signUpMethod, setSignUpMethod] = useState<'email' | 'phone'>('email');

  // Email/Password states
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);

  // Social/Provider states
  const [isSubmittingGoogle, setIsSubmittingGoogle] = useState(false);
  const [isSubmittingApple, setIsSubmittingApple] = useState(false);

  // Phone Auth states
  const [persistedNameForOtp, setPersistedNameForOtp] = useState("");
  const [persistedBirthdayForOtp, setPersistedBirthdayForOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null); // To store widget ID
  const recaptchaContainerId = "recaptcha-container-signup";


  const emailForm = useForm<z.infer<typeof emailPasswordSchema>>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: { name: "", email: "", password: "", birthday: "" },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "05", name: "", birthday: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otpCode: "" },
  });

   useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.warn("Error clearing reCAPTCHA verifier on SignUpForm unmount:", e);
        }
        recaptchaVerifierRef.current = null;
      }
      if (recaptchaWidgetIdRef.current !== null && typeof window !== 'undefined' && (window as any).grecaptcha) {
        try {
            (window as any).grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch(e) {
            console.warn("Error resetting reCAPTCHA widget on unmount:", e);
        }
        recaptchaWidgetIdRef.current = null;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear(); 
        } catch (e) {
          console.warn("[reCAPTCHA SignUp] Error clearing previous reCAPTCHA verifier UI:", e);
        }
        recaptchaVerifierRef.current = null; 
      }
      if (recaptchaWidgetIdRef.current !== null && typeof window !== 'undefined' && (window as any).grecaptcha) {
        try {
            (window as any).grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch(e) {
            console.warn("Error resetting reCAPTCHA widget during setup:", e);
        }
        recaptchaWidgetIdRef.current = null;
      }


      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = ''; 
      } else {
        console.error(`[reCAPTCHA SignUp] Critical: Container element with ID '${recaptchaContainerId}' NOT FOUND in the DOM.`);
        toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "שגיאה קריטית: מיקום הרכיב לאימות reCAPTCHA לא נמצא. (ID: " + recaptchaContainerId + ")", variant: "destructive", duration: 10000 });
        return null; 
      }

      console.log(`[reCAPTCHA Setup - SignUp] Creating new RecaptchaVerifier for container '${recaptchaContainerId}'.`);
      try {
        const verifier = new RecaptchaVerifier(firebaseAuthInstance, recaptchaContainerId, {
          size: 'invisible',
          'callback': (response: any) => {
            console.log("[reCAPTCHA SignUp] 'callback' triggered. Response:", response);
          },
          'expired-callback': () => {
            console.warn("[reCAPTCHA SignUp] 'expired-callback' triggered. The user needs to verify again.");
            toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "אימות reCAPTCHA פג תוקף. אנא נסה לשלוח קוד שוב.", variant: "destructive" });
            setIsSendingOtp(false); 
          },
          'error-callback': (error: any) => {
            console.error("[reCAPTCHA SignUp] 'error-callback' triggered. Error:", error);
            toast({ title: HEBREW_TEXT.auth.recaptchaError, description: `שגיאה בתהליך אימות reCAPTCHA: ${error?.message || 'Unknown reCAPTCHA error'}. נסה שוב.`, variant: "destructive", duration: 10000 });
            setIsSendingOtp(false); 
          }
        });
        recaptchaVerifierRef.current = verifier;
        return verifier;
      } catch (e) {
        console.error("[reCAPTCHA SignUp] Error creating RecaptchaVerifier instance:", e);
        toast({ title: HEBREW_TEXT.auth.recaptchaError, description: `שגיאה ביצירת רכיב reCAPTCHA: ${e instanceof Error ? e.message : String(e)}`, variant: "destructive", duration: 10000 });
        return null;
      }
    }
    console.error("[reCAPTCHA Setup - SignUp] Window or document is undefined. Cannot setup reCAPTCHA.");
    return null;
  };


  const createUserDocument = async (user: User, name?: string, birthday?: string, profileImageUrl?: string) => {
    const userDocRef = doc(db, "users", user.uid);
    const userData: any = {
      firebaseUid: user.uid,
      name: name || user.displayName || `משתמש ${user.uid.substring(0,5)}`,
      email: user.email,
      profileImageUrl: profileImageUrl || user.photoURL || `https://placehold.co/150x150.png?text=${(name || user.displayName || "U").charAt(0)}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (birthday) userData.birthday = birthday;
    if (user.phoneNumber) userData.phone = user.phoneNumber;
    if (!user.email) userData.email = null;

    try {
      await setDoc(userDocRef, userData);
      console.log("User document created in Firestore for UID:", user.uid);
    } catch (error) {
      console.error("Error creating user document in Firestore:", error);
      toast({
        title: "שגיאת יצירת פרופיל",
        description: "הייתה בעיה ביצירת הפרופיל שלך. ייתכן שתצטרך לעדכן פרטים ידנית.",
        variant: "destructive",
      });
    }
  };

  const handleSignUpSuccess = async (user: User, formValues?: { name: string, birthday?: string }) => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userName', formValues?.name || user.displayName || user.email || user.phoneNumber || 'משתמש חדש');

    await createUserDocument(user, formValues?.name, formValues?.birthday);

    toast({
      title: HEBREW_TEXT.general.success,
      description: HEBREW_TEXT.auth.phoneSignUpSuccess, 
    });
    router.push("/events");
  };

  const handleAuthError = (error: any, method: string) => {
    console.error(`${method} Sign Up Error:`, error);
    let description = "שגיאה בהרשמה. נסה שוב.";
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          description = HEBREW_TEXT.auth.emailInUseError;
          break;
        case 'auth/invalid-email':
          description = HEBREW_TEXT.auth.emailInvalid;
          break;
        case 'auth/weak-password':
          description = HEBREW_TEXT.auth.weakPasswordError;
          break;
        case 'auth/popup-closed-by-user':
          description = "חלון ההרשמה נסגר לפני השלמת התהליך.";
          break;
        case 'auth/cancelled-popup-request':
            description = "בקשת ההרשמה בוטלה.";
            break;
        case 'auth/operation-not-allowed':
            description = "סוג הרשמה זה אינו מאופשר כרגע.";
            break;
        case 'auth/invalid-phone-number':
            description = HEBREW_TEXT.auth.invalidIsraeliPhoneNumber;
            break;
        case 'auth/captcha-check-failed':
            description = HEBREW_TEXT.auth.recaptchaError + " (Auth Hostname). " + error.message;
            break;
        case 'auth/network-request-failed':
            description = "שגיאת רשת. בדוק את חיבור האינטרנט שלך.";
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
        case 'auth/internal-error': 
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
      duration: 10000, 
    });
  };

  const onEmailPasswordSubmit = async (values: z.infer<typeof emailPasswordSchema>) => {
    setIsSubmittingEmail(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuthInstance, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.name });
      await handleSignUpSuccess(userCredential.user, { name: values.name, birthday: values.birthday });
    } catch (error: any) {
      handleAuthError(error, "Email/Password");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsSubmittingGoogle(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      await handleSignUpSuccess(result.user, { name: result.user.displayName || "משתמש גוגל" });
    } catch (error: any) {
      handleAuthError(error, "Google");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignUp = async () => {
    setIsSubmittingApple(true);
    const providerPackage = await import("firebase/auth"); 
    const provider = new providerPackage.OAuthProvider('apple.com');
    try {
      const result = await signInWithPopup(firebaseAuthInstance, provider);
      await handleSignUpSuccess(result.user, { name: result.user.displayName || "משתמש אפל" });
    } catch (error: any) {
      handleAuthError(error, "Apple");
    } finally {
      setIsSubmittingApple(false);
    }
  };

  const onSendOtp = async (data: z.infer<typeof phoneSchema>) => {
    setIsSendingOtp(true);
    setPersistedNameForOtp(data.name);
    setPersistedBirthdayForOtp(data.birthday);
    try {
      firebaseAuthInstance.languageCode = 'he';
      const verifier = setupRecaptcha(); 
      if (!verifier) {
          setIsSendingOtp(false);
          return;
      }

      console.log("[SignUpForm] Attempting to render reCAPTCHA...");
      recaptchaWidgetIdRef.current = await verifier.render(); 
      console.log("[SignUpForm] reCAPTCHA rendered successfully. Widget ID:", recaptchaWidgetIdRef.current);


      let firebasePhoneNumber = data.phoneNumber;
      if (firebasePhoneNumber.startsWith('0')) {
        firebasePhoneNumber = '+972' + firebasePhoneNumber.substring(1);
      }
      
      console.log(`[SignUpForm] Calling signInWithPhoneNumber for ${firebasePhoneNumber}`);
      const result = await signInWithPhoneNumber(firebaseAuthInstance, firebasePhoneNumber, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      otpForm.reset(); 
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.auth.otpSent });
    } catch (error: any) {
      console.error("[SignUpForm] Error in onSendOtp:", error);
      handleAuthError(error, "Phone OTP Send (SignUp)");
      if (recaptchaWidgetIdRef.current !== null && typeof window !== 'undefined' && (window as any).grecaptcha) {
        try {
          console.log(`[SignUpForm] Attempting to reset reCAPTCHA widget ID: ${recaptchaWidgetIdRef.current} after onSendOtp error.`);
          (window as any).grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch (resetError) {
          console.error("[SignUpForm] Error resetting reCAPTCHA widget in onSendOtp catch:", resetError);
        } finally {
            recaptchaWidgetIdRef.current = null; 
        }
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onVerifyOtp = async (data: z.infer<typeof otpSchema>) => {
    if (!confirmationResult) return;
    setIsVerifyingOtp(true);
    try {
      const userCredential = await confirmationResult.confirm(data.otpCode);
      await handleSignUpSuccess(userCredential.user, { name: persistedNameForOtp, birthday: persistedBirthdayForOtp });
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Verify (SignUp)");
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
    setConfirmationResult(null);
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch (e) {
        console.warn("[SignUpForm] Error clearing reCAPTCHA in resetPhoneAuthFlow:", e);
      }
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaWidgetIdRef.current !== null && typeof window !== 'undefined' && (window as any).grecaptcha) {
        try {
            (window as any).grecaptcha.reset(recaptchaWidgetIdRef.current);
        } catch (e) {
             console.warn("[SignUpForm] Error resetting reCAPTCHA widget in resetPhoneAuthFlow:", e);
        }
        recaptchaWidgetIdRef.current = null;
    }
    const container = document.getElementById(recaptchaContainerId);
    if (container) container.innerHTML = '';
  };


  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.auth.signUp}</CardTitle>
        <CardDescription>{HEBREW_TEXT.auth.signUp} {HEBREW_TEXT.general.to} {HEBREW_TEXT.appName}</CardDescription>
      </CardHeader>
      <CardContent>
        {signUpMethod === 'email' && (
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailPasswordSubmit)} className="space-y-6">
              <FormField
                control={emailForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                    <FormControl>
                      <Input placeholder="שם מלא" {...field} disabled={isLoadingOverall} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={emailForm.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.profile.birthday}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isLoadingOverall} max={new Date().toISOString().split("T")[0]} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-body" disabled={isLoadingOverall || !emailForm.formState.isValid}>
                {isSubmittingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {HEBREW_TEXT.auth.signUpButton}
              </Button>
            </form>
          </Form>
        )}

        {signUpMethod === 'phone' && (
          <div className="space-y-6">
            {!isOtpSent ? (
              <Form {...phoneForm} key="phone-input-signup">
                <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.name}</FormLabel>
                        <FormControl>
                          <Input placeholder="שם מלא" {...field} disabled={isLoadingOverall} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={phoneForm.control}
                    name="birthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.birthday}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={isLoadingOverall} max={new Date().toISOString().split("T")[0]} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              <Form {...otpForm} key="otp-input-signup">
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
                    onClick={() => {
                      setIsOtpSent(false); 
                      otpForm.reset();
                    }}
                    className="w-full text-sm"
                    disabled={isLoadingOverall}
                  >
                    שנה פרטים או שלח קוד מחדש
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
            {signUpMethod === 'email' && (
                <div className="relative">
                    <Button variant="outline" type="button" onClick={() => { setSignUpMethod('phone'); resetPhoneAuthFlow(); }} disabled={isLoadingOverall} className="w-full">
                        <Phone className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.signUpWithPhone}
                    </Button>
                     <Badge variant="warning" className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs">בטא</Badge>
                </div>
            )}
            {signUpMethod === 'phone' && (
                 <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                        setSignUpMethod('email');
                        resetPhoneAuthFlow();
                        setPersistedNameForOtp("");
                        setPersistedBirthdayForOtp("");
                        phoneForm.reset({ phoneNumber: "05", name: "", birthday: ""}); 
                    }}
                    disabled={isLoadingOverall}
                >
                    <Chrome className="mr-2 h-4 w-4" /> הרשמה עם אימייל וסיסמה
                </Button>
            )}
          </div>
           <div className="mt-3 grid grid-cols-2 gap-3">
             <Button variant="outline" type="button" onClick={handleGoogleSignUp} disabled={isLoadingOverall}>
              {isSubmittingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            <div className="relative">
                 <Button variant="outline" type="button" onClick={handleAppleSignUp} disabled={isLoadingOverall} className="w-full">
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
          <Link href="/signin" className="underline">
            {HEBREW_TEXT.auth.alreadyHaveAccount}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

