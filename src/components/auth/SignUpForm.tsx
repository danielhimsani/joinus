
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
import { Chrome, Loader2, Phone } from "lucide-react"; // Removed Apple from lucide-react
import { useToast } from "@/hooks/use-toast";
import { auth as firebaseAuthInstance, db } from "@/lib/firebase"; 
import { useState, useEffect, useRef } from "react";

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
        recaptchaVerifierRef.current.clear();
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (typeof window !== 'undefined') {
      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = ''; 
      }
      if (!recaptchaVerifierRef.current || (container && container.innerHTML === '')) {
        const verifier = new RecaptchaVerifier(firebaseAuthInstance, recaptchaContainerId, {
          size: 'invisible',
          'callback': (response: any) => console.log("reCAPTCHA (signup) solved:", response),
          'expired-callback': () => {
            console.log("reCAPTCHA (signup) expired");
            toast({ title: HEBREW_TEXT.auth.recaptchaError, description: "אימות reCAPTCHA פג תוקף. אנא נסה לשלוח קוד שוב.", variant: "destructive" });
            if (recaptchaVerifierRef.current) {
              recaptchaVerifierRef.current.clear();
              recaptchaVerifierRef.current = null;
            }
            setIsSendingOtp(false);
          }
        });
        recaptchaVerifierRef.current = verifier;
      }
    }
    return recaptchaVerifierRef.current;
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
      description: HEBREW_TEXT.auth.phoneSignUpSuccess, // Generic success message
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
        case 'auth/internal-error-encountered':
             description = "שגיאה פנימית של Firebase. אנא בדוק את הגדרות הפרויקט שלך ב-Firebase Console (כגון חיוב, הרשאות API, ואזורי SMS מאושרים), או נסה שוב מאוחר יותר.";
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
      await handleSignUpSuccess(result.user, { name: result.user.displayName || "משתמש גוגל", birthday: "" });
    } catch (error: any) {
      handleAuthError(error, "Google");
    } finally {
      setIsSubmittingGoogle(false);
    }
  };

  const handleAppleSignUp = async () => { 
    setIsSubmittingApple(true);
    toast({ title: "הרשמה עם אפל", description: "תהליך הרשמה עם אפל מופעל (דמה)..." });
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    const mockUser = { uid: 'mock-apple-uid-' + Date.now(), displayName: 'משתמש אפל', email: 'apple-user@example.com', photoURL: `https://placehold.co/150x150.png?text=A`} as User; 
    await handleSignUpSuccess(mockUser, { name: 'משתמש אפל', birthday: "" });
    setIsSubmittingApple(false);
  };

  const onSendOtp = async (data: z.infer<typeof phoneSchema>) => {
    setIsSendingOtp(true);
    setPersistedNameForOtp(data.name); 
    setPersistedBirthdayForOtp(data.birthday);
    try {
      firebaseAuthInstance.languageCode = 'he';
      const verifier = setupRecaptcha();
      if (!verifier) {
          throw new Error("RecaptchaVerifier not initialized for signup");
      }
      
      let firebasePhoneNumber = data.phoneNumber;
      if (firebasePhoneNumber.startsWith('0')) {
        firebasePhoneNumber = '+972' + firebasePhoneNumber.substring(1);
      }

      const result = await signInWithPhoneNumber(firebaseAuthInstance, firebasePhoneNumber, verifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      otpForm.reset(); 
      toast({ title: HEBREW_TEXT.general.success, description: HEBREW_TEXT.auth.otpSent });
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Send (SignUp)");
       if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
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
                          <Input type="tel" placeholder={HEBREW_TEXT.auth.phoneNumberPlaceholderShort} {...field} disabled={isLoadingOverall} dir="ltr" />
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
                    onClick={() => { 
                        setIsOtpSent(false); 
                        otpForm.reset(); 
                        phoneForm.reset(); 
                        setConfirmationResult(null); 
                        setPersistedNameForOtp(""); 
                        setPersistedBirthdayForOtp("");
                        if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                        }
                        const container = document.getElementById(recaptchaContainerId);
                        if (container) container.innerHTML = '';
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
                <Button variant="outline" onClick={() => setSignUpMethod('phone')} disabled={isLoadingOverall}>
                     <Phone className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.signUpWithPhone}
                </Button>
            )}
            {signUpMethod === 'phone' && (
                 <Button 
                    variant="outline" 
                    onClick={() => {
                        setSignUpMethod('email'); 
                        setIsOtpSent(false); 
                        otpForm.reset();
                        phoneForm.reset();
                        setConfirmationResult(null);
                        setPersistedNameForOtp("");
                        setPersistedBirthdayForOtp("");
                        if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                        }
                        const container = document.getElementById(recaptchaContainerId);
                        if (container) container.innerHTML = '';
                    }} 
                    disabled={isLoadingOverall}
                >
                    <Chrome className="mr-2 h-4 w-4" /> הרשמה עם אימייל וסיסמה
                </Button>
            )}
          </div>
           <div className="mt-3 grid grid-cols-2 gap-3">
             <Button variant="outline" onClick={handleGoogleSignUp} disabled={isLoadingOverall}>
              {isSubmittingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            <Button variant="outline" onClick={handleAppleSignUp} disabled={isLoadingOverall}>
              {isSubmittingApple ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M17.57,15.32a4.39,4.39,0,0,1,1.88-3.3,4.68,4.68,0,0,0-3.45-2A4.75,4.75,0,0,0,12.31,6.5a5.44,5.44,0,0,0-3.75,1.74,5.11,5.11,0,0,0-1.69,4.08,6,6,0,0,0,2.55,4.92A5.22,5.22,0,0,0,11,19.44a5.07,5.07,0,0,0,3.42-1.34,1.37,1.37,0,0,0,.47-.9A3.61,3.61,0,0,1,17.57,15.32ZM12.57,6A2.61,2.61,0,0,1,14,3.57,2.8,2.8,0,0,0,11.22,2,2.74,2.74,0,0,0,9.5,4.47,2.56,2.56,0,0,1,12.57,6Z" />
                </svg>
              )}
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
