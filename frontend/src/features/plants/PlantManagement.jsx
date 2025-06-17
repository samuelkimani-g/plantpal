"use client"

import { useState } from "react"
import { usePlant } from "../../context/PlantContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Leaf, Plus, Edit, Trash2, Save, X, AlertCircle, Loader2, Droplets, Music, Calendar } from "lucide-react"
import { formatDate } from "../../lib/utils"

const PLANT_SPECIES = [
  { value: "succulent", label: "🌵 Succulent", description: "Hardy and resilient" },
  { value: "fern", label: "🌿 Fern", description: "Loves gentle care" },
  { value: "flowering", label: "🌸 Flowering Plant", description: "Blooms with positivity" },
  { value: "tree", label: "🌳 Tree", description: "Grows strong with time" },
  { value: "herb", label: "🌱 Herb", description: "Practical and nurturing" },
  { value: "vine", label: "🍃 Vine", description: "Spreads joy and connection" },
]

const HEALTH_STATUS_CONFIG = {
  excellent: { color: "bg-green-500", text: "text-green-700", emoji: "💚" },
  good: { color: "bg-blue-500", text: "text-blue-700", emoji: "💙" },
  fair: { color: "bg-yellow-500", text: "text-yellow-700", emoji: "💛" },
  poor: { color: "bg-orange-500", text: "text-orange-700", emoji: "🧡" },
  critical: { color: "bg-red-500", text: "text-red-700", emoji: "❤️" },
}

export default function PlantManagement() {
  const { plants, createPlant, updatePlant, deletePlant, isLoading, error, clearError } = usePlant()
  const [isCreating, setIsCreating] = useState(false)
  const [editingPlant, setEditingPlant] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    description: "",
  })
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const resetForm = () => {
    setFormData({ name: "", species: "", description: "" })
    setIsCreating(false)
    setEditingPlant(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.species) {
      return
    }

    const plantData = {
      name: formData.name.trim(),
      species: formData.species,
      description: formData.description.trim() || "",
    }

    let result
    if (editingPlant) {
      result = await updatePlant(editingPlant.id, plantData)
    } else {
      result = await createPlant(plantData)
    }

    if (result.success) {
      resetForm()
    }
  }

  const handleEdit = (plant) => {
    setFormData({
      name: plant.name,
      species: plant.species,
      description: plant.description || "",
    })
    setEditingPlant(plant)
    setIsCreating(false)
  }

  const handleDelete = async (plantId) => {
    const result = await deletePlant(plantId)
    if (result.success) {
      setDeleteConfirm(null)
    }
  }

  const startCreating = () => {
    resetForm()
    setIsCreating(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-emerald-600">Loading your plants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-gray-900 dark:to-emerald-950 p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-emerald-800 dark:text-emerald-200 mb-2 flex items-center justify-center gap-3">
            <Leaf className="h-8 w-8" />
            Plant Management
          </h1>
          <p className="text-emerald-600 dark:text-emerald-400">Create, edit, and care for your virtual plants</p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        )}

        {/* Create/Edit Form */}
        {(isCreating || editingPlant) && (
          <Card className="mb-8 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {editingPlant ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                {editingPlant ? "Edit Plant" : "Create New Plant"}
              </CardTitle>
              <CardDescription>
                {editingPlant ? "Update your plant's details" : "Add a new plant to your collection"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Plant Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Give your plant a name..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="species">Species</Label>
                    <Select
                      value={formData.species}
                      onValueChange={(value) => setFormData({ ...formData, species: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose species..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANT_SPECIES.map((species) => (
                          <SelectItem key={species.value} value={species.value}>
                            <div className="flex flex-col">
                              <span>{species.label}</span>
                              <span className="text-xs text-muted-foreground">{species.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your plant's personality..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600">
                    <Save className="h-4 w-4 mr-2" />
                    {editingPlant ? "Update Plant" : "Create Plant"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Plants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Add Plant Card */}
          {!isCreating && !editingPlant && (
            <Card
              className="border-dashed border-2 border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-600 cursor-pointer transition-colors"
              onClick={startCreating}
            >
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Plus className="h-12 w-12 text-emerald-400 mb-4" />
                <h3 className="font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Add New Plant</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Create a new virtual plant</p>
              </CardContent>
            </Card>
          )}

          {/* Plant Cards */}
          {plants.map((plant) => {
            const healthConfig = HEALTH_STATUS_CONFIG[plant.health_status] || HEALTH_STATUS_CONFIG.fair
            const speciesInfo = PLANT_SPECIES.find((s) => s.value === plant.species)

            return (
              <Card key={plant.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-2xl">{speciesInfo?.label.split(" ")[0] || "🌱"}</span>
                        {plant.name}
                      </CardTitle>
                      <CardDescription className="capitalize">{plant.species}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plant)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(plant.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Plant Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Growth Level</span>
                      <Badge variant="secondary">Level {plant.growth_level}</Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Health</span>
                      <Badge className={`${healthConfig.color} text-white`}>
                        {healthConfig.emoji} {plant.health_status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />
                        <span>Last watered:</span>
                      </div>
                      <div>{plant.last_watered ? formatDate(plant.last_watered) : "Never"}</div>

                      <div className="flex items-center gap-1">
                        <Music className="h-3 w-3" />
                        <span>Music minutes:</span>
                      </div>
                      <div>{plant.total_music_minutes || 0}</div>

                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Created:</span>
                      </div>
                      <div>{formatDate(plant.date_added)}</div>
                    </div>
                  </div>

                  {/* Description */}
                  {plant.description && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm italic text-gray-600 dark:text-gray-400">"{plant.description}"</p>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Droplets className="h-3 w-3 mr-1" />
                      Water
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Music className="h-3 w-3 mr-1" />
                      Music
                    </Button>
                  </div>
                </CardContent>

                {/* Delete Confirmation */}
                {deleteConfirm === plant.id && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-sm">
                      <h4 className="font-semibold mb-2">Delete {plant.name}?</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        This action cannot be undone. All plant data will be lost.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(plant.id)}>
                          Delete
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>

        {/* Empty State */}
        {plants.length === 0 && !isCreating && (
          <div className="text-center py-12">
            <Leaf className="h-16 w-16 text-emerald-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2">No plants yet</h3>
            <p className="text-emerald-600 dark:text-emerald-400 mb-6">
              Create your first virtual plant to start your growth journey
            </p>
            <Button onClick={startCreating} className="bg-emerald-500 hover:bg-emerald-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Plant
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
