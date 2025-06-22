import React, { useEffect, useState } from "react";
import { plantAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MemorySeeds({ journalEntries = [] }) {
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ journal_entry: "", title: "", description: "" });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSeeds();
  }, []);

  const fetchSeeds = () => {
    setLoading(true);
    plantAPI
      .getMemorySeeds()
      .then((res) => {
        // Ensure seeds is always an array
        const seedsData = res.data || []
        setSeeds(Array.isArray(seedsData) ? seedsData : [])
        setError("");
      })
      .catch(() => {
        setError("Failed to load memory seeds.")
        setSeeds([]) // Set empty array on error
      })
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await plantAPI.createMemorySeed(form);
      setShowForm(false);
      setForm({ journal_entry: "", title: "", description: "" });
      fetchSeeds();
    } catch {
      setError("Failed to create memory seed.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="my-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
        <h2 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">Memory Seeds</h2>
        <Button size="sm" className="ml-auto" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Create Memory Seed"}
        </Button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-emerald-950 rounded-lg p-4 mb-6 shadow space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Journal Entry</label>
            <select
              className="w-full rounded border p-2"
              value={form.journal_entry}
              onChange={(e) => setForm((f) => ({ ...f, journal_entry: e.target.value }))}
              required
            >
              <option value="">Select an entry...</option>
              {Array.isArray(journalEntries) && journalEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.text.slice(0, 40)}...
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="w-full rounded border p-2"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full rounded border p-2"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Create Memory Seed"}
          </Button>
        </form>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500 font-semibold py-8">{error}</div>
      ) : seeds.length === 0 ? (
        <div className="text-center text-emerald-700 dark:text-emerald-200 py-8">
          No memory seeds yet. Create one from a special journal entry!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(seeds) && seeds.map((seed) => (
            <Card key={seed.id} className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-950/40 border-emerald-200 dark:border-emerald-800 shadow-lg">
              <CardHeader className="flex flex-row items-center gap-2 justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">{seed.title}</span>
                </CardTitle>
                <Badge className="bg-emerald-500 text-white">Memory Seed</Badge>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 dark:text-gray-200 mb-2">{seed.description}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/journal/entry/${seed.journal_entry}`)}
                  className="mt-2"
                >
                  View Journal Entry
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 