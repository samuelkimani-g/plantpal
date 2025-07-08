"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext"
import { plantAPI } from "../../services/api"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Progress } from "../../components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Alert, AlertDescription } from "../../components/ui/alert"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { 
  Heart, 
  Play, 
  Pause, 
  RotateCcw, 
  Leaf, 
  Sparkles, 
  Clock,
  CheckCircle,
  Star,
  Wind,
  Sun,
  Moon,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Award,
  Gift,
  Trees,
  Brain,
  Meditation,
  Flower,
  Rainbow,
  Lightbulb,
  Trophy,
  Timer,
  Music,
  BookOpen,
  Smile,
  Peace,
  Infinity
} from "lucide-react"

const MindfulnessPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlant, fetchPlants } = usePlant()
  const [activeTab, setActiveTab] = useState("breathing")
  
  // Breathing exercise state
  const [isBreathing, setIsBreathing] = useState(false)
  const [breathingPhase, setBreathingPhase] = useState("inhale")
  const [breathingCount, setBreathingCount] = useState(0)
  const [breathingDuration, setBreathingDuration] = useState(0)
  const [breathingTimer, setBreathingTimer] = useState(null)
  const [breathingPattern, setBreathingPattern] = useState("4-4-4")
  const [selectedPattern, setSelectedPattern] = useState("4-4-4")
  
  // Meditation state
  const [isMeditating, setIsMeditating] = useState(false)
  const [meditationTime, setMeditationTime] = useState(300)
  const [meditationRemaining, setMeditationRemaining] = useState(300)
  const [meditationTimer, setMeditationTimer] = useState(null)
  const [selectedMeditationTime, setSelectedMeditationTime] = useState(300)
  
  // Gratitude state
  const [gratitudeItems, setGratitudeItems] = useState(["", "", ""])
  const [isSubmittingGratitude, setIsSubmittingGratitude] = useState(false)
  
  // New exercises state
  const [isVisualizing, setIsVisualizing] = useState(false)
  const [visualizationTime, setVisualizationTime] = useState(0)
  const [visualizationTimer, setVisualizationTimer] = useState(null)
  const [selectedVisualization, setSelectedVisualization] = useState("garden")
  
  // Progress tracking
  const [todaysSessions, setTodaysSessions] = useState([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [streak, setStreak] = useState(0)
  const [achievements, setAchievements] = useState([])
  const [weeklyGoal, setWeeklyGoal] = useState(30) // minutes
  const [weeklyProgress, setWeeklyProgress] = useState(0)
  
  const audioRef = useRef(null)

  useEffect(() => {
    loadMindfulnessData()
    return () => {
      if (breathingTimer) clearInterval(breathingTimer)
      if (meditationTimer) clearInterval(meditationTimer)
      if (visualizationTimer) clearInterval(visualizationTimer)
    }
  }, [])

  const loadMindfulnessData = () => {
    const saved = localStorage.getItem('mindfulnessProgress')
    if (saved) {
      const data = JSON.parse(saved)
      setTodaysSessions(data.todaysSessions || [])
      setTotalMinutes(data.totalMinutes || 0)
      setStreak(data.streak || 0)
      setAchievements(data.achievements || [])
      setWeeklyProgress(data.weeklyProgress || 0)
    }
  }

  const saveMindfulnessData = () => {
    const data = {
      todaysSessions,
      totalMinutes,
      streak,
      achievements,
      weeklyProgress,
      lastSession: new Date().toISOString()
    }
    localStorage.setItem('mindfulnessProgress', JSON.stringify(data))
  }

  // Breathing Exercise Logic
  const startBreathingExercise = () => {
    setIsBreathing(true)
    setBreathingCount(0)
    setBreathingDuration(0)
    setBreathingPhase("inhale")
    setBreathingPattern(selectedPattern)
    
    const [inhale, hold, exhale] = selectedPattern.split("-").map(Number)
    
    let phase = "inhale"
    let count = 0
    let duration = 0
    
    const timer = setInterval(() => {
      duration++
      setBreathingDuration(duration)
      
      if (phase === "inhale" && count >= inhale) {
        phase = "hold"
        count = 0
      } else if (phase === "hold" && count >= hold) {
        phase = "exhale"
        count = 0
      } else if (phase === "exhale" && count >= exhale) {
        phase = "inhale"
        count = 0
        setBreathingCount(prev => prev + 1)
      }
      
      count++
      setBreathingPhase(phase)
    }, 1000)
    
    setBreathingTimer(timer)
  }

  const stopBreathingExercise = async () => {
    if (breathingTimer) {
      clearInterval(breathingTimer)
      setBreathingTimer(null)
    }
    
    setIsBreathing(false)
    
    const session = {
      type: "breathing",
      duration: breathingDuration,
      count: breathingCount,
      pattern: breathingPattern,
      timestamp: new Date().toISOString()
    }
    
    setTodaysSessions(prev => [...prev, session])
    setTotalMinutes(prev => prev + Math.floor(breathingDuration / 60))
    setWeeklyProgress(prev => prev + Math.floor(breathingDuration / 60))
    
    await rewardPlant("breathing")
    checkAchievements()
    saveMindfulnessData()
  }

  // Meditation Logic
  const startMeditation = () => {
    setIsMeditating(true)
    setMeditationRemaining(selectedMeditationTime)
    setMeditationTime(selectedMeditationTime)
    
    const timer = setInterval(() => {
      setMeditationRemaining(prev => {
        if (prev <= 1) {
          finishMeditation()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setMeditationTimer(timer)
  }

  const stopMeditation = () => {
    if (meditationTimer) {
      clearInterval(meditationTimer)
      setMeditationTimer(null)
    }
    
    setIsMeditating(false)
    
    const completedTime = selectedMeditationTime - meditationRemaining
    if (completedTime >= 60) {
      recordMeditationSession(completedTime)
    }
  }

  const finishMeditation = async () => {
    if (meditationTimer) {
      clearInterval(meditationTimer)
      setMeditationTimer(null)
    }
    
    setIsMeditating(false)
    await recordMeditationSession(selectedMeditationTime)
  }

  const recordMeditationSession = async (duration) => {
    const session = {
      type: "meditation",
      duration: duration,
      targetDuration: selectedMeditationTime,
      timestamp: new Date().toISOString()
    }
    
    setTodaysSessions(prev => [...prev, session])
    setTotalMinutes(prev => prev + Math.floor(duration / 60))
    setWeeklyProgress(prev => prev + Math.floor(duration / 60))
    
    await rewardPlant("meditation")
    checkAchievements()
    saveMindfulnessData()
  }

  // Visualization Logic
  const startVisualization = () => {
    setIsVisualizing(true)
    setVisualizationTime(0)
    
    const timer = setInterval(() => {
      setVisualizationTime(prev => prev + 1)
    }, 1000)
    
    setVisualizationTimer(timer)
  }

  const stopVisualization = async () => {
    if (visualizationTimer) {
      clearInterval(visualizationTimer)
      setVisualizationTimer(null)
    }
    
    setIsVisualizing(false)
    
    const session = {
      type: "visualization",
      duration: visualizationTime,
      theme: selectedVisualization,
      timestamp: new Date().toISOString()
    }
    
    setTodaysSessions(prev => [...prev, session])
    setTotalMinutes(prev => prev + Math.floor(visualizationTime / 60))
    setWeeklyProgress(prev => prev + Math.floor(visualizationTime / 60))
    
    await rewardPlant("visualization")
    checkAchievements()
    saveMindfulnessData()
  }

  // Gratitude Logic
  const submitGratitude = async () => {
    const validItems = gratitudeItems.filter(item => item.trim())
    if (validItems.length === 0) return
    
    setIsSubmittingGratitude(true)
    
    try {
      const session = {
        type: "gratitude",
        items: validItems,
        timestamp: new Date().toISOString()
      }
      
      setTodaysSessions(prev => [...prev, session])
      
      await rewardPlant("gratitude")
      checkAchievements()
      
      setGratitudeItems(["", "", ""])
      saveMindfulnessData()
      
    } finally {
      setIsSubmittingGratitude(false)
    }
  }

  // Plant Reward System
  const rewardPlant = async (exerciseType) => {
    if (!currentPlant) return
    
    try {
      await plantAPI.rewardMindfulness(exerciseType)
      await fetchPlants()
    } catch (error) {
      console.error("Error rewarding plant:", error)
    }
  }

  // Achievement System
  const checkAchievements = () => {
    const newAchievements = []
    
    // Streak achievements
    if (streak >= 3 && !achievements.includes('streak_3')) {
      newAchievements.push('streak_3')
    }
    if (streak >= 7 && !achievements.includes('streak_7')) {
      newAchievements.push('streak_7')
    }
    if (streak >= 30 && !achievements.includes('streak_30')) {
      newAchievements.push('streak_30')
    }
    
    // Session achievements
    const todaySessions = todaysSessions.length
    if (todaySessions >= 3 && !achievements.includes('daily_3')) {
      newAchievements.push('daily_3')
    }
    if (todaySessions >= 5 && !achievements.includes('daily_5')) {
      newAchievements.push('daily_5')
    }
    
    // Time achievements
    if (totalMinutes >= 60 && !achievements.includes('hour_total')) {
      newAchievements.push('hour_total')
    }
    if (totalMinutes >= 300 && !achievements.includes('five_hours')) {
      newAchievements.push('five_hours')
    }
    
    if (newAchievements.length > 0) {
      setAchievements(prev => [...prev, ...newAchievements])
    }
  }

  const getAchievementInfo = (achievement) => {
    const achievementData = {
      'streak_3': { name: 'Consistent Beginner', icon: '🔥', description: '3-day streak' },
      'streak_7': { name: 'Weekly Warrior', icon: '⚡', description: '7-day streak' },
      'streak_30': { name: 'Mindfulness Master', icon: '👑', description: '30-day streak' },
      'daily_3': { name: 'Triple Session', icon: '🎯', description: '3 sessions in one day' },
      'daily_5': { name: 'Daily Champion', icon: '🏆', description: '5 sessions in one day' },
      'hour_total': { name: 'Hour of Peace', icon: '⏰', description: '1 hour total practice' },
      'five_hours': { name: 'Zen Seeker', icon: '🧘', description: '5 hours total practice' }
    }
    return achievementData[achievement] || { name: 'Unknown', icon: '❓', description: 'Unknown achievement' }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getBreathingInstruction = () => {
    const [inhale, hold, exhale] = breathingPattern.split("-").map(Number)
    switch (breathingPhase) {
      case "inhale":
        return `Breathe in... (${inhale}s)`
      case "hold":
        return `Hold... (${hold}s)`
      case "exhale":
        return `Breathe out... (${exhale}s)`
      default:
        return "Ready to begin"
    }
  }

  const getBreathingCircleClass = () => {
    switch (breathingPhase) {
      case "inhale":
        return "scale-150 bg-blue-200 shadow-lg"
      case "hold":
        return "scale-150 bg-purple-200 shadow-lg"
      case "exhale":
        return "scale-100 bg-green-200 shadow-md"
      default:
        return "scale-100 bg-gray-200"
    }
  }

  const getVisualizationContent = () => {
    const visualizations = {
      'garden': {
        title: 'Peaceful Garden',
        description: 'Imagine yourself in a beautiful, serene garden. Feel the gentle breeze, hear the birds singing, and see flowers blooming all around you.',
        icon: '🌸'
      },
      'ocean': {
        title: 'Calming Ocean',
        description: 'Visualize yourself by the ocean. Feel the waves gently lapping at your feet, hear the soothing sound of water, and breathe in the fresh sea air.',
        icon: '🌊'
      },
      'forest': {
        title: 'Enchanted Forest',
        description: 'Picture yourself walking through a magical forest. The trees are tall and majestic, sunlight filters through the leaves, and you feel completely at peace.',
        icon: '🌲'
      },
      'mountain': {
        title: 'Mountain Peak',
        description: 'Imagine yourself at the top of a mountain. You can see for miles in every direction, the air is crisp and clear, and you feel on top of the world.',
        icon: '⛰️'
      }
    }
    return visualizations[selectedVisualization] || visualizations['garden']
  }

  const breathingPatterns = [
    { value: "4-4-4", label: "Box Breathing", description: "Equal inhale, hold, exhale" },
    { value: "4-7-8", label: "Relaxing Breath", description: "Calming pattern for sleep" },
    { value: "6-2-7", label: "Energy Boost", description: "Energizing breathing pattern" },
    { value: "5-5-5", label: "Simple Calm", description: "Easy pattern for beginners" }
  ]

  const meditationTimes = [
    { value: 300, label: "5 minutes", description: "Quick session" },
    { value: 600, label: "10 minutes", description: "Standard session" },
    { value: 900, label: "15 minutes", description: "Extended session" },
    { value: 1800, label: "30 minutes", description: "Deep meditation" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🧘 Mindfulness Garden
          </h1>
          <p className="text-muted-foreground">Nurture your mind and watch your plant flourish</p>
          
          {/* Progress Overview */}
          <div className="flex justify-center gap-6 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{streak}</div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{totalMinutes}</div>
              <div className="text-sm text-muted-foreground">Total Minutes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{todaysSessions.length}</div>
              <div className="text-sm text-muted-foreground">Today's Sessions</div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="breathing" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Breathing
            </TabsTrigger>
            <TabsTrigger value="meditation" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Meditation
            </TabsTrigger>
            <TabsTrigger value="visualization" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Visualization
            </TabsTrigger>
            <TabsTrigger value="gratitude" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Gratitude
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Progress
            </TabsTrigger>
          </TabsList>

          {/* Breathing Tab */}
          <TabsContent value="breathing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Breathing Exercise */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wind className="h-5 w-5" />
                    Breathing Exercise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Pattern Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Choose Breathing Pattern:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {breathingPatterns.map((pattern) => (
                        <button
                          key={pattern.value}
                          onClick={() => setSelectedPattern(pattern.value)}
                          className={`p-3 text-left rounded-lg border transition-all ${
                            selectedPattern === pattern.value
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-medium text-sm">{pattern.label}</div>
                          <div className="text-xs text-muted-foreground">{pattern.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Breathing Visualization */}
                  <div className="text-center space-y-4">
                    <div className="relative h-48 flex items-center justify-center">
                      <div 
                        className={`w-32 h-32 rounded-full transition-all duration-1000 ease-in-out ${getBreathingCircleClass()}`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{getBreathingInstruction()}</h3>
                      <p className="text-sm text-muted-foreground">
                        Cycles completed: {breathingCount} | Duration: {formatTime(breathingDuration)}
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      {!isBreathing ? (
                        <Button onClick={startBreathingExercise} className="bg-blue-500 hover:bg-blue-600">
                          <Play className="h-4 w-4 mr-2" />
                          Start Breathing
                        </Button>
                      ) : (
                        <Button onClick={stopBreathingExercise} variant="outline">
                          <Pause className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plant Impact */}
              {currentPlant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Leaf className="h-5 w-5" />
                      Plant Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🌱</div>
                      <h3 className="font-semibold">{currentPlant.name}</h3>
                      <Badge className="capitalize">
                        {currentPlant.current_mood_influence || 'neutral'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Health</span>
                          <span>{currentPlant.health_score || 50}%</span>
                        </div>
                        <Progress value={currentPlant.health_score || 50} className="h-2" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Growth</span>
                          <span>{currentPlant.growth_stage || 1}/10</span>
                        </div>
                        <Progress value={(currentPlant.growth_stage || 1) * 10} className="h-2" />
                      </div>
                    </div>

                    <Alert>
                      <Sparkles className="h-4 w-4" />
                      <AlertDescription>
                        Breathing exercises boost your plant's health and promote calm growth!
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Meditation Tab */}
          <TabsContent value="meditation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meditation Timer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="h-5 w-5" />
                    Meditation Timer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Time Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Choose Duration:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {meditationTimes.map((time) => (
                        <button
                          key={time.value}
                          onClick={() => setSelectedMeditationTime(time.value)}
                          className={`p-3 text-left rounded-lg border transition-all ${
                            selectedMeditationTime === time.value
                              ? "border-purple-500 bg-purple-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-medium text-sm">{time.label}</div>
                          <div className="text-xs text-muted-foreground">{time.description}</div>
                          // ... existing code ...

                          <div className="text-xs text-muted-foreground">{time.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meditation Timer */}
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold text-purple-600">
                      {formatTime(meditationRemaining)}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {isMeditating ? "Meditating..." : "Ready to begin"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Focus on your breath and let thoughts pass by like clouds
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      {!isMeditating ? (
                        <Button onClick={startMeditation} className="bg-purple-500 hover:bg-purple-600">
                          <Play className="h-4 w-4 mr-2" />
                          Start Meditation
                        </Button>
                      ) : (
                        <Button onClick={stopMeditation} variant="outline">
                          <Pause className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meditation Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Meditation Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-700 mb-2">�� Mental Clarity</h4>
                      <p className="text-sm text-purple-600">
                        Regular meditation improves focus and reduces mental clutter.
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-2">😌 Stress Relief</h4>
                      <p className="text-sm text-blue-600">
                        Meditation activates the relaxation response, reducing stress hormones.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">�� Plant Growth</h4>
                      <p className="text-sm text-green-600">
                        Your calm energy promotes balanced growth in your digital plant.
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-4">
                    <Badge variant="outline" className="bg-purple-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Today: {todaysSessions.filter(s => s.type === 'meditation').length} sessions
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Visualization Tab */}
          <TabsContent value="visualization" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Visualization Exercise */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Guided Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Scene Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Choose Visualization Scene:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'garden', label: 'Peaceful Garden', icon: '🌸' },
                        { value: 'ocean', label: 'Calming Ocean', icon: '🌊' },
                        { value: 'forest', label: 'Enchanted Forest', icon: '🌲' },
                        { value: 'mountain', label: 'Mountain Peak', icon: '⛰️' }
                      ].map((scene) => (
                        <button
                          key={scene.value}
                          onClick={() => setSelectedVisualization(scene.value)}
                          className={`p-3 text-left rounded-lg border transition-all ${
                            selectedVisualization === scene.value
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-medium text-sm">{scene.icon} {scene.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visualization Content */}
                  <div className="text-center space-y-4">
                    <div className="text-6xl mb-4">
                      {getVisualizationContent().icon}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{getVisualizationContent().title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getVisualizationContent().description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {formatTime(visualizationTime)}
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      {!isVisualizing ? (
                        <Button onClick={startVisualization} className="bg-indigo-500 hover:bg-indigo-600">
                          <Play className="h-4 w-4 mr-2" />
                          Start Visualization
                        </Button>
                      ) : (
                        <Button onClick={stopVisualization} variant="outline">
                          <Pause className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Visualization Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rainbow className="h-5 w-5" />
                    Visualization Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-indigo-700 mb-2">🎨 Creative Thinking</h4>
                      <p className="text-sm text-indigo-600">
                        Visualization enhances creativity and problem-solving abilities.
                      </p>
                    </div>
                    
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-pink-700 mb-2">💭 Mental Escape</h4>
                      <p className="text-sm text-pink-600">
                        Provides a mental break from daily stress and worries.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">🌿 Nature Connection</h4>
                      <p className="text-sm text-green-600">
                        Reconnects you with nature and promotes environmental awareness.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gratitude Tab */}
          <TabsContent value="gratitude" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gratitude Journal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Gratitude Journal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Write down three things you're grateful for today. This simple practice can significantly improve your mood and outlook.
                    </p>
                    
                    {gratitudeItems.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <label className="text-sm font-medium">
                          I'm grateful for... #{index + 1}
                        </label>
                        <Textarea
                          value={item}
                          onChange={(e) => {
                            const newItems = [...gratitudeItems]
                            newItems[index] = e.target.value
                            setGratitudeItems(newItems)
                          }}
                          placeholder={`What are you grateful for today? (e.g., ${['a warm cup of coffee', 'a kind message from a friend', 'beautiful weather'][index]})`}
                          rows={2}
                        />
                      </div>
                    ))}
                    
                    <Button 
                      onClick={submitGratitude} 
                      disabled={isSubmittingGratitude || gratitudeItems.every(item => !item.trim())}
                      className="w-full bg-pink-500 hover:bg-pink-600"
                    >
                      {isSubmittingGratitude ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4 mr-2" />
                          Submit Gratitude
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Gratitude Benefits */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flower className="h-5 w-5" />
                    Gratitude Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-pink-700 mb-2">😊 Improved Mood</h4>
                      <p className="text-sm text-pink-600">
                        Regular gratitude practice increases happiness and reduces depression.
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-700 mb-2">🤝 Better Relationships</h4>
                      <p className="text-sm text-yellow-600">
                        Gratitude strengthens social bonds and improves communication.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-700 mb-2">�� Plant Happiness</h4>
                      <p className="text-sm text-green-600">
                        Your grateful energy helps your plant grow with joy and positivity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weekly Goal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Weekly Goal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {weeklyProgress}/{weeklyGoal} min
                    </div>
                    <Progress value={(weeklyProgress / weeklyGoal) * 100} className="h-3" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {weeklyGoal - weeklyProgress > 0 
                        ? `${weeklyGoal - weeklyProgress} minutes remaining`
                        : "Goal achieved! 🎉"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {achievements.length > 0 ? (
                    <div className="space-y-2">
                      {achievements.map((achievement) => {
                        const info = getAchievementInfo(achievement)
                        return (
                          <div key={achievement} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                            <span className="text-2xl">{info.icon}</span>
                            <div>
                              <div className="font-medium text-sm">{info.name}</div>
                              <div className="text-xs text-muted-foreground">{info.description}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No achievements yet. Keep practicing!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {todaysSessions.length > 0 ? (
                    <div className="space-y-2">
                      {todaysSessions.slice(-5).reverse().map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {session.type === 'breathing' && <Wind className="h-4 w-4 text-blue-500" />}
                            {session.type === 'meditation' && <Moon className="h-4 w-4 text-purple-500" />}
                            {session.type === 'visualization' && <Brain className="h-4 w-4 text-indigo-500" />}
                            {session.type === 'gratitude' && <Heart className="h-4 w-4 text-pink-500" />}
                            <span className="text-sm font-medium capitalize">{session.type}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {session.duration ? formatTime(session.duration) : 'Completed'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Zap className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No sessions today. Start your mindfulness journey!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Community Garden Section */}
        <div className="max-w-6xl mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trees className="h-5 w-5" />
                Community Garden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Explore other users' plants and spread mindful energy by watering their gardens
                </p>
                <Button 
                  onClick={() => navigate("/public-garden")} 
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Trees className="h-4 w-4 mr-2" />
                  Explore Community Plants
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MindfulnessPage