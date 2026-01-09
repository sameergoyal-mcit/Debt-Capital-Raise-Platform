import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

const createDealSchema = z.object({
  dealName: z.string().min(1, "Deal name is required"),
  borrowerName: z.string().min(1, "Borrower name is required"),
  sector: z.string().min(1, "Sector is required"),
  facilitySize: z.coerce.number().positive("Facility size must be positive"),
  facilityType: z.string().min(1, "Facility type is required"),
  instrument: z.string().min(1, "Instrument is required"),
});

type CreateDealForm = z.infer<typeof createDealSchema>;

interface CreateDealDialogProps {
  trigger?: React.ReactNode;
}

export function CreateDealDialog({ trigger }: CreateDealDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateDealForm>({
    resolver: zodResolver(createDealSchema),
    defaultValues: {
      dealName: "",
      borrowerName: "",
      sector: "",
      facilitySize: 0,
      facilityType: "First Lien",
      instrument: "Senior Secured Term Loan",
    },
  });

  const onSubmit = async (data: CreateDealForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          sponsor: "TBD",
          stage: "Structuring",
          status: "draft",
          targetSize: data.facilitySize,
          committed: "0",
          pricingBenchmark: "SOFR",
          spreadLowBps: 500,
          spreadHighBps: 550,
          oid: "99",
          feesPct: "2",
          closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          launchDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create deal");
      }

      const deal = await response.json();
      toast({ title: "Deal Created", description: `${data.dealName} has been created.` });
      setOpen(false);
      reset();
      navigate(`/deal/${deal.id}/overview`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const instruments = [
    "Senior Secured Term Loan",
    "Revolving Credit Facility",
    "Project Finance",
    "Delayed Draw Term Loan",
    "Asset-Based Loan",
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2" data-testid="button-new-deal">
            <Plus className="h-4 w-4" /> New Deal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Enter the basic details for your new debt deal. You can add more information later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dealName">Deal Name</Label>
            <Input
              id="dealName"
              placeholder="e.g., Project Phoenix"
              {...register("dealName")}
              data-testid="input-deal-name"
            />
            {errors.dealName && <p className="text-sm text-destructive">{errors.dealName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="borrowerName">Borrower Name</Label>
            <Input
              id="borrowerName"
              placeholder="e.g., Acme Corporation"
              {...register("borrowerName")}
              data-testid="input-borrower-name"
            />
            {errors.borrowerName && <p className="text-sm text-destructive">{errors.borrowerName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Select onValueChange={(v) => setValue("sector", v)} defaultValue="">
                <SelectTrigger data-testid="select-sector">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sector && <p className="text-sm text-destructive">{errors.sector.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilitySize">Facility Size ($)</Label>
              <Input
                id="facilitySize"
                type="number"
                placeholder="e.g., 50000000"
                {...register("facilitySize")}
                data-testid="input-facility-size"
              />
              {errors.facilitySize && <p className="text-sm text-destructive">{errors.facilitySize.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="facilityType">Facility Type</Label>
              <Select onValueChange={(v) => setValue("facilityType", v)} defaultValue="First Lien">
                <SelectTrigger data-testid="select-facility-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {facilityTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrument">Instrument</Label>
              <Select onValueChange={(v) => setValue("instrument", v)} defaultValue="Senior Secured Term Loan">
                <SelectTrigger data-testid="select-instrument">
                  <SelectValue placeholder="Select instrument" />
                </SelectTrigger>
                <SelectContent>
                  {instruments.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-create-deal-submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create Deal"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
