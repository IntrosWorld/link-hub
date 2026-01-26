import { Hub, Link, AnalyticsSummary } from './database';

export interface CreateHubRequest {
  handle: string;
  title?: string;
  description?: string;
  themeConfig?: Record<string, unknown>;
}

export interface CreateLinkRequest {
  hubId: number;
  title: string;
  url: string;
  startHour?: number | null;
  endHour?: number | null;
  timePriority?: number;
  deviceTarget?: 'all' | 'mobile' | 'desktop';
}

export interface HubWithLinksResponse {
  hub: Hub;
  links: Link[];
}

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  success: boolean;
}

export { Hub, Link, AnalyticsSummary };
