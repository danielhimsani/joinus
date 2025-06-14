
"use client";

import { useState, useEffect, type ChangeEvent, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus } from 'lucide-react';
import { HEBREW_TEXT } from '@/constants/hebrew-text';
import type { UserProfile } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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

  const executeSearch = useCallback(async (currentSearchTerm: string) => {
    if (!currentSearchTerm.trim()) {
      setSearchResults([]);
      setIsLoading(false); // Ensure loading is false if search term is cleared
      return;
    }
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const nameQuery = query(
        usersRef,
        where("name", ">=", currentSearchTerm.trim()),
        where("name", "<=", currentSearchTerm.trim() + "\uf8ff"),
        orderBy("name"),
        limit(10)
      );
      
      const querySnapshot = await getDocs(nameQuery);
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile;
        if (userData.firebaseUid && !currentOwnerUids.includes(userData.firebaseUid)) {
          users.push({ ...userData, id: doc.id });
        }
      });
      setSearchResults(users);
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
         // if search term is empty and results are already empty, do nothing
         // Or if it became empty and results were not empty, it's handled above.
         // This also ensures loading is false if search term is initially empty.
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
        <DialogHeader>
          <DialogTitle className="font-headline">{HEBREW_TEXT.event.addOwner}</DialogTitle>
          <DialogDescription>
            {HEBREW_TEXT.event.searchUsersPlaceholder}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={HEBREW_TEXT.general.search + " שם משתמש..."}
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3"
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
                    <AvatarImage src={user.profileImageUrl} alt={user.name} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
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
