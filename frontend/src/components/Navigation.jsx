"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { paymentsAPI } from "../services/api"
import {
  ArrowLeft,
  Home,
  Leaf,
  BookOpen,
  User,
  Menu,
  X,
  LogOut,
  Settings,
  ChevronRight,
  Smile,
  CreditCard,
  MessageCircle,
  TrendingUp,
  ShoppingCart,
  Heart,
  Users,
  Crown,
  Music,
} from "lucide-react"
import { Button } from "./ui/button"

const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [leaves, setLeaves] = useState(0)

  // Load leaves count - Commented out since leaves display is disabled
  /*
  useEffect(() => {
    if (user) {
      paymentsAPI.getLeaves()
        .then((res) => setLeaves(res.data.leaves || 0))
        .catch(() => setLeaves(0))
    }
  }, [user])
  */

  const handleBack = () => {
    navigate(-1)
  }

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const getBreadcrumbs = () => {
    const path = location.pathname
    const segments = path.split("/").filter(Boolean)

    const breadcrumbs = [{ name: "Dashboard", path: "/dashboard" }]

    if (segments.includes("plants")) {
      breadcrumbs.push({ name: "My Plant", path: "/plants" })
    }
    if (segments.includes("journal")) {
      breadcrumbs.push({ name: "Journal", path: "/journal" })
    }
    if (segments.includes("profile")) {
      breadcrumbs.push({ name: "Profile", path: "/profile" })
    }
    if (segments.includes("music")) {
      breadcrumbs.push({ name: "Music", path: "/music" })
    }
    if (segments.includes("mindfulness")) {
      breadcrumbs.push({ name: "Mindfulness", path: "/mindfulness" })
    }

    if (segments.includes("premium")) {
      breadcrumbs.push({ name: "Premium", path: "/premium" })
    }

    return breadcrumbs
  }

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: Home },
    { name: "My Plant", path: "/my-plants", icon: Leaf },
    { name: "Journal", path: "/journal", icon: BookOpen },
    { name: "Mindfulness", path: "/mindfulness", icon: Heart },
    // { name: "Public Garden", path: "/public-garden", icon: Users },
    { name: "Music", path: "/music", icon: Music },
    // { name: "Premium", path: "/premium", icon: Crown },
  ]

  // Premium-only items (shown in dropdown or premium page)
  const premiumItems = [
    { name: "Mood Analytics", path: "/mood", icon: TrendingUp },
    { name: "AI Chat", path: "/premium-chatbot", icon: MessageCircle },
  ]

  const breadcrumbs = getBreadcrumbs()
  const isHomePage = location.pathname === "/dashboard"

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-green-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Back button and breadcrumbs */}
          <div className="flex items-center space-x-4">
            {!isHomePage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}

            {/* Breadcrumbs */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-400" />}
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={`hover:text-green-600 transition-colors ${
                      location.pathname === crumb.path ? "text-green-600 font-medium" : ""
                    }`}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Center - Logo */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center space-x-2 text-green-700 hover:text-green-800 transition-colors"
            >
              <Leaf className="h-6 w-6" />
              <span className="font-bold text-lg">PlantPal</span>
            </button>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                if (item.premiumRequired && !user?.is_premium) {
                    return null; // Don't show premium links to non-premium users
                }

                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={
                      isActive
                        ? "bg-green-600 hover:bg-green-700"
                        : "text-gray-600 hover:text-green-600 hover:bg-green-50"
                    }
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    {item.name}
                  </Button>
                )
              })}
            </div>

            {/* Leaves Counter - Commented out
            <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg px-3 py-2 shadow-sm border border-emerald-200 dark:border-emerald-700">
              <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">
                {leaves}
              </span>
              <button
                onClick={() => navigate("/buy-leaves")}
                className="ml-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition-colors"
                title="Buy more leaves"
              >
                +
              </button>
            </div>
            */}

            {/* User Menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="text-gray-600 hover:text-green-600 hover:bg-green-50"
              >
                <User className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{user?.username}</span>
              </Button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      navigate("/profile")
                      setIsUserMenuOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </button>
                  {/* Buy Leaves - Commented out
                  <button
                    onClick={() => {
                      navigate("/buy-leaves")
                      setIsUserMenuOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Buy Leaves
                  </button>
                  */}

                  
                  {/* Premium Features - Commented out
                  {user?.is_premium ? (
                    <>
                      <hr className="my-1" />
                      <div className="px-4 py-1 text-xs font-medium text-amber-600 bg-amber-50">Premium Features</div>
                      {premiumItems.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.path}
                            onClick={() => {
                              navigate(item.path)
                              setIsUserMenuOpen(false)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600"
                          >
                            <Icon className="h-4 w-4 mr-2" />
                            {item.name}
                          </button>
                        )
                      })}
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        navigate("/premium")
                        setIsUserMenuOpen(false)
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                    >
                      <Crown className="h-4 w-4 mr-2 text-amber-500" />
                      Upgrade to Premium
                    </button>
                  )}
                  */}
                  
                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-600 hover:text-green-600"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-green-100 py-4">
            <div className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path)
                      setIsMobileMenuOpen(false)
                    }}
                    className={`flex items-center w-full px-4 py-2 text-left rounded-md transition-colors ${
                      isActive ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-green-50 hover:text-green-600"
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </button>
                )
              })}
              

              
              {/* Premium Features in mobile menu - Commented out
              {user?.is_premium && (
                <>
                  <div className="px-4 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-md">Premium Features</div>
                  {premiumItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path)
                          setIsMobileMenuOpen(false)
                        }}
                        className={`flex items-center w-full px-4 py-2 text-left rounded-md transition-colors ${
                          isActive ? "bg-amber-100 text-amber-700" : "text-gray-600 hover:bg-amber-50 hover:text-amber-600"
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.name}
                      </button>
                    )
                  })}
                </>
              )}
              */}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false)
            setIsMobileMenuOpen(false)
          }}
        />
      )}
    </nav>
  )
}

export default Navigation
