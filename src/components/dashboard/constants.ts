export const DEAL_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'missing_docs', label: 'Missing Docs', color: 'bg-orange-100 text-orange-800' },
  { value: 'submitted', label: 'Submitted', color: 'bg-purple-100 text-purple-800' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'funded', label: 'Funded', color: 'bg-gray-100 text-gray-800' },
  { value: 'declined', label: 'Declined', color: 'bg-red-100 text-red-800' },
];

export const LOAN_TYPES = [
  'Merchant Cash Advance',
  'Term Loan',
  'Line of Credit (LOC)',
  'Factoring',
  'Equipment Financing',
  'SBA 7(a)',
  'SBA 504',
  'Commercial Real Estate (CRE)',
  'Personal Loan',
  'Business Credit Card',
  'Other',
];

export const DATE_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: 'all', label: 'All time' },
];