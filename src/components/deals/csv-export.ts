import type { Deal } from "@/types/database"

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      let s = v === null || v === undefined ? "" : String(v)
      // Escape quotes and wrap fields containing commas/newlines
      s = s.replace(/"/g, '""')
      if (/[,\n\r]/.test(s)) s = `"${s}"`
      return s
    })
    .join(",")
}

export function exportDealsToCsv(filename: string, deals: Deal[]) {
  const headers = [
    "Date Submitted",
    "Loan Type",
    "Company",
    "Client Name",
    "Email",
    "Phone",
    "Loan Amount",
    "Status",
    "Source",
  ]

  const rows = deals.map((d) =>
    toCsvRow([
      d.created_at,
      d.loan_type,
      d.legal_company_name,
      d.client_name ?? "",
      d.email ?? "",
      d.phone ?? "",
      Number(d.loan_amount || 0),
      d.status,
      d.source ?? "",
    ]),
  )

  const csv = [toCsvRow(headers), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}