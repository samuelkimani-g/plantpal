import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { PlantProvider } from "./context/PlantContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Layout from "./components/Layout"

// Import pages
import LandingPage from "./features/LandingPage/LandingPage"
import Login from "./features/userProfile/Login"
import Register from "./features/userProfile/Register"
import Dashboard from "./features/userProfile/Dashboard"
import PlantManagement from "./features/plants/PlantManagement"
import ProfilePage from "./features/userProfile/ProfilePage"
import SpotifyIntegration from "./features/music/SpotifyIntegration"

function App() {
  return (
    <AuthProvider>
      <PlantProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with Layout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PlantManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/music"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SpotifyIntegration />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Redirect any unknown routes to dashboard if authenticated, otherwise to landing */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </PlantProvider>
    </AuthProvider>
  )
}

export default App
