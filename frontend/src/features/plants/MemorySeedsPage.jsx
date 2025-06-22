import React, { useEffect, useState } from "react";
import { journalAPI } from "@/services/api";
import MemorySeeds from "./MemorySeeds";
import { Loader2, BookOpen } from "lucide-react";

export default function MemorySeedsPage() {
  const [journalEntries, setJournalEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    journalAPI
      .getEntries()
      .then((res) => {
        const entries = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data.results)
          ? res.data.results
          : [];
        setJournalEntries(entries);
        setError("");
      })
      .catch(() => setError("Failed to load journal entries."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <BookOpen className="h-8 w-8 text-emerald-400 animate-bounce" />
          <h1 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-200">Memory Seeds</h1>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-semibold py-8">{error}</div>
        ) : (
          <MemorySeeds journalEntries={journalEntries} />
        )}
      </div>
    </div>
  );
} 