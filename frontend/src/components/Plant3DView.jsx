"use client"

import { Suspense, useState, useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, Text, Html } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import Plant3D from "./Plant3D"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Droplets, Heart, Sparkles, Loader2, RotateCcw } from "lucide-react"

function getCustomization() {
  try {
    return JSON.parse(localStorage.getItem("plantCustomization") || "{}")
  } catch {
    return {}
  }
}

const Plant3DView = ({ plantData, isOwner = false, onWaterPlant, onFertilizePlant, isLoading = false, compactMode = false }) => {
  const [isWatering, setIsWatering] = useState(false)
  const [cameraPosition, setCameraPosition] = useState([2, 2, 2])
  const controlsRef = useRef()
  const canvasRef = useRef()
  const customization = { ...getCustomization(), ...(plantData?.fantasy_params || {}) }

  // Cleanup WebGL context on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2')
        if (gl) {
          const loseContext = gl.getExtension('WEBGL_lose_context')
          if (loseContext) {
            loseContext.loseContext()
          }
        }
      }
    }
  }, [])

  const handleWaterPlant = async () => {
    if (isWatering || !onWaterPlant) return

    setIsWatering(true)
    try {
      await onWaterPlant()
    } catch (error) {
      console.error("Error watering plant:", error)
    }
  }

  const handleWaterComplete = () => {
    setIsWatering(false)
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  const getMoodColor = (mood) => {
    switch (mood) {
      case "happy":
        return "text-green-500"
      case "sad":
        return "text-blue-500"
      case "energetic":
        return "text-yellow-500"
      case "calm":
        return "text-purple-500"
      default:
        return "text-gray-500"
    }
  }

  const getMoodEmoji = (mood) => {
    switch (mood) {
      case "happy":
        return "😊"
      case "sad":
        return "😔"
      case "energetic":
        return "⚡"
      case "calm":
        return "😌"
      default:
        return "😐"
    }
  }

  if (isLoading) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-emerald-500" />
          <p className="text-muted-foreground">Loading your plant...</p>
        </div>
      </Card>
    )
  }

  if (!plantData) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌱</div>
          <p className="text-muted-foreground">No plant data available</p>
        </div>
      </Card>
    )
  }

  // Compact mode for dashboard - shows simplified view without 3D Canvas
  if (compactMode) {
    return (
      <div className="space-y-4">
        <Card className="w-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">{plantData.name || "My Plant"}</h3>
                <p className="text-sm text-muted-foreground capitalize">{plantData.species || "Unknown"}</p>
              </div>
              <div className="text-4xl">{getMoodEmoji(plantData.current_mood_influence)}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Health</p>
                <Progress value={plantData.health_score || 50} className="mt-1 h-2" />
                <p className="text-xs text-right mt-1">{plantData.health_score || 50}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Water</p>
                <Progress value={plantData.water_level || 50} className="mt-1 h-2" />
                <p className="text-xs text-right mt-1">{plantData.water_level || 50}%</p>
              </div>
            </div>

            {isOwner && (
              <div className="flex gap-2">
                <Button onClick={handleWaterPlant} disabled={isWatering} size="sm" className="bg-blue-500 hover:bg-blue-600">
                  {isWatering ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Droplets className="h-3 w-3 mr-1" />
                  )}
                  {isWatering ? "Watering..." : "Water"}
                </Button>
                <Button
                  onClick={onFertilizePlant}
                  variant="outline"
                  size="sm"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Fertilize
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Title above plant */}
      {customization.title && customization.title !== "none" && (
        <div className="text-center text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-2">
          {customization.title === "mindful_gardener" ? "🌱 Mindful Gardener" : customization.title}
        </div>
      )}
      {/* Plant Stats - Fixed alignment */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col h-full justify-between">
              <p className="text-sm text-muted-foreground mb-2">Level</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-emerald-600">{plantData.growth_stage || 1}/10</p>
                <Sparkles className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col h-full justify-between">
              <p className="text-sm text-muted-foreground mb-2">Health</p>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-2xl font-bold text-green-600">{plantData.health_score || 50}%</p>
                  <Heart className="h-6 w-6 text-red-500" />
                </div>
                <Progress value={plantData.health_score || 50} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col h-full justify-between">
              <p className="text-sm text-muted-foreground mb-2">Water</p>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-2xl font-bold text-blue-600">{plantData.water_level || 50}%</p>
                  <Droplets className="h-6 w-6 text-blue-500" />
                </div>
                <Progress value={plantData.water_level || 50} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col h-full justify-between">
              <p className="text-sm text-muted-foreground mb-2">Mood</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl">{getMoodEmoji(plantData.current_mood_influence)}</span>
                <Badge variant="secondary" className={getMoodColor(plantData.current_mood_influence)}>
                  {plantData.current_mood_influence || "neutral"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Plant Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">🌱 {plantData.name || "My Plant"}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetCamera}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset View
              </Button>
              {isOwner && (
                <>
                  <Button onClick={handleWaterPlant} disabled={isWatering} className="bg-blue-500 hover:bg-blue-600">
                    {isWatering ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Droplets className="h-4 w-4 mr-2" />
                    )}
                    {isWatering ? "Watering..." : "Water Plant"}
                  </Button>
                  <Button
                    onClick={onFertilizePlant}
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-50"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Fertilize
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full bg-gradient-to-b from-sky-100 to-green-100 dark:from-sky-900 dark:to-green-900 rounded-lg overflow-hidden relative">
            {/* Accessory overlay */}
            {customization.accessory === "butterfly" && (
              <div className="absolute left-8 top-8 text-4xl pointer-events-none select-none animate-bounce-slow">🦋</div>
            )}
            <Canvas camera={{ position: cameraPosition, fov: 50 }} shadows ref={canvasRef}>
              <Suspense
                fallback={
                  <Html center>
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                      <p className="text-sm text-muted-foreground mt-2">Rendering plant...</p>
                    </div>
                  </Html>
                }
              >
                {/* Lighting */}
                <ambientLight intensity={0.6} />
                <directionalLight
                  position={[5, 5, 5]}
                  intensity={0.8}
                  castShadow
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                />
                <pointLight position={[-5, 5, -5]} intensity={0.3} />

                {/* Environment */}
                <Environment preset="park" />

                {/* Plant */}
                <Plant3D plantData={plantData} isWatering={isWatering} onWaterComplete={handleWaterComplete} customization={customization} />

                {/* Ground - improved 3D grass */}
                <group position={[0, -0.5, 0]}>
                  {/* Main ground - bumpy mesh */}
                  <mesh receiveShadow castShadow>
                    <sphereGeometry args={[5, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshLambertMaterial color="#7ec850" />
                  </mesh>
                  {/* Simple grass blades */}
                  {[...Array(30)].map((_, i) => (
                    <mesh
                      key={i}
                      position={[
                        Math.cos((i / 30) * Math.PI * 2) * (2.5 + Math.random() * 1.5),
                        0.05 + Math.random() * 0.1,
                        Math.sin((i / 30) * Math.PI * 2) * (2.5 + Math.random() * 1.5),
                      ]}
                      rotation={[0, Math.random() * Math.PI * 2, 0]}
                      scale={[0.1 + Math.random() * 0.2, 0.5 + Math.random() * 0.5, 0.1]}
                    >
                      <cylinderGeometry args={[0.01, 0.02, 0.4, 6]} />
                      <meshLambertMaterial color="#4caf50" />
                    </mesh>
                  ))}
                </group>

                {/* Plant name floating text */}
                <Text position={[0, 2, 0]} fontSize={0.3} color="#2D5016" anchorX="center" anchorY="middle">
                  {plantData.name || "My Plant"}
                </Text>

                {/* Controls */}
                <OrbitControls
                  ref={controlsRef}
                  enablePan={true}
                  enableZoom={true}
                  enableRotate={true}
                  minDistance={1}
                  maxDistance={8}
                  maxPolarAngle={Math.PI / 2}
                />

                {/* Post-processing effects */}
                <EffectComposer>
                  <Bloom
                    intensity={plantData.three_d_model_params?.glow_intensity || 0}
                    luminanceThreshold={0.9}
                    luminanceSmoothing={0.025}
                  />
                </EffectComposer>
              </Suspense>
            </Canvas>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>🖱️ Click and drag to rotate • 🔍 Scroll to zoom • 🖱️ Right-click and drag to pan</p>
          </div>
        </CardContent>
      </Card>

      {/* Plant Details */}
      <Card>
        <CardHeader>
          <CardTitle>Plant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Basic Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Species:</span>
                  <span>{plantData.species || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>
                    {plantData.created_at
                      ? Math.floor((Date.now() - new Date(plantData.created_at)) / (1000 * 60 * 60 * 24))
                      : 0}{" "}
                    days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Watered:</span>
                  <span>
                    {plantData.last_watered_at ? new Date(plantData.last_watered_at).toLocaleDateString() : "Never"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">3D Parameters</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trunk Height:</span>
                  <span>{(plantData.three_d_model_params?.trunk_height || 0.5).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leaf Count:</span>
                  <span>{plantData.three_d_model_params?.leaf_count || 8}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Canopy Width:</span>
                  <span>{(plantData.three_d_model_params?.canopy_width || 1.0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Has Flowers:</span>
                  <span>{plantData.three_d_model_params?.flower_presence ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Plant3DView
