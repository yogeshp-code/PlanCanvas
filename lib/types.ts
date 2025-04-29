export interface ResourceChange {
  address: string
  type: string
  name: string
  action: "create" | "update" | "delete"
  changeDetails?: any
  dependencies?: string[]
}

export interface PlanSummary {
  create: number
  update: number
  delete: number
}

export interface ParsedPlan {
  resourceChanges: ResourceChange[]
  summary: PlanSummary
}
