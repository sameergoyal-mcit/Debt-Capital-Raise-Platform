import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { can } from "@/lib/capabilities";
import { mockBookrunners, Bookrunner } from "@/data/bookrunners";
import { addDealBookrunner, BookrunnerRole } from "@/data/deal-bookrunners";
import { mockLenders, Lender } from "@/data/lenders";
import { createInvitation, Invitation } from "@/data/invitations";
import { formatISO } from "date-fns";
import {
  Plus,
  Loader2,
  CalendarIcon,
  ChevronRight,
  ChevronLeft,
  Building2,
  Users,
  FileText,
  Check,
  X,
  Crown,
  Mail,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Step 1: Deal Details Schema
const dealDetailsSchema = z.object({
  dealName: z.string().min(1, "Deal name is required"),
  companyName: z.string().min(1, "Company name is required"),
  sector: z.string().min(1, "Sector is required"),
  facilitySize: z.coerce.number().positive("Facility size must be positive"),
  facilityType: z.string().min(1, "Facility type is required"),
  targetCloseDate: z.date({ required_error: "Target close date is required" }),
});

type DealDetailsForm = z.infer<typeof dealDetailsSchema>;

// Selected bookrunner type
interface SelectedBookrunner {
  id?: string;
  organization: string;
  contactName: string;
  email: string;
  isLead: boolean;
  isNew: boolean;
}

// Selected investor type
interface SelectedInvestor {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  organization: string;
  ndaRequired: boolean;
  accessTier: "early" | "full" | "legal";
  isNew: boolean;
}

interface CreateDealWizardProps {
  trigger?: React.ReactNode;
}

const STEPS = [
  { id: 1, name: "Deal Details", icon: FileText },
  { id: 2, name: "Bookrunners", icon: Building2 },
  { id: 3, name: "Prospective Lenders", icon: Users },
];

const sectors = [
  "Enterprise SaaS",
  "Healthcare",
  "Infrastructure",
  "Manufacturing",
  "Financial Services",
  "Consumer & Retail",
  "Technology",
  "Energy",
  "Real Estate",
  "Telecom",
];

const facilityTypes = ["First Lien", "Second Lien", "Unitranche", "Mezzanine", "Revolver"];

export function CreateDealWizard({ trigger }: CreateDealWizardProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dealData, setDealData] = useState<DealDetailsForm | null>(null);
  const [createdDealId, setCreatedDealId] = useState<string | null>(null);

  // Bookrunner state
  const [selectedBookrunners, setSelectedBookrunners] = useState<SelectedBookrunner[]>([]);
  const [newBookrunnerOrg, setNewBookrunnerOrg] = useState("");
  const [newBookrunnerContact, setNewBookrunnerContact] = useState("");
  const [newBookrunnerEmail, setNewBookrunnerEmail] = useState("");
  const [bookrunnerSelectValue, setBookrunnerSelectValue] = useState("");

  // Investor state
  const [selectedInvestors, setSelectedInvestors] = useState<SelectedInvestor[]>([]);
  const [newInvestorFirstName, setNewInvestorFirstName] = useState("");
  const [newInvestorLastName, setNewInvestorLastName] = useState("");
  const [newInvestorEmail, setNewInvestorEmail] = useState("");
  const [newInvestorOrg, setNewInvestorOrg] = useState("");
  const [investorSelectValue, setInvestorSelectValue] = useState("");
  const [newInvestorNdaRequired, setNewInvestorNdaRequired] = useState(true);
  const [newInvestorAccessTier, setNewInvestorAccessTier] = useState<"early" | "full" | "legal">("early");

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<DealDetailsForm>({
    resolver: zodResolver(dealDetailsSchema),
    defaultValues: {
      dealName: "",
      companyName: "",
      sector: "",
      facilitySize: 0,
      facilityType: "First Lien",
    },
  });

  const targetCloseDate = watch("targetCloseDate");

  // Check if user can create deals
  if (!can(user?.role).createDeal) {
    return null;
  }

  const resetWizard = () => {
    setCurrentStep(1);
    setDealData(null);
    setCreatedDealId(null);
    setSelectedBookrunners([]);
    setSelectedInvestors([]);
    setNewBookrunnerOrg("");
    setNewBookrunnerContact("");
    setNewBookrunnerEmail("");
    setBookrunnerSelectValue("");
    setNewInvestorFirstName("");
    setNewInvestorLastName("");
    setNewInvestorEmail("");
    setNewInvestorOrg("");
    setInvestorSelectValue("");
    setNewInvestorNdaRequired(true);
    setNewInvestorAccessTier("early");
    reset();
  };

  const handleClose = () => {
    resetWizard();
    setOpen(false);
  };

  // Step 1: Save deal details and move to step 2
  const onDealDetailsSubmit = (data: DealDetailsForm) => {
    setDealData(data);
    setCurrentStep(2);
  };

  // Add bookrunner from selection
  const handleBookrunnerSelect = (value: string) => {
    setBookrunnerSelectValue(value);
    if (value && value !== "new") {
      const bookrunner = mockBookrunners.find((b) => b.id === value);
      if (bookrunner) {
        // Check if already selected
        if (selectedBookrunners.some((b) => b.id === bookrunner.id)) {
          toast({ title: "Already Added", description: "This bookrunner is already in the list.", variant: "destructive" });
          return;
        }
        const isFirstBookrunner = selectedBookrunners.length === 0;
        setSelectedBookrunners([
          ...selectedBookrunners,
          {
            id: bookrunner.id,
            organization: bookrunner.organization,
            contactName: bookrunner.contactName,
            email: bookrunner.email,
            isLead: isFirstBookrunner,
            isNew: false,
          },
        ]);
        setBookrunnerSelectValue("");
      }
    }
  };

  // Add new bookrunner
  const handleAddNewBookrunner = () => {
    if (!newBookrunnerOrg.trim() || !newBookrunnerContact.trim() || !newBookrunnerEmail.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in all bookrunner fields.", variant: "destructive" });
      return;
    }
    const isFirstBookrunner = selectedBookrunners.length === 0;
    setSelectedBookrunners([
      ...selectedBookrunners,
      {
        organization: newBookrunnerOrg.trim(),
        contactName: newBookrunnerContact.trim(),
        email: newBookrunnerEmail.trim(),
        isLead: isFirstBookrunner,
        isNew: true,
      },
    ]);
    setNewBookrunnerOrg("");
    setNewBookrunnerContact("");
    setNewBookrunnerEmail("");
    setBookrunnerSelectValue("");
  };

  // Remove bookrunner
  const handleRemoveBookrunner = (index: number) => {
    const updated = selectedBookrunners.filter((_, i) => i !== index);
    // If removed the lead, make the first one lead
    if (selectedBookrunners[index].isLead && updated.length > 0) {
      updated[0].isLead = true;
    }
    setSelectedBookrunners(updated);
  };

  // Set lead bookrunner
  const handleSetLeadBookrunner = (index: number) => {
    setSelectedBookrunners(
      selectedBookrunners.map((b, i) => ({
        ...b,
        isLead: i === index,
      }))
    );
  };

  // Add investor from selection
  const handleInvestorSelect = (value: string) => {
    setInvestorSelectValue(value);
    if (value && value !== "new") {
      const investor = mockLenders.find((l) => l.id === value);
      if (investor) {
        if (selectedInvestors.some((i) => i.id === investor.id)) {
          toast({ title: "Already Added", description: "This lender is already in the list.", variant: "destructive" });
          return;
        }
        const nameParts = investor.name.split(" ");
        setSelectedInvestors([
          ...selectedInvestors,
          {
            id: investor.id,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: `contact@${investor.name.toLowerCase().replace(/\s+/g, "")}.com`,
            organization: investor.name,
            ndaRequired: true,
            accessTier: "early",
            isNew: false,
          },
        ]);
        setInvestorSelectValue("");
      }
    }
  };

  // Add new investor
  const handleAddNewInvestor = () => {
    if (!newInvestorFirstName.trim() || !newInvestorLastName.trim() || !newInvestorEmail.trim() || !newInvestorOrg.trim()) {
      toast({ title: "Missing Fields", description: "Please fill in all lender fields.", variant: "destructive" });
      return;
    }
    setSelectedInvestors([
      ...selectedInvestors,
      {
        firstName: newInvestorFirstName.trim(),
        lastName: newInvestorLastName.trim(),
        email: newInvestorEmail.trim(),
        organization: newInvestorOrg.trim(),
        ndaRequired: newInvestorNdaRequired,
        accessTier: newInvestorAccessTier,
        isNew: true,
      },
    ]);
    setNewInvestorFirstName("");
    setNewInvestorLastName("");
    setNewInvestorEmail("");
    setNewInvestorOrg("");
    setNewInvestorNdaRequired(true);
    setNewInvestorAccessTier("early");
    setInvestorSelectValue("");
  };

  // Remove investor
  const handleRemoveInvestor = (index: number) => {
    setSelectedInvestors(selectedInvestors.filter((_, i) => i !== index));
  };

  // Final submission
  const handleCreateDeal = async () => {
    if (!dealData) return;

    setIsSubmitting(true);
    try {
      // Create the deal
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealName: dealData.dealName,
          borrowerName: dealData.companyName,
          sector: dealData.sector,
          facilitySize: String(dealData.facilitySize * 1000000), // Convert MM to actual
          facilityType: dealData.facilityType,
          instrument: "Senior Secured Term Loan",
          sponsor: user?.name || "TBD",
          stage: "Structuring",
          status: "draft",
          targetSize: String(dealData.facilitySize * 1000000),
          committed: "0",
          pricingBenchmark: "SOFR",
          spreadLowBps: "500",
          spreadHighBps: "550",
          oid: "99",
          feesPct: "2",
          closeDate: format(dealData.targetCloseDate, "yyyy-MM-dd"),
          launchDate: format(new Date(), "yyyy-MM-dd"),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create deal");
      }

      const deal = await response.json();
      setCreatedDealId(deal.id);

      // Add bookrunners
      for (const bookrunner of selectedBookrunners) {
        let bookrunnerId = bookrunner.id;

        // If new bookrunner, add to mock data
        if (bookrunner.isNew) {
          bookrunnerId = `br-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          mockBookrunners.push({
            id: bookrunnerId,
            organization: bookrunner.organization,
            contactName: bookrunner.contactName,
            email: bookrunner.email,
          });
        }

        if (bookrunnerId) {
          addDealBookrunner(
            deal.id,
            bookrunnerId,
            bookrunner.isLead ? "lead" : "co-manager",
            user?.email || ""
          );
        }
      }

      // Add investors
      let nextLenderId = 1000;
      for (const investor of selectedInvestors) {
        let lenderId = investor.id;

        // If new investor, add to mock lenders
        if (investor.isNew) {
          lenderId = `lender_${nextLenderId++}`;
          const newLender: Lender = {
            id: lenderId,
            name: `${investor.firstName} ${investor.lastName}`,
            type: "Direct Lender",
            status: "invited",
            ticketMin: 0,
            ticketMax: 0,
            lastContactAt: new Date().toISOString(),
            owner: user?.email || "",
            notes: `New lender from ${investor.organization}`,
            interactions: [],
            seriousnessScore: 0,
          };
          mockLenders.push(newLender);
        }

        if (lenderId) {
          const invitation: Invitation = {
            dealId: deal.id,
            lenderId,
            invitedBy: user?.email || "",
            invitedAt: formatISO(new Date()),
            ndaRequired: investor.ndaRequired,
            accessGranted: !investor.ndaRequired,
            accessTier: investor.accessTier,
            tierHistory: [
              { tier: investor.accessTier, changedAt: formatISO(new Date()), changedBy: "System" },
            ],
          };
          createInvitation(invitation);
        }
      }

      toast({
        title: "Deal Created",
        description: `${dealData.dealName} has been created successfully.`,
      });

      handleClose();
      navigate(`/deal/${deal.id}/overview`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {STEPS.map((step, index) => (
        <React.Fragment key={step.id}>
          <div
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-colors",
              currentStep === step.id
                ? "bg-primary text-primary-foreground"
                : currentStep > step.id
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            )}
          >
            {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
          </div>
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-1",
                currentStep > step.id ? "bg-green-500" : "bg-muted"
              )}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <form onSubmit={handleSubmit(onDealDetailsSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dealName">Deal Name *</Label>
        <Input
          id="dealName"
          placeholder="e.g., Project Phoenix"
          {...register("dealName")}
          data-testid="input-deal-name"
        />
        {errors.dealName && <p className="text-sm text-destructive">{errors.dealName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name *</Label>
        <Input
          id="companyName"
          placeholder="e.g., Acme Corporation"
          {...register("companyName")}
          data-testid="input-company-name"
        />
        {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Select onValueChange={(v) => setValue("sector", v)} defaultValue="">
            <SelectTrigger data-testid="select-sector">
              <SelectValue placeholder="Select sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.sector && <p className="text-sm text-destructive">{errors.sector.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="facilitySize">Facility Size ($MM) *</Label>
          <Input
            id="facilitySize"
            type="number"
            placeholder="e.g., 50"
            {...register("facilitySize")}
            data-testid="input-facility-size"
          />
          {errors.facilitySize && <p className="text-sm text-destructive">{errors.facilitySize.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="facilityType">Facility Type *</Label>
          <Select onValueChange={(v) => setValue("facilityType", v)} defaultValue="First Lien">
            <SelectTrigger data-testid="select-facility-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {facilityTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Target Close Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !targetCloseDate && "text-muted-foreground"
                )}
                data-testid="button-target-close-date"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {targetCloseDate ? format(targetCloseDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={targetCloseDate}
                onSelect={(date) => date && setValue("targetCloseDate", date)}
                initialFocus
                disabled={(date) => date < new Date()}
              />
            </PopoverContent>
          </Popover>
          {errors.targetCloseDate && <p className="text-sm text-destructive">{errors.targetCloseDate.message}</p>}
        </div>
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit" data-testid="button-next-step">
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </form>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Existing Bookrunner</Label>
        <Select value={bookrunnerSelectValue} onValueChange={handleBookrunnerSelect}>
          <SelectTrigger data-testid="select-bookrunner">
            <SelectValue placeholder="Select a bookrunner" />
          </SelectTrigger>
          <SelectContent>
            {mockBookrunners
              .filter((b) => !selectedBookrunners.some((sb) => sb.id === b.id))
              .map((bookrunner) => (
                <SelectItem key={bookrunner.id} value={bookrunner.id}>
                  {bookrunner.organization} — {bookrunner.contactName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <Label className="text-xs text-muted-foreground">Or Add New Bookrunner</Label>
        <div className="grid grid-cols-3 gap-2">
          <Input
            placeholder="Organization"
            value={newBookrunnerOrg}
            onChange={(e) => setNewBookrunnerOrg(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Contact Name"
            value={newBookrunnerContact}
            onChange={(e) => setNewBookrunnerContact(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Email"
            type="email"
            value={newBookrunnerEmail}
            onChange={(e) => setNewBookrunnerEmail(e.target.value)}
            className="text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNewBookrunner}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Bookrunner
        </Button>
      </div>

      {selectedBookrunners.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selected Bookrunners</Label>
          <div className="border rounded-lg divide-y">
            {selectedBookrunners.map((bookrunner, index) => (
              <div key={index} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetLeadBookrunner(index)}
                    className={cn(
                      "p-1 rounded",
                      bookrunner.isLead
                        ? "text-amber-500"
                        : "text-muted-foreground hover:text-amber-500"
                    )}
                    title={bookrunner.isLead ? "Lead Bookrunner" : "Set as Lead"}
                  >
                    <Crown className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-sm font-medium">{bookrunner.organization}</p>
                    <p className="text-xs text-muted-foreground">
                      {bookrunner.contactName} • {bookrunner.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {bookrunner.isLead && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                      Lead
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveBookrunner(index)}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
          Skip
        </Button>
        <Button type="button" onClick={() => setCurrentStep(3)} data-testid="button-next-step-2">
          Next <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </DialogFooter>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Existing Investor</Label>
        <Select value={investorSelectValue} onValueChange={handleInvestorSelect}>
          <SelectTrigger data-testid="select-investor">
            <SelectValue placeholder="Select an investor" />
          </SelectTrigger>
          <SelectContent>
            {mockLenders
              .filter((l) => !selectedInvestors.some((si) => si.id === l.id))
              .map((lender) => (
                <SelectItem key={lender.id} value={lender.id}>
                  {lender.name} — {lender.type}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
        <Label className="text-xs text-muted-foreground">Or Add New Investor</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="First Name"
            value={newInvestorFirstName}
            onChange={(e) => setNewInvestorFirstName(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Last Name"
            value={newInvestorLastName}
            onChange={(e) => setNewInvestorLastName(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Email"
            type="email"
            value={newInvestorEmail}
            onChange={(e) => setNewInvestorEmail(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Organization"
            value={newInvestorOrg}
            onChange={(e) => setNewInvestorOrg(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="new-investor-nda"
              checked={newInvestorNdaRequired}
              onCheckedChange={setNewInvestorNdaRequired}
            />
            <Label htmlFor="new-investor-nda" className="text-xs">
              NDA Required
            </Label>
          </div>
          <Select
            value={newInvestorAccessTier}
            onValueChange={(v) => setNewInvestorAccessTier(v as "early" | "full" | "legal")}
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="early">Early Access</SelectItem>
              <SelectItem value="full">Full Access</SelectItem>
              <SelectItem value="legal">Legal Access</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddNewInvestor}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Lender
        </Button>
      </div>

      {selectedInvestors.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Selected Lenders</Label>
          <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
            {selectedInvestors.map((investor, index) => (
              <div key={index} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">
                    {investor.firstName} {investor.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {investor.organization} • {investor.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">{investor.accessTier}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveInvestor(index)}
                    className="h-7 w-7"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <Button
          type="button"
          onClick={handleCreateDeal}
          disabled={isSubmitting}
          data-testid="button-create-deal-submit"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
            </>
          ) : (
            <>Create Deal</>
          )}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2" data-testid="button-new-deal">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {STEPS[currentStep - 1].icon && (
              <span className="text-primary">
                {React.createElement(STEPS[currentStep - 1].icon, { className: "h-5 w-5" })}
              </span>
            )}
            {currentStep === 1 && "Create New Deal"}
            {currentStep === 2 && "Invite Bookrunners"}
            {currentStep === 3 && "Invite Investors"}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Enter the basic details for your new debt deal."}
            {currentStep === 2 && "Add bookrunners to manage this deal. You can designate one as lead."}
            {currentStep === 3 && "Optionally invite investors now, or you can do this later."}
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </DialogContent>
    </Dialog>
  );
}
