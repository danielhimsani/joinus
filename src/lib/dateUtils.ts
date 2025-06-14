
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
