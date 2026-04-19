import { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from "react-router-dom";
import { Toaster, toast, ToastBar } from "react-hot-toast";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import "./App.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import Footer from "./components/Footer";
import { Analytics } from "@vercel/analytics/react"
import { lazy, Suspense } from "react";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const MarketplacePage = lazy(() => import("./pages/MarketplacePage"));
const CreateProductListing = lazy(() => import("./pages/CreateProductListing"));
const EditProductListing = lazy(() => import("./pages/EditProductListing"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage"));
const Profile = lazy(() => import("./pages/Profile"));
const MarketDetailPage = lazy(() => import("./pages/MarketDetailPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const MaterialDetailPage = lazy(() => import("./pages/MaterialDetailPage"));

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
                     aria-label="Dismiss notification"
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
            <Suspense fallback={<div className="p-4">Loading (๑•̀ㅂ•́)و✧ ...</div>}>
              <Outlet />
            </Suspense>
          </main>
        <Footer />
        <Analytics />
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
          { path: "/studio/materials/:id", element: <MaterialDetailPage /> },
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