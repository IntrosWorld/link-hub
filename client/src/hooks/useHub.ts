import { useState, useEffect } from 'react';
import { UseHubReturn } from '../types/hooks';
import { HubResponse } from '../types/api';

export function useHub(handle: string | undefined): UseHubReturn {
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
      const response = await fetch(`/api/hubs/${handle}`);

      if (!response.ok) {
        throw new Error(`Hub not found: ${response.status}`);
      }

      const data: HubResponse = await response.json();
      console.log('Hub data received:', data);

      setHub(data.hub);
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
  }, [handle]);

  return { hub, links, loading, error, refresh: fetchHub };
}
