import React, { useEffect, useState, useRef } from "react";
import { plantAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Droplets, Leaf, Loader2, Search, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

function getSupportNotes() {
  try {
    return JSON.parse(localStorage.getItem("supportNotes") || "{}")
  } catch {
    return {}
  }
}

function setSupportNotes(notes) {
  localStorage.setItem("supportNotes", JSON.stringify(notes))
}

function PlantCard({ plant, isOwn, onWater, watering, onProfile, onLeaveNote, recentNotes }) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-950/40 border-emerald-200 dark:border-emerald-800 shadow-lg hover:scale-[1.02] transition-transform">
      <div className="absolute -top-8 -right-8 opacity-20 pointer-events-none select-none">
        <Leaf className="w-32 h-32 text-emerald-300 dark:text-emerald-700 animate-spin-slow" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-200">{plant.username || "User"}</span>
        </div>
        <Badge className="capitalize bg-emerald-500 text-white">{plant.species}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-emerald-700 dark:text-emerald-100">{plant.name}</span>
          <span className="text-xs text-gray-500">Lv. {plant.growth_level || plant.growth_stage || 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500">Health: {plant.health_score || plant.health || 80}%</Badge>
          <Badge className="bg-cyan-600">Water: {plant.water_level || 50}%</Badge>
          <Badge className="bg-purple-600 capitalize">{plant.current_mood_influence || "neutral"}</Badge>
        </div>
        <Progress value={plant.health_score || plant.health || 80} className="h-2 mt-2" />
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="flex-1" onClick={onProfile}>
            View Profile
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={onLeaveNote}
            disabled={isOwn || watering}
          >
            {watering ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Droplets className="h-4 w-4 mr-2" />}
            {watering ? "Watering..." : isOwn ? "Your Plant" : "Water & Cheer"}
          </Button>
        </div>
        {/* Recent notes/emojis */}
        {recentNotes && recentNotes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1 text-sm">
            {recentNotes.slice(-3).map((note, i) => (
              <span key={i} className="bg-emerald-100 dark:bg-emerald-800 rounded px-2 py-1">
                {note}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicGarden() {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wateringId, setWateringId] = useState(null);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [notePlant, setNotePlant] = useState(null);
  const noteInputRef = useRef();
  const [noteValue, setNoteValue] = useState("");
  const [supportNotes, setSupportNotesState] = useState(getSupportNotes());

  useEffect(() => {
    setLoading(true);
    plantAPI
      .getPublicGarden()
      .then((res) => {
        setPlants(res.data || []);
        setError("");
      })
      .catch((err) => {
        setError("Failed to load public garden.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleWater = async (plant) => {
    setWateringId(plant.userId || plant.user_id);
    try {
      await plantAPI.waterOtherPlant(plant.userId || plant.user_id);
      // Optionally, refresh plant data
      setPlants((prev) =>
        prev.map((p) =>
          (p.userId || p.user_id) === (plant.userId || plant.user_id)
            ? { ...p, water_level: Math.min(100, (p.water_level || 50) + 10) }
            : p
        )
      );
    } catch (e) {
      setError("Failed to water plant.");
    } finally {
      setWateringId(null);
    }
  };

  const handleLeaveNote = (plant) => {
    setNotePlant(plant);
    setNoteValue("");
    setShowNoteModal(true);
  };

  const handleSubmitNote = async () => {
    setShowNoteModal(false);
    setWateringId(notePlant.userId || notePlant.user_id);
    try {
      await plantAPI.waterOtherPlant(notePlant.userId || notePlant.user_id);
      // Save note
      const id = notePlant.userId || notePlant.user_id;
      const updated = { ...supportNotes, [id]: [...(supportNotes[id] || []), noteValue || "💧"] };
      setSupportNotes(updated);
      setSupportNotesState(updated);
      // Optionally, refresh plant data
      setPlants((prev) =>
        prev.map((p) =>
          (p.userId || p.user_id) === id
            ? { ...p, water_level: Math.min(100, (p.water_level || 50) + 10) }
            : p
        )
      );
    } catch (e) {
      setError("Failed to water plant.");
    } finally {
      setWateringId(null);
      setNotePlant(null);
      setNoteValue("");
    }
  };

  const filteredPlants = plants.filter(
    (p) =>
      (!search ||
        (p.username && p.username.toLowerCase().includes(search.toLowerCase())) ||
        (p.species && p.species.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <Leaf className="h-8 w-8 text-emerald-400 animate-bounce" /> Public Garden
          </h1>
          <div className="flex items-center gap-2 bg-white dark:bg-emerald-950 rounded-lg px-3 py-2 shadow">
            <Search className="h-4 w-4 text-emerald-400" />
            <input
              type="text"
              placeholder="Search by user or species..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-emerald-900 dark:text-emerald-100 placeholder:text-emerald-400"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-semibold py-8">{error}</div>
        ) : filteredPlants.length === 0 ? (
          <div className="text-center text-emerald-700 dark:text-emerald-200 py-8">
            No plants found. Try a different search!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPlants.map((plant) => (
              <PlantCard
                key={plant.userId || plant.user_id}
                plant={plant}
                isOwn={user && (plant.userId === user.id || plant.user_id === user.id)}
                watering={wateringId === (plant.userId || plant.user_id)}
                onWater={() => handleWater(plant)}
                onProfile={() => navigate(`/profile/${plant.userId || plant.user_id}`)}
                onLeaveNote={() => handleLeaveNote(plant)}
                recentNotes={supportNotes[plant.userId || plant.user_id] || []}
              />
            ))}
          </div>
        )}
        {/* Supportive Note Modal */}
        {showNoteModal && notePlant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-sm w-full text-center">
              <h2 className="text-xl font-bold mb-2 text-emerald-700 dark:text-emerald-300">Send Support</h2>
              <p className="mb-4 text-emerald-600 dark:text-emerald-200">Leave a supportive note or emoji for {notePlant.name}!</p>
              <input
                ref={noteInputRef}
                type="text"
                maxLength={32}
                value={noteValue}
                onChange={e => setNoteValue(e.target.value)}
                placeholder="e.g. Keep growing! 🌱"
                className="w-full px-3 py-2 rounded border border-emerald-300 mb-4"
              />
              <div className="flex gap-2 justify-center mb-4">
                {["💧","🌱","🌞","💚","🦋","🌸","🌈","✨"].map((emoji) => (
                  <button key={emoji} onClick={() => setNoteValue(emoji)} className="text-2xl hover:scale-125 transition-transform">
                    {emoji}
                  </button>
                ))}
              </div>
              <Button onClick={handleSubmitNote} className="bg-emerald-500 hover:bg-emerald-600 w-full">Send</Button>
              <Button onClick={() => setShowNoteModal(false)} variant="outline" className="w-full mt-2">Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 