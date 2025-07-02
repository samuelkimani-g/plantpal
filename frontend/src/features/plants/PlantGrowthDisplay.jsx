import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlant } from '../../context/PlantContext';
import PlantDisplay from '../../components/PlantDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Settings, RefreshCw, Heart, Droplets, Leaf, Sparkles } from 'lucide-react';

const PlantGrowthDisplay = () => {
  const navigate = useNavigate();
  const { currentPlant, isLoading, waterPlant, fertilizePlant, fetchPlants } = usePlant();

  const handleWaterPlant = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available");
      return;
    }
    try {
      const result = await waterPlant(currentPlant.id, 20);
      if (result.success) {
        await fetchPlants(); // Refresh plant data
      }
    } catch (error) {
      console.error("Error watering plant:", error);
    }
  };

  const handleFertilizePlant = async () => {
    if (!currentPlant?.id) {
      console.error("No plant ID available");
      return;
    }
    try {
      const result = await fertilizePlant(currentPlant.id);
      if (result.success) {
        await fetchPlants(); // Refresh plant data
      }
    } catch (error) {
      console.error("Error fertilizing plant:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Loading your plant...</p>
        </div>
      </div>
    );
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
    );
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
                <span className="text-lg font-bold text-orange-700">{currentPlant.care_streak || 0} days</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground">Your digital companion grows with your mindfulness</p>
        </div>

        {/* Main Plant Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
          
          {/* Plant Display Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Your Plant
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Level {currentPlant.level || 1}</Badge>
                  <Badge variant={currentPlant.health_score > 70 ? "default" : currentPlant.health_score > 40 ? "secondary" : "destructive"}>
                    {currentPlant.health_score > 70 ? "Thriving" : currentPlant.health_score > 40 ? "Growing" : "Needs Care"}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlantDisplay plantData={currentPlant} />
              
              {/* Quick Care Actions */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Button
                  onClick={handleWaterPlant}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600"
                >
                  <Droplets className="h-4 w-4" />
                  Water (+20)
                </Button>
                <Button
                  onClick={handleFertilizePlant}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600"
                >
                  <Leaf className="h-4 w-4" />
                  Fertilize
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plant Stats and Actions */}
          <div className="space-y-6">
            
            {/* Health Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Plant Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Health</span>
                    <span className="font-medium">{currentPlant.health_score || 50}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        currentPlant.health_score > 70 ? 'bg-green-500' :
                        currentPlant.health_score > 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(currentPlant.health_score || 50, 0)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Water Level</span>
                    <span className="font-medium">{currentPlant.water_level || 50}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.max(currentPlant.water_level || 50, 0)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Growth Progress</span>
                    <span className="font-medium">{currentPlant.growth_stage || 1}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-purple-500 transition-all duration-500"
                      style={{ width: `${Math.max((currentPlant.growth_stage || 1) * 10, 10)}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mood Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Current Mood
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-pulse">
                    {currentPlant.current_mood_influence === 'happy' ? '😊' :
                     currentPlant.current_mood_influence === 'sad' ? '😔' :
                     currentPlant.current_mood_influence === 'energetic' ? '⚡' :
                     currentPlant.current_mood_influence === 'calm' ? '😌' : '😐'}
                  </div>
                  <Badge className="text-lg px-4 py-2 capitalize">
                    {currentPlant.current_mood_influence || 'neutral'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Overall Mood: {((currentPlant.combined_mood_score || 0.5) * 100).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Navigation Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Plant Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => navigate('/plants')} 
                  className="w-full"
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Full Plant Management
                </Button>
                <Button 
                  onClick={() => navigate('/journal')} 
                  className="w-full"
                  variant="outline"
                >
                  📝 Write Journal Entry
                </Button>
                <Button 
                  onClick={() => navigate('/music')} 
                  className="w-full"
                  variant="outline"
                >
                  🎵 Boost with Music
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlantGrowthDisplay; 