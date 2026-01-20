import type { AppProps } from "next/app";
import "../styles/globals.css";
import { GlobalContextProvider } from "@/features/context/useGlobalContext";
import { ThemeProvider } from "@/features/context/ThemeContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <GlobalContextProvider>
        <Component {...pageProps} />
      </GlobalContextProvider>
    </ThemeProvider>
  );
}
