import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { DealCalendar } from "@/components/deal-calendar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { NDAGate } from "@/components/nda-gate";
import { useAuth } from "@/context/auth-context";

export default function CalendarPage() {
  const [, params] = useRoute("/deal/:id/calendar");
  const dealId = params?.id || "101";
  const { user } = useAuth();
  const userRole = user?.role?.toLowerCase();
  const isInvestor = userRole === "investor" || userRole === "lender";

  const PageContent = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href={`/deal/${dealId}/timeline`}>
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Timeline
          </Button>
        </Link>
        <h1 className="text-2xl font-serif font-bold text-primary">Deal Calendar</h1>
      </div>
      
      <DealCalendar dealId={dealId} inline />
    </div>
  );

  if (isInvestor) {
    return (
      <Layout>
        <NDAGate dealId={dealId} title="Deal Calendar Access">
          <PageContent />
        </NDAGate>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContent />
    </Layout>
  );
}
