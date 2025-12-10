export type LossEventStatus = 'Unreviewed' | 'Contacted' | 'Qualified' | 'Converted';

export type LossEvent = {
  id: string;
  timestamp: string;
  event: string;
  severity: number;
  zip: string;
  incomeBand: string;
  propertyType: string;
  claimProbability: number;
  priorityScore: number;
  status: LossEventStatus;
};

export const lossEvents: LossEvent[] = [
  {
    id: '10001',
    timestamp: '2025-01-02 14:32',
    event: 'Hail',
    severity: 3.25,
    zip: '76179',
    incomeBand: '72nd percentile',
    propertyType: 'Single Family',
    claimProbability: 0.82,
    priorityScore: 92,
    status: 'Unreviewed',
  },
  {
    id: '10002',
    timestamp: '2025-01-02 15:01',
    event: 'Wind',
    severity: 61,
    zip: '77007',
    incomeBand: '68th percentile',
    propertyType: 'Townhome',
    claimProbability: 0.71,
    priorityScore: 84,
    status: 'Contacted',
  },
  {
    id: '10003',
    timestamp: '2025-01-02 15:47',
    event: 'Hail',
    severity: 2.75,
    zip: '75248',
    incomeBand: '81st percentile',
    propertyType: 'Single Family',
    claimProbability: 0.88,
    priorityScore: 96,
    status: 'Unreviewed',
  },
  {
    id: '10004',
    timestamp: '2025-01-02 16:10',
    event: 'Freeze',
    severity: 18,
    zip: '80216',
    incomeBand: '55th percentile',
    propertyType: 'Duplex',
    claimProbability: 0.54,
    priorityScore: 68,
    status: 'Qualified',
  },
  {
    id: '10005',
    timestamp: '2025-01-02 16:42',
    event: 'Wind',
    severity: 72,
    zip: '29464',
    incomeBand: '77th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.76,
    priorityScore: 89,
    status: 'Unreviewed',
  },
  {
    id: '10006',
    timestamp: '2025-01-02 17:05',
    event: 'Fire',
    severity: 83,
    zip: '85054',
    incomeBand: '63rd percentile',
    propertyType: 'Condo',
    claimProbability: 0.69,
    priorityScore: 80,
    status: 'Qualified',
  },
  {
    id: '10007',
    timestamp: '2025-01-02 17:22',
    event: 'Hail',
    severity: 1.75,
    zip: '60611',
    incomeBand: '88th percentile',
    propertyType: 'High-Rise',
    claimProbability: 0.61,
    priorityScore: 74,
    status: 'Contacted',
  },
  {
    id: '10008',
    timestamp: '2025-01-02 18:03',
    event: 'Wind',
    severity: 58,
    zip: '30041',
    incomeBand: '69th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.59,
    priorityScore: 71,
    status: 'Unreviewed',
  },
  {
    id: '10009',
    timestamp: '2025-01-02 18:37',
    event: 'Freeze',
    severity: 15,
    zip: '55410',
    incomeBand: '73rd percentile',
    propertyType: 'Single Family',
    claimProbability: 0.63,
    priorityScore: 76,
    status: 'Contacted',
  },
  {
    id: '10010',
    timestamp: '2025-01-02 19:02',
    event: 'Hail',
    severity: 2.0,
    zip: '73099',
    incomeBand: '58th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.69,
    priorityScore: 83,
    status: 'Qualified',
  },
  {
    id: '10011',
    timestamp: '2025-01-02 19:18',
    event: 'Wind',
    severity: 64,
    zip: '29407',
    incomeBand: '61st percentile',
    propertyType: 'Townhome',
    claimProbability: 0.57,
    priorityScore: 69,
    status: 'Unreviewed',
  },
  {
    id: '10012',
    timestamp: '2025-01-02 19:56',
    event: 'Fire',
    severity: 91,
    zip: '85018',
    incomeBand: '79th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.91,
    priorityScore: 98,
    status: 'Converted',
  },
  {
    id: '10013',
    timestamp: '2025-01-02 20:24',
    event: 'Hail',
    severity: 1.5,
    zip: '76109',
    incomeBand: '66th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.55,
    priorityScore: 64,
    status: 'Contacted',
  },
  {
    id: '10014',
    timestamp: '2025-01-02 20:45',
    event: 'Freeze',
    severity: 12,
    zip: '80210',
    incomeBand: '71st percentile',
    propertyType: 'Duplex',
    claimProbability: 0.48,
    priorityScore: 59,
    status: 'Unreviewed',
  },
  {
    id: '10015',
    timestamp: '2025-01-02 21:10',
    event: 'Wind',
    severity: 69,
    zip: '30004',
    incomeBand: '75th percentile',
    propertyType: 'Single Family',
    claimProbability: 0.73,
    priorityScore: 86,
    status: 'Qualified',
  },
];

