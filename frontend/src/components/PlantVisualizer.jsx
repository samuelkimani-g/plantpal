"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Leaf, Heart, Droplets, Sun, Music, TrendingUp, Calendar, Sparkles, MoreVertical } from "lucide-react"
import { formatDate } from "../lib/utils"
import { plantAPI } from "../services/api"

const PLANT_EMOJIS = {
  succulent: "🌵",
  fern: "🌿",
  flowering: "🌸",
  tree: "🌳",
  herb: "🌱",
  vine: "🍃",
}

const GROWTH_STAGES = {
  1: { name: "Seedling", emoji: "🌱", color: "bg-green-400" },
  2: { name: "Young Plant", emoji: "🌿", color: "bg-green-500" },
  3: { name: "Growing", emoji: "🪴", color: "bg-green-600" },
  4: { name: "Developing", emoji: "🌳", color: "bg-emerald-600" },
  5: { name: "Mature", emoji: "🌲", color: "bg-emerald-700" },
  6: { name: "Strong", emoji: "🌴", color: "bg-emerald-800" },
  7: { name: "Thriving", emoji: "🌺", color: "bg-pink-500" },
  8: { name: "Blooming", emoji: "🌸", color: "bg-pink-600" },
  9: { name: "Flourishing", emoji: "🌼", color: "bg-yellow-500" },
  10: { name: "Magnificent", emoji: "🌻", color: "bg-orange-500" },
}

const HEALTH_STATUS = {
  excellent: { label: "Excellent", color: "bg-green-500", textColor: "text-green-700 dark:text-green-300" },
  good: { label: "Good", color: "bg-blue-500", textColor: "text-blue-700 dark:text-blue-300" },
  fair: { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-700 dark:text-yellow-300" },
  poor: { label: "Poor", color: "bg-orange-500", textColor: "text-orange-700 dark:text-orange-300" },
  critical: { label: "Critical", color: "bg-red-500", textColor: "text-red-700 dark:text-red-300" },
}

export default function PlantVisualizer({ plant }) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [sunshineCooldown, setSunshineCooldown] = useState(0)
  const [showSunbeam, setShowSunbeam] = useState(false)
  const [localPlant, setLocalPlant] = useState(plant)

  useEffect(() => {
    setLocalPlant(plant)
    if (plant?.last_sunshine) {
      const last = new Date(plant.last_sunshine).getTime()
      const now = Date.now()
      const diff = Math.max(0, 3600 - Math.floor((now - last) / 1000))
      setSunshineCooldown(diff)
      if (diff > 0) {
        const interval = setInterval(() => {
          setSunshineCooldown((s) => (s > 0 ? s - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
      }
    } else {
      setSunshineCooldown(0)
    }
  }, [plant])

  const handleSunshine = async () => {
    if (sunshineCooldown > 0) return
    setShowSunbeam(true)
    try {
      const res = await plantAPI.sunshine(plant.id)
      setLocalPlant(res.data.plant)
      setSunshineCooldown(3600)
      setTimeout(() => setShowSunbeam(false), 1200)
    } catch (e) {
      setShowSunbeam(false)
      // Optionally show error
    }
  }

  useEffect(() => {
    // Trigger animation when component mounts or plant changes
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 2000)
    return () => clearTimeout(timer)
  }, [plant?.id])

  if (!plant) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No plant selected</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const growthStage = GROWTH_STAGES[Math.min(plant.growth_level || 1, 10)]
  const healthStatus = HEALTH_STATUS[plant.health_status] || HEALTH_STATUS.fair
  const plantEmoji = PLANT_EMOJIS[plant.species] || "🌱"

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Plant Display */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fillRule=%27evenodd%27%3E%3Cg fill=%27%2334d399%27 fillOpacity=%27.05%27%3E%3Ccircle cx=%2730%27 cy=%2730%27 r=%274%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>

        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`text-6xl ${isAnimating ? "animate-plant-grow" : ""}`}>{growthStage.emoji}</div>
              <div>
                <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {plant.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{plantEmoji}</span>
                  <span className="text-sm text-emerald-600 dark:text-emerald-400 capitalize">{plant.species}</span>
                  <Badge variant="secondary" className={`${growthStage.color} text-white`}>
                    {growthStage.name}
                  </Badge>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="text-emerald-600 dark:text-emerald-400">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-6">
          {/* Plant Description */}
          {plant.description && (
            <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 italic">"{plant.description}"</p>
            </div>
          )}

          {/* Growth Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Growth Progress</span>
              </div>
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                Level {Math.floor(plant.growth_level || 0)}
              </span>
            </div>
            <Progress value={(plant.growth_level || 1) * 10} className="h-3 bg-emerald-100 dark:bg-emerald-900" />
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>Seed</span>
              <span>Flourishing</span>
            </div>
          </div>

          {/* Health Status */}
          <div className="flex items-center gap-3">
            <Heart className={`h-5 w-5 ${healthStatus.textColor}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Health:</span>
            <Badge className={`${healthStatus.color} text-white`}>{healthStatus.label}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Care Stats */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Last Watered</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {plant.last_watered ? formatDate(plant.last_watered) : "Never"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Music Influence */}
        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Music className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Music Boost</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {plant.music_boost_active ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plant Age */}
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Plant Age</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{formatDate(plant.date_added)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button className="bg-blue-500 hover:bg-blue-600 text-white">
          <Droplets className="h-4 w-4 mr-2" />
          Water Plant
        </Button>
        <Button
          variant="outline"
          className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-950"
        >
          <Music className="h-4 w-4 mr-2" />
          Play Music
        </Button>
        <Button
          variant="outline"
          className="border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950 relative"
          onClick={handleSunshine}
          disabled={sunshineCooldown > 0}
        >
          <Sun className="h-4 w-4 mr-2" />
          {sunshineCooldown > 0 ? `Sunshine (${Math.ceil(sunshineCooldown/60)}m)` : "Give Sunlight"}
          {showSunbeam && (
            <span className="absolute left-1/2 top-0 -translate-x-1/2 animate-ping text-yellow-400 text-4xl pointer-events-none select-none">☀️</span>
          )}
        </Button>
        <Button
          variant="outline"
          className="border-pink-300 text-pink-600 hover:bg-pink-50 dark:border-pink-700 dark:text-pink-400 dark:hover:bg-pink-950"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Send Love
        </Button>
      </div>
    </div>
  )
}
