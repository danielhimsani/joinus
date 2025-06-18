
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
import { Apple, Chrome, Loader2, Phone } from "lucide-react";
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
  const [phoneNumberForOtp, setPhoneNumberForOtp] = useState("05");
  const [nameForPhoneSignUp, setNameForPhoneSignUp] = useState(""); 
  const [birthdayForPhoneSignUp, setBirthdayForPhoneSignUp] = useState(""); 
  const [otpCode, setOtpCode] = useState("");
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
    if (!recaptchaVerifierRef.current && typeof window !== 'undefined') {
      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = ''; // Explicitly clear the container
      }
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
    if (user.phoneNumber) userData.phone = user.phoneNumber; // Firebase phone number is E.164
    if (!user.email) userData.email = null; // Explicitly null for phone-only users

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
            description = HEBREW_TEXT.auth.recaptchaError;
            break;
        case 'auth/network-request-failed':
            description = "שגיאת רשת. בדוק את חיבור האינטרנט שלך.";
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
      // For Google sign-up, birthday isn't typically provided by Google, so we pass an empty string or handle it in profile completion.
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
    // For Apple sign-up, birthday isn't typically provided, so we pass an empty string.
    await handleSignUpSuccess(mockUser, { name: 'משתמש אפל', birthday: "" });
    setIsSubmittingApple(false);
  };

  const onSendOtp = async (data: z.infer<typeof phoneSchema>) => {
    setIsSendingOtp(true);
    setNameForPhoneSignUp(data.name || ""); 
    setBirthdayForPhoneSignUp(data.birthday || "");
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
      setPhoneNumberForOtp(data.phoneNumber); 
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
      await handleSignUpSuccess(userCredential.user, { name: nameForPhoneSignUp || `משתמש ${phoneNumberForOtp.slice(-4)}`, birthday: birthdayForPhoneSignUp });
    } catch (error: any) {
      handleAuthError(error, "Phone OTP Verify (SignUp)");
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
                      <Input placeholder="שם מלא" {...field} disabled={isLoading} />
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
              <FormField
                control={emailForm.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.profile.birthday}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isLoading} max={new Date().toISOString().split("T")[0]} />
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
        )}
        
        {signUpMethod === 'phone' && (
          <div className="space-y-6">
            {!isOtpSent ? (
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{HEBREW_TEXT.profile.name} (נדרש להרשמה)</FormLabel>
                        <FormControl>
                          <Input placeholder="שם מלא" {...field} disabled={isLoading} onChange={(e) => {setNameForPhoneSignUp(e.target.value); field.onChange(e);}} />
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
                        <FormLabel>{HEBREW_TEXT.profile.birthday} (נדרש להרשמה)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} disabled={isLoading} max={new Date().toISOString().split("T")[0]} onChange={(e) => {setBirthdayForPhoneSignUp(e.target.value); field.onChange(e);}} />
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
                          <Input type="tel" placeholder={HEBREW_TEXT.auth.phoneNumber} {...field} disabled={isLoading} dir="ltr" value={phoneNumberForOtp} onChange={(e) => {setPhoneNumberForOtp(e.target.value); field.onChange(e);}} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoading || !phoneNumberForOtp.match(/^05\d{8}$/) || !nameForPhoneSignUp || !birthdayForPhoneSignUp}>
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
                          <Input type="text" inputMode="numeric" maxLength={6} placeholder="123456" {...field} disabled={isLoading} dir="ltr" value={otpCode} onChange={(e) => {setOtpCode(e.target.value); field.onChange(e);}}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full font-body" disabled={isLoading || otpCode.length !== 6}>
                    {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {HEBREW_TEXT.auth.verifyOtp}
                  </Button>
                  <Button 
                    variant="link" 
                    onClick={() => { 
                        setIsOtpSent(false); 
                        setOtpCode(''); 
                        setConfirmationResult(null); 
                        if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                        }
                    }} 
                    className="w-full text-sm" 
                    disabled={isLoading}
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
                <Button variant="outline" onClick={() => setSignUpMethod('phone')} disabled={isLoading}>
                     <Phone className="mr-2 h-4 w-4" /> {HEBREW_TEXT.auth.signUpWithPhone}
                </Button>
            )}
            {signUpMethod === 'phone' && (
                 <Button 
                    variant="outline" 
                    onClick={() => {
                        setSignUpMethod('email'); 
                        setIsOtpSent(false); 
                        setOtpCode(''); 
                        setConfirmationResult(null);
                        if (recaptchaVerifierRef.current) {
                            recaptchaVerifierRef.current.clear();
                            recaptchaVerifierRef.current = null;
                        }
                    }} 
                    disabled={isLoading}
                >
                    <Chrome className="mr-2 h-4 w-4" /> הרשמה עם אימייל וסיסמה
                </Button>
            )}
          </div>
           <div className="mt-3 grid grid-cols-2 gap-3">
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
