import axios, { Method, AxiosResponse } from "axios";
import { useState, useEffect } from "react";

interface RequestOptions {
  url: string;
  method?: Method; // 'GET' | 'POST' | 'PUT' | etc.
  data?: Record<string, unknown> | unknown[];
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

interface ApiResponse<T = any> {
  data: T | null;
  status: number;
  statusText: string;
  error?: string | null;
  isError: boolean;
}

export const apiClient = async <T = any>({
  url,
  method = "GET",
  data = {},
  headers = {},
  withCredentials = false,
}: RequestOptions): Promise<ApiResponse<T>> => {
  try {
    const response: AxiosResponse = await axios({
      url,
      method,
      data,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      withCredentials,
      validateStatus: () => true, // Always resolve the promise
    });

    // Handle different status codes
    if (response.status >= 200 && response.status < 300) {
      return {
        data: (response.data ?? null) as T | null,
        status: response.status,
        statusText: response.statusText,
        isError: false,
        error: null,
      };
    } else {
      let errorMessage = "An error occurred";

      // response.data may be unknown; narrow defensively
      const respData = response.data as any;

      switch (response.status) {
        case 400:
          errorMessage = respData?.detail ?? "Bad request";
          break;
        case 401:
          errorMessage = "Unauthorized. Please log in again.";
          break;
        case 403:
          errorMessage = "You don't have permission to access this resource";
          break;
        case 404:
          errorMessage = "Resource not found";
          break;
        case 500:
          errorMessage = "Internal server error";
          break;
        default:
          errorMessage = respData?.detail ?? `Error: ${response.statusText}`;
      }

      return {
        data: (response.data ?? null) as T | null,
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        isError: true,
      };
    }
  } catch (err: unknown) {
    console.error("API Client Error:", err);
    return {
      data: null,
      status: 0,
      statusText: "Network Error",
      error: err instanceof Error ? err.message : String(err),
      isError: true,
    };
  }
};

// React hook for fetching with an access token (renamed to follow hooks convention)
export const useFetchDataFromAccessToken = <T = unknown>(
  url: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = ""; // Replace with logic to retrieve the token, e.g., from cookies or local storage

        const response = await apiClient<T>({
          url,
          method,
          data: body as any,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        if (response.isError) {
          throw new Error(response.error ?? "API error");
        }

        setData(response.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // stringify body to avoid object identity causing repeated fetches
  }, [url, method, JSON.stringify(body ?? null)]);

  return { data, error, loading } as const;
};

export default useFetchDataFromAccessToken;
