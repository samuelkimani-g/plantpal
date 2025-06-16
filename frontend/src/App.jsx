import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { PlantProvider } from "./context/PlantContext"
import ProtectedRoute from "./components/ProtectedRoute"

// Pages
import LandingPage from "./features/LandingPage/LandingPage"
import Login from "./features/userProfile/Login"
import Register from "./features/userProfile/Register"
import Dashboard from "./features/userProfile/Dashboard"

// Placeholder components for future development
const JournalPage = () => <div className="p-8">Journal Page - Coming Soon</div>
const PlantPage = () => <div className="p-8">Plant Page - Coming Soon</div>
const ProfilePage = () => <div className="p-8">Profile Page - Coming Soon</div>

import "./App.css"

function App() {
  return (
    <AuthProvider>
      <PlantProvider>
        <Router>
          <div className="app-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Routes */}
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
                path="/plants"
                element={
                  <ProtectedRoute>
                    <PlantPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Redirect unknown routes to landing page */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </PlantProvider>
    </AuthProvider>
  )
}

export default App
