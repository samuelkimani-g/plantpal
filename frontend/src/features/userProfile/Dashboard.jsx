"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "../context/AuthContext" 
import { usePlant } from "../context/PlantContext"
import PlantVisualizer from "../components/PlantVisualizer" 
import JournalForm from "../features/journaling/JournalEntryForm" 
import MoodCard from "../components/MoodCard" 
import { getLatestJournalEntry, getAllMoodEntries } from "../services/api" 
import { BookOpen, TrendingUp, Calendar, Plus } from "lucide-react"

const Dashboard = () => {
  const { user } = useAuth()
  // Now get currentPlant, plants, createNewPlant, and fetchPlantsAndLogs from usePlant
  const { currentPlant, plants, createNewPlant, fetchPlantsAndLogs, loading: plantLoading } = usePlant() 
  const [latestEntry, setLatestEntry] = useState(null)
  const [latestMood, setLatestMood] = useState(null)
  const [loadingDashboard, setLoadingDashboard] = useState(true) // Separate loading state for Dashboard's specific fetches

  useEffect(() => {
    fetchDashboardData()
  }, [user, fetchPlantsAndLogs]) // Add user and fetchPlantsAndLogs to dependencies

  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      // Plant data is now managed by PlantContext's useEffect, triggered by isAuthenticated
      // We only fetch journal and mood here
      const [entryData, moodData] = await Promise.all([
        getLatestJournalEntry(), 
        getAllMoodEntries()
      ])

      setLatestEntry(entryData)
      if (moodData && moodData.length > 0) {
        // Assuming moodData is ordered by latest first from backend
        setLatestMood(moodData[0]) 
      } else {
        setLatestMood(null);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      // Potentially set an error state here
    } finally {
      setLoadingDashboard(false)
    }
  }

  const handleCreateFirstPlant = async () => {
    // This will trigger PlantContext's createNewPlant and then re-fetch via its useEffect
    await createNewPlant(`${user?.username}'s Plant`, "Happiness Flower") 
    // No need to call fetchDashboardData here, as PlantContext's internal state update
    // and subsequent fetch (if implemented) will update currentPlant.
    // However, if Dashboard needs updated journal/mood data after plant creation,
    // you might consider re-calling fetchDashboardData or specific mood/journal fetches.
    // For now, let's keep it simple.
  }

  const handleEntryCreated = () => {
    // After a new journal entry, re-fetch dashboard data to update latest entry and mood
    fetchDashboardData()
  }

  // Combine loading states for a comprehensive loading indicator
  if (loadingDashboard || plantLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your garden dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {user?.username}! 🌱</h1>
        <p className="text-gray-600">How is your plant feeling today?</p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Visualizer */}
        <div className="lg:col-span-2">
          {currentPlant ? (
            <PlantVisualizer plant={currentPlant} mood={latestMood} />
          ) : (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">🌱</div>
              <h3 className="text-xl font-semibold mb-2">No plants yet!</h3>
              <p className="text-gray-600 mb-4">Create your first virtual plant to start your journey.</p>
              <Button onClick={handleCreateFirstPlant}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Plant
              </Button>
            </Card>
          )}
        </div>

        {/* Mood Card */}
        <div>
          <MoodCard mood={latestMood} />
        </div>
      </div>

      {/* Journal Form */}
      <JournalForm onEntryCreated={handleEntryCreated} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <div className="text-2xl font-bold">{latestEntry ? "1+" : "0"}</div> {/* This might not be accurate for total entries, just if one exists */}
            <div className="text-sm text-gray-600">Journal Entries</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
            {/* Display actual growth_level from currentPlant */}
            <div className="text-2xl font-bold">{currentPlant?.growth_level || 0}</div> 
            <div className="text-sm text-gray-600">Growth Level</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            {/* Display total number of plants from PlantContext */}
            <div className="text-2xl font-bold">{plants.length}</div> 
            <div className="text-sm text-gray-600">Plants Created</div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Journal Entry */}
      {latestEntry && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Journal Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-2">{latestEntry.text}</p>
            <div className="text-sm text-gray-500">
              {new Date(latestEntry.created_at).toLocaleDateString()} at{" "}
              {new Date(latestEntry.created_at).toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Dashboard
