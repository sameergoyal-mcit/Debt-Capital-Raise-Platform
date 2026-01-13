import React from "react";
import { useRoute, Link } from "wouter";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { useDeal } from "@/hooks/api-hooks";
import { RoleSwitcher } from "@/components/role-switcher";
import { useRole } from "@/context/role";
import { Briefcase, TrendingUp, Activity, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

export default function IssuerViewer() {
  const [, params] = useRoute("/deal/:id/viewer/issuer");
  const dealId = params?.id || "1";
  const { data: deal } = useDeal(dealId);
  const { setRole } = useRole();

  // Force role to issuer when visiting this route
  React.useEffect(() => {
    setRole("issuer");
  }, [setRole]);

  return (
    <Layout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-serif font-bold text-primary tracking-tight">Role Portal</h1>
              <Badge variant="outline" className="bg-secondary text-secondary-foreground">
                Current View: Issuer
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Demonstrating role-based access and views for {deal.dealName}.
            </p>
          </div>
          <div className="flex items-center gap-3">
             <RoleSwitcher />
          </div>
        </div>

        <div className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Briefcase className="h-4 w-4" />
            <AlertTitle>Issuer (Sponsor) View</AlertTitle>
            <AlertDescription>
              Focus on execution cost, speed, and covenant flexibility.
            </AlertDescription>
          </Alert>

          {/* Top KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Kpi title="Committed vs Target" value={`$${(deal.committed / 1000000).toFixed(1)}M / $${(deal.targetSize / 1000000).toFixed(1)}M`} meta={`${deal.committedPct}% subscribed`} />
            <Kpi title="Pricing Guidance" value={`SOFR + ${deal.pricing.spreadLowBps}–${deal.pricing.spreadHighBps}`} meta={`OID ${deal.pricing.oid} • Fees ${deal.pricing.feesPct}%`} />
            <Kpi title="Est. All-In Yield" value="10.4% – 10.8%" meta="+25 bps = +$0.6M/yr" />
            <Kpi title="Days to Close" value="9" meta="Hard close Apr 30" />
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <Activity className="h-4 w-4 text-primary" /> Pricing Pressure
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-md border border-green-100">
                   <TrendingUp className="h-5 w-5" />
                   <span className="font-bold">Tightening</span>
                 </div>
                 <p className="text-xs text-muted-foreground mt-2">
                   Strong demand allows for potential reverse flex (-25 bps).
                 </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <Shield className="h-4 w-4 text-primary" /> Covenant Headroom
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="space-y-3">
                   <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Leverage</span>
                     <span className="font-medium">4.50x / 4.75x Cap</span>
                   </div>
                   <Progress value={90} className="h-2" />
                   <p className="text-xs text-amber-600 mt-1">Tight headroom in Year 1</p>
                 </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <Briefcase className="h-4 w-4 text-primary" /> Issuer Actions
                 </CardTitle>
              </CardHeader>
              <CardContent>
                 <ul className="text-sm text-slate-700 space-y-3">
                    <li className="pb-2 border-b border-border/50">
                      <span className="font-medium block">Approve Pricing</span>
                      <span className="text-xs text-muted-foreground">Delay may reduce allocation priority.</span>
                    </li>
                    <li>
                      <span className="font-medium block">Respond to Diligence</span>
                      <span className="text-xs text-muted-foreground">Needed to convert IOIs → firm bids.</span>
                    </li>
                 </ul>
              </CardContent>
            </Card>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
            <Link href={`/deal/${dealId}/overview`} className="text-sm text-primary hover:underline">
              Open Deal Overview
            </Link>
            <Link href={`/deal/${dealId}/documents`} className="text-sm text-primary hover:underline">
              Documents & Legal
            </Link>
            <Link href={`/deal/${dealId}/qa`} className="text-sm text-primary hover:underline">
              Q&A Center
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Kpi({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-2 text-xl font-semibold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
    </div>
  );
}
