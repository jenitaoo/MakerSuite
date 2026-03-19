import { Toaster } from "react-hot-toast";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import './App.css';
import CrossList from "./pages/CrossList";
import EditProductListing from "./pages/EditProductListing";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              border: '1px solid #713200',
              padding: '16px',
              color: '#713200',
            },
            iconTheme: {
              primary: '#713200',
              secondary: '#FFFAEE',
            },
          }}
        />
        <Navbar />
        <main className="main-content flex justify-center items-center min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/crosslist" element={<CrossList />} />
              <Route path="/products/:id/edit" element={<EditProductListing />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;