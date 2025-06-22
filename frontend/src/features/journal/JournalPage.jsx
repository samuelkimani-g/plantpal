"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { journalAPI, plantAPI } from "../../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { 
  BookOpen, 
  Plus, 
  Heart, 
  Sparkles, 
  Calendar, 
  TrendingUp,
  Leaf,
  Save,
  RefreshCw,
  Trash2,
  Edit,
  Star,
  Lightbulb,
  Sprout,
  Target,
  CheckCircle,
  Clock,
  Smile,
  Frown,
  Meh,
  Zap,
  Moon
} from "lucide-react"

const JournalPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlant, fetchPlants } = usePlant()
  const [activeTab, setActiveTab] = useState("write")
  const [entries, setEntries] = useState([])
  const [memorySeeds, setMemorySeeds] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Journal entry form
  const [newEntry, setNewEntry] = useState({
    text: "",
    mood_type: "",
    is_favorite: false
  })
  
  // Memory seed form
  const [newMemorySeed, setNewMemorySeed] = useState({
    title: "",
    description: "",
    journal_entry_id: null
  })
  
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showMemorySeedForm, setShowMemorySeedForm] = useState(false)

  useEffect(() => {
    loadJournalData()
  }, [])

  const loadJournalData = async () => {
    setIsLoading(true)
    try {
      const [entriesResponse, memorySeedsResponse] = await Promise.allSettled([
        journalAPI.getEntries({ limit: 20 }),
        plantAPI.getMemorySeeds()
      ])
      
      if (entriesResponse.status === 'fulfilled') {
        const entriesData = entriesResponse.value.data.results || entriesResponse.value.data || []
        setEntries(Array.isArray(entriesData) ? entriesData : [])
      } else {
        setEntries([])
      }
      
      if (memorySeedsResponse.status === 'fulfilled') {
        const memorySeedsData = memorySeedsResponse.value.data || []
        setMemorySeeds(Array.isArray(memorySeedsData) ? memorySeedsData : [])
      } else {
        setMemorySeeds([])
      }
    } catch (error) {
      console.error("Error loading journal data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveEntry = async () => {
    if (!newEntry.text.trim()) return

    setIsSaving(true)
    try {
      const response = await journalAPI.createEntry(newEntry)
      setEntries([response.data, ...entries])
      setNewEntry({ text: "", mood_type: "", is_favorite: false })
      
      // Refresh plant data to see mood updates
      await fetchPlants()
    } catch (error) {
      console.error("Error saving journal entry:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateMemorySeed = async () => {
    if (!newMemorySeed.title.trim() || !selectedEntry) return
    
    setIsSaving(true)
    try {
      const response = await plantAPI.createMemorySeed({
        ...newMemorySeed,
        journal_entry_id: selectedEntry.id
      })
      
      setMemorySeeds([response.data, ...memorySeeds])
      setNewMemorySeed({ title: "", description: "", journal_entry_id: null })
      setSelectedEntry(null)
      setShowMemorySeedForm(false)
    } catch (error) {
      console.error("Error creating memory seed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFavorite = async (entryId) => {
    try {
      const response = await journalAPI.markFavorite(entryId)
      setEntries(entries.map(entry => 
        entry.id === entryId ? response.data : entry
      ))
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case 'happy': return '😊'
      case 'sad': return '😔'
      case 'excited': return '🤩'
      case 'calm': return '😌'
      case 'anxious': return '😰'
      case 'angry': return '😠'
      case 'grateful': return '🙏'
      case 'tired': return '😴'
      default: return '😐'
    }
  }

  const getMoodColor = (mood) => {
    switch (mood) {
      case 'happy': return 'text-green-500'
      case 'sad': return 'text-blue-500'
      case 'excited': return 'text-yellow-500'
      case 'calm': return 'text-purple-500'
      case 'anxious': return 'text-orange-500'
      case 'angry': return 'text-red-500'
      case 'grateful': return 'text-pink-500'
      case 'tired': return 'text-gray-500'
      default: return 'text-gray-500'
    }
  }

  const moodOptions = [
    { value: 'happy', label: 'Happy', emoji: '😊' },
    { value: 'sad', label: 'Sad', emoji: '😔' },
    { value: 'excited', label: 'Excited', emoji: '🤩' },
    { value: 'calm', label: 'Calm', emoji: '😌' },
    { value: 'anxious', label: 'Anxious', emoji: '😰' },
    { value: 'angry', label: 'Angry', emoji: '😠' },
    { value: 'grateful', label: 'Grateful', emoji: '🙏' },
    { value: 'tired', label: 'Tired', emoji: '😴' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📖 Journal & Memory Seeds
          </h1>
          <p className="text-muted-foreground">Express your thoughts and grow your digital companion</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="write" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Write
            </TabsTrigger>
            <TabsTrigger value="entries" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Entries
            </TabsTrigger>
            <TabsTrigger value="memory-seeds" className="flex items-center gap-2">
              <Sprout className="h-4 w-4" />
              Memory Seeds
            </TabsTrigger>
            <TabsTrigger value="impact" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Plant Impact
            </TabsTrigger>
          </TabsList>

          {/* Write Tab */}
          <TabsContent value="write" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Writing Interface */}
              <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                New Journal Entry
              </CardTitle>
            </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="mood">How are you feeling?</Label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.value}
                          onClick={() => setNewEntry({ ...newEntry, mood_type: mood.value })}
                          className={`p-3 border-2 rounded-lg text-center transition-all ${
                            newEntry.mood_type === mood.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="text-2xl mb-1">{mood.emoji}</div>
                          <div className="text-xs font-medium">{mood.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="entry-text">What's on your mind?</Label>
                <Textarea
                      id="entry-text"
                      value={newEntry.text}
                      onChange={(e) => setNewEntry({ ...newEntry, text: e.target.value })}
                      placeholder="Share your thoughts, feelings, or experiences..."
                      rows={8}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="favorite"
                      checked={newEntry.is_favorite}
                      onChange={(e) => setNewEntry({ ...newEntry, is_favorite: e.target.checked })}
                      className="rounded"
                />
                    <Label htmlFor="favorite" className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Mark as favorite
                    </Label>
                  </div>

                  <Button 
                    onClick={handleSaveEntry} 
                    disabled={isSaving || !newEntry.text.trim()}
                    className="w-full"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Entry
                  </Button>
                </CardContent>
              </Card>

              {/* Plant Mood Impact */}
              {currentPlant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Plant Mood Impact
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
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Journal Mood Score</span>
                          <span>{((currentPlant.journal_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.journal_mood_score || 0.5) * 100} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Combined Mood Score</span>
                          <span>{((currentPlant.combined_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.combined_mood_score || 0.5) * 100} className="h-2" />
                </div>
              </div>

                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertDescription>
                        Your journal entries influence your plant's mood! Positive thoughts help your plant grow happier and healthier.
                      </AlertDescription>
                    </Alert>
            </CardContent>
          </Card>
        )}
            </div>
          </TabsContent>

          {/* Entries Tab */}
          <TabsContent value="entries" className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-muted-foreground">Loading your journal entries...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {entries.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl ${getMoodColor(entry.mood_type)}`}>
                            {getMoodEmoji(entry.mood_type)}
                          </span>
                          <div>
                            <Badge variant="outline" className="capitalize">
                              {entry.mood_type || 'neutral'}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(entry.id)}
                            className={entry.is_favorite ? "text-yellow-500" : "text-gray-400"}
                          >
                            <Star className="h-4 w-4" fill={entry.is_favorite ? "currentColor" : "none"} />
                          </Button>
                <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEntry(entry)
                              setShowMemorySeedForm(true)
                            }}
                          >
                            <Sprout className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                      {entry.mood_confidence && (
                        <div className="mt-3 text-xs text-muted-foreground">
                          Mood confidence: {(entry.mood_confidence * 100).toFixed(0)}%
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {entries.length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <BookOpen className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-blue-700 mb-2">No entries yet</h3>
                    <p className="text-blue-600 mb-6">
                      Start your journaling journey and watch your plant respond to your emotions
                    </p>
                    <Button onClick={() => setActiveTab("write")} className="bg-blue-500 hover:bg-blue-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Write Your First Entry
                </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Memory Seeds Tab */}
          <TabsContent value="memory-seeds" className="space-y-6">
            {/* Memory Seed Creation Form */}
            {showMemorySeedForm && selectedEntry && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sprout className="h-5 w-5" />
                    Create Memory Seed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      Transform meaningful journal entries into memory seeds that help your plant grow!
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Selected Entry:</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{selectedEntry.text}</p>
                  </div>

                  <div>
                    <Label htmlFor="seed-title">Memory Seed Title</Label>
                    <Input
                      id="seed-title"
                      value={newMemorySeed.title}
                      onChange={(e) => setNewMemorySeed({ ...newMemorySeed, title: e.target.value })}
                      placeholder="Give your memory a meaningful title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="seed-description">Description (Optional)</Label>
                    <Textarea
                      id="seed-description"
                      value={newMemorySeed.description}
                      onChange={(e) => setNewMemorySeed({ ...newMemorySeed, description: e.target.value })}
                      placeholder="Add more context or reflection..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateMemorySeed} disabled={isSaving || !newMemorySeed.title.trim()}>
                      {isSaving ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Create Memory Seed
                    </Button>
                    <Button variant="outline" onClick={() => setShowMemorySeedForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Memory Seeds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.isArray(memorySeeds) && memorySeeds.map((seed) => (
                <Card key={seed.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sprout className="h-5 w-5 text-green-600" />
                      {seed.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {seed.description && (
                      <p className="text-sm text-muted-foreground">{seed.description}</p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(seed.created_at).toLocaleDateString()}
                    </div>
                    <Badge variant="outline" className="w-fit">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Memory Seed
                    </Badge>
              </CardContent>
            </Card>
              ))}

              {(!Array.isArray(memorySeeds) || memorySeeds.length === 0) && (
                <div className="col-span-3 text-center py-12">
                  <Sprout className="h-16 w-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-green-700 mb-2">No memory seeds yet</h3>
                  <p className="text-green-600 mb-6">
                    Create memory seeds from your meaningful journal entries to boost your plant's growth
                  </p>
                  <Button onClick={() => setActiveTab("entries")} variant="outline">
                    <Sprout className="h-4 w-4 mr-2" />
                    Browse Journal Entries
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Plant Impact Tab */}
          <TabsContent value="impact" className="space-y-6">
            {currentPlant ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mood Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Mood Analysis
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
                      <Badge className="capitalize text-lg">
                        {currentPlant.current_mood_influence || 'neutral'}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Journal Influence</span>
                          <span>{((currentPlant.journal_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.journal_mood_score || 0.5) * 100} className="h-3" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Music Influence</span>
                          <span>{((currentPlant.spotify_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.spotify_mood_score || 0.5) * 100} className="h-3" />
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Combined Mood</span>
                          <span>{((currentPlant.combined_mood_score || 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Progress value={(currentPlant.combined_mood_score || 0.5) * 100} className="h-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Plant Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Plant Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{currentPlant.health_score || 50}%</div>
                        <div className="text-sm text-muted-foreground">Health</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{currentPlant.growth_stage || 1}/10</div>
                        <div className="text-sm text-muted-foreground">Growth</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Overall Health</span>
                        <span>{currentPlant.health_score || 50}%</span>
                      </div>
                      <Progress value={currentPlant.health_score || 50} className="h-2" />
                    </div>

                    <Alert>
                      <Heart className="h-4 w-4" />
                      <AlertDescription>
                        Your journal entries have contributed {memorySeeds.length} memory seeds to your plant's growth!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Growth Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-700 mb-2">📝 Journal Regularly</h4>
                        <p className="text-sm text-green-600">
                          Daily journaling helps your plant understand your emotional patterns and grow stronger.
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-700 mb-2">🌱 Create Memory Seeds</h4>
                        <p className="text-sm text-blue-600">
                          Transform meaningful entries into memory seeds for extra growth boosts.
                        </p>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-purple-700 mb-2">😊 Express Positivity</h4>
                        <p className="text-sm text-purple-600">
                          Positive emotions and gratitude help your plant develop a happier disposition.
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-700 mb-2">🎵 Combine with Music</h4>
                        <p className="text-sm text-yellow-600">
                          Journal while listening to uplifting music for maximum plant happiness!
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <Leaf className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Plant Found</h3>
                  <p className="text-gray-600 mb-6">Create a plant first to see how your journal impacts its growth.</p>
                  <Button onClick={() => navigate("/plants")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plant
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default JournalPage
