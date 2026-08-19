import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import NewScanPage from "@/pages/new-scan";
import "@/styles.css";

const HistoryPage = lazy(() => import("@/pages/history"));
const ScanDetailPage = lazy(() => import("@/pages/scan-detail"));
const fallback = <div className="space-y-4" aria-label="A carregar"><Skeleton className="h-9 w-64" /><Skeleton className="h-48 w-full" /></div>;

createRoot(document.getElementById("root")!).render(<TooltipProvider><BrowserRouter><Routes><Route element={<Layout />}><Route index element={<NewScanPage />} /><Route path="history" element={<Suspense fallback={fallback}><HistoryPage /></Suspense>} /><Route path="scans/:id" element={<Suspense fallback={fallback}><ScanDetailPage /></Suspense>} /></Route></Routes></BrowserRouter></TooltipProvider>);
