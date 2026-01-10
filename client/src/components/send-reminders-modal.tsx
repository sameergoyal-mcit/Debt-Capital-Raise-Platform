import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, Send, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendRemindersModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealName: string;
}

type AudienceFilter = "all" | "missing_nda" | "no_commitment" | "unviewed_docs";

const audienceLabels: Record<AudienceFilter, string> = {
  all: "All Invited Lenders",
  missing_nda: "Missing NDA Signature",
  no_commitment: "No Commitment Submitted",
  unviewed_docs: "Unviewed Key Documents",
};

const audienceCounts: Record<AudienceFilter, number> = {
  all: 12,
  missing_nda: 3,
  no_commitment: 5,
  unviewed_docs: 4,
};

export function SendRemindersModal({ isOpen, onClose, dealId, dealName }: SendRemindersModalProps) {
  const { toast } = useToast();
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [subject, setSubject] = useState(`Action Required: ${dealName} - Deadline Approaching`);
  const [body, setBody] = useState(
`Dear Lender,

This is a reminder regarding the ${dealName} facility currently in syndication.

Please ensure you have completed the following before the deadline:
• Signed the Confidentiality Agreement (NDA)
• Reviewed the Lender Presentation materials
• Submitted your indication of interest

The commitment deadline is approaching. Please contact us with any questions.

Best regards,
The Deal Team`
  );
  const [isPreview, setIsPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const response = await fetch(`/api/deals/${dealId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          subject,
          bodyText: body,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Reminders Sent",
          description: `Successfully sent to ${result.sentCount || audienceCounts[audience]} recipients.`,
        });
        onClose();
      } else {
        throw new Error(result.error || "Failed to send reminders");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Reminders
          </DialogTitle>
          <DialogDescription>
            Send deadline reminders to lenders on {dealName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="audience">Target Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as AudienceFilter)}>
              <SelectTrigger id="audience" data-testid="select-audience">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(audienceLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {audienceCounts[key as AudienceFilter]} lenders
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..."
              data-testid="input-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            {isPreview ? (
              <div className="p-4 bg-secondary/20 rounded-lg border text-sm whitespace-pre-wrap min-h-[200px]">
                {body}
              </div>
            ) : (
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email content..."
                className="min-h-[200px] font-mono text-sm"
                data-testid="textarea-body"
              />
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              This will send {audienceCounts[audience]} email{audienceCounts[audience] !== 1 ? "s" : ""} to {audienceLabels[audience].toLowerCase()}.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsPreview(!isPreview)}
            className="gap-1"
          >
            <Eye className="h-4 w-4" />
            {isPreview ? "Edit" : "Preview"}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isSending}
            className="gap-1"
            data-testid="button-send-reminders"
          >
            <Send className="h-4 w-4" />
            {isSending ? "Sending..." : "Send Reminders"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
