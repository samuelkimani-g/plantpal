"use client"

import { useState } from "react"
import { usePlant } from "../../context/PlantContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Leaf, Sparkles, Heart, AlertCircle, Loader2 } from "lucide-react"

const PLANT_SPECIES = [
  { value: "succulent", label: "🌵 Succulent", description: "Hardy and resilient, perfect for beginners" },
  { value: "fern", label: "🌿 Fern", description: "Loves gentle care and consistent attention" },
  { value: "flowering", label: "🌸 Flowering Plant", description: "Blooms with positive emotions" },
  { value: "tree", label: "🌳 Tree", description: "Grows strong with time and patience" },
  { value: "herb", label: "🌱 Herb", description: "Practical and nurturing, grows with purpose" },
  { value: "vine", label: "🍃 Vine", description: "Spreads joy and connects with others" },
]

export default function CreatePlantForm() {
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    description: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  const { createPlant, error, clearError } = usePlant()

  const handleChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }

    // Clear plant error when user starts typing
    if (error) {
      clearError()
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = "Plant name is required"
    } else if (formData.name.length < 2) {
      errors.name = "Plant name must be at least 2 characters"
    } else if (formData.name.length > 50) {
      errors.name = "Plant name must be less than 50 characters"
    }

    if (!formData.species) {
      errors.species = "Please select a plant species"
    }

    if (formData.description && formData.description.length > 200) {
      errors.description = "Description must be less than 200 characters"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    const result = await createPlant({
      name: formData.name.trim(),
      species: formData.species,
      description: formData.description.trim() || null,
    })

    if (result.success) {
      // Form will disappear as the dashboard will re-render with the new plant
      setFormData({ name: "", species: "", description: "" })
    }

    setIsSubmitting(false)
  }

  const selectedSpecies = PLANT_SPECIES.find((species) => species.value === formData.species)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-emerald-950 dark:to-teal-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2760%27 height=%2760%27 viewBox=%270 0 60 60%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cg fill=%27none%27 fillRule=%27evenodd%27%3E%3Cg fill=%27%2334d399%27 fillOpacity=%27.03%27%3E%3Ccircle cx=%2730%27 cy=%2730%27 r=%274%27/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>

      <Card className="w-full max-w-lg relative z-10 shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-lg">
                <Leaf className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
            Create Your First Plant
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
            Your emotional journey starts here. Choose a plant that resonates with your spirit.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/50 dark:border-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Plant Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Give your plant a special name..."
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                disabled={isSubmitting}
                className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.name}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="species" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Plant Species
              </Label>
              <Select value={formData.species} onValueChange={(value) => handleChange("species", value)}>
                <SelectTrigger className="h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700">
                  <SelectValue placeholder="Choose your plant type..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-600">
                  {PLANT_SPECIES.map((species) => (
                    <SelectItem
                      key={species.value}
                      value={species.value}
                      className="dark:text-gray-200 dark:focus:bg-gray-700"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{species.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{species.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.species && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {validationErrors.species}
                </p>
              )}
              {selectedSpecies && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    {selectedSpecies.description}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Description <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell us about your plant's personality or what it means to you..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
              />
              <div className="flex justify-between items-center">
                {validationErrors.description && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                  {formData.description.length}/200 characters
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 dark:from-emerald-600 dark:to-teal-600 dark:hover:from-emerald-700 dark:hover:to-teal-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating your plant...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Create My Plant
                </>
              )}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
