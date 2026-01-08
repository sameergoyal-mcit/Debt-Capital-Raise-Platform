import { useState, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockLenders, Lender } from "@/data/lenders";
import { getDealInvitations, createInvitation, Invitation } from "@/data/invitations";
import { useToast } from "@/hooks/use-toast";
import { emailService } from "@/lib/email-service";
import { emailTemplates } from "@/lib/email-templates";
import { Mail, UserPlus, Building2, AlertCircle } from "lucide-react";
import { formatISO } from "date-fns";

interface InviteLenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealName: string;
  invitedBy: string;
  onInvitationCreated: () => void;
}

let nextLenderId = 100;

export function InviteLenderModal({
  isOpen,
  onClose,
  dealId,
  dealName,
  invitedBy,
  onInvitationCreated,
}: InviteLenderModalProps) {
  const { toast } = useToast();
  
  const [selectedLenderId, setSelectedLenderId] = useState<string>("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [ndaRequired, setNdaRequired] = useState(true);
  const [accessTier, setAccessTier] = useState<"early" | "full" | "legal">("early");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingInvitations = useMemo(() => getDealInvitations(dealId), [dealId]);
  const invitedLenderIds = new Set(existingInvitations.map(i => i.lenderId));

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  
  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && organization.trim() && isValidEmail(email);

  const handleLenderSelect = (lenderId: string) => {
    setSelectedLenderId(lenderId);
    setError(null);
    
    if (lenderId && lenderId !== "new") {
      const lender = mockLenders.find(l => l.id === lenderId);
      if (lender) {
        const nameParts = lender.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setOrganization(lender.name);
        setEmail(`contact@${lender.name.toLowerCase().replace(/\s+/g, "")}.com`);
      }
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setOrganization("");
    }
  };

  const handleSubmit = async () => {
    setError(null);
    
    if (!isFormValid) {
      setError("Please fill in all required fields with valid data.");
      return;
    }

    let lenderId = selectedLenderId;
    
    if (!lenderId || lenderId === "new") {
      lenderId = `lender_${nextLenderId++}`;
      const newLender: Lender = {
        id: lenderId,
        name: `${firstName} ${lastName}`,
        type: "Direct Lender",
        status: "NDA Sent",
        ticketMin: 0,
        ticketMax: 0,
        lastContactAt: new Date().toISOString(),
        owner: invitedBy,
        notes: `New lender from ${organization}`,
        interactions: [],
        seriousnessScore: 0,
      };
      mockLenders.push(newLender);
    }

    if (invitedLenderIds.has(lenderId)) {
      setError("This lender is already invited to this deal.");
      return;
    }

    setIsSubmitting(true);

    const invitation: Invitation = {
      dealId,
      lenderId,
      invitedBy,
      invitedAt: formatISO(new Date()),
      ndaRequired,
      accessGranted: !ndaRequired,
      accessTier,
      tierHistory: [
        { tier: accessTier, changedAt: formatISO(new Date()), changedBy: "System" }
      ]
    };

    createInvitation(invitation);

    await emailService.send({
      to: email,
      subject: `Investment Opportunity: ${dealName}`,
      html: emailTemplates.ndaInvitation(dealName, `https://capitalflow.com/deal/${dealId}/overview`)
    });

    toast({
      title: "Invitation Sent",
      description: `${firstName} ${lastName} (${email}) has been invited to ${dealName}.`,
    });

    setIsSubmitting(false);
    resetForm();
    onInvitationCreated();
    onClose();
  };

  const resetForm = () => {
    setSelectedLenderId("");
    setFirstName("");
    setLastName("");
    setEmail("");
    setOrganization("");
    setNdaRequired(true);
    setAccessTier("early");
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
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Lender
          </DialogTitle>
          <DialogDescription>
            Invite a lender to participate in <span className="font-medium text-foreground">{dealName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Existing Lender (Optional)</Label>
            <Select value={selectedLenderId} onValueChange={handleLenderSelect}>
              <SelectTrigger data-testid="select-existing-lender">
                <SelectValue placeholder="Select a lender or enter new details below" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">+ Add New Lender</SelectItem>
                {mockLenders.map(lender => (
                  <SelectItem 
                    key={lender.id} 
                    value={lender.id}
                    disabled={invitedLenderIds.has(lender.id)}
                  >
                    {lender.name} — {lender.type}
                    {invitedLenderIds.has(lender.id) && " (Already Invited)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                data-testid="input-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                data-testid="input-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.smith@firm.com"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Organization *</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="organization"
                data-testid="input-organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Investment Firm LLC"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="nda-required">NDA Required</Label>
              <p className="text-xs text-muted-foreground">
                Lender must sign NDA before accessing deal documents
              </p>
            </div>
            <Switch
              id="nda-required"
              data-testid="switch-nda-required"
              checked={ndaRequired}
              onCheckedChange={setNdaRequired}
            />
          </div>

          <div className="space-y-2">
            <Label>Initial Access Tier</Label>
            <Select value={accessTier} onValueChange={(v) => setAccessTier(v as "early" | "full" | "legal")}>
              <SelectTrigger data-testid="select-access-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="early">Early Access — Limited documents</SelectItem>
                <SelectItem value="full">Full Access — All marketing materials</SelectItem>
                <SelectItem value="legal">Legal Access — Credit agreement drafts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel-invite">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isFormValid || isSubmitting}
            data-testid="button-send-invite"
          >
            {isSubmitting ? "Sending..." : "Send Invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
