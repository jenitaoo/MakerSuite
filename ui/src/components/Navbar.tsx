import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import MakerSuite_Logo_White_Filled from "../assets/logos/MakerSuite_Logo_White_Filled.png";
import { AuthContext } from "../context/AuthContext";
import { authService } from "../services/auth";
import "../index.css"

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = useState(false);
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const isLoggedIn = !!auth?.user;

  const handleLogout = async () => {
    try {
      await authService.logout();
      auth?.setUser(null);
      localStorage.removeItem("user");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
  <nav className="navbar w-full bg-[var(--color-bg)] text-[var(--color-text)] shadow-md font-[var(--font-body)]">
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center w-5/6 mx-auto py-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src={MakerSuite_Logo_White_Filled}
            alt="MakerSuite Logo"
            className="h-12"
          />
          {/* Optional: brand text using heading font */}
          {/* <span className="text-2xl font-[var(--font-heading)]">MakerSuite</span> */}
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex gap-10 items-center text-lg font-[var(--font-body)]"style={{ fontSize: "1.25rem" }}>
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" className="hover:text-[var(--color-primary)]">Dashboard</Link>
              <Link to="/crosslist" className="hover:text-[var(--color-primary)]">Cross List</Link>
              <Link to="/settings" className="hover:text-[var(--color-primary)]">Settings</Link>
              <button onClick={handleLogout} className="hover:text-[var(--color-primary)]">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-[var(--color-primary)]">Login</Link>
              <Link to="/signup" className="hover:text-[var(--color-primary)]">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden flex items-center">
          <button onClick={() => setToggleMenu(!toggleMenu)}>
            {toggleMenu ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </div>

    {/* Mobile Slide-Down Menu */}
    <div
      className={`fixed z-40 w-full bg-[var(--color-bg)] overflow-hidden flex flex-col lg:hidden gap-8 origin-top duration-700 ${
        !toggleMenu ? "h-0" : "h-full"
      }`}
    >
      <div className="px-8 pt-10">
        <div className="flex flex-col gap-6 text-xl font-semibold tracking-wide font-[var(--font-body)]">
          {isLoggedIn ? (
            <>
              <Link to="/dashboard" onClick={() => setToggleMenu(false)}>Dashboard</Link>
              <Link to="/crosslist" onClick={() => setToggleMenu(false)}>Cross List</Link>
              <Link to="/settings" onClick={() => setToggleMenu(false)}>Settings</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setToggleMenu(false)}>Login</Link>
              <Link to="/signup" onClick={() => setToggleMenu(false)}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </div>
  </nav>
  );
};

export default Navbar;
