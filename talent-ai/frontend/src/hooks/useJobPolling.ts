import { useState, useEffect } from "react";

export function useJobPolling(jobId: string, intervalMs: number = 5000) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let timeoutId: number;
    let isMounted = true;

    const fetchJob = async () => {
      try {
        const response = await fetch(`/api/v1/jobs/${jobId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch job');
        }
        const data = await response.json();
        
        if (isMounted) {
          setJob(data);
          setLoading(false);
          setError(null);
          
          if (data.status !== "results" && data.status !== "completed") {
            timeoutId = window.setTimeout(fetchJob, intervalMs);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err);
          setLoading(false);
          // Optional: Retry on error
          // timeoutId = window.setTimeout(fetchJob, intervalMs);
        }
      }
    };

    fetchJob();

    return () => {
      isMounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [jobId, intervalMs]);

  return { job, loading, error };
}
