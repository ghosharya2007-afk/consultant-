export interface User {
  id: string;
  name: string;
  age: number;
  education: string;
  income: number;
  free_time: number;
  clarity_level: number;
  execution_readiness_score: number;
  subscription_status: 'free' | 'pro';
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'active' | 'completed';
  google_project_prompt?: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id: string;
  week_number: number;
  title: string;
  description: string;
  time_required: string;
  reason: string;
  status: 'pending' | 'completed' | 'skipped';
  blocker_reason?: string;
  youtube_recommendation?: string;
  github_idea?: string;
}

export interface CareerPath {
  title: string;
  description: string;
  why: string;
  google_project_prompt: string;
}
