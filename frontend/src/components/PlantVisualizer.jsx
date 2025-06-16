import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Droplets, Sun, Heart } from "lucide-react"

const PlantVisualizer = ({ plant, mood, className = "" }) => {
  // Determine plant appearance based on mood and health
  const getPlantAppearance = () => {
    if (!plant) return { color: "#8B5CF6", emoji: "🌱", status: "Growing" }

    const health = plant.health || 50
    const moodScore = mood?.mood || 5

    if (health > 80 && moodScore >= 8) {
      return { color: "#10B981", emoji: "🌸", status: "Blooming" }
    } else if (health > 60 && moodScore >= 6) {
      return { color: "#059669", emoji: "🌿", status: "Thriving" }
    } else if (health > 40 && moodScore >= 4) {
      return { color: "#34D399", emoji: "🌱", status: "Growing" }
    } else if (health > 20 && moodScore >= 2) {
      return { color: "#FCD34D", emoji: "🍃", status: "Struggling" }
    } else {
      return { color: "#F87171", emoji: "🥀", status: "Wilting" }
    }
  }

  const appearance = getPlantAppearance()

  return (
    <Card className={`p-6 text-center ${className}`}>
      <div className="space-y-4">
        <div className="text-8xl mb-4">{appearance.emoji}</div>

        <div>
          <h3 className="text-xl font-semibold text-gray-800">{plant?.name || "Your Plant"}</h3>
          <Badge
            variant="secondary"
            className="mt-2"
            style={{ backgroundColor: `${appearance.color}20`, color: appearance.color }}
          >
            {appearance.status}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <Droplets className="h-6 w-6 mx-auto text-blue-500 mb-2" />
            <div className="text-sm text-gray-600">Hydration</div>
            <div className="font-semibold">{plant?.health || 50}%</div>
          </div>

          <div className="text-center">
            <Sun className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
            <div className="text-sm text-gray-600">Sunlight</div>
            <div className="font-semibold">{Math.min(100, (mood?.mood || 5) * 10)}%</div>
          </div>

          <div className="text-center">
            <Heart className="h-6 w-6 mx-auto text-red-500 mb-2" />
            <div className="text-sm text-gray-600">Love</div>
            <div className="font-semibold">{plant?.growth_level || 1}</div>
          </div>
        </div>

        {plant?.species && <div className="text-sm text-gray-500 mt-4">Species: {plant.species}</div>}
      </div>
    </Card>
  )
}

export default PlantVisualizer
