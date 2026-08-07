
// import { clsx, type ClassValue } from 'clsx';
// import { twMerge } from 'tailwind-merge';

// export async function getProtectedData() {
//   try {
//     // ✅ Retrieve token from localStorage (or cookies if needed)
//     const token = localStorage.getItem("jwtToken");

//     if (!token) {
//       return { message: "Unauthorized: No token provided" };
//     }

//     // ✅ API endpoint for protected data
//     const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

//     const response = await fetch(`${API_URL}/api/protected`, {
//       method: "GET",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`, // ✅ Send JWT Token
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! Status: ${response.status}`);
//     }

//     // ✅ Parse response JSON
//     const data = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Error fetching protected data:", error);
//     return { message: "Error fetching data" };
//   }
// }

// export function cn(...inputs: ClassValue[]) {
//   return twMerge(clsx(inputs));
// }
