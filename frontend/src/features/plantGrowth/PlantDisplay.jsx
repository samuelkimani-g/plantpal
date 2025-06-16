"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { updateExistingPlant, addPlantLog } from "../../context/PlantContext"
import { Droplets, Sprout, LeafyGreen, Snowflake } from "lucide-react"

// Simple SVG for a plant based on growth level/mood
const PlantSVG = ({ growthLevel, mood }) => {
  let plantBodyColor = "fill-green-600";
  let leavesColor = "fill-green-400";
  let potColor = "fill-red-700";

  // Adjust colors based on mood (this is a simplified example)
  if (mood) {
      if (mood.mood_type === "sad" || mood.mood_type === "anxious") {
          leavesColor = "fill-gray-400";
          plantBodyColor = "fill-gray-500";
      } else if (mood.mood_type === "happy" || mood.mood_type === "energetic") {
          leavesColor = "fill-lime-400";
          plantBodyColor = "fill-lime-600";
      }
  }

  let leaves = null;
  // Dynamic leaves based on growthLevel (simplified representation)
  if (growthLevel >= 3) {
    leaves = (
      <>
        <circle cx="100" cy="50" r="20" className={leavesColor} />
        <circle cx="130" cy="70" r="20" className={leavesColor} />
        <circle cx="70" cy="70" r="20" className={leavesColor} />
      </>
    );
  } else if (growthLevel >= 2) {
    leaves = (
      <>
        <circle cx="100" cy="60" r="15" className={leavesColor} />
        <circle cx="120" cy="80" r="15" className={leavesColor} />
      </>
    );
  } else {
    leaves = <circle cx="100" cy="80" r="10" className={leavesColor} />;
  }

  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      {/* Pot */}
      <rect x="70" y="150" width="60" height="40" rx="5" ry="5" className={potColor} />
      {/* Stem */}
      <rect x="98" y="90" width="4" height="60" className={plantBodyColor} />
      {/* Leaves */}
      {leaves}
    </svg>
  );
};


const PlantVisualizer = ({ plant, mood }) => {
  const { updateExistingPlant, addPlantLog, loading: plantLoadingContext } = usePlant(); // Import from PlantContext
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState(false); // Local loading for actions

  const handleWater = async () => {
    setLoadingAction(true);
    try {
      await addPlantLog(plant.id, "Watered the plant.", true, false);
      toast({
        title: "Plant Watered!",
        description: `${plant.name} has received some water.`,
      });
    } catch (error) {
      toast({
        title: "Watering Failed",
        description: "Could not water your plant. Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleFertilize = async () => {
    setLoadingAction(true);
    try {
      await addPlantLog(plant.id, "Fertilized the plant.", false, true);
      toast({
        title: "Plant Fertilized!",
        description: `${plant.name} has been fertilized.`,
      });
    } catch (error) {
      toast({
        title: "Fertilizing Failed",
        description: "Could not fertilize your plant. Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(false);
    }
  };

  // Plant health and growth level calculation (simplified, might be more complex from backend)
  const healthPercentage = plant?.health || 50;
  const growthLevel = plant?.growth_level || 1; // Assuming growth_level is now available

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">{plant?.name || "Your Plant"}</CardTitle>
        <Badge variant="secondary" className="text-sm">Level {growthLevel}</Badge>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-center p-6">
        <PlantSVG growthLevel={growthLevel} mood={mood} />
        <div className="w-full mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Health</span>
            <span>{healthPercentage}%</span>
          </div>
          <Progress value={healthPercentage} className="w-full h-2" />
        </div>
        {mood && (
            <div className="mt-4 text-center text-sm text-gray-600">
                Current Mood: <Badge variant="outline">{mood.mood_type}</Badge>
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-around p-4 border-t">
        <Button onClick={handleWater} disabled={loadingAction || plantLoadingContext}>
          <Droplets className="h-4 w-4 mr-2" /> Water
        </Button>
        <Button onClick={handleFertilize} disabled={loadingAction || plantLoadingContext}>
          <LeafyGreen className="h-4 w-4 mr-2" /> Fertilize
        </Button>
        {/* You could add more actions here */}
      </CardFooter>
    </Card>
  );
};

export default PlantVisualizer;
