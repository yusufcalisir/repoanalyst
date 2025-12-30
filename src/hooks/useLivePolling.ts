import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = 'http://localhost:8080';

interface UseLivePollingOptions {
    interval?: number; // polling interval in ms (default: 30000)
    enabled?: boolean; // whether polling is active
}

interface UseLivePollingResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
    refetch: () => void;
}

/**
 * Custom hook for live polling of analysis data with If-Modified-Since support.
 * Polls the endpoint at a specified interval and only updates state if data has changed.
 */
export function useLivePolling<T>(
    endpoint: string,
    options: UseLivePollingOptions = {}
): UseLivePollingResult<T> {
    const { interval = 30000, enabled = true } = options;

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const lastModifiedRef = useRef<string>('');
    const isFirstFetchRef = useRef(true);

    const fetchData = useCallback(async (useCache = true) => {
        try {
            const headers: HeadersInit = {};

            // Send If-Modified-Since header for subsequent requests
            if (useCache && lastModifiedRef.current) {
                headers['If-Modified-Since'] = lastModifiedRef.current;
            }

            const res = await fetch(`${API_BASE}${endpoint}`, { headers });

            // 304 Not Modified - data hasn't changed
            if (res.status === 304) {
                return;
            }

            if (!res.ok) {
                if (res.status === 429) {
                    setError('Live data unavailable; retry in a few seconds.');
                    return;
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();

            // Store Last-Modified header for next request
            const lastMod = res.headers.get('Last-Modified');
            if (lastMod) {
                lastModifiedRef.current = lastMod;
            }

            setData(json);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError('Live data unavailable; retry in a few seconds.');
        } finally {
            if (isFirstFetchRef.current) {
                setLoading(false);
                isFirstFetchRef.current = false;
            }
        }
    }, [endpoint]);

    // Initial fetch and polling
    useEffect(() => {
        if (!enabled) return;

        // Initial fetch
        fetchData(false);

        // Set up polling interval
        const timer = setInterval(() => {
            fetchData(true);
        }, interval);

        return () => clearInterval(timer);
    }, [endpoint, interval, enabled, fetchData]);

    // Manual refetch function
    const refetch = useCallback(() => {
        lastModifiedRef.current = ''; // Clear cached timestamp
        isFirstFetchRef.current = true;
        setLoading(true);
        fetchData(false);
    }, [fetchData]);

    return { data, loading, error, lastUpdated, refetch };
}

export default useLivePolling;
