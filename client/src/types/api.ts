export interface User {
  id: number;
  uid: string;
  username: string;
  displayName: string | null;
  createdAt: Date;
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

export interface Link {
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
  visibility: 'public' | 'restricted';
  allowed_usernames: string[] | null;
  created_at: Date;
  effective_score?: number;
}

export interface HubResponse {
  hub: Hub;
  links: Link[];
}

export interface AnalyticsResponse {
  total_views: string;
  total_clicks: string;
}
