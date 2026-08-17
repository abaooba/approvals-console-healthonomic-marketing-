export interface Campaign {
  campaignName: string;
  briefObjective: string;
  keyMessaging: string;
  targetAudience: string;
}

export interface QueueRecord {
  id: string;
  title: string;
  content: string;
  channel: string;
  entity: string;
  gbpLocation: string | null;
  previewUrl: string | null;
  createdTime: string;
  campaign: Campaign | null;
}

export interface QueueResponse {
  entity: string;
  records: QueueRecord[];
}

export type DecisionAction = "approve" | "revise";

export interface PlanRecord {
  id: string;
  campaignGroup: string;
  month: string;
  campaignName: string;
  channel: string;
  scheduledDate: string | null;
  planStatus: string;
  briefObjective: string;
  keyMessaging: string;
  targetKeyword: string;
  gbpLocation: string;
  rationale: string;
  reviewerNotes: string;
}

export interface PlansResponse {
  records: PlanRecord[];
}
