import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { PlantProvider } from "./context/PlantContext"
import { WeatherProvider } from "./context/WeatherContext"
import ProtectedRoute from "./components/ProtectedRoute"
import Layout from "./components/Layout"

// Log deployment version
console.log("PlantPal Frontend - Payment System Version - Build:", new Date().toISOString())

// Import pages
import LandingPage from "./features/LandingPage/LandingPage"
import Login from "./features/userProfile/Login"
import Register from "./features/userProfile/Register"
import Dashboard from "./features/userProfile/Dashboard"
import PlantManagement from "./features/plants/PlantManagement"
import ProfilePage from "./features/userProfile/ProfilePage"
import MusicDashboard from "./pages/MusicDashboard"
import JournalPage from "./features/journal/JournalPage"
import CreatePlantForm from "./features/plantGrowth/CreatePlantForm"
import PublicGarden from "./features/plants/PublicGarden"
import MindfulnessPage from "./features/mindfulness/MindfulnessPage"
import { UserPlantProfile } from "./features/userProfile"
import ReminderSettings from "./features/reminders/ReminderSettings"
import BuyLeavesPage from "./pages/BuyLeavesPage"
import PremiumChatbot from "./pages/PremiumChatbot"
import PremiumUpgradePage from "./pages/PremiumUpgradePage"
import MoodAnalysisDashboard from "./features/mood/MoodAnalysisDashboard"
import ShopPage from './pages/ShopPage';
import PremiumPage from './pages/PremiumPage';

function App() {
  return (
    <WeatherProvider>
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
              path="/my-plants"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PlantManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/plants/create"
              element={
                <ProtectedRoute>
                  <CreatePlantForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journal"
              element={
                <ProtectedRoute>
                  <Layout>
                    <JournalPage />
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
                    <MusicDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
              <Route
                path="/garden"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PublicGarden />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <UserPlantProfile />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mindfulness"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MindfulnessPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ReminderSettings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/buy-leaves"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <BuyLeavesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/premium-chatbot"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PremiumChatbot />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/premium-upgrade"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PremiumUpgradePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mood-analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MoodAnalysisDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explore-plants"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PublicGarden />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-plants"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PlantManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/public-garden"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PublicGarden />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/mood"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MoodAnalysisDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ShopPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/premium"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <PremiumPage />
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
    </WeatherProvider>
  )
}

export default App
