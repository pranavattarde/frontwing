export interface Investigation {
  id: string;
  user_id?: string | null;
  question: string;
  ai_response: any;
  session?: string | null;
  timestamp: Date;
  provider_used: string;
  investigation_metadata?: any;
  created_at: Date;
  is_saved?: boolean;
}

export interface SavedInvestigation {
  id: number;
  user_id: string;
  investigation_id: string;
  created_at: Date;
}

export interface CreateInvestigationDTO {
  user_id?: string | null;
  question: string;
  ai_response: any;
  session?: string | null;
  provider_used?: string;
  investigation_metadata?: any;
}

export interface HistoryQueryParams {
  limit?: number;
  offset?: number;
  session?: string;
  search?: string;
}
