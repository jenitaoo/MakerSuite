import { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster, toast, ToastBar } from "react-hot-toast";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";
import MarketplacePage from "./pages/MarketplacePage";
import CreateProductListing from "./pages/CreateProductListing";
import EditProductListing from "./pages/EditProductListing";
import "./App.css";
import InventoryPage from "./pages/InventoryPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import Profile from "./pages/Profile";
import { TooltipProvider } from "@/components/ui/tooltip";
import MarketDetailPage from "./pages/MarketDetailPage";
import InsightsPage from "./pages/InsightsPage";
import Footer from "./components/Footer";

function AppLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <TooltipProvider>
      <div className="app">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              border: "1px solid #713200",
              padding: "16px",
              color: "#713200",
            },
            iconTheme: {
              primary: "#713200",
              secondary: "#FFFAEE",
            },
            duration: 4000,
          }}
        >
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="flex items-center gap-2">
                  {icon}
                  {message}
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="ml-1 opacity-60 hover:opacity-100 shrink-0 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
        <Navbar />
        <main className="main-content">
          <Outlet />
        </main>
        <Footer />
      </div>
    </TooltipProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/home", element: <LandingPage /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      {
        element: <PrivateRoute />,
        children: [
          { path: "/studio", element: <InventoryPage /> },
          { path: "/studio/projects/:id", element: <ProjectDetailPage /> },
          { path: "/marketplace", element: <MarketplacePage /> },
          { path: "/products/new", element: <CreateProductListing /> },
          { path: "/products/:id/edit", element: <EditProductListing /> },
          { path: "/marketplace/markets/:id/", element: <MarketDetailPage /> },
          { path: "/insights", element: <InsightsPage /> },
          { path: "/profile", element: <Profile /> },
          { path: "/crosslist", element: <Navigate to="/marketplace" replace /> },
          { path: "/inventory", element: <Navigate to="/studio" replace /> },
          { path: "/inventory/projects/:id", element: <Navigate to="/studio/projects/:id" replace /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}