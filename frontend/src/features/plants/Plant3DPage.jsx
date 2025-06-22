"use client"

import { useState, useEffect, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CuboidIcon as Cube, Droplets, Music, Users, Loader2, Search } from "lucide-react"
import { usePlant } from "../../context/PlantContext"
import { useAuth } from "../../context/AuthContext"
import { plantAPI } from "../../services/api"
import Plant3DView from "../../components/Plant3DView"

// Simple 3D Plant Component
function Plant3D({ plantData }) {
  const params = plantData?.three_d_model_params || {}

  const trunkHeight = params.trunk_height || 0.5
  const trunkRadius = params.trunk_radius || 0.05
  const canopySize = params.canopy_size || 0.6
  const colorHue = params.color_hue || 0.25
  const healthFactor = params.health_factor || 0.8

  return (
    <group>
      {/* Trunk */}
      <mesh position={[0, trunkHeight / 2, 0]}>
        <cylinderGeometry args={[trunkRadius, trunkRadius * 1.2, trunkHeight, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Canopy */}
      <mesh position={[0, trunkHeight + canopySize / 2, 0]}>
        <sphereGeometry args={[canopySize, 16, 16]} />
        <meshStandardMaterial color={`hsl(${colorHue * 360}, 70%, ${30 + healthFactor * 20}%)`} roughness={0.8} />
      </mesh>

      {/* Flowers (if healthy) */}
      {healthFactor > 0.7 && (
        <>
          <mesh position={[canopySize * 0.3, trunkHeight + canopySize * 0.8, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#FF69B4" emissive="#FF1493" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[-canopySize * 0.3, trunkHeight + canopySize * 0.6, canopySize * 0.2]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#FF69B4" emissive="#FF1493" emissiveIntensity={0.2} />
          </mesh>
        </>
      )}
    </group>
  )
}

function PlantViewer({ plantData, isOwn = true }) {
  return (
    <div className="h-96 w-full bg-gray-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={0.3} color="#4F46E5" />

          <Plant3D plantData={plantData} />

          <ContactShadows position={[0, -0.1, 0]} opacity={0.3} scale={3} blur={2} far={1} />

          <Environment preset="forest" background={false} />
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            maxPolarAngle={Math.PI / 2}
            minDistance={1}
            maxDistance={5}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default function Plant3DPage() {
  const { plants, isLoading: plantLoading, waterPlant, fertilizePlant, fetchPlants } = usePlant()
  const { user } = useAuth()
  const [plantData, setPlantData] = useState(null)
  const [otherUserPlant, setOtherUserPlant] = useState(null)
  const [searchUserId, setSearchUserId] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const currentPlant = plants[0]

  useEffect(() => {
    if (currentPlant && user) {
      // Listen to real-time updates for current user's plant
      setPlantData(currentPlant)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [currentPlant, user])

  const handleWaterPlant = async () => {
    if (currentPlant?.id) {
      try {
        await waterPlant(currentPlant.id, 20)
        await fetchPlants() // Refresh plant data after watering
      } catch (error) {
        console.error("Error watering plant:", error)
      }
    } else {
      console.error("Plant3DPage: No plant ID available - backend restart may be required")
    }
  }

  const handleFertilizePlant = async () => {
    if (currentPlant?.id) {
      try {
        await fertilizePlant(currentPlant.id)
        await fetchPlants() // Refresh plant data after fertilizing
      } catch (error) {
        console.error("Error fertilizing plant:", error)
      }
    } else {
      console.error("Plant3DPage: No plant ID available - backend restart may be required")
    }
  }

  const handleSearchUser = async () => {
    if (!searchUserId.trim()) return

    setIsSearching(true)
    try {
      const response = await plantAPI.getPublicPlant(searchUserId.trim())
      setOtherUserPlant(response.data)
    } catch (error) {
      console.error("Error fetching other user's plant:", error)
      setOtherUserPlant(null)
    } finally {
      setIsSearching(false)
    }
  }

  if (plantLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto mb-4" />
          <p className="text-emerald-300">Loading your 3D plant...</p>
        </div>
      </div>
    )
  }

  if (!currentPlant) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 text-white max-w-md">
          <CardContent className="text-center py-12">
            <Cube className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-emerald-300 mb-2">No Plant Found</h3>
            <p className="text-gray-400 mb-6">Create your plant companion first to see it in 3D</p>
            <Button onClick={() => (window.location.href = "/plants")} className="bg-emerald-600 hover:bg-emerald-700">
              Create Plant
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayPlantData = plantData || currentPlant

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-emerald-300 mb-2 flex items-center justify-center gap-3">
            <Cube className="h-8 w-8" />
            3D Plant Companion
          </h1>
          <p className="text-emerald-400">Experience your plant in immersive 3D</p>
        </div>

        <Tabs defaultValue="my-plant" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 border-gray-700">
            <TabsTrigger value="my-plant" className="data-[state=active]:bg-emerald-600">
              My Plant
            </TabsTrigger>
            <TabsTrigger value="explore" className="data-[state=active]:bg-emerald-600">
              Explore Others
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-plant" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 3D Viewer */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-300 flex items-center gap-2">
                      <Cube className="h-5 w-5" />
                      {displayPlantData.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Plant3DView plantData={displayPlantData} isOwner={true} onWaterPlant={handleWaterPlant} onFertilizePlant={handleFertilizePlant} />
                  </CardContent>
                </Card>
              </div>

              {/* Plant Stats & Controls */}
              <div className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-300">Plant Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Growth Stage</span>
                      <Badge className="bg-emerald-600">
                        Level {displayPlantData.growth_level || displayPlantData.growth_stage || 1}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Health</span>
                      <Badge className="bg-blue-600">
                        {displayPlantData.health || displayPlantData.health_score || 80}%
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Water Level</span>
                      <Badge className="bg-cyan-600">{displayPlantData.water_level || 50}%</Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Mood</span>
                      <Badge className="bg-purple-600 capitalize">
                        {displayPlantData.current_mood_influence || "neutral"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-emerald-300">Plant Care</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button onClick={handleWaterPlant} className="w-full bg-blue-600 hover:bg-blue-700">
                      <Droplets className="h-4 w-4 mr-2" />
                      Water Plant
                    </Button>

                    <Button
                      onClick={() => (window.location.href = "/music")}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Music className="h-4 w-4 mr-2" />
                      Play Music
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="explore" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-emerald-300 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Explore Other Plants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Enter user ID to view their plant..."
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    onClick={handleSearchUser}
                    disabled={isSearching}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>

                {otherUserPlant && (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-300 mb-4">
                      {otherUserPlant.name} (User: {searchUserId})
                    </h3>
                    <PlantViewer plantData={otherUserPlant} isOwn={false} />
                  </div>
                )}

                {otherUserPlant === null && searchUserId && !isSearching && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No plant found for user ID: {searchUserId}</p>
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
