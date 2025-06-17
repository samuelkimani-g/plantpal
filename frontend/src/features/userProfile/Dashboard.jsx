"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { journalAPI, moodAPI } from "../../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import PlantVisualizer from "../../components/PlantVisualizer"
import { Leaf, Plus, BookOpen, Music, Heart, Droplets, Sun, TrendingUp, Calendar, Sparkles } from "lucide-react"

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { plants, currentPlant, hasPlants, isLoading: plantsLoading } = usePlant()
  const [dashboardData, setDashboardData] = useState({
    latestJournal: null,
    recentMoods: [],
    stats: {
      journalStreak: 0,
      totalEntries: 0,
    },
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      // Fetch dashboard data in parallel
      const [latestJournalResponse, moodsResponse] = await Promise.all([
        journalAPI.getLatestEntry().catch(() => ({ data: null })),
        moodAPI.getMoods({ limit: 5 }).catch(() => ({ data: { results: [] } })),
      ])

      setDashboardData({
        latestJournal: latestJournalResponse.data,
        recentMoods: moodsResponse.data.results || moodsResponse.data || [],
        stats: {
          journalStreak: 7, // This would come from backend calculation
          totalEntries: 15, // This would come from backend calculation
        },
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const calculateStats = () => {
    if (!plants || plants.length === 0) {
      return {
        totalPlants: 0,
        healthyPlants: 0,
        averageHealth: 0,
        totalLevel: 0,
      }
    }

    const totalPlants = plants.length
    const healthyPlants = plants.filter((plant) => plant.health >= 70).length
    const averageHealth = plants.reduce((sum, plant) => sum + plant.health, 0) / totalPlants
    const totalLevel = plants.reduce((sum, plant) => sum + plant.level, 0)

    return {
      totalPlants,
      healthyPlants,
      averageHealth: Math.round(averageHealth),
      totalLevel,
    }
  }

  const stats = calculateStats()
  const recentPlants = plants?.slice(0, 3) || []

  // Show loading state
  if (isLoading || plantsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-green-600 font-medium animate-pulse">Loading your garden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            {getGreeting()}, {user?.username}! 🌱
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to your mindful garden. Track your plants, journal your thoughts, and let music nurture your digital
            ecosystem.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-700 text-sm font-medium">Total Plants</p>
                  <p className="text-3xl font-bold text-green-800">{stats.totalPlants}</p>
                </div>
                <div className="bg-green-300 p-3 rounded-full">
                  <Leaf className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-700 text-sm font-medium">Healthy Plants</p>
                  <p className="text-3xl font-bold text-blue-800">{stats.healthyPlants}</p>
                </div>
                <div className="bg-blue-300 p-3 rounded-full">
                  <Heart className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-yellow-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-700 text-sm font-medium">Avg Health</p>
                  <p className="text-3xl font-bold text-yellow-800">{stats.averageHealth}%</p>
                </div>
                <div className="bg-yellow-300 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-700 text-sm font-medium">Journal Streak</p>
                  <p className="text-3xl font-bold text-purple-800">{dashboardData.stats.journalStreak}</p>
                </div>
                <div className="bg-purple-300 p-3 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card
          className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-800">
              <Sparkles className="h-5 w-5 text-green-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate("/plants")}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-16 text-lg hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Leaf className="h-5 w-5 mr-2" />
                Manage Plants
              </Button>
              <Button
                onClick={() => navigate("/journal")}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 h-16 text-lg hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Write Journal
              </Button>
              <Button
                onClick={() => navigate("/music")}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 h-16 text-lg hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Music className="h-5 w-5 mr-2" />
                Connect Music
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current Plant Highlight */}
        {currentPlant && (
          <Card
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up"
            style={{ animationDelay: "0.5s" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-800">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Featured Plant
                </span>
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  Level {currentPlant.level}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex justify-center">
                  <PlantVisualizer plant={currentPlant} size="medium" />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentPlant.name}</h3>
                    <p className="text-gray-600 capitalize">{currentPlant.species}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-700">Health</span>
                        <span className="text-green-600">{currentPlant.health}%</span>
                      </div>
                      <Progress value={currentPlant.health} className="h-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Droplets className="h-4 w-4" />
                        <span>Water: {currentPlant.water_level}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-yellow-600">
                        <Sun className="h-4 w-4" />
                        <span>Light: {currentPlant.sunlight_level}%</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/plants")}
                    variant="outline"
                    className="w-full hover:bg-green-50 hover:border-green-300 transition-colors"
                  >
                    Care for {currentPlant.name}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Plants Grid */}
        {recentPlants.length > 1 && (
          <Card
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up"
            style={{ animationDelay: "0.6s" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-gray-800">
                  <Leaf className="h-5 w-5 text-green-600" />
                  Your Garden ({plants.length} plants)
                </span>
                <Button variant="outline" size="sm" onClick={() => navigate("/plants")}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentPlants.slice(1).map((plant, index) => (
                  <div
                    key={plant.id}
                    className="space-y-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-center">
                      <PlantVisualizer plant={plant} size="small" />
                    </div>
                    <div className="space-y-2 text-center">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">{plant.name}</h3>
                        <Badge variant="outline" size="sm">
                          Level {plant.level}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Health</span>
                          <span className="text-green-600 font-medium">{plant.health}%</span>
                        </div>
                        <Progress value={plant.health} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {stats.totalPlants === 0 && (
          <Card
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg text-center py-12 animate-slide-up"
            style={{ animationDelay: "0.4s" }}
          >
            <CardContent>
              <div className="space-y-6">
                <div className="bg-green-100 p-6 rounded-full w-fit mx-auto">
                  <Leaf className="h-16 w-16 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Start Your Garden Journey</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create your first plant and begin your mindful journey of growth and reflection.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/plants")}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 text-lg hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Plant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest Journal Entry */}
        {dashboardData.latestJournal && (
          <Card
            className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up"
            style={{ animationDelay: "0.7s" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <BookOpen className="h-5 w-5 text-blue-600" />
                Latest Journal Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {new Date(dashboardData.latestJournal.created_at).toLocaleDateString()}
                  </Badge>
                  {dashboardData.latestJournal.mood && (
                    <Badge className="bg-blue-100 text-blue-700">{dashboardData.latestJournal.mood}</Badge>
                  )}
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-gray-700 italic line-clamp-3">"{dashboardData.latestJournal.text}"</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate("/journal")}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  View All Entries
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Dashboard
