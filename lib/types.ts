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
  ob_account_id?: string
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
  ob_account_id?: string
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
  negotiation_status?: 'cancel' | 'negotiate' | 'switch' | null
  created_at: string
}

export interface RenewalNegotiation {
  id: string
  renewal_id: string
  user_id: string
  household_id: string
  messages: AgentMessage[]
  draft_letter?: string
  created_at: string
  updated_at: string
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

// ─── Open Banking ─────────────────────────────────────────────────────────────

export interface OpenBankingConnection {
  id: string
  household_id: string
  user_id: string
  provider: string
  bank_id: string
  bank_name: string
  bank_logo_url?: string
  status: 'active' | 'expired' | 'revoked' | 'error'
  last_synced_at?: string
  consent_expires_at: string
  token_expires_at: string
  created_at: string
  updated_at: string
  // client-side extras (not persisted)
  account_count?: number
}

export interface OpenBankingAccount {
  id: string
  connection_id: string
  household_id: string
  external_account_id: string
  account_type: string
  account_name: string
  currency: string
  balance: number
  linked_asset_id?: string
  linked_liability_id?: string
  last_synced_at?: string
  created_at: string
}

export interface DetectedRecurring {
  merchant_key: string
  name: string
  amount: number
  currency: string
  frequency: 'monthly'
  next_renewal_date: string
  transaction_count: number
}

// Matches a TrueLayer account as returned from their API
export interface TLAccount {
  account_id: string
  account_type: string  // TRANSACTION | SAVINGS | CREDIT_CARD | LOAN | MORTGAGE
  display_name: string
  currency: string
  provider: { display_name: string; logo_uri?: string; provider_id: string }
  // added by our mapping layer:
  balance?: number
  side?: 'asset' | 'liability'
  category?: AssetCategory | LiabilityCategory
}

export interface AccountMapping {
  external_account_id: string
  account_type: string
  account_name: string
  currency: string
  balance: number
  decision: 'asset' | 'liability' | 'skip'
  category: string
}
