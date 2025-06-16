"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { journalAPI, moodAPI } from "../../services/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Leaf, BookOpen, Heart, Plus, Calendar, TrendingUp, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import { formatDate, getMoodColor, getMoodEmoji } from "../../lib/utils"
import CreatePlantForm from "../plantGrowth/CreatePlantForm"
import PlantVisualizer from "../../components/PlantVisualizer"

export default function Dashboard() {
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

  // Show create plant form if user has no plants
  if (!plantsLoading && !hasPlants) {
    return <CreatePlantForm />
  }

  if (isLoading || plantsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-emerald-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-emerald-600 dark:text-emerald-400">Loading your garden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-emerald-950 dark:to-teal-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-2">
            Welcome back, {user?.username}! 🌱
          </h1>
          <p className="text-emerald-600 dark:text-emerald-400 text-lg">Your garden is growing beautifully today</p>
        </div>

        {/* Plant Visualizer - Main Feature */}
        <div className="mb-8">
          <PlantVisualizer plant={currentPlant} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 border-emerald-200 dark:border-emerald-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Your Plants</CardTitle>
              <Leaf className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{plants.length}</div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Growing strong</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Journal Streak</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {dashboardData.stats.journalStreak}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">Days in a row</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Entries</CardTitle>
              <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {dashboardData.stats.totalEntries}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Thoughts captured</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Journal Entry */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <BookOpen className="h-5 w-5" />
                    Latest Journal
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Your most recent thoughts and reflections
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                  <Link to="/journal">
                    <Plus className="h-4 w-4 mr-2" />
                    Write
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardData.latestJournal ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{formatDate(dashboardData.latestJournal.created_at)}</Badge>
                    {dashboardData.latestJournal.mood && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getMoodEmoji(dashboardData.latestJournal.mood)}</span>
                        <Badge className={getMoodColor(dashboardData.latestJournal.mood)}>
                          {dashboardData.latestJournal.mood}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-sm line-clamp-3 text-gray-700 dark:text-gray-300">
                    {dashboardData.latestJournal.text}
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/journal">View all entries</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-300">No journal entries yet</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Start your mindful journey by writing your first entry
                  </p>
                  <Button asChild className="bg-emerald-500 hover:bg-emerald-600">
                    <Link to="/journal">
                      <Plus className="h-4 w-4 mr-2" />
                      Write First Entry
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Moods */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                <Heart className="h-5 w-5" />
                Mood Trends
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Your emotional patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentMoods.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {dashboardData.recentMoods.map((mood) => (
                      <div key={mood.id} className="flex items-center gap-2">
                        <span>{getMoodEmoji(mood.mood)}</span>
                        <Badge variant="outline" className={getMoodColor(mood.mood)}>
                          {mood.mood}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>Tracking your emotional wellness</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Heart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No mood data yet. Start journaling to track your emotions!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button
              asChild
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            >
              <Link to="/plants">
                <Leaf className="h-4 w-4 mr-2" />
                Manage Plants
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400"
            >
              <Link to="/journal">
                <BookOpen className="h-4 w-4 mr-2" />
                Write Journal
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
            >
              <Link to="/profile">
                <Sparkles className="h-4 w-4 mr-2" />
                View Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
