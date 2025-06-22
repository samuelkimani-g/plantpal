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
  Gift
} from "lucide-react"

const MindfulnessPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentPlant, fetchPlants } = usePlant()
  const [activeTab, setActiveTab] = useState("breathing")
  
  // Breathing exercise state
  const [isBreathing, setIsBreathing] = useState(false)
  const [breathingPhase, setBreathingPhase] = useState("inhale") // inhale, hold, exhale
  const [breathingCount, setBreathingCount] = useState(0)
  const [breathingDuration, setBreathingDuration] = useState(0)
  const [breathingTimer, setBreathingTimer] = useState(null)
  const [breathingPattern, setBreathingPattern] = useState("4-4-4") // inhale-hold-exhale
  
  // Meditation state
  const [isMeditating, setIsMeditating] = useState(false)
  const [meditationTime, setMeditationTime] = useState(300) // 5 minutes default
  const [meditationRemaining, setMeditationRemaining] = useState(300)
  const [meditationTimer, setMeditationTimer] = useState(null)
  
  // Gratitude state
  const [gratitudeItems, setGratitudeItems] = useState(["", "", ""])
  const [isSubmittingGratitude, setIsSubmittingGratitude] = useState(false)
  
  // Progress tracking
  const [todaysSessions, setTodaysSessions] = useState([])
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [streak, setStreak] = useState(0)
  
  const audioRef = useRef(null)

  useEffect(() => {
    loadMindfulnessData()
    return () => {
      // Cleanup timers
      if (breathingTimer) clearInterval(breathingTimer)
      if (meditationTimer) clearInterval(meditationTimer)
    }
  }, [])

  const loadMindfulnessData = () => {
    // Load from localStorage for now
    const saved = localStorage.getItem('mindfulnessProgress')
    if (saved) {
      const data = JSON.parse(saved)
      setTodaysSessions(data.todaysSessions || [])
      setTotalMinutes(data.totalMinutes || 0)
      setStreak(data.streak || 0)
    }
  }

  const saveMindfulnessData = () => {
    const data = {
      todaysSessions,
      totalMinutes,
      streak,
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
    
    const [inhale, hold, exhale] = breathingPattern.split("-").map(Number)
    
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
    
    // Record session
    const session = {
      type: "breathing",
      duration: breathingDuration,
      count: breathingCount,
      pattern: breathingPattern,
      timestamp: new Date().toISOString()
    }
    
    setTodaysSessions(prev => [...prev, session])
    setTotalMinutes(prev => prev + Math.floor(breathingDuration / 60))
    
    // Reward plant
    await rewardPlant("breathing")
    
    saveMindfulnessData()
  }

  // Meditation Logic
  const startMeditation = () => {
    setIsMeditating(true)
    setMeditationRemaining(meditationTime)
    
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
    
    // Record partial session if more than 1 minute
    const completedTime = meditationTime - meditationRemaining
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
    await recordMeditationSession(meditationTime)
  }

  const recordMeditationSession = async (duration) => {
    const session = {
      type: "meditation",
      duration: duration,
      targetDuration: meditationTime,
      timestamp: new Date().toISOString()
    }
    
    setTodaysSessions(prev => [...prev, session])
    setTotalMinutes(prev => prev + Math.floor(duration / 60))
    
    // Reward plant
    await rewardPlant("meditation")
    
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
      
      // Reward plant
      await rewardPlant("gratitude")
      
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
        return "scale-150 bg-blue-200"
      case "hold":
        return "scale-150 bg-purple-200"
      case "exhale":
        return "scale-100 bg-green-200"
      default:
        return "scale-100 bg-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🧘 Mindfulness Garden
          </h1>
          <p className="text-muted-foreground">Nurture your mind and watch your plant flourish</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="breathing" className="flex items-center gap-2">
              <Wind className="h-4 w-4" />
              Breathing
            </TabsTrigger>
            <TabsTrigger value="meditation" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Meditation
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
                  {/* Breathing Pattern Selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Breathing Pattern</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["4-4-4", "4-7-8", "6-6-6"].map((pattern) => (
                        <button
                          key={pattern}
                          onClick={() => setBreathingPattern(pattern)}
                          disabled={isBreathing}
                          className={`p-2 border-2 rounded-lg text-sm font-medium transition-all ${
                            breathingPattern === pattern
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          {pattern}
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
                    Guided Meditation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Duration Selector */}
                  {!isMeditating && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Duration</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[300, 600, 900, 1200].map((duration) => (
                          <button
                            key={duration}
                            onClick={() => setMeditationTime(duration)}
                            className={`p-2 border-2 rounded-lg text-sm font-medium transition-all ${
                              meditationTime === duration
                                ? "border-purple-500 bg-purple-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            {Math.floor(duration / 60)}m
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timer Display */}
                  <div className="text-center space-y-4">
                    <div className="relative h-48 flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-8 border-purple-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">
                            {formatTime(isMeditating ? meditationRemaining : meditationTime)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {isMeditating ? "Remaining" : "Duration"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">
                        {isMeditating ? "Meditation in Progress" : "Ready to Meditate"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isMeditating 
                          ? "Focus on your breath and let thoughts pass by like clouds"
                          : "Find a comfortable position and prepare to center yourself"
                        }
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
                      <h4 className="font-semibold text-purple-700 mb-2">🧠 Mental Clarity</h4>
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
                      <h4 className="font-semibold text-green-700 mb-2">🌱 Plant Growth</h4>
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

          {/* Gratitude Tab */}
          <TabsContent value="gratitude" className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Gratitude Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <Sun className="h-4 w-4" />
                    <AlertDescription>
                      Take a moment to reflect on three things you're grateful for today. 
                      This practice cultivates positivity and helps your plant thrive!
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-4">
                    {gratitudeItems.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <label className="text-sm font-medium">
                          I'm grateful for... #{index + 1}
                        </label>
                        <textarea
                          value={item}
                          onChange={(e) => {
                            const newItems = [...gratitudeItems]
                            newItems[index] = e.target.value
                            setGratitudeItems(newItems)
                          }}
                          placeholder="Something you appreciate today..."
                          className="w-full p-3 border border-gray-200 rounded-lg resize-none"
                          rows={2}
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={submitGratitude}
                    disabled={isSubmittingGratitude || gratitudeItems.every(item => !item.trim())}
                    className="w-full bg-pink-500 hover:bg-pink-600"
                  >
                    {isSubmittingGratitude ? (
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Heart className="h-4 w-4 mr-2" />
                    )}
                    Share Gratitude with Your Plant
                  </Button>

                  <div className="text-center">
                    <Badge variant="outline" className="bg-pink-100">
                      <Gift className="h-3 w-3 mr-1" />
                      Today: {todaysSessions.filter(s => s.type === 'gratitude').length} gratitude sessions
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Today's Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Today's Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{todaysSessions.length}</div>
                    <div className="text-sm text-muted-foreground">Sessions Completed</div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Breathing:</span>
                      <span>{todaysSessions.filter(s => s.type === 'breathing').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Meditation:</span>
                      <span>{todaysSessions.filter(s => s.type === 'meditation').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gratitude:</span>
                      <span>{todaysSessions.filter(s => s.type === 'gratitude').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Overall Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{totalMinutes}</div>
                    <div className="text-sm text-muted-foreground">Total Minutes</div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{streak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </div>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Badge 
                      variant={totalMinutes >= 10 ? "default" : "secondary"} 
                      className="w-full justify-center"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      First 10 Minutes
                    </Badge>
                    
                    <Badge 
                      variant={streak >= 3 ? "default" : "secondary"} 
                      className="w-full justify-center"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      3-Day Streak
                    </Badge>
                    
                    <Badge 
                      variant={todaysSessions.length >= 3 ? "default" : "secondary"} 
                      className="w-full justify-center"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Daily Trio
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todaysSessions.length > 0 ? (
                  <div className="space-y-3">
                    {todaysSessions.slice(-5).reverse().map((session, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            {session.type === 'breathing' && <Wind className="h-4 w-4 text-blue-600" />}
                            {session.type === 'meditation' && <Moon className="h-4 w-4 text-purple-600" />}
                            {session.type === 'gratitude' && <Heart className="h-4 w-4 text-pink-600" />}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{session.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {session.duration ? formatTime(session.duration) : 'Completed'}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(session.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-muted-foreground">No sessions today. Start your mindfulness journey!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default MindfulnessPage 