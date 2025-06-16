"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "../../../context/AuthContext" // Corrected path
import { usePlant } from "../../../context/PlantContext" // Corrected path
import { getJournalEntries, getAllMoodEntries } from "../../../services/api" // Corrected path
import { User, BookOpen, Flower2, TrendingUp } from "lucide-react"

const Profile = () => {
  const { user } = useAuth()
  const { plants } = usePlant()
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalMoods: 0,
    averageMood: 0,
    joinDate: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const [entries, moods] = await Promise.all([getJournalEntries(), getAllMoodEntries()])

      const averageMood = moods.length > 0 ? moods.reduce((sum, mood) => sum + mood.mood, 0) / moods.length : 0

      setStats({
        totalEntries: entries.length,
        totalMoods: moods.length,
        averageMood: Math.round(averageMood * 10) / 10,
        joinDate: user?.date_joined,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const getMoodBadgeColor = (mood) => {
    if (mood >= 8) return "bg-green-500"
    if (mood >= 6) return "bg-blue-500"
    if (mood >= 4) return "bg-yellow-500"
    if (mood >= 2) return "bg-orange-500"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Profile 👤</h1>
        <p className="text-gray-600">Track your journey and growth</p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>User Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Username</div>
              <div className="font-semibold">{user?.username}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Email</div>
              <div className="font-semibold">{user?.email}</div>
            </div>
            {stats.joinDate && (
              <div>
                <div className="text-sm text-gray-600">Member Since</div>
                <div className="font-semibold">{new Date(stats.joinDate).toLocaleDateString()}</div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600">Plants Created</div>
              <div className="font-semibold">{plants.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <div className="text-sm text-gray-600">Journal Entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold">{stats.totalMoods}</div>
            <div className="text-sm text-gray-600">Mood Records</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl mb-2">😊</div>
            <div className="text-2xl font-bold">{stats.averageMood}/10</div>
            <div className="text-sm text-gray-600">Average Mood</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Flower2 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold">{plants.length}</div>
            <div className="text-sm text-gray-600">Plants</div>
          </CardContent>
        </Card>
      </div>

      {/* Mood Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Mood Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Average Mood Score</span>
              <Badge className={`${getMoodBadgeColor(stats.averageMood)} text-white`}>{stats.averageMood}/10</Badge>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.averageMood / 10) * 100}%` }}
              ></div>
            </div>

            <div className="text-sm text-gray-600">
              {stats.averageMood >= 7
                ? "You're doing great! Keep up the positive energy! 🌟"
                : stats.averageMood >= 5
                  ? "You're on a good path. Remember to take care of yourself! 🌱"
                  : "Remember that it's okay to have ups and downs. Your plant is here to support you! 💚"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plants Summary */}
      {plants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Plants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plants.map((plant) => (
                <div key={plant.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{plant.name}</h4>
                    <Badge variant="outline">Level {plant.growth_level || 1}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Species: {plant.species || "Default"}</div>
                    <div>Health: {plant.health || 50}%</div>
                    <div>Created: {new Date(plant.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Profile
