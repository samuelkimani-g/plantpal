"use client"

import { useState, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createJournalEntry, getAllMoodEntries, getJournalPrompt } from "../../services/api" // Corrected paths
import { useAuth } from "../../context/AuthContext"
import { usePlant } from "../../context/PlantContext" 
import { Loader2, Sparkles, BookOpen } from "lucide-react"

const JournalEntryForm = ({ onEntryCreated }) => {
  const { user } = useAuth()
  const { currentPlant, addPlantLog } = usePlant()
  const [journalText, setJournalText] = useState("")
  const [selectedMood, setSelectedMood] = useState(null) // Stores the selected mood object from API
  const [moods, setMoods] = useState([]) // Stores all available moods from API
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    if (user) { // Only fetch moods if user is authenticated
      fetchMoodsAndPrompt()
    }
  }, [user, selectedMood]) // Re-fetch prompt if selectedMood changes

  const fetchMoodsAndPrompt = async () => {
    setLoading(true)
    try {
      const fetchedMoods = await getAllMoodEntries()
      setMoods(fetchedMoods)
      
      // Attempt to get an AI prompt based on a general or user's latest mood if available
      const latestMood = fetchedMoods.length > 0 ? fetchedMoods[0].mood : null; // Assuming moods are ordered by latest
      const prompt = await getJournalPrompt(latestMood);
      setAiPrompt(prompt);

    } catch (error) {
      console.error("Error fetching moods or prompt:", error)
      toast({
        title: "Error",
        description: "Could not load mood options or AI prompt.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood)
    // When a mood is selected, fetch a new prompt specific to that mood
    getJournalPrompt(mood.mood_type).then(setAiPrompt).catch(console.error);
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!journalText.trim()) {
      toast({
        title: "Input required",
        description: "Please write something in your journal.",
        variant: "destructive",
      })
      return
    }
    if (!selectedMood) {
      toast({
        title: "Mood required",
        description: "Please select your current mood.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Create a journal entry, linking it to the selected mood
      const newEntry = await createJournalEntry(journalText, selectedMood.id, false); 
      
      // Also log a plant activity if a plant exists
      if (currentPlant) {
        await addPlantLog(currentPlant.id, `Journaled about mood: ${selectedMood.mood_type}`, true, false); // Example: journaling implies watering/caring
      }

      setJournalText("")
      setSelectedMood(null)
      setAiPrompt("") // Clear AI prompt after submission
      toast({
        title: "Journal Entry Added!",
        description: "Your thoughts and mood have been recorded.",
        variant: "success",
      })
      if (onEntryCreated) {
        onEntryCreated() // Notify parent component (Dashboard) to refresh data
      }
      fetchMoodsAndPrompt(); // Re-fetch prompt and moods to reset
    } catch (error) {
      console.error("Error submitting journal entry:", error)
      toast({
        title: "Submission Failed",
        description: error.response?.data?.detail || "Could not save your journal entry.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading journal form...</p>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <span>Write in your Journal</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="journalText" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              What's on your mind?
            </label>
            <Textarea
              id="journalText"
              placeholder="Start journaling..."
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              className="mt-1 min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>

          {/* AI Prompt */}
          {aiPrompt && (
            <div className="relative p-3 bg-green-50/50 border border-green-200 rounded-md text-sm text-green-700 flex items-start">
              <Sparkles className="h-4 w-4 mr-2 flex-shrink-0 text-green-600" />
              <span>
                **AI Prompt:** {aiPrompt}
              </span>
            </div>
          )}

          {/* Mood Selection */}
          <div>
            <label className="text-sm font-medium leading-none">How are you feeling?</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {moods.map((mood) => (
                <Button
                  key={mood.id}
                  type="button"
                  variant={selectedMood?.id === mood.id ? "default" : "outline"}
                  onClick={() => handleMoodSelect(mood)}
                  disabled={isSubmitting}
                  className={selectedMood?.id === mood.id ? "bg-green-600 text-white hover:bg-green-700" : ""}
                >
                  {mood.mood_type}
                </Button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Entry
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default JournalEntryForm;