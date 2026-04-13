import { useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const PrivateRoute = () => {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-white/70 text-sm">Loading…</p>
      </div>
    );
  }

  return auth?.user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;