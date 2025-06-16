// src/lib/textUtils.ts
export const getDisplayInitial = (name?: string | null): string => {
  if (!name || name.trim() === "") {
    // Return empty string if name is invalid, 
    // allowing components to use their own specific fallback like an icon or a default letter.
    return ""; 
  }
  const firstChar = name.charAt(0);
  const charCode = firstChar.charCodeAt(0);

  // Check if it's a Hebrew character (Unicode range U+0590 to U+05FF)
  if (charCode >= 0x0590 && charCode <= 0x05FF) {
    return firstChar; // Return Hebrew character as-is
  }
  
  // For other characters (e.g., Latin), convert to uppercase
  return firstChar.toUpperCase();
};
