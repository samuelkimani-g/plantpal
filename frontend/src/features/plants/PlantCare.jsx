import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePlant } from '../../context/PlantContext'
import { plantAPI, paymentsAPI } from '../../services/api'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Progress } from '../../components/ui/progress'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { 
  Droplets, 
  Leaf, 
  Zap, 
  Heart, 
  TrendingUp,
  ShoppingCart,
  AlertCircle
} from 'lucide-react'

const PlantCare = () => {
  const { user } = useAuth()
  const { currentPlant, fetchPlants } = usePlant()
  const [isWatering, setIsWatering] = useState(false)
  const [isFertilizing, setIsFertilizing] = useState(false)
  const [isPurchasingWater, setIsPurchasingWater] = useState(false)
  const [waterAmount, setWaterAmount] = useState(1)
  const [showWaterPurchase, setShowWaterPurchase] = useState(false)
  const [userProfile, setUserProfile] = useState(null)

  useEffect(() => {
    if (user) {
      setUserProfile(user)
    }
  }, [user])

  const handleWater = async () => {
    if (!currentPlant || !userProfile) return
    
    // Check if user has water
    if (userProfile.water_count <= 0) {
      setShowWaterPurchase(true)
      return
    }
    
    setIsWatering(true)
    try {
      const response = await plantAPI.waterPlant(currentPlant.id, 20)
      
      // Update user profile with new water count
      if (response.data.water_remaining !== undefined) {
        setUserProfile(prev => ({
          ...prev,
          water_count: response.data.water_remaining
        }))
      }
      
      // Update plant data
      if (response.data.plant) {
        fetchPlants()
      }
      
      console.log('Plant watered successfully:', response.data)
    } catch (error) {
      console.error('Error watering plant:', error)
    } finally {
      setIsWatering(false)
    }
  }

  const handleFertilize = async () => {
    if (!currentPlant) return
    
    setIsFertilizing(true)
    try {
      const response = await plantAPI.fertilizePlant(currentPlant.id)
      fetchPlants()
      console.log('Plant fertilized successfully:', response.data)
    } catch (error) {
      console.error('Error fertilizing plant:', error)
    } finally {
      setIsFertilizing(false)
    }
  }

  const handlePurchaseWater = async () => {
    setIsPurchasingWater(true)
    try {
      const response = await paymentsAPI.purchaseWater(waterAmount)
      
      // Update user profile
      setUserProfile(prev => ({
        ...prev,
        plantpal_leaves: response.data.remaining_leaves,
        water_count: response.data.total_water
      }))
      
      setShowWaterPurchase(false)
      console.log('Water purchased successfully:', response.data)
    } catch (error) {
      console.error('Error purchasing water:', error)
    } finally {
      setIsPurchasingWater(false)
    }
  }

  if (!currentPlant) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">No plant found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Water Purchase Modal */}
      {showWaterPurchase && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="space-y-3">
              <p>You're out of water! Purchase more water using your leaves.</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Amount:</span>
                  <select 
                    value={waterAmount} 
                    onChange={(e) => setWaterAmount(parseInt(e.target.value))}
                    className="border rounded px-2 py-1"
                  >
                    <option value={1}>1 Water (10 leaves)</option>
                    <option value={5}>5 Water (50 leaves)</option>
                    <option value={10}>10 Water (100 leaves)</option>
                  </select>
                </div>
                <Button 
                  onClick={handlePurchaseWater}
                  disabled={isPurchasingWater}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isPurchasingWater ? 'Purchasing...' : 'Buy Water'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowWaterPurchase(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Plant Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Plant Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Health</span>
                <span className="font-semibold">{currentPlant.health_score}%</span>
              </div>
              <Progress value={currentPlant.health_score} className="h-2" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Water Level</span>
                <span className="font-semibold">{currentPlant.water_level}%</span>
              </div>
              <Progress value={currentPlant.water_level} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Care Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Care Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium">Water Plant</p>
                <p className="text-sm text-muted-foreground">
                  Available water: {userProfile?.water_count || 0}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleWater}
              disabled={isWatering || (userProfile?.water_count || 0) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isWatering ? 'Watering...' : 'Water'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Fertilize Plant</p>
                <p className="text-sm text-muted-foreground">Boost plant growth</p>
              </div>
            </div>
            <Button 
              onClick={handleFertilize}
              disabled={isFertilizing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFertilizing ? 'Fertilizing...' : 'Fertilize'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-purple-500" />
            Your Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <Leaf className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">{userProfile?.plantpal_leaves || 0}</p>
                <p className="text-sm text-muted-foreground">Leaves</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Droplets className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{userProfile?.water_count || 0}</p>
                <p className="text-sm text-muted-foreground">Water</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PlantCare 