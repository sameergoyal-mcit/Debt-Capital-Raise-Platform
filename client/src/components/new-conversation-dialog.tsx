import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import {
  createThread,
  getAllParticipants,
  MessageParticipant,
  MessageThread
} from "@/data/messages";
import { mockLenders } from "@/data/lenders";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, AlertCircle } from "lucide-react";

interface NewConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dealId?: string;
  dealName?: string;
  onThreadCreated?: (thread: MessageThread) => void;
}

export function NewConversationDialog({
  isOpen,
  onClose,
  dealId,
  dealName,
  onThreadCreated
}: NewConversationDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [subject, setSubject] = useState("");
  const [recipientType, setRecipientType] = useState<string>("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [initialMessage, setInitialMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const userRole = user?.role?.toLowerCase();
  const isBookrunner = userRole === "bookrunner";
  const isIssuer = userRole === "issuer";
  const isLender = userRole === "investor" || userRole === "lender";

  // Role-based recipient filtering
  const availableRecipientTypes = useMemo(() => {
    if (isBookrunner) {
      return [
        { value: "issuer", label: "Issuer / Deal Team" },
        { value: "lender", label: "Lender" },
        { value: "counsel", label: "Legal Counsel" }
      ];
    }
    if (isIssuer) {
      return [
        { value: "bookrunner", label: "Bookrunner" },
        { value: "internal", label: "Internal Team" }
      ];
    }
    if (isLender) {
      // Lenders can ONLY contact Deal Team, NOT other lenders
      return [
        { value: "dealteam", label: "Deal Team (Bookrunner/Issuer)" }
      ];
    }
    return [];
  }, [isBookrunner, isIssuer, isLender]);

  // Get specific recipients based on type
  const availableRecipients = useMemo(() => {
    const allParticipants = getAllParticipants();

    switch (recipientType) {
      case "issuer":
        return allParticipants.filter(p => p.role === "Issuer");
      case "bookrunner":
        return allParticipants.filter(p => p.role === "Bookrunner");
      case "lender":
        return mockLenders.map(l => ({
          id: `lender-${l.id}`,
          role: "Investor" as const,
          name: l.name,
          email: `contact@${l.name.toLowerCase().replace(/\s+/g, "")}.com`,
          lenderId: l.id
        }));
      case "counsel":
        return allParticipants.filter(p => p.role === "Counsel");
      case "dealteam":
        return allParticipants.filter(p =>
          p.role === "Bookrunner" || p.role === "Issuer"
        );
      case "internal":
        return allParticipants.filter(p =>
          p.role === "Issuer" || p.role === "Bookrunner"
        );
      default:
        return [];
    }
  }, [recipientType]);

  const isFormValid = subject.trim() && selectedRecipientId && initialMessage.trim();

  const handleSubmit = () => {
    setError(null);

    if (!isFormValid || !user) {
      setError("Please fill in all required fields.");
      return;
    }

    const recipient = availableRecipients.find(r => r.id === selectedRecipientId);
    if (!recipient) {
      setError("Please select a valid recipient.");
      return;
    }

    // Determine category based on recipient
    let category: "Issuer" | "Investor" | "Counsel" = "Issuer";
    if (recipient.role === "Investor") category = "Investor";
    if (recipient.role === "Counsel") category = "Counsel";

    // Create sender participant
    const senderRole = isLender ? "Investor" : isIssuer ? "Issuer" : "Bookrunner";
    const sender: MessageParticipant = {
      id: user.id?.toString() || "current-user",
      role: senderRole as any,
      name: user.name || user.email,
      email: user.email,
      lenderId: user.lenderId
    };

    const thread = createThread({
      dealId: dealId || "101",
      dealName: dealName || "Project Titan",
      category,
      subject,
      participants: [sender, recipient as MessageParticipant],
      lenderId: recipient.lenderId,
      initialMessage,
      senderId: sender.id
    });

    toast({
      title: "Conversation Started",
      description: `Your message has been sent to ${recipient.name}.`
    });

    onThreadCreated?.(thread);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setSubject("");
    setRecipientType("");
    setSelectedRecipientId("");
    setInitialMessage("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            New Conversation
          </DialogTitle>
          <DialogDescription>
            Start a new message thread{dealName && ` for ${dealName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Question about term sheet"
            />
          </div>

          {/* Recipient Type */}
          <div className="space-y-2">
            <Label>Recipient Type *</Label>
            <Select
              value={recipientType}
              onValueChange={(v) => {
                setRecipientType(v);
                setSelectedRecipientId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select recipient type" />
              </SelectTrigger>
              <SelectContent>
                {availableRecipientTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specific Recipient */}
          {recipientType && (
            <div className="space-y-2">
              <Label>Select Recipient *</Label>
              <Select
                value={selectedRecipientId}
                onValueChange={setSelectedRecipientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipient" />
                </SelectTrigger>
                <SelectContent>
                  {availableRecipients.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Initial Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Type your message..."
              rows={4}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="gap-2"
          >
            <Send className="h-4 w-4" /> Start Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
