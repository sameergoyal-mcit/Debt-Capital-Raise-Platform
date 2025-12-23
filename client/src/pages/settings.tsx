import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { dailyDigestService } from "@/lib/daily-digest-service";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [digestStatus, setDigestStatus] = useState<{success?: boolean; message?: string} | null>(null);

  const handleSendDigest = async () => {
    setLoading(true);
    setDigestStatus(null);
    try {
      const result = await dailyDigestService.sendDailyDigests(user);
      setDigestStatus(result);
      
      if (result.success) {
        toast({
          title: "Digest Sent",
          description: "Check your console logs for the email payload.",
        });
      } else {
        toast({
          title: "Digest Skipped",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error(error);
      setDigestStatus({ success: false, message: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account preferences and notifications.</p>
        </div>

        <div className="grid gap-6">
            {/* Developer Tools Section - Visible for prototype purposes */}
            <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                        <Mail className="h-5 w-5" /> Developer Tools: Email Notifications
                    </CardTitle>
                    <CardDescription className="text-amber-800/80">
                        Manually trigger background jobs and test email delivery systems.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-lg shadow-sm">
                        <div className="space-y-1">
                            <h4 className="font-medium text-sm">Trigger Daily Digest</h4>
                            <p className="text-xs text-muted-foreground">
                                Simulates the daily cron job that sends summary emails to investors.
                                <br/>Run this while logged in as an Investor to see your personal digest.
                            </p>
                        </div>
                        <Button 
                            onClick={handleSendDigest} 
                            disabled={loading}
                            className="bg-amber-600 hover:bg-amber-700 text-white min-w-[140px]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                            {loading ? "Sending..." : "Send Digest Now"}
                        </Button>
                    </div>

                    {digestStatus && (
                        <div className={`p-3 rounded-md text-sm flex items-center gap-2 ${digestStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {digestStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                            {digestStatus.message}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Control when and how you receive updates.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Daily Digest</Label>
                            <p className="text-sm text-muted-foreground">Receive a daily summary of all activity across your active deals.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Real-time Documents</Label>
                            <p className="text-sm text-muted-foreground">Get notified immediately when new documents are uploaded.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label className="text-base">Q&A Responses</Label>
                            <p className="text-sm text-muted-foreground">Notify me when my questions are answered.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </Layout>
  );
}
