import { useState, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthContext } from "../context/AuthContext";
import { authService } from "../services/auth";
import MakerSuite_Logo_White_Filled from "../assets/logos/MakerSuite_Logo_White_Filled.png";

const NAV_LINKS = [
  { label: "Home", to: "/home" },
  { label: "Studio", to: "/studio" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Insights", to: "/insights", disabled: false },
];

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!auth?.user;

  const handleLogout = async () => {
    try {
      await authService.logout();
      auth?.setUser(null);
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getInitials = () => {
    const name = auth?.user?.full_name || auth?.user?.username || "";
    return name.slice(0, 2).toUpperCase();
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <nav className="navbar-frosted w-full sticky top-0 z-50 text-taupe-800">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to={isLoggedIn ? "/home" : "/"} className="flex items-center gap-2 shrink-0">
          <img src={MakerSuite_Logo_White_Filled} alt="MakerSuite" className="h-10" />
        </Link>

        {/* Desktop center nav links */}
        {isLoggedIn && (
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium">
            {NAV_LINKS.map(({ label, to, disabled }) =>
              disabled ? (
                <span
                  key={to}
                  className="opacity-40 cursor-not-allowed text-sm font-medium"
                  title="Coming soon"
                >
                  {label}
                </span>
              ) : (
                <Link
                  key={to}
                  to={to}
                  className={`transition-colors hover:text-primary ${
                    isActive(to)
                      ? "text-primary font-semibold border-b-2 border-primary pb-0.5"
                      : ""
                  }`}
                >
                  {label}
                </Link>
              )
            )}
          </div>
        )}

        {/* Desktop right side */}
        <div className="hidden lg:flex items-center gap-4">
          {isLoggedIn ? (
            <Link to="/profile">
              <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-white hover:ring-primary transition-all">
                <AvatarImage src={auth?.user?.photo ?? undefined} alt={auth?.user?.username} />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="lg:hidden flex items-center gap-3">
          {isLoggedIn && (
            <Link to="/profile">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage src={auth?.user?.photo ?? undefined} />
                <AvatarFallback className="text-xs font-semibold bg-muted">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="lg:hidden border-t bg-background px-6 py-4 flex flex-col gap-4 text-sm font-medium">
          {isLoggedIn ? (
            <>
              {NAV_LINKS.map(({ label, to, disabled }) =>
                disabled ? (
                  <span key={to} className="opacity-40 cursor-not-allowed">
                    {label} (coming soon)
                  </span>
                ) : (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={`hover:text-primary ${isActive(to) ? "text-primary font-semibold" : ""}`}
                  >
                    {label}
                  </Link>
                )
              )}
              <button
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="text-left text-destructive hover:opacity-80"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;