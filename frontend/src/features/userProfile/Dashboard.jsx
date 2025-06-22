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
import Plant3DView from "../../components/Plant3DView"
import { Leaf, BookOpen, Music, Heart, Droplets, Sun, Calendar, Sparkles, TrendingUp, Plus, Clock, Zap } from "lucide-react"

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlant, hasPlants, isLoading: plantsLoading } = usePlant()
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
      const [latestJournalResponse, moodsResponse, journalStatsResponse] = await Promise.allSettled([
        journalAPI.getLatestEntry(),
        moodAPI.getMoods({ limit: 5 }),
        journalAPI.getStats()
      ]);

      // Handle the latest journal entry response
      let latestJournal = null;
      if (latestJournalResponse.status === 'fulfilled') {
        if (latestJournalResponse.value?.status !== 404) {
          latestJournal = latestJournalResponse.value?.data;
        }
      }

      // Handle the moods response
      const recentMoods = moodsResponse.status === 'fulfilled' ? (moodsResponse.value?.data?.results || []) : [];

      // Handle the journal stats response
      let journalStats = { journalStreak: 0, totalEntries: 0 };
      if (journalStatsResponse.status === 'fulfilled') {
        const statsData = journalStatsResponse.value?.data;
        journalStats = {
          journalStreak: statsData?.streak || 0,
          totalEntries: statsData?.total_entries || 0,
        };
      }

      setDashboardData({
        latestJournal,
        recentMoods,
        stats: journalStats,
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      // Set default state on error
      setDashboardData({
        latestJournal: null,
        recentMoods: [],
        stats: {
          journalStreak: 0,
          totalEntries: 0,
        },
      })
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

  const getDaysOld = (createdAt) => {
    if (!createdAt) return 0
    const created = new Date(createdAt)
    const now = new Date()
    const diffTime = Math.abs(now - created)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😊'
      case 'sad': return '😔'
      case 'energetic': return '⚡'
      case 'calm': return '😌'
      case 'excited': return '🤩'
      default: return '😐'
    }
  }

  const getHealthStatus = (health) => {
    if (health >= 90) return { status: 'Thriving', color: 'text-green-600', bg: 'bg-green-100' }
    if (health >= 70) return { status: 'Healthy', color: 'text-green-600', bg: 'bg-green-100' }
    if (health >= 50) return { status: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (health >= 30) return { status: 'Needs Care', color: 'text-orange-600', bg: 'bg-orange-100' }
    return { status: 'Critical', color: 'text-red-600', bg: 'bg-red-100' }
  }

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

  // Show empty state if no plant
  if (!hasPlants || !currentPlant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4 animate-fade-in mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {getGreeting()}, {user?.username}! 🌱
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Welcome to PlantPal. Create your digital plant companion and begin your mindful journey.
            </p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg text-center py-12 max-w-2xl mx-auto">
            <CardContent>
              <div className="space-y-6">
                <div className="bg-green-100 p-6 rounded-full w-fit mx-auto">
                  <Leaf className="h-16 w-16 text-green-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Create Your Plant Companion</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start your mindful journey by creating your unique digital plant that grows with your mood and music.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/plants")}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-3 text-lg hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your Plant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const healthStatus = getHealthStatus(currentPlant.health_score || currentPlant.health || 0)
  const plantAge = getDaysOld(currentPlant.created_at)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            {getGreeting()}, {user?.username}! 🌱
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Check in with <span className="font-semibold text-green-600">{currentPlant.name}</span> and see how your mindful journey is growing.
          </p>
        </div>

        {/* Plant Overview Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up min-h-[500px]">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-gray-800 text-xl">
                <Leaf className="h-7 w-7 text-green-600" />
                {currentPlant.name}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge className={`${healthStatus.bg} ${healthStatus.color} border-0 px-3 py-1 text-sm`}>
                  {healthStatus.status}
                </Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 px-3 py-1 text-sm">
                  Level {currentPlant.growth_stage || currentPlant.level || 1}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* 3D Plant View */}
              <div className="flex justify-center min-h-[300px] items-center">
                <Plant3DView
                  plantData={currentPlant}
                  isOwner={false}
                  compactMode={true}
                />
              </div>

              {/* Plant Stats */}
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {currentPlant.health_score || currentPlant.health || 0}%
                    </div>
                    <div className="text-sm text-green-700 font-medium">Health</div>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {currentPlant.water_level || 0}%
                    </div>
                    <div className="text-sm text-blue-700 font-medium">Water</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2 font-medium">
                      <Heart className="h-5 w-5" />
                      Current Mood
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{getMoodEmoji(currentPlant.current_mood_influence)}</span>
                      <span className="capitalize font-semibold text-gray-800">{currentPlant.current_mood_influence || 'neutral'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2 font-medium">
                      <Calendar className="h-5 w-5" />
                      Plant Age
                    </span>
                    <span className="font-semibold text-gray-800">{plantAge} {plantAge === 1 ? 'day' : 'days'} old</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 flex items-center gap-2 font-medium">
                      <Sparkles className="h-5 w-5" />
                      Species
                    </span>
                    <span className="font-semibold capitalize text-gray-800">{currentPlant.species || 'Unknown'}</span>
                  </div>
                </div>

                <Button
                  onClick={() => navigate("/plants")}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:scale-105 transition-all duration-200 h-12 text-lg font-semibold"
                >
                  <Heart className="h-5 w-5 mr-2" />
                  Care for {currentPlant.name}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-gradient-to-br from-purple-100 to-purple-200 border-purple-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up min-h-[140px]">
            <CardContent className="p-8">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-2">
                  <p className="text-purple-700 text-sm font-medium">Care Streak</p>
                  <p className="text-4xl font-bold text-purple-800">{currentPlant?.care_streak || 0} 🔥</p>
                  <p className="text-xs text-purple-600">days caring for plant</p>
                </div>
                <div className="bg-purple-300 p-4 rounded-full">
                  <Heart className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up min-h-[140px]" style={{ animationDelay: "0.1s" }}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-2">
                  <p className="text-blue-700 text-sm font-medium">Total Entries</p>
                  <p className="text-4xl font-bold text-blue-800">{dashboardData.stats.totalEntries}</p>
                  <p className="text-xs text-blue-600">journal entries</p>
                </div>
                <div className="bg-blue-300 p-4 rounded-full">
                  <TrendingUp className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-100 to-green-200 border-green-300 hover:shadow-lg hover:scale-105 transition-all duration-300 animate-slide-up min-h-[140px]" style={{ animationDelay: "0.2s" }}>
            <CardContent className="p-8">
              <div className="flex items-center justify-between h-full">
                <div className="space-y-2">
                  <p className="text-green-700 text-sm font-medium">Growth Progress</p>
                  <p className="text-4xl font-bold text-green-800">{currentPlant.growth_stage || 1}/10</p>
                  <p className="text-xs text-green-600">growth level</p>
                </div>
                <div className="bg-green-300 p-4 rounded-full">
                  <Zap className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up" style={{ animationDelay: "0.3s" }}>
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
                Tend to {currentPlant.name}
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
                Play Music
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Latest Journal Entry */}
        {dashboardData.latestJournal && (
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-lg animate-slide-up" style={{ animationDelay: "0.4s" }}>
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
