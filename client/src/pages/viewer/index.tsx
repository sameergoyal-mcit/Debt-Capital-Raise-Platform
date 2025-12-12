import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useRole } from "@/context/role";

export default function ViewerIndex(props: any) {
  const { role } = useRole();
  const [, setLocation] = useLocation();
  const dealId = props?.params?.id;

  useEffect(() => {
    if (!dealId) return;
    setLocation(`/deal/${dealId}/viewer/${role}`);
  }, [dealId, role, setLocation]);

  return null;
}
