import React from "react";
import { Badge } from "@/components/ui/badge";

type StatusTagProps = {
  status: string;
  className?: string;
};

const STATUS_STYLES: Record<string, string> = {
  "new": "bg-[#1E3A8A] text-white", // Deep brand blue
  "new deal": "bg-[#1E3A8A] text-white",
  "under review": "bg-[#283593] text-white", // Indigo
  "missing information": "bg-[#FF8F00] text-black", // Orange accent
  "approved": "bg-[#2E7D32] text-white", // Green
  "declined": "bg-[#C62828] text-white", // Red
  "funded": "bg-[#00C853] text-white", // Success green
  "not interested": "bg-[#6B7280] text-white", // Neutral gray
  "on hold": "bg-[#8D6E63] text-white", // Muted brown
  "withdrawn": "bg-[#9CA3AF] text-white", // Cool gray
  "re-submission": "bg-[#7E57C2] text-white", // Purple
};

export function StatusTag({ status, className }: StatusTagProps) {
  const key = (status || "").toLowerCase().trim();
  const style = STATUS_STYLES[key] || "bg-muted text-muted-foreground";
  return (
    <Badge className={`${style} ${className || ""}`}>
      {status}
    </Badge>
  );
}

export default StatusTag;