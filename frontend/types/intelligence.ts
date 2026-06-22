export interface Topic {
  title: string;
  discussion: string;
}

export interface Quote {
  speaker: string;
  quote: string;
}

export interface ActionItem {
  description: string;
  owner: string | null;
  deadline_mentioned: string | null;
}

export interface MeetingIntelligence {
  id: string;
  meeting_id: string;
  summary: string;
  decisions: string[];
  topics_discussed: Topic[];
  risks_and_concerns: string[];
  notable_quotes: Quote[];
  action_items: ActionItem[];
  confidence: number;
  ai_model_used: string;
  agent_run_log: string[];
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}
