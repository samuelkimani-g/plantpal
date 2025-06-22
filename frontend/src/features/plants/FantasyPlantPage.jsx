import React, { useEffect, useState } from "react";
import { plantAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Palette } from "lucide-react";
import { PLANT_SPECIES } from "./PlantManagement";
import { useAuth } from "../../context/AuthContext";

const THEMES = [
  { label: "Emerald", value: "emerald" },
  { label: "Rainbow", value: "rainbow" },
  { label: "Blue Dream", value: "blue" },
  { label: "Spiral", value: "spiral" },
  { label: "Classic", value: "classic" },
]

const POT_STYLES = [
  { value: "classic", label: "Classic Pot", emoji: "🪴" },
  { value: "modern", label: "Modern Pot", emoji: "🏺" },
  { value: "colorful", label: "Colorful Pot", emoji: "🌈" },
];

const ACCESSORIES = [
  { value: "none", label: "None" },
  { value: "butterfly", label: "Butterfly", emoji: "🦋" },
  { value: "rainbow", label: "Rainbow", emoji: "🌈" },
];

const BACKGROUNDS = [
  { value: "emerald", label: "Emerald", className: "bg-emerald-400" },
  { value: "blue", label: "Blue Dream", className: "bg-blue-400" },
  { value: "pink", label: "Pink", className: "bg-pink-400" },
  { value: "rainbow", label: "Rainbow", className: "bg-gradient-to-r from-pink-400 via-yellow-400 to-green-400" },
  { value: "white", label: "White", className: "bg-white" },
];

function getUnlockedRewards() {
  try {
    return JSON.parse(localStorage.getItem("unlockedRewards") || "[]")
  } catch {
    return []
  }
}

function getDesign() {
  try {
    return JSON.parse(localStorage.getItem("plantDesign") || "{}")
  } catch {
    return {}
  }
}

function setDesign(design) {
  localStorage.setItem("plantDesign", JSON.stringify(design))
}

function DesignPreview({ design }) {
  const pot = POT_STYLES.find(p => p.value === design.pot) || POT_STYLES[0];
  const accessory = ACCESSORIES.find(a => a.value === design.accessory) || ACCESSORIES[0];
  const bg = BACKGROUNDS.find(b => b.value === design.background) || BACKGROUNDS[0];
  const species = PLANT_SPECIES.find(s => s.value === design.species) || PLANT_SPECIES[0];
  return (
    <div className={`flex flex-col items-center gap-2 py-4 w-full`}>
      <div className={`w-28 h-28 rounded-full shadow-lg flex items-center justify-center relative ${bg.className}`}>
        <span className="absolute text-4xl left-2 top-2">{accessory.emoji || ""}</span>
        <span className="absolute text-5xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{species.label.split(" ")[0]}</span>
        <span className="absolute text-4xl right-2 bottom-2">{pot.emoji}</span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
        <span className="font-semibold">Type:</span> {species.label} <br />
        <span className="font-semibold">Pot:</span> {pot.label} <br />
        <span className="font-semibold">Accessory:</span> {accessory.label} <br />
        <span className="font-semibold">Background:</span> {bg.label}
      </div>
    </div>
  );
}

export default function FantasyPlantPage() {
  const { user } = useAuth();
  const [fantasyParams, setFantasyParams] = useState(null);
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const unlocked = getUnlockedRewards();
  const [design, setDesignState] = useState(() => getDesign() || {
    species: PLANT_SPECIES[0].value,
    pot: "classic",
    background: "emerald",
    accessory: "none",
  });

  useEffect(() => {
    setLoading(true);
    plantAPI
      .getPlants()
      .then((res) => {
        setFantasyParams(res.data.fantasy_params || {});
        setError("");
      })
      .catch(() => setError("Failed to load fantasy plant."))
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Save to backend fantasy params
      await plantAPI.updateFantasyParams({
        theme: design.background,
        pot: design.pot,
        accessory: design.accessory,
        species: design.species,
        background: design.background,
      });
      // Also update main plant
      await plantAPI.updatePlant(user?.plant_id, {
        fantasy_params: {
          theme: design.background,
          pot: design.pot,
          accessory: design.accessory,
          species: design.species,
          background: design.background,
        },
      });
      setError("");
    } catch {
      setError("Failed to update fantasy plant.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDesignChange = (type, value) => {
    const updated = { ...design, [type]: value };
    setDesignState(updated);
    setDesign(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Palette className="h-8 w-8 text-emerald-400 animate-bounce" />
          <h1 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-200">Design Studio</h1>
        </div>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-950/40 border-emerald-200 dark:border-emerald-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Customize Your Plant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DesignPreview design={design} />
            <form className="flex flex-col gap-4 mt-4">
              <label className="font-medium">Plant Type</label>
              <select
                className="rounded border p-2"
                value={design.species}
                onChange={e => handleDesignChange("species", e.target.value)}
              >
                {PLANT_SPECIES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <label className="font-medium">Pot Style</label>
              <select
                className="rounded border p-2"
                value={design.pot}
                onChange={e => handleDesignChange("pot", e.target.value)}
              >
                {POT_STYLES.map((p, idx) => (
                  <option key={p.value} value={p.value} disabled={idx > 2 && !unlocked.includes(idx)}>{p.label}</option>
                ))}
              </select>
              <label className="font-medium">Accessory</label>
              <select
                className="rounded border p-2"
                value={design.accessory}
                onChange={e => handleDesignChange("accessory", e.target.value)}
              >
                {ACCESSORIES.map((a, idx) => (
                  <option key={a.value} value={a.value} disabled={idx > 1 && !unlocked.includes(idx)}>{a.label}</option>
                ))}
              </select>
              <label className="font-medium">Background</label>
              <select
                className="rounded border p-2"
                value={design.background}
                onChange={e => handleDesignChange("background", e.target.value)}
              >
                {BACKGROUNDS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 