import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const MoodCard = ({ mood, className = "" }) => {
  const getMoodColor = (moodValue) => {
    if (moodValue >= 8) return "bg-green-500"
    if (moodValue >= 6) return "bg-blue-500"
    if (moodValue >= 4) return "bg-yellow-500"
    if (moodValue >= 2) return "bg-orange-500"
    return "bg-red-500"
  }

  const getMoodEmoji = (moodValue) => {
    if (moodValue >= 8) return "😊"
    if (moodValue >= 6) return "🙂"
    if (moodValue >= 4) return "😐"
    if (moodValue >= 2) return "😔"
    return "😢"
  }

  const getMoodLabel = (moodValue) => {
    if (moodValue >= 8) return "Excellent"
    if (moodValue >= 6) return "Good"
    if (moodValue >= 4) return "Okay"
    if (moodValue >= 2) return "Low"
    return "Very Low"
  }

  if (!mood) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <div className="text-2xl mb-2">🌱</div>
          <div className="text-sm text-gray-500">No mood data yet</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardContent className="p-4 text-center">
        <div className="text-3xl mb-2">{getMoodEmoji(mood.mood)}</div>
        <Badge className={`${getMoodColor(mood.mood)} text-white mb-2`}>{getMoodLabel(mood.mood)}</Badge>
        <div className="text-sm text-gray-600">Mood: {mood.mood}/10</div>
        {mood.note && <div className="text-xs text-gray-500 mt-2 italic">"{mood.note}"</div>}
        <div className="text-xs text-gray-400 mt-2">{new Date(mood.created_at).toLocaleDateString()}</div>
      </CardContent>
    </Card>
  )
}

export default MoodCard
