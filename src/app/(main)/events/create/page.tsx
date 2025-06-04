import { EventForm } from "@/components/events/EventForm";
import { HEBREW_TEXT } from "@/constants/hebrew-text";

export default function CreateEventPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <EventForm />
    </div>
  );
}
