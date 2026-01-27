export interface DatabaseUser {
  id: number;
  uid: string;
  username: string;
  display_name: string | null;
  created_at: Date;
}

export interface User {
  id: number;
  uid: string;
  username: string;
  displayName: string | null;
  createdAt: Date;
}

export interface DatabaseHub {
  id: number;
  handle: string;
  username: string;
  uid: string;
  title: string;
  description: string;
  theme_config: string;
  visibility: 'public' | 'private' | 'restricted';
  allowed_usernames: string[] | null;
  created_at: Date;
}

export interface Hub {
  id: number;
  handle: string;
  username: string;
  uid: string;
  title: string;
  description: string;
  themeConfig: Record<string, unknown>;
  visibility: 'public' | 'private' | 'restricted';
  allowedUsernames: string[] | null;
  createdAt: Date;
}

export interface DatabaseLink {
  id: number;
  hub_id: number;
  title: string;
  url: string;
  clicks: number;
  start_hour: number | null;
  end_hour: number | null;
  time_priority: number;
  schedule_start_date: string | null;  // DATE type
  schedule_end_date: string | null;    // DATE type
  days_of_week: number[] | null;       // 0-6 (Sun-Sat)
  max_clicks: number | null;
  max_clicks_per_user: number | null;
  device_target: 'all' | 'mobile' | 'desktop';
  location_target: string | null;
  visibility: 'public' | 'restricted';
  allowed_usernames: string[] | null;
  created_at: Date;
  expires_at: Date | null;
}

export interface Link extends DatabaseLink {
  effective_score?: number;
}

export interface DatabaseLinkArrangement {
  id: number;
  hub_id: number;
  username: string | null;  // null = default for all users
  link_order: number[];     // Array of link IDs
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LinkArrangement {
  id: number;
  hubId: number;
  username: string | null;
  linkOrder: number[];
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseLinkRule {
  id: number;
  link_id: number;
  rule_type: 'geo_fence' | 'prerequisite' | 'ab_test' | 'conditional' | 'schedule_complex';
  rule_config: string;  // JSONB stored as string
  enabled: boolean;
  priority: number;
  created_at: Date;
}

export interface LinkRule {
  id: number;
  linkId: number;
  ruleType: 'geo_fence' | 'prerequisite' | 'ab_test' | 'conditional' | 'schedule_complex';
  ruleConfig: Record<string, unknown>;
  enabled: boolean;
  priority: number;
  createdAt: Date;
}

export interface DatabaseUserLinkData {
  id: number;
  username: string;
  link_id: number;
  clicks: number;
  first_clicked: Date | null;
  last_clicked: Date | null;
  metadata: string | null;  // JSONB stored as string
  created_at: Date;
}

export interface UserLinkData {
  id: number;
  username: string;
  linkId: number;
  clicks: number;
  firstClicked: Date | null;
  lastClicked: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface DatabaseAnalytics {
  id: number;
  hub_id: number | null;
  link_id: number | null;
  event_type: 'view' | 'click';
  timestamp: Date;
  user_agent: string | null;
  ip_hash: string | null;
}

export interface AnalyticsSummary {
  total_views: string;
  total_clicks: string;
}
