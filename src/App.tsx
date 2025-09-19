import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminCreatePurchase from "./pages/admin/CreatePurchase";
import AdminComparePrices from "./pages/admin/ComparePrices";
import AdminFinalize from "./pages/admin/Finalize";
import AdminUsers from "./pages/admin/Users";
import AdminPurchaseHistory from "./pages/admin/PurchaseHistory";
import TeacherBookRequests from "./pages/teacher/BookRequests";
import TeacherNotes from "./pages/teacher/Notes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin/create-purchase" element={<AdminCreatePurchase />} />
            <Route path="admin/compare-prices" element={<AdminComparePrices />} />
            <Route path="admin/finalize" element={<AdminFinalize />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/purchase-history" element={<AdminPurchaseHistory />} />
            <Route path="teacher/book-requests" element={<TeacherBookRequests />} />
            <Route path="teacher/notes" element={<TeacherNotes />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
