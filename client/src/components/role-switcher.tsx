import React from "react";
import { useRole, UserRole } from "@/lib/roleContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Shield, Users, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function RoleSwitcher() {
  const { role, setRole } = useRole();

  const roleConfig = {
    issuer: {
      label: "Issuer (Sponsor)",
      icon: <Briefcase className="h-4 w-4" />,
      color: "bg-blue-100 text-blue-700 border-blue-200"
    },
    bookrunner: {
      label: "Bookrunner (Bank)",
      icon: <Shield className="h-4 w-4" />,
      color: "bg-purple-100 text-purple-700 border-purple-200"
    },
    investor: {
      label: "Investor (Lender)",
      icon: <Users className="h-4 w-4" />,
      color: "bg-green-100 text-green-700 border-green-200"
    }
  };

  const currentConfig = roleConfig[role];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">Viewing as:</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={`h-8 gap-2 border ${currentConfig.color} hover:${currentConfig.color}`}>
            {currentConfig.icon}
            <span className="text-xs font-semibold">{currentConfig.label}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRole("issuer")}>
            <Briefcase className="mr-2 h-4 w-4 text-blue-600" />
            <span>Issuer (Sponsor)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRole("bookrunner")}>
            <Shield className="mr-2 h-4 w-4 text-purple-600" />
            <span>Bookrunner (Bank)</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRole("investor")}>
            <Users className="mr-2 h-4 w-4 text-green-600" />
            <span>Investor (Lender)</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
