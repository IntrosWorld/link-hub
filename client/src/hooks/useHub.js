import { useState, useEffect } from 'react';

export function useHub(handle) {
    const [hub, setHub] = useState(null);
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHub = async () => {
        if (!handle) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('Fetching hub:', handle);
            const res = await fetch(`/api/hubs/${handle}`);

            if (!res.ok) {
                throw new Error(`Hub not found: ${res.status}`);
            }

            const data = await res.json();
            console.log('Hub data received:', data);

            setHub(data.hub);
            setLinks(data.links || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching hub:', err);
            setError(err.message);
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
