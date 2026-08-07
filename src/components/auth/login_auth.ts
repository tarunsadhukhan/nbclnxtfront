'use client';

import axios from "axios";
import Swal from "sweetalert2";
import { apiRoutes } from "@/utils/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const login = async (
  username: string,
  password: string,
  logintype: string,
  rememberMe: boolean
) => {
  try {
    const subdomain = typeof window !== 'undefined' ? window.location.hostname.split(".")[0] : ""; 

    // Make the request to the login endpoint
    const response = await axios.post(
      apiRoutes.USERLOGINCONSOLE,
      {
        username,
        password,
        logintype,
        rememberMe
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Subdomain": subdomain,
        },
        withCredentials: true, // Ensure cookies are sent and received
        validateStatus: () => true, // Allow any status code to be handled in JS
      }
    );

    console.log("Login API Response:", response);

    // Return the complete response data including status code
    return {
      status: response.status,
      ...response.data
    };
  } catch (error: unknown) {
    console.error("Login failed:", error);

    if (axios.isAxiosError(error)) {
      console.error("Axios Error Details:", error.toJSON());
      
      // Return error information in a consistent format
      return {
        status: error.response?.status || 500,
        message: error.response?.data?.message || "Login request failed",
        error: true
      };
    } else {
      return {
        status: 500,
        message: "Login request failed",
        error: true
      };
    }
  }
};

export const loginConsole = async (
  username: string,
  password: string,
  logintype: string,
  rememberMe: boolean
) => {
  try {
    const subdomain = typeof window !== 'undefined' ? window.location.hostname.split(".")[0] : "";
    console.log('Subdomain:', subdomain);

    const requestData = {
      username,
      password,
      logintype,
      rememberMe,
    };

    const API_URL=process.env.NEXT_PUBLIC_API_BASE_URL || '/apix';
console.log('API_URL for all', API_URL);

    console.log("API Request Data:", requestData,'path', apiRoutes.SUPERADMINLOGINCONSOLE);

    const response = await axios.post(
      apiRoutes.SUPERADMINLOGINCONSOLE,
      requestData,
      {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-Subdomain": subdomain,
        },
        withCredentials: true, // Ensure cookies are sent and received
        validateStatus: () => true,    }
    );

    console.log("API Response:", response); // Log the full response

    // Check if the cookie is set
    const cookies = typeof window !== 'undefined' ? document.cookie : "";
    console.log("Cookies after login:", cookies);

    if (response.status === 200) {
      console.log("Login successful");
      return {
        status: response.status,
        ...response.data
      };
    } else {
      console.log("Login unsuccessful");
      return {
        status: response.status,
        ...response.data
      };
    }
  } catch (error: unknown) {
    console.error("Login failed:", error);

    if (axios.isAxiosError(error)) {
      console.error("Axios Error Details:", error.toJSON()); // Log detailed Axios error
    }

    throw new Error("Login request failed");
  }
};

export const getProtectedData = async () => {
  if (typeof window === 'undefined') return null; // Ensure this runs only in the browser

  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const response = await axios.get(apiRoutes.PROTECTED, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  } catch (error) {
    console.error("Access denied:", error);
    return null;
  }
};
