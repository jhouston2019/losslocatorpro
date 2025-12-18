// Domain types and enums for Loss Locator Pro

export enum LossEventStatus {
  Unreviewed = 'Unreviewed',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Converted = 'Converted',
}

export enum EventType {
  Hail = 'Hail',
  Wind = 'Wind',
  Fire = 'Fire',
  Freeze = 'Freeze',
}

export enum RoutingQueueStatus {
  Unassigned = 'Unassigned',
  Assigned = 'Assigned',
  Contacted = 'Contacted',
  Qualified = 'Qualified',
  Converted = 'Converted',
}

export enum AssigneeType {
  InternalOps = 'internal-ops',
  AdjusterPartner = 'adjuster-partner',
  ContractorPartner = 'contractor-partner',
}

export enum Priority {
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
}

export enum UserRole {
  Admin = 'admin',
  Ops = 'ops',
  Viewer = 'viewer',
}

