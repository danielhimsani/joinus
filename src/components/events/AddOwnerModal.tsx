
"use client";

import { useState, useEffect, type ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus, UserX } from 'lucide-react';
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

export function AddOwnerModal({ isOpen, onOpenChange, onOwnerAdded, currentOwnerUids }: AddOwnerModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSearch = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      // Basic prefix search for name. For more complex search, consider a dedicated search service.
      const nameQuery = query(
        usersRef,
        where("name", ">=", searchTerm.trim()),
        where("name", "<=", searchTerm.trim() + "\uf8ff"),
        orderBy("name"),
        limit(10)
      );
      
      // It's difficult to do an OR query for name and email directly in Firestore efficiently for prefix search.
      // For simplicity, we'll primarily search by name.
      // You could run a second query for email and merge results if needed, but that adds complexity.

      const querySnapshot = await getDocs(nameQuery);
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as UserProfile;
        // Filter out already current owners and the current user themselves (if their UID is in currentOwnerUids)
        if (userData.firebaseUid && !currentOwnerUids.includes(userData.firebaseUid)) {
          users.push({ ...userData, id: doc.id }); // Ensure id is set if doc.id is the source
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
  };

  const handleAddOwner = (user: UserProfile) => {
    onOwnerAdded(user);
    // Optionally close modal or allow adding multiple users
    // For now, let's assume we add one and then the user can close or search again
    toast({
        title: HEBREW_TEXT.general.success,
        description: `${user.name} ${HEBREW_TEXT.event.addOwner.toLowerCase()} בהצלחה.`
    });
    // To reflect the change immediately if the modal stays open, we'd need to update currentOwnerUids here
    // or rely on the parent component to pass the updated list.
    // For simplicity, let's close the modal after adding.
    onOpenChange(false);
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
        <form onSubmit={handleSearch} className="flex items-center space-x-2 rtl:space-x-reverse mt-4">
          <Input
            type="search"
            placeholder={HEBREW_TEXT.general.search + "..."}
            value={searchTerm}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={isLoading || !searchTerm.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <ScrollArea className="h-[300px] mt-4 border rounded-md">
          <div className="p-4 space-y-3">
            {isLoading && searchResults.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {!isLoading && searchResults.length === 0 && searchTerm.trim() && (
              <p className="text-center text-muted-foreground py-4">{HEBREW_TEXT.event.noUsersFound}</p>
            )}
             {!isLoading && searchResults.length === 0 && !searchTerm.trim() && (
              <p className="text-center text-muted-foreground py-4">התחל לחפש משתמשים.</p>
            )}
            {searchResults.map((user) => (
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
