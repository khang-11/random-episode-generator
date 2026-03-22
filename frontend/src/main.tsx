import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProfileSelect from "@/pages/ProfileSelect";
import Dashboard from "@/pages/Dashboard";
import ShowDetail from "@/pages/ShowDetail";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProfileSelect />} />
          <Route path="/dashboard/:userId" element={<Dashboard />} />
          <Route
            path="/dashboard/:userId/show/:showId"
            element={<ShowDetail />}
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
