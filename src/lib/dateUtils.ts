
import { Timestamp } from 'firebase/firestore';

export const safeToDate = (timestampField: any): Date => {
    if (timestampField && typeof timestampField.toDate === 'function') {
      // Firestore Timestamp
      return (timestampField as Timestamp).toDate();
    }
    if (timestampField instanceof Date) {
      // Already a Date object
      return timestampField;
    }
    if (typeof timestampField === 'string' || typeof timestampField === 'number') {
      // Attempt to parse from string or number (milliseconds since epoch)
      const d = new Date(timestampField);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    // Fallback for unhandled types or invalid date strings/numbers
    console.warn("safeToDate received unhandled type or invalid date:", timestampField, "Returning current date as fallback.");
    return new Date();
};

export const calculateAge = (birthDateString?: string): number | null => {
  if (!birthDateString) return null;

  const parts = birthDateString.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
    const day = parseInt(parts[2], 10);

    // Validate parsed parts
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn("calculateAge: Invalid date parts from string:", birthDateString);
      return null;
    }

    const birthDate = new Date(year, month, day);
    if (isNaN(birthDate.getTime())) { // Check if date is valid
      console.warn("calculateAge: Constructed invalid date from parts:", birthDateString);
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? null : age; // Age cannot be negative
  } else {
    // Fallback for other date string formats, or if it's not YYYY-MM-DD
    // This part might be less reliable if format isn't YYYY-MM-DD
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) {
       console.warn("calculateAge: Invalid date string (non YYYY-MM-DD format):", birthDateString);
       return null;
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 0 ? null : age;
  }
};
    
