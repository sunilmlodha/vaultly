export type AssetCategory =
  | 'bank_account'
  | 'investment'
  | 'pension'
  | 'property'
  | 'crypto'
  | 'insurance'
  | 'other'

export type LiabilityCategory =
  | 'mortgage'
  | 'loan'
  | 'credit_card'
  | 'overdraft'
  | 'other'

export type FamilyRole = 'owner' | 'partner' | 'child' | 'parent' | 'advisor'

export type TracingStatus =
  | 'pending_intake'
  | 'intake_complete'
  | 'pending_approval'
  | 'submitted'
  | 'awaiting_response'
  | 'responded'
  | 'claim_initiated'
  | 'completed'

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  currency: string
  household_id?: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface HouseholdMember {
  id: string
  household_id: string
  user_id: string
  role: FamilyRole
  invited_email?: string
  accepted: boolean
  profile?: Profile
}

export interface Asset {
  id: string
  user_id: string
  household_id: string
  name: string
  category: AssetCategory
  value: number
  currency: string
  institution?: string
  account_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Liability {
  id: string
  user_id: string
  household_id: string
  name: string
  category: LiabilityCategory
  balance: number
  currency: string
  interest_rate?: number
  monthly_payment?: number
  institution?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Renewal {
  id: string
  user_id: string
  household_id: string
  name: string
  category: string
  amount: number
  currency: string
  renewal_date: string
  provider?: string
  auto_renews: boolean
  notes?: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  household_id: string
  name: string
  target_amount: number
  current_amount: number
  currency: string
  target_date?: string
  category: string
  notes?: string
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  household_id: string
  name: string
  category: string
  file_url: string
  file_size: number
  notes?: string
  created_at: string
}

export interface EmploymentRecord {
  id: string
  user_id: string
  employer_name: string
  role?: string
  start_date: string
  end_date?: string
  is_current: boolean
  pension_enrolled?: boolean
  notes?: string
}

export interface TracingRequest {
  id: string
  user_id: string
  employment_record_id?: string
  service_type: 'pension_tracer' | 'bank_tracer' | 'ns_i' | 'abi' | 'hmrc'
  employer_name?: string
  scheme_name?: string
  confidence_score?: number
  status: TracingStatus
  submitted_at?: string
  expected_response_by?: string
  response_received_at?: string
  idempotency_key: string
  reference_number?: string
  notes?: string
  created_at: string
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AgentWorkflow {
  id: string
  user_id: string
  phase: 'intake' | 'inference' | 'approval' | 'submission' | 'monitoring' | 'complete'
  employment_records: EmploymentRecord[]
  probable_assets: ProbableAsset[]
  tracing_requests: TracingRequest[]
  messages: AgentMessage[]
  created_at: string
  updated_at: string
}

export interface ProbableAsset {
  employer_name: string
  asset_type: 'pension' | 'bank_account' | 'insurance' | 'ns_i'
  likely_provider?: string
  confidence_score: number
  reasoning: string
  recommended_service: string
}
