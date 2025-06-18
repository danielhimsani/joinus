
"use client";

import { useState, useEffect, type ChangeEvent, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus, Contact as UserPlaceholderIcon } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, type QuerySnapshot, type DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AddOwnerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOwnerAdded: (owner: UserProfile) => void;
  currentOwnerUids: string[];
}

const DEBOUNCE_DELAY = 300; // 300ms

export function AddOwnerModal({ isOpen, onOpenChange, onOwnerAdded, currentOwnerUids }: AddOwnerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const executeSearch = useCallback(async (rawSearchTerm: string) => {
    const currentSearchTerm = rawSearchTerm.trim();
    if (!currentSearchTerm) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const searchPromises: Promise<QuerySnapshot<DocumentData, DocumentData>>[] = [];

      // Create different casings for the search term
      const termsToSearch: string[] = [currentSearchTerm]; // Original term
      const lowerCaseTerm = currentSearchTerm.toLowerCase();
      if (lowerCaseTerm !== currentSearchTerm) {
          termsToSearch.push(lowerCaseTerm);
      }
      const capitalizedTerm = lowerCaseTerm.charAt(0).toUpperCase() + lowerCaseTerm.slice(1);
      if (capitalizedTerm !== currentSearchTerm && capitalizedTerm !== lowerCaseTerm) {
          termsToSearch.push(capitalizedTerm);
      }
      // Consider adding all uppercase if needed: const upperCaseTerm = currentSearchTerm.toUpperCase();

      const uniqueTerms = [...new Set(termsToSearch)]; // Ensure unique terms to avoid redundant queries

      for (const term of uniqueTerms) {
          const q = query(
              usersRef,
              where("name", ">=", term),
              where("name", "<=", term + "\uf8ff"),
              orderBy("name"),
              limit(10) // Limit each query to keep results manageable
          );
          searchPromises.push(getDocs(q));
      }

      const querySnapshots = await Promise.all(searchPromises);
      
      const usersMap = new Map<string, UserProfile>(); // Use Map to handle de-duplication by document ID
      querySnapshots.forEach(snapshot => {
          snapshot.forEach((doc) => {
              const userData = doc.data() as Omit<UserProfile, 'id'>; // Assume UserProfile from types doesn't always have 'id' from data()
              // Ensure firebaseUid exists and is not already a current owner, and not already added to map
              if (userData.firebaseUid && !currentOwnerUids.includes(userData.firebaseUid) && !usersMap.has(doc.id)) {
                  usersMap.set(doc.id, { ...userData, id: doc.id });
              }
          });
      });

      const mergedUsers = Array.from(usersMap.values());
      
      // Optional: Sort merged results by name again if strict alphabetical order is critical for the combined list
      // mergedUsers.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      // Optional: Limit the final merged list to a specific number, e.g., 10 overall
      // const finalResults = mergedUsers.slice(0, 10); 

      setSearchResults(mergedUsers);

    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: HEBREW_TEXT.general.error,
        description: "שגיאה בחיפוש משתמשים.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentOwnerUids, toast]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setIsLoading(false);
      return; // Don't run search logic if modal is closed
    }

    // Debounce search
    const handler = setTimeout(() => {
      if (searchTerm === "" && searchResults.length > 0) { // Clear results if search term is emptied
         setSearchResults([]);
         setIsLoading(false);
      } else if (searchTerm.trim() !== "") {
        executeSearch(searchTerm);
      } else {
         setIsLoading(false);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, isOpen, executeSearch, searchResults.length]);


  const handleAddOwner = (user: UserProfile) => {
    onOwnerAdded(user);
    toast({
        title: HEBREW_TEXT.general.success,
        description: `${user.name} ${HEBREW_TEXT.event.addOwner.toLowerCase()} בהצלחה.`
    });
    onOpenChange(false); // Close modal after adding
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[550px]">
        <DialogHeader className="text-right">
          <DialogTitle className="font-headline">{HEBREW_TEXT.event.addOwner}</DialogTitle>
          <DialogDescription>
            {HEBREW_TEXT.event.searchUsersPlaceholder}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={HEBREW_TEXT.general.search + " שם משתמש..."}
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-3"
            dir="rtl"
          />
        </div>

        <ScrollArea className="h-[300px] mt-4 border rounded-md">
          <div className="p-4 space-y-3">
            {isLoading && (
              <div className="flex justify-center items-center h-full py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!isLoading && searchResults.length === 0 && searchTerm.trim() && (
              <p className="text-center text-muted-foreground py-10">{HEBREW_TEXT.event.noUsersFound}</p>
            )}
            {!isLoading && searchResults.length === 0 && !searchTerm.trim() && (
              <p className="text-center text-muted-foreground py-10">התחל לחפש משתמשים על ידי הקלדת שמם.</p>
            )}
            {!isLoading && searchResults.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Avatar className="h-10 w-10">
                    {user.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="user avatar" />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <UserPlaceholderIcon className="h-6 w-6 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleAddOwner(user)}>
                  <UserPlus className="ml-1.5 h-4 w-4" />
                  {HEBREW_TEXT.event.add}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>{HEBREW_TEXT.general.close}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
