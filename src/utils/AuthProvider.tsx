"use client";
import { useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: { id: string; name: string } | null;
  setUser: React.Dispatch<React.SetStateAction<{ id: string; name: string } | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const router = useRouter();
  const pathname = usePathname(); // ✅ Get current route

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    console.log('logouts ')
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
} else {
      console.log("No access token found. Redirecting to login...");
      router.push("/");
    }
    console.log('logouts 1')
     
    // ✅ List of pages that should NOT log out on refresh
const allowedPages = ["/dashboard1"];
    // ✅ Logout on refresh, except for allowed pages
    const handleUnload = () => {
      console.log("Browser refreshed. Removing JWT...");
      if (!allowedPages.includes(pathname)) {
        localStorage.removeItem("user"); // Remove user session
        localStorage.removeItem("jwtToken"); // Remove JWT token
        console.log('nnnnnn')
        router.push("/"); // Redirect to login
        console.log('dsdndshdhd')
   console.log('logouts 3')     }
  console.log('logouts 3')  };
    console.log('logouts 3')
    window.addEventListener("beforeunload", handleUnload);
        return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [pathname, router]);

  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
