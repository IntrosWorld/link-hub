import { useState, useEffect } from 'react';
import { UseHubReturn } from '../types/hooks';
import { Hub, HubResponse } from '../types/api';

const normalizeHub = (hub: HubResponse['hub']): Hub => {
  const allowedUsernames = (hub as any).allowed_usernames ?? (hub as any).allowedUsernames ?? null;
  const themeConfig = (hub as any).theme_config ?? (hub as any).themeConfig ?? {};
  const createdAt = (hub as any).created_at ?? (hub as any).createdAt ?? null;

  return {
    ...hub,
    allowedUsernames,
    themeConfig,
    createdAt
  } as Hub;
};

export function useHub(handle: string | undefined, username?: string, token?: string | null): UseHubReturn {
  const [hub, setHub] = useState<UseHubReturn['hub']>(null);
  const [links, setLinks] = useState<UseHubReturn['links']>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHub = async (): Promise<void> => {
    if (!handle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching hub:', handle);
      const path = username ? `/api/hubs/${username}/${handle}` : `/api/hubs/${handle}`;
      const response = await fetch(path, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Hub request failed: ${response.status}`);
      }

      const data: HubResponse = await response.json();
      console.log('Hub data received:', data);

      setHub(normalizeHub(data.hub));
      setLinks(data.links || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching hub:', err);
      setError(errorMessage);
      setHub(null);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (handle) {
      fetchHub();
    } else {
      setHub(null);
      setLinks([]);
      setLoading(false);
    }
  }, [handle, username, token]);

  return { hub, links, loading, error, refresh: fetchHub };
}
