import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { SyndicateBook } from "@/components/syndicate-book";
import { mockDeals } from "@/data/deals";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export default function SyndicateBookPage() {
  const [, params] = useRoute("/deal/:id/syndicate-book");
  const dealId = params?.id || "101";
  const deal = mockDeals.find(d => d.id === dealId);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Internal Only
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Syndicate Book</h1>
            <p className="text-muted-foreground mt-1">
              Internal tracking for {deal?.dealName || "Deal"} syndication
            </p>
          </div>
        </div>

        {/* Syndicate Book Component */}
        <SyndicateBook dealId={dealId} />
      </div>
    </Layout>
  );
}
