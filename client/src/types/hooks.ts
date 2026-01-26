import { Hub, Link } from './api';

export interface UseHubReturn {
  hub: Hub | null;
  links: Link[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
