import React, { useState, useEffect, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";
import { MessageParticipant, MENTIONABLE_ROLES } from "@/data/messages";
import { Users, User } from "lucide-react";

interface MentionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mention: { type: "role" | "user"; value: string; displayName: string }) => void;
  participants: MessageParticipant[];
  searchQuery: string;
  anchorRef: React.RefObject<HTMLElement>;
}

export function MentionPicker({
  isOpen,
  onClose,
  onSelect,
  participants,
  searchQuery,
  anchorRef
}: MentionPickerProps) {
  const [internalSearch, setInternalSearch] = useState(searchQuery);

  useEffect(() => {
    setInternalSearch(searchQuery);
  }, [searchQuery]);

  const filteredRoles = useMemo(() => {
    const search = internalSearch.toLowerCase();
    return MENTIONABLE_ROLES.filter(role =>
      role.toLowerCase().includes(search)
    );
  }, [internalSearch]);

  const filteredUsers = useMemo(() => {
    const search = internalSearch.toLowerCase();
    return participants.filter(p =>
      p.name.toLowerCase().includes(search)
    );
  }, [internalSearch, participants]);

  const handleSelect = (type: "role" | "user", value: string, displayName: string) => {
    onSelect({ type, value, displayName: `@${displayName}` });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor asChild>
        <span ref={anchorRef as any} className="absolute" style={{ left: 0, bottom: '100%' }} />
      </PopoverAnchor>
      <PopoverContent className="p-0 w-64" align="start" sideOffset={5}>
        <Command>
          <CommandInput
            placeholder="Search people or roles..."
            value={internalSearch}
            onValueChange={setInternalSearch}
          />
          <CommandList>
            <CommandEmpty>No matches found.</CommandEmpty>

            {filteredRoles.length > 0 && (
              <CommandGroup heading="Roles">
                {filteredRoles.map(role => (
                  <CommandItem
                    key={role}
                    onSelect={() => handleSelect("role", role, role)}
                    className="gap-2 cursor-pointer"
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>@{role}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      Notify all
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredUsers.length > 0 && (
              <CommandGroup heading="People">
                {filteredUsers.map(user => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleSelect("user", user.id, user.name)}
                    className="gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>@{user.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {user.role}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
