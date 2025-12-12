import React, { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useRole } from "@/context/role";

export default function ViewerIndex() {
  const [, params] = useRoute("/deal/:id/viewer");
  const dealId = params?.id;
  const { role } = useRole();
  const [, setLocation] = useLocation();

  // Redirect to the specific role page based on current context
  useEffect(() => {
    if (dealId) {
      setLocation(`/deal/${dealId}/viewer/${role}`);
    }
  }, [dealId, role, setLocation]);

  return null; // or a loading spinner
}
