import React from "react"
import { Button } from "@/components/ui/button"
import { exportDealsToCsv } from "./csv-export"
import { FileDown } from "lucide-react"
import type { Deal } from "@/types/database"

type Props = {
  deals: Deal[]
  filename?: string
}

export default function CsvExportButton({ deals, filename = "deals.csv" }: Props) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.preventDefault()
        exportDealsToCsv(filename, deals)
      }}
    >
      <FileDown className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  )
}