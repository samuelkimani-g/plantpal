"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { usePlant } from "../../context/PlantContext"
import { useAuth } from "../../context/AuthContext"
import { plantAPI } from "../../services/api"
import { spotifyService } from "../../services/spotify"
import Plant3DView from "../../components/Plant3DView"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { 
  Leaf, 
  Sparkles, 
  Heart, 
  Droplets, 
  Sun, 
  Palette, 
  Settings, 
  Crown,
  Gem,
  Rainbow,
  Bug,
  Wand2,
  Save,
  RefreshCw,
  TrendingUp,
  Calendar,
  Music,
  BookOpen
} from "lucide-react"

// Plant species options
export const PLANT_SPECIES = [
  { value: "succulent", label: "Succulent 🌵", description: "Hardy and low-maintenance" },
  { value: "fern", label: "Fern 🌿", description: "Loves humidity and shade" },
  { value: "flowering", label: "Flowering Plant 🌸", description: "Beautiful blooms" },
  { value: "tree", label: "Tree 🌳", description: "Grows tall and strong" },
  { value: "herb", label: "Herb 🌱", description: "Aromatic and useful" },
  { value: "vine", label: "Vine 🍃", description: "Climbs and spreads" },
]

// Customization options
export const POT_STYLES = [
  { id: "classic", name: "Classic Pot", icon: "🪴", unlocked: true },
  { id: "modern", name: "Modern Pot", icon: "🏺", unlocked: true },
  { id: "colorful", name: "Colorful Pot", icon: "🌈", unlocked: true },
  { id: "gold", name: "Gold Pot", icon: "🏆", unlocked: true },
  { id: "crystal", name: "Crystal Pot", icon: "💎", unlocked: true },
]

export const ACCESSORIES = [
  { id: "none", name: "None", icon: "❌", unlocked: true },
  { id: "butterfly", name: "Butterfly", icon: "🦋", unlocked: true },
  { id: "rainbow", name: "Rainbow", icon: "🌈", unlocked: true },
  { id: "ladybug", name: "Ladybug", icon: "🐞", unlocked: true },
  { id: "fairy", name: "Fairy", icon: "🧚", unlocked: true },
]

export const TITLES = [
  { id: "none", name: "No Title", unlocked: true },
  { id: "mindful_gardener", name: "Mindful Gardener", unlocked: true },
  { id: "plant_whisperer", name: "Plant Whisperer", unlocked: false },
  { id: "nature_lover", name: "Nature Lover", unlocked: false },
  { id: "zen_master", name: "Zen Master", unlocked: false },
]

const PlantManagement = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { plants, currentPlant, isLoading, waterPlant, fertilizePlant, updatePlant, fetchPlants } = usePlant()
  const [activeTab, setActiveTab] = useState("overview")
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    species: "",
    description: "",
  })
  const [customization, setCustomization] = useState({
    pot: "classic",
    accessory: "none",
    title: "none",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncingMusic, setIsSyncingMusic] = useState(false)

  // Load current plant data
  useEffect(() => {
    if (currentPlant) {
      setEditForm({
        name: currentPlant.name || "",
        species: currentPlant.species || "",
        description: currentPlant.description || "",
      })
      
      // Load customization from localStorage and plant data
      const savedCustomization = JSON.parse(localStorage.getItem("plantCustomization") || "{}")
      const plantCustomization = currentPlant.fantasy_params || {}
      setCustomization({
        pot: plantCustomization.pot || savedCustomization.pot || "classic",
        accessory: plantCustomization.accessory || savedCustomization.accessory || "none",
        title: plantCustomization.title || savedCustomization.title || "none",
      })
    }
  }, [currentPlant])

  const handleSaveBasicInfo = async () => {
    if (!currentPlant) return
    
    setIsSaving(true)
    try {
      const result = await updatePlant(currentPlant.id, editForm)
      if (result.success) {
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error saving plant info:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveCustomization = async () => {
    setIsSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem("plantCustomization", JSON.stringify(customization))
      
      // Save to backend
      await plantAPI.updateFantasyParams({
        pot: customization.pot,
        accessory: customization.accessory,
        title: customization.title,
      })
      
      // Refresh plant data
      await fetchPlants()
    } catch (error) {
      console.error("Error saving customization:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleWaterPlant = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available")
      return
    }
    try {
      const result = await waterPlant(currentPlant.id, 20)
      if (result.success) {
        await fetchPlants() // Refresh plant data
      }
    } catch (error) {
      console.error("Error watering plant:", error)
    }
  }

  const handleFertilizePlant = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available")
      return
    }
    try {
      const result = await fertilizePlant(currentPlant.id)
      if (result.success) {
        await fetchPlants() // Refresh plant data
      }
    } catch (error) {
      console.error("Error fertilizing plant:", error)
    }
  }

  const handleSunshine = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available")
      return
    }
    try {
      await plantAPI.sunshine(currentPlant.id)
      await fetchPlants() // Refresh plant data
    } catch (error) {
      console.error("Error giving sunshine:", error)
    }
  }

  const handleSyncMusicMood = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available")
      return
    }
    setIsSyncingMusic(true)
    try {
      // Check if Spotify is connected
      const status = await spotifyService.getConnectionStatus()
      if (!status.connected) {
        alert("Please connect Spotify first in the Music page!")
        return
      }

      // Fetch valence data and update plant mood
      const response = await spotifyService.fetchValenceAndUpdatePlant()
      console.log('🎵 Music mood synced:', response)
      
      // Refresh plant data to show updated mood
      await fetchPlants()
      
      // Show success message
      if (response.valence_scores && response.valence_scores.length > 0) {
        alert(`✅ Music mood synced! Average mood: ${(response.average_valence * 100).toFixed(0)}%`)
      } else {
        alert("No recent music found. Try playing some music on Spotify first!")
      }
    } catch (error) {
      console.error("Error syncing music mood:", error)
      alert("Failed to sync music mood. Please try again.")
    } finally {
      setIsSyncingMusic(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Loading your plant...</p>
        </div>
      </div>
    )
  }

  if (!currentPlant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-2xl font-bold mb-4">Create Your First Plant</h2>
            <p className="text-muted-foreground mb-6">
              Start your mindful journey by creating your digital companion.
            </p>
            <Button onClick={() => navigate("/plants/create")} className="w-full">
              <Leaf className="h-4 w-4 mr-2" />
              Create Plant
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              🌱 {currentPlant.name}
            </h1>
            {/* Daily Streak */}
            <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
              <span className="text-2xl animate-pulse">🔥</span>
              <div className="flex flex-col">
                <span className="text-xs text-orange-600 font-medium">Daily Streak</span>
                <span className="text-lg font-bold text-orange-700">{currentPlant.daily_streak || 0} days</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">Your digital companion grows with your mindfulness</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="customize" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Customize
            </TabsTrigger>
            <TabsTrigger value="care" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Care
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stats
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 3D Plant View */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      3D Plant View
                    </span>
                    <Badge variant="outline">Level {currentPlant.level || 1}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Plant3DView
                    plantData={currentPlant}
                    isOwner={true}
                    onWaterPlant={handleWaterPlant}
                    onFertilizePlant={handleFertilizePlant}
                  />
                </CardContent>
              </Card>

              {/* Plant Info */}
              <div className="space-y-6">
                {/* Basic Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Plant Information
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Plant Name</Label>
                          <Input
                            id="name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Give your plant a name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="species">Species</Label>
                          <Select
                            value={editForm.species}
                            onValueChange={(value) => setEditForm({ ...editForm, species: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select species" />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANT_SPECIES.map((species) => (
                                <SelectItem key={species.value} value={species.value}>
                                  {species.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Describe your plant's personality"
                            rows={3}
                          />
                        </div>
                        <Button onClick={handleSaveBasicInfo} disabled={isSaving} className="w-full">
                          {isSaving ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Species:</span>
                          <span className="capitalize">{currentPlant.species || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Age:</span>
                          <span>
                            {currentPlant.created_at
                              ? Math.floor((Date.now() - new Date(currentPlant.created_at)) / (1000 * 60 * 60 * 24))
                              : 0}{" "}
                            days
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Watered:</span>
                          <span>
                            {currentPlant.last_watered_at
                              ? new Date(currentPlant.last_watered_at).toLocaleDateString()
                              : "Never"}
                          </span>
                        </div>
                        {currentPlant.description && (
                          <div>
                            <span className="text-muted-foreground">Description:</span>
                            <p className="mt-1 text-sm">{currentPlant.description}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3">
                      <Button onClick={handleWaterPlant} className="bg-blue-500 hover:bg-blue-600">
                        <Droplets className="h-4 w-4 mr-2" />
                        Water Plant
                      </Button>
                      <Button onClick={handleFertilizePlant} variant="outline" className="border-green-500 text-green-600">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Fertilize
                      </Button>
                      <Button onClick={handleSunshine} variant="outline" className="border-yellow-500 text-yellow-600">
                        <Sun className="h-4 w-4 mr-2" />
                        Give Sunshine
                      </Button>
                      <Button 
                        onClick={handleSyncMusicMood} 
                        disabled={isSyncingMusic}
                        variant="outline" 
                        className="border-purple-500 text-purple-600"
                      >
                        {isSyncingMusic ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Music className="h-4 w-4 mr-2" />
                        )}
                        {isSyncingMusic ? "Syncing..." : "Sync Music Mood"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Design Studio
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Customize Your Plant</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Type Selection */}
                <div>
                  <Label className="text-base font-medium mb-4 block flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Plant Type
                  </Label>
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                    <div className="text-2xl">{customization.pot === "flowering" ? "🌸" : "🌿"}</div>
                    <div>
                      <p className="font-medium">Type: {customization.pot === "flowering" ? "Flowering Plant 🌸" : "Regular Plant 🌿"}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto"
                        onClick={() => setCustomization({ ...customization, pot: customization.pot === "flowering" ? "classic" : "flowering" })}
                      >
                        Switch to {customization.pot === "flowering" ? "Regular" : "Flowering"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Pot Style */}
                <div>
                  <Label className="text-base font-medium mb-4 block flex items-center gap-2">
                    <Gem className="h-4 w-4" />
                    Pot Style
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {POT_STYLES.map((pot) => (
                      <button
                        key={pot.id}
                        onClick={() => setCustomization({ ...customization, pot: pot.id })}
                        className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                          customization.pot === pot.id
                            ? "border-emerald-500 bg-emerald-50 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        } ${!pot.unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={!pot.unlocked}
                      >
                        <div className="text-3xl mb-2">{pot.icon}</div>
                        <div className="text-xs font-medium">{pot.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accessory */}
                <div>
                  <Label className="text-base font-medium mb-4 block flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Accessory
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {ACCESSORIES.map((accessory) => (
                      <button
                        key={accessory.id}
                        onClick={() => setCustomization({ ...customization, accessory: accessory.id })}
                        className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                          customization.accessory === accessory.id
                            ? "border-emerald-500 bg-emerald-50 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        } ${!accessory.unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={!accessory.unlocked}
                      >
                        <div className="text-3xl mb-2">{accessory.icon}</div>
                        <div className="text-xs font-medium">{accessory.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div>
                  <Label className="text-base font-medium mb-4 block flex items-center gap-2">
                    <Rainbow className="h-4 w-4" />
                    Background
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: "sky", name: "Sky Blue", color: "bg-gradient-to-b from-sky-100 to-blue-200" },
                      { id: "emerald", name: "Emerald", color: "bg-gradient-to-b from-emerald-100 to-green-200" },
                      { id: "sunset", name: "Sunset", color: "bg-gradient-to-b from-orange-100 to-pink-200" },
                      { id: "night", name: "Night", color: "bg-gradient-to-b from-purple-100 to-indigo-200" },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setCustomization({ ...customization, background: bg.id })}
                        className={`p-4 border-2 rounded-lg text-center transition-all hover:scale-105 ${
                          customization.background === bg.id
                            ? "border-emerald-500 shadow-lg"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`h-12 w-full rounded mb-2 ${bg.color}`}></div>
                        <div className="text-xs font-medium">{bg.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <Label className="text-base font-medium mb-4 block">Title</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TITLES.map((title) => (
                      <button
                        key={title.id}
                        onClick={() => setCustomization({ ...customization, title: title.id })}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          customization.title === title.id
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-gray-300"
                        } ${!title.unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={!title.unlocked}
                      >
                        <div className="font-medium">{title.name}</div>
                        {!title.unlocked && <div className="text-xs text-muted-foreground">🔒 Locked</div>}
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSaveCustomization} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Customization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Care Tab */}
          <TabsContent value="care" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Care Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Plant Care
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Health</span>
                      <span className="font-medium">{currentPlant.health_score || 50}%</span>
                    </div>
                    <Progress value={currentPlant.health_score || 50} className="h-3" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Water Level</span>
                      <span className="font-medium">{currentPlant.water_level || 50}%</span>
                    </div>
                    <Progress value={currentPlant.water_level || 50} className="h-3" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Growth Stage</span>
                      <span className="font-medium">{currentPlant.growth_stage || 1}/10</span>
                    </div>
                    <Progress value={(currentPlant.growth_stage || 1) * 10} className="h-3" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 mt-6">
                    <Button onClick={handleWaterPlant} className="bg-blue-500 hover:bg-blue-600">
                      <Droplets className="h-4 w-4 mr-2" />
                      Water Plant (+20 water)
                    </Button>
                    <Button onClick={handleFertilizePlant} variant="outline" className="border-green-500 text-green-600">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Fertilize (+10 growth)
                    </Button>
                    <Button onClick={handleSunshine} variant="outline" className="border-yellow-500 text-yellow-600">
                      <Sun className="h-4 w-4 mr-2" />
                      Give Sunshine (+level boost)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Mood & Influence */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Mood & Influence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl mb-2">
                      {currentPlant.current_mood_influence === 'happy' ? '😊' :
                       currentPlant.current_mood_influence === 'sad' ? '😔' :
                       currentPlant.current_mood_influence === 'energetic' ? '⚡' :
                       currentPlant.current_mood_influence === 'calm' ? '😌' : '😐'}
                    </div>
                    <Badge className="capitalize">
                      {currentPlant.current_mood_influence || 'neutral'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Journal Mood:</span>
                      <span>{((currentPlant.journal_mood_score || 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Music Mood:</span>
                      <span>{((currentPlant.spotify_mood_score || 0.5) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Combined Mood:</span>
                      <span>{((currentPlant.combined_mood_score || 0.5) * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={() => navigate('/journal')}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Write Journal Entry
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate('/music')}>
                      <Music className="h-4 w-4 mr-2" />
                      Connect Spotify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Time Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                      <span>
                        {currentPlant.created_at
                          ? Math.floor((Date.now() - new Date(currentPlant.created_at)) / (1000 * 60 * 60 * 24))
                          : 0} days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Level:</span>
                      <span>{currentPlant.level || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Growth Stage:</span>
                      <span>{currentPlant.growth_stage || 1}/10</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Health Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Health:</span>
                      <span>{currentPlant.health_score || 50}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Water Level:</span>
                      <span>{currentPlant.water_level || 50}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {currentPlant.health_status || 'good'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    Activity Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Music Minutes:</span>
                      <span>{currentPlant.total_music_minutes || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Music Boost:</span>
                      <Badge variant={currentPlant.music_boost_active ? "default" : "secondary"}>
                        {currentPlant.music_boost_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default PlantManagement
