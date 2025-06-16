"use client"

import React, { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus } from "lucide-react"
import { usePlant } from "../../context/PlantContext" // Corrected path
import { useAuth } from "../../context/AuthContext" // Corrected path
import { useToast } from "@/hooks/use-toast"

const CreatePlantForm = () => {
  const { user } = useAuth()
  const { createNewPlant, loading: plantLoadingContext } = usePlant()
  const [plantName, setPlantName] = useState("")
  const [species, setSpecies] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!plantName.trim()) {
      toast({
        title: "Plant name required",
        description: "Please give your plant a name.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await createNewPlant(plantName, species || "Default Species") // Use default if species is empty
      setPlantName("")
      setSpecies("")
      toast({
        title: "Plant Created!",
        description: "Your new plant is ready to grow.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error creating plant:", error)
      toast({
        title: "Plant Creation Failed",
        description: error.response?.data?.detail || "Could not create plant.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add a New Plant</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="plantName">Plant Name</Label>
            <Input
              id="plantName"
              name="plantName"
              type="text"
              value={plantName}
              onChange={(e) => setPlantName(e.target.value)}
              required
              disabled={loading || plantLoadingContext}
            />
          </div>
          <div>
            <Label htmlFor="species">Species (Optional)</Label>
            <Input
              id="species"
              name="species"
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              disabled={loading || plantLoadingContext}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || plantLoadingContext}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Plant
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default CreatePlantForm;
