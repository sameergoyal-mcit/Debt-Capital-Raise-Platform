import React from "react";
import { useParams } from "wouter";
import { Layout } from "@/components/layout";
import { SubmitProposal } from "@/components/rfp/submit-proposal";

export default function BankProposalPage() {
  const { id: dealId } = useParams<{ id: string }>();

  if (!dealId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-destructive">
          Deal ID is required
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <SubmitProposal dealId={dealId} />
      </div>
    </Layout>
  );
}
