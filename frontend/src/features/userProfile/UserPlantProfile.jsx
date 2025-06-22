import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { plantAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Leaf, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function UserPlantProfile() {
  const { userId } = useParams();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [watering, setWatering] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    plantAPI
      .getPublicPlant(userId)
      .then((res) => {
        setPlant(res.data);
        setError("");
      })
      .catch((err) => {
        setError("Failed to load plant profile.");
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleWater = async () => {
    setWatering(true);
    try {
      await plantAPI.waterOtherPlant(userId);
      setPlant((prev) => ({ ...prev, water_level: Math.min(100, (prev.water_level || 50) + 10) }));
    } catch (e) {
      setError("Failed to water plant.");
    } finally {
      setWatering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <Button variant="outline" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-semibold py-8">{error}</div>
        ) : !plant ? (
          <div className="text-center text-emerald-700 dark:text-emerald-200 py-8">
            Plant not found.
          </div>
        ) : (
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-lg">
            <div className="absolute -top-8 -right-8 opacity-20 pointer-events-none select-none">
              <Leaf className="w-32 h-32 text-emerald-300 dark:text-emerald-700 animate-spin-slow" />
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-100 text-2xl">{plant.name}</span>
                <Badge className="capitalize bg-emerald-500 text-white">{plant.species}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">Lv. {plant.growth_level || plant.growth_stage || 1}</span>
                <Badge className="bg-blue-500">Health: {plant.health_score || plant.health || 80}%</Badge>
                <Badge className="bg-cyan-600">Water: {plant.water_level || 50}%</Badge>
                <Badge className="bg-purple-600 capitalize">{plant.current_mood_influence || "neutral"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={plant.health_score || plant.health || 80} className="h-2" />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-emerald-800 dark:text-emerald-200">Owner:</span>
                  <span className="text-emerald-700 dark:text-emerald-100">{plant.username || "User"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-emerald-800 dark:text-emerald-200">Mood:</span>
                  <span className="capitalize text-purple-600 dark:text-purple-300">{plant.current_mood_influence || "neutral"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-emerald-800 dark:text-emerald-200">Description:</span>
                  <span className="text-gray-700 dark:text-gray-300">{plant.description || "No description."}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={handleWater}
                  disabled={user && (user.id === plant.userId || user.id === plant.user_id) || watering}
                >
                  {watering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Droplets className="h-4 w-4 mr-2" />}
                  {watering ? "Watering..." : user && (user.id === plant.userId || user.id === plant.user_id) ? "Your Plant" : "Water Plant"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 