"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Upload } from "lucide-react";
import { format } from "date-fns"; 
import { he } from 'date-fns/locale';


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HEBREW_TEXT } from "@/constants/hebrew-text";
import type { PaymentOption, FoodType, ReligionStyle } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const foodTypes: { value: FoodType; label: string }[] = [
  { value: "kosherMeat", label: HEBREW_TEXT.event.kosherMeat },
  { value: "kosherDairy", label: HEBREW_TEXT.event.kosherDairy },
  { value: "kosherParve", label: HEBREW_TEXT.event.kosherParve },
  { value: "notKosher", label: HEBREW_TEXT.event.notKosher },
];

const religionStyles: { value: ReligionStyle; label: string }[] = [
  { value: "secular", label: "חילוני" },
  { value: "traditional", label: "מסורתי" },
  { value: "religious", label: "דתי" },
  { value: "mixed", label: "מעורב" },
];

const paymentOptions: { value: PaymentOption; label: string }[] = [
    { value: "fixed", label: HEBREW_TEXT.event.pricePerGuest },
    { value: "payWhatYouWant", label: HEBREW_TEXT.event.payWhatYouWant },
    { value: "free", label: HEBREW_TEXT.event.free },
];


const formSchema = z.object({
  name: z.string().min(3, { message: "שם אירוע חייב להכיל לפחות 3 תווים." }),
  numberOfGuests: z.coerce.number().min(1, { message: "מספר אורחים חייב להיות לפחות 1." }),
  paymentOption: z.enum(["fixed", "payWhatYouWant", "free"]),
  pricePerGuest: z.coerce.number().optional(),
  location: z.string().min(3, { message: "מיקום חייב להכיל לפחות 3 תווים." }),
  dateTime: z.date({ required_error: "תאריך ושעה נדרשים." }),
  description: z.string().min(10, { message: "תיאור חייב להכיל לפחות 10 תווים." }),
  ageRange: z.string().optional(),
  foodType: z.enum(["kosherMeat", "kosherDairy", "kosherParve", "notKosher"]),
  religionStyle: z.enum(["secular", "traditional", "religious", "mixed"]),
  imageUrl: z.string().optional(), // For simplicity, handling as URL. Real upload would be different.
}).refine(data => {
    if (data.paymentOption === 'fixed') {
        return data.pricePerGuest !== undefined && data.pricePerGuest > 0;
    }
    return true;
}, {
    message: "יש להזין מחיר לאורח כאשר אפשרות התשלום היא מחיר קבוע.",
    path: ["pricePerGuest"],
});


export function EventForm() {
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      numberOfGuests: 10,
      paymentOption: "fixed",
      pricePerGuest: 100,
      location: "",
      description: "",
      foodType: "kosherParve",
      religionStyle: "mixed",
    },
  });

  const paymentOptionValue = form.watch("paymentOption");

  // Mock create event function
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log("Event creation data:", values);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: HEBREW_TEXT.general.success,
      description: `אירוע "${values.name}" נוצר בהצלחה!`,
    });
    // Ideally redirect to the created event page or events list
    router.push("/events"); 
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{HEBREW_TEXT.event.createEventTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.eventName}</FormLabel>
                  <FormControl>
                    <Input placeholder="לדוגמה: החתונה של דנה ויוסי" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="numberOfGuests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.numberOfGuests}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateTime"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{HEBREW_TEXT.event.dateTime}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPPP, HH:mm", { locale: he })
                            ) : (
                              <span>{HEBREW_TEXT.event.selectDate}</span>
                            )}
                            <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={he}
                        />
                         {/* Basic time picker - consider a dedicated component for better UX */}
                        <div className="p-2 border-t">
                           <Input type="time" defaultValue={field.value ? format(field.value, 'HH:mm') : "19:00"} onChange={(e) => {
                               const [hours, minutes] = e.target.value.split(':').map(Number);
                               const newDate = new Date(field.value || new Date());
                               newDate.setHours(hours);
                               newDate.setMinutes(minutes);
                               field.onChange(newDate);
                           }} />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="paymentOption"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                    <FormLabel className="text-right">{HEBREW_TEXT.event.paymentOptions}</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4 rtl:md:space-x-reverse"
                        >
                        {paymentOptions.map(option => (
                            <FormItem key={option.value} className="flex items-center space-x-3 space-y-0 rtl:space-x-reverse">
                                <FormControl>
                                    <RadioGroupItem value={option.value} />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    {option.label}
                                </FormLabel>
                            </FormItem>
                        ))}
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {paymentOptionValue === 'fixed' && (
                 <FormField
                    control={form.control}
                    name="pricePerGuest"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{HEBREW_TEXT.event.pricePerGuest} (בש"ח)</FormLabel>
                        <FormControl>
                        <Input type="number" placeholder="150" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
            
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.location}</FormLabel>
                  <FormControl>
                    <Input placeholder="לדוגמה: אולמי 'הדקל', תל אביב" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{HEBREW_TEXT.event.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ספרו על האירוע, האווירה, מה מיוחד בו..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid md:grid-cols-3 gap-8">
                <FormField
                control={form.control}
                name="ageRange"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.ageRange} ({HEBREW_TEXT.general.optional})</FormLabel>
                    <FormControl>
                        <Input placeholder="לדוגמה: 25-40" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="foodType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.foodType}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="בחר סוג אוכל" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {foodTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="religionStyle"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{HEBREW_TEXT.event.religionStyle}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="בחר סגנון" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {religionStyles.map(style => (
                            <SelectItem key={style.value} value={style.value}>{style.label}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{HEBREW_TEXT.event.uploadImage} ({HEBREW_TEXT.general.optional})</FormLabel>
                        <FormControl>
                            {/* This is a mock. Real file upload requires more setup (e.g., to Firebase Storage) */}
                            <Button type="button" variant="outline" className="w-full" onClick={() => alert("File upload functionality to be implemented.")}>
                                <Upload className="ml-2 h-4 w-4" />
                                בחר קובץ
                            </Button>
                        </FormControl>
                        {field.value && <FormDescription>תמונה נבחרה: {field.value.split('/').pop()}</FormDescription>}
                        <FormMessage />
                    </FormItem>
                )} />


            <Button type="submit" className="w-full font-body text-lg py-6">
              {HEBREW_TEXT.event.createEventButton}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