type TimelineEntry = { type: string; value: string; date: string };

type PropertyIntel = {
  address: string;
  zipIncome: string;
  roofAge: string;
  propertyType: string;
  risks: string[];
  timeline: TimelineEntry[];
  recommendedActions: string[];
};

export const propertyIntel: Record<string, PropertyIntel> = {
  '10001': {
    address: '1209 Meadowbrook Dr, Fort Worth TX',
    zipIncome: '72nd percentile',
    roofAge: '12–15 years',
    propertyType: 'Single Family',
    risks: ['High hail exposure', 'Old shingles', 'Prior storm cluster'],
    timeline: [
      { type: 'Hail', value: '3.25 inch', date: '2025-01-02' },
      { type: 'Wind', value: '58 mph', date: '2024-08-14' },
      { type: 'Freeze', value: '17°F', date: '2024-01-18' },
    ],
    recommendedActions: [
      'Contact homeowner for roof inspection',
      'Verify prior claim history',
      'Send contractor match',
    ],
  },
  '10002': {
    address: '714 Heights Blvd, Houston TX',
    zipIncome: '68th percentile',
    roofAge: '5–7 years',
    propertyType: 'Townhome',
    risks: ['Tree overhang', 'Mixed roofing materials'],
    timeline: [
      { type: 'Wind', value: '61 mph', date: '2025-01-02' },
      { type: 'Hail', value: '1.75 inch', date: '2024-05-09' },
      { type: 'Freeze', value: '21°F', date: '2023-12-22' },
    ],
    recommendedActions: [
      'Confirm no prior unrepaired roof work',
      'Capture exterior photos during inspection',
    ],
  },
  '10003': {
    address: '5811 Preston Meadow Dr, Dallas TX',
    zipIncome: '81st percentile',
    roofAge: '8–10 years',
    propertyType: 'Single Family',
    risks: ['Frequent hail corridor', 'Adjacent to open field exposure'],
    timeline: [
      { type: 'Hail', value: '2.75 inch', date: '2025-01-02' },
      { type: 'Hail', value: '1.5 inch', date: '2024-03-30' },
      { type: 'Wind', value: '64 mph', date: '2023-09-18' },
    ],
    recommendedActions: [
      'Prioritize outbound call within 2 hours',
      'Pre-authorize ladder assist for inspection',
      'Flag for QA review due to repeated impacts',
    ],
  },
};

export type RoutingQueueEntry = {
  id: string;
  status: 'Unassigned' | 'Assigned' | 'Contacted' | 'Qualified' | 'Converted';
  assignedTo?: string;
};

export const routingQueue: RoutingQueueEntry[] = [
  { id: '10001', status: 'Unassigned' },
  { id: '10002', status: 'Assigned', assignedTo: 'Internal Ops' },
  { id: '10003', status: 'Contacted', assignedTo: 'Adjuster Partner' },
  { id: '10005', status: 'Qualified', assignedTo: 'Contractor Partner' },
  { id: '10012', status: 'Converted', assignedTo: 'Internal Ops' },
];


