import type { AppProps } from "next/app";
import "../styles/globals.css";
import { GlobalContextProvider } from "@/features/context/useGlobalContext";
import { ThemeProvider } from "@/features/context/ThemeContext";
import { AuthProvider } from "@/features/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useRouter } from "next/router";

// List of routes that do not require authentication
const noAuthRequired = ["/login", "/unauthorized", "/members/[id]/access"];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <ThemeProvider>
      <GlobalContextProvider>
        <AuthProvider>
          {noAuthRequired.includes(router.pathname) ? (
            <Component {...pageProps} />
          ) : (
            <ProtectedRoute>
              <Component {...pageProps} />
            </ProtectedRoute>
          )}
        </AuthProvider>
      </GlobalContextProvider>
    </ThemeProvider>
  );
}
