    import React, { useContext, useEffect } from 'react';
    import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
    // Import AuthContext directly for useContext
    import { AuthContext } from './context/AuthContext';
    // Import PlantProvider separately if it needs its own context
    import { PlantProvider } from './context/PlantContext';
    import { Toaster } from "@/components/ui/toaster"; // Assuming this is from Shadcn
    
    // Import all necessary page/feature components with corrected paths
    import LandingPage from './features/LandingPage/LandingPage';
    import Login from './features/userProfile/Login';
    import Register from './features/userProfile/Register';
    import Dashboard from './features/userProfile/Dashboard';
    import JournalPage from './pages/JournalPage';
    import PlantPage from './pages/PlantPage'; // For the /plant route
    
    // Navbar component (assuming it's in src/components directly)
    import Navbar from './components/Navbar'; 
    
    // ProtectedRoute component: Defined internally as per your App.jsx structure
    const ProtectedRoute = ({ children }) => {
      const { user, loading } = useContext(AuthContext); // Use useContext directly
    
      if (loading) {
        return (
          <div className="flex justify-center items-center h-screen text-2xl text-green-700 bg-green-50">
            Loading authentication...
          </div>
        );
      }
    
      if (!user) {
        // Redirect to login if not authenticated
        return <Navigate to="/login" replace />; 
      }
    
      return children; // Render the protected component if authenticated
    };
    
    // Main App component: Handles global routing and authentication flow
    function App() {
      const { user, loading } = useContext(AuthContext); // Use useContext directly
      const navigate = useNavigate();
    
      // Effect to handle redirection based on authentication status
      useEffect(() => {
        if (!loading) {
          const currentPath = window.location.pathname;
          if (user) {
            // If logged in and on a public auth page, redirect to dashboard
            if (currentPath === '/' || currentPath === '/login' || currentPath === '/register') {
              navigate('/dashboard');
            }
          } else {
            // If not logged in and not on landing/auth page, go to landing
            if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
                navigate('/');
            }
          }
        }
      }, [user, loading, navigate]);
    
      // Display loading state while authentication status is being determined
      if (loading) {
        return (
          <div className="flex justify-center items-center h-screen text-2xl text-green-700 bg-green-50">
            Loading authentication...
          </div>
        );
      }
    
      return (
        // AuthProvider and PlantProvider should wrap the entire Router
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            <Navbar /> {/* Navbar outside Routes so it's always visible */}
            <main className="container mx-auto px-4 py-8">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
    
                    {/* Protected Routes: Require authentication */}
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/journal"
                      element={
                        <ProtectedRoute>
                          <JournalPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/plant" 
                      element={
                        <ProtectedRoute>
                          <PlantPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* Catch-all route for any unmatched paths, redirects to landing */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <Toaster />
        </div>
      );
    }
    
    // AppWrapper provides the AuthProvider and PlantProvider contexts to the App component
    function AppWrapper() {
      return (
        <Router> {/* Router must wrap App, but context providers wrap Router */}
          <AuthContext.Provider value={{}}>
          <PlantProvider>
            <App />
          </PlantProvider>
          </AuthContext.Provider>
        </Router>
      );
    }
    
    export default AppWrapper;