export interface DatabaseHub {
  id: number;
  handle: string;
  uid: string;
  title: string;
  description: string;
  theme_config: string;
  created_at: Date;
}

export interface Hub {
  id: number;
  handle: string;
  uid: string;
  title: string;
  description: string;
  themeConfig: Record<string, unknown>;
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
  device_target: 'all' | 'mobile' | 'desktop';
  location_target: string | null;
}

export interface Link extends DatabaseLink {
  effective_score?: number;
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
