import { useState, useEffect } from 'react';
import { Activity, Users } from 'lucide-react';

interface UptimeKumaApiResponse {
  // This is a flexible interface. Adjust based on your Uptime Kuma API response.
  // Example 1: For a badge-like API directly providing uptime string
  message?: string; // e.g., "99.98%"
  // Example 2: For a status page API with a list of monitors
  publicGroupList?: Array<{
    name: string;
    monitorList: Array<{
      id: number;
      name: string;
      uptime?: number; // e.g., 99.9876 (percentage)
      status?: number; // e.g., 1 for UP
    }>;
  }>;
  // Example 3: Simpler direct uptime if your API provides it
  uptime?: string | number;
}

interface PrometheusResponse {
  status: string;
  data?: {
    resultType: string;
    result: Array<{
      metric: Record<string, string>;
      value: [number, string]; // [timestamp, value]
    }>;
  };
}

const UPTIME_KUMA_API_URL = import.meta.env.VITE_UPTIME_KUMA_API_URL ?? '';
const PROMETHEUS_API_URL = import.meta.env.VITE_PROMETHEUS_API_URL ?? '';
const PROMQL_QUERY_VISITORS = import.meta.env.VITE_PROMQL_QUERY_VISITORS ?? '';

function SiteStats() {
  const isConfigured = !!(UPTIME_KUMA_API_URL || PROMETHEUS_API_URL);

  const [uptimeData, setUptimeData] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState<string | null>(null);
  const [uptimeError, setUptimeError] = useState<string | null>(null);
  const [visitorsError, setVisitorsError] = useState<string | null>(null);
  const [isLoadingUptime, setIsLoadingUptime] = useState(true);
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(true);

  useEffect(() => {
    const fetchUptime = async () => {
      if (!UPTIME_KUMA_API_URL) {
        setUptimeError("Uptime Kuma API URL not configured.");
        setIsLoadingUptime(false);
        return;
      }
      try {
        const response = await fetch(UPTIME_KUMA_API_URL);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: UptimeKumaApiResponse = await response.json();

        // --- Adjust this parsing logic based on your Uptime Kuma API response structure ---
        let foundUptime: string | null = null;
        if (data.message) { // Example 1: Badge-like API
          foundUptime = data.message;
        } else if (data.publicGroupList && data.publicGroupList.length > 0) { // Example 2: Status page API
          // Assuming you want the uptime of the first monitor on the first group, or a specific one
          // You might need to iterate or find a specific monitor by name/ID
          const firstMonitor = data.publicGroupList[0]?.monitorList[0];
          if (firstMonitor && typeof firstMonitor.uptime === 'number') {
            foundUptime = `${firstMonitor.uptime.toFixed(2)}%`;
          }
        } else if (data.uptime) { // Example 3: Direct uptime field
            foundUptime = typeof data.uptime === 'number' ? `${data.uptime.toFixed(2)}%` : data.uptime.toString();
        }
        // --- End of parsing logic adjustment section ---

        if (foundUptime) {
          setUptimeData(foundUptime);
        } else {
          setUptimeData("N/A");
          // Consider setting a mild error or notice if data structure is unexpected
          // setUptimeError("Uptime data format not recognized.");
        }
      } catch (error) {
        console.error("Failed to fetch uptime data:", error);
        setUptimeError("Failed to load uptime.");
      } finally {
        setIsLoadingUptime(false);
      }
    };

    const fetchVisitors = async () => {
      if (!PROMETHEUS_API_URL || !PROMQL_QUERY_VISITORS) {
        setVisitorsError("Prometheus API or query not configured.");
        setIsLoadingVisitors(false);
        return;
      }
      try {
        const query = encodeURIComponent(PROMQL_QUERY_VISITORS);
        const response = await fetch(`${PROMETHEUS_API_URL}?query=${query}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PrometheusResponse = await response.json();
        if (data.status === 'success' && data.data && data.data.result && data.data.result.length > 0) {
          setVisitorCount(data.data.result[0].value[1]);
        } else {
          setVisitorCount("N/A");
          // setVisitorsError("Visitor data not found or invalid response.");
        }
      } catch (error) {
        console.error("Failed to fetch visitor data:", error);
        setVisitorsError("Failed to load visitor count.");
      } finally {
        setIsLoadingVisitors(false);
      }
    };

    fetchUptime();
    fetchVisitors();
  }, []);

  if (!isConfigured) return null;

  return (
    <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-6 text-center">Site Statistics</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Uptime Stat */}
        <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <div className="flex items-center text-blue-500 dark:text-blue-400 mb-2">
            <Activity className="w-8 h-8 mr-3" />
            <span className="text-xl font-semibold">Current Uptime</span>
          </div>
          {isLoadingUptime && <p className="text-gray-600 dark:text-gray-300">Loading...</p>}
          {uptimeError && <p className="text-red-500 dark:text-red-400">{uptimeError}</p>}
          {!isLoadingUptime && !uptimeError && uptimeData && (
            <p className="text-3xl font-bold text-green-500 dark:text-green-400">{uptimeData}</p>
          )}
          {!isLoadingUptime && !uptimeError && !uptimeData && (
             <p className="text-gray-600 dark:text-gray-300">Data unavailable</p>
          )}
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">via Uptime Kuma</p>
        </div>

        {/* Visitor Count Stat */}
        <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <div className="flex items-center text-purple-500 dark:text-purple-400 mb-2">
            <Users className="w-8 h-8 mr-3" />
            <span className="text-xl font-semibold">Visitors (24h)</span>
          </div>
          {isLoadingVisitors && <p className="text-gray-600 dark:text-gray-300">Loading...</p>}
          {visitorsError && <p className="text-red-500 dark:text-red-400">{visitorsError}</p>}
          {!isLoadingVisitors && !visitorsError && visitorCount && (
            <p className="text-3xl font-bold">{visitorCount}</p>
          )}
           {!isLoadingVisitors && !visitorsError && !visitorCount && (
             <p className="text-gray-600 dark:text-gray-300">Data unavailable</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">via Traefik/Prometheus</p>
        </div>
      </div>
      <p className="text-xs text-center mt-6 text-gray-500 dark:text-gray-400">
        Note: Statistics are fetched client-side. Ensure your Uptime Kuma and Prometheus instances have CORS configured to allow requests from this domain.
      </p>
    </div>
  );
}

export default SiteStats;
