import { createBrowserRouter, RouterProvider, Navigate, Outlet } from "react-router-dom";
import { Toaster, toast, ToastBar } from "react-hot-toast";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MarketplacePage from "./pages/MarketplacePage";
import CreateProductListing from "./pages/CreateProductListing";
import EditProductListing from "./pages/EditProductListing";
import "./App.css";
import InventoryPage from "./pages/InventoryPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import Profile from "./pages/Profile";
import { TooltipProvider } from "@/components/ui/tooltip";

function AppLayout() {
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
      </div>
    </TooltipProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/login" /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      {
        element: <PrivateRoute />,
        children: [
          // Home dashboard — Step 4
          { path: "/home", element: <Dashboard /> },

          // Studio — making things
          { path: "/studio", element: <InventoryPage /> },
          { path: "/studio/projects/:id", element: <ProjectDetailPage /> },

          // Marketplace — selling things
          { path: "/marketplace", element: <MarketplacePage /> },
          { path: "/products/new", element: <CreateProductListing /> },
          { path: "/products/:id/edit", element: <EditProductListing /> },

          // Insights — placeholder for Step 8
          // { path: "/insights", element: <InsightsPage /> },

          // Profile
          { path: "/profile", element: <Profile /> },

          // Legacy redirects — keep old URLs working during transition
          { path: "/dashboard", element: <Navigate to="/home" replace /> },
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