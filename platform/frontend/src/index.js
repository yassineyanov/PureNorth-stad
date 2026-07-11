import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";
import { WebsiteProvider } from "@/context/WebsiteContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WebsiteProvider>
        <App />
      </WebsiteProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
// force rebuild Wed Jun 24 22:12:06 UTC 2026
// force rebuild Thu Jun 25 15:22:46 UTC 2026
