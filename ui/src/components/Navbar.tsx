import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Navbar as MTNavbar,
  Typography,
} from "@material-tailwind/react";
import { authService } from "../services/auth";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
      auth?.setUser(null);
      localStorage.removeItem("user");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isLoggedIn = !!auth?.user;

  return (
    <MTNavbar className="w-full px-6 py-3 bg-[#242424] text-white">
      <div className="flex items-center justify-between">

        {/* Logo */}
        <Typography
          as={Link}
          to="/"
          variant="h6"
          className="cursor-pointer py-1.5 text-[#646cff] hover:text-[#535bf2]"
        >
          MakerSuite
        </Typography>

        {/* Right side menu */}
        <div className="flex gap-6 items-center">

          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hover:text-[#535bf2] transition-colors">
                Dashboard
              </Link>

              <Link to="/crosslist" className="hover:text-[#535bf2] transition-colors">
                Cross List
              </Link>

              <Link to="/settings" className="hover:text-[#535bf2] transition-colors">
                Settings
              </Link>

              <button
                onClick={handleLogout}
                className="auth-button hover:text-[#535bf2] transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="auth-button hover:text-[#535bf2] transition-colors">
                Login
              </Link>

              <Link to="/signup" className="auth-button hover:text-[#535bf2] transition-colors">
                Sign Up
              </Link>
            </>
          )}

        </div>
      </div>
    </MTNavbar>
  );
};

export default Navbar;
