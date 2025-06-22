import React, { useState } from "react";
import { plantAPI } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Smile, Sun, Sparkles, Calendar, Award } from "lucide-react";
// Removed date-fns import - using native Date methods instead

function BreathingExercise({ onComplete }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Breathe in...",
    "Hold...",
    "Breathe out...",
    "Hold...",
  ];
  const [cycle, setCycle] = useState(1);
  const totalCycles = 3;

  React.useEffect(() => {
    if (step < steps.length) {
      const timer = setTimeout(() => setStep(step + 1), 2000);
      return () => clearTimeout(timer);
    } else if (cycle < totalCycles) {
      setTimeout(() => {
        setStep(0);
        setCycle(cycle + 1);
      }, 1000);
    } else {
      setTimeout(onComplete, 1000);
    }
  }, [step, cycle]);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Sun className="h-10 w-10 text-yellow-400 animate-pulse" />
      <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-200 animate-bounce">
        {step < steps.length ? steps[step] : ""}
      </div>
      <div className="text-sm text-gray-500">Cycle {cycle} of {totalCycles}</div>
    </div>
  );
}

function GratitudeExercise({ onComplete }) {
  const [gratitude, setGratitude] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(onComplete, 1200);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 py-6">
      <Heart className="h-10 w-10 text-pink-400 animate-pulse" />
      <label className="text-lg font-medium text-emerald-700 dark:text-emerald-200">What are you grateful for today?</label>
      <input
        className="rounded border p-2 w-64"
        value={gratitude}
        onChange={(e) => setGratitude(e.target.value)}
        required
        disabled={submitted}
      />
      <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={submitted}>
        {submitted ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Submit"}
      </Button>
    </form>
  );
}

const DAILY_CHALLENGES = [
  "Take 3 deep breaths and smile.",
  "Write down one thing you did well today.",
  "Send a kind message to someone.",
  "Stand up and stretch for 1 minute.",
  "Look outside and notice something beautiful.",
  "Close your eyes and listen to your breath for 30 seconds.",
  "Think of a happy memory for 1 minute.",
];

function getTodayChallenge() {
  const today = new Date();
  const idx = today.getDate() % DAILY_CHALLENGES.length;
  return DAILY_CHALLENGES[idx];
}

function getMindfulStats() {
  try {
    return JSON.parse(localStorage.getItem("mindfulStats") || "{}")
  } catch {
    return {}
  }
}

function setMindfulStats(stats) {
  localStorage.setItem("mindfulStats", JSON.stringify(stats))
}

const BADGES = [
  { key: "streak_3", label: "3-Day Streak", emoji: "🌿" },
  { key: "streak_7", label: "7-Day Streak", emoji: "🌸" },
  { key: "kindness", label: "Kindness", emoji: "🤝" },
  { key: "challenge", label: "Challenge Champ", emoji: "🏆" },
];

function KindnessExercise({ onComplete }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Heart className="h-10 w-10 text-emerald-400 animate-pulse" />
      <div className="text-lg font-medium text-emerald-700 dark:text-emerald-200">Do a small act of kindness today!</div>
      <Button onClick={() => { setDone(true); setTimeout(onComplete, 1200); }} disabled={done} className="bg-emerald-500 hover:bg-emerald-600">
        {done ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "I Did It!"}
      </Button>
    </div>
  );
}

function ChallengeExercise({ onComplete }) {
  const challenge = getTodayChallenge();
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Award className="h-10 w-10 text-yellow-400 animate-pulse" />
      <div className="text-lg font-medium text-emerald-700 dark:text-emerald-200">Daily Challenge:</div>
      <div className="italic text-emerald-600 dark:text-emerald-300">{challenge}</div>
      <Button onClick={() => { setDone(true); setTimeout(onComplete, 1200); }} disabled={done} className="bg-emerald-500 hover:bg-emerald-600">
        {done ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Completed!"}
      </Button>
    </div>
  );
}

export default function MindfulnessPage() {
  const [exercise, setExercise] = useState("");
  const [rewarding, setRewarding] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [stats, setStats] = useState(getMindfulStats());
  const todayStr = new Date().toISOString().split('T')[0]; // yyyy-MM-dd format

  const handleComplete = async () => {
    setRewarding(true);
    try {
      await plantAPI.rewardMindfulness(exercise);
      // Update streaks and badges
      const last = stats.lastCompleted;
      let streak = stats.streak || 0;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (last && last === yesterday) {
        streak += 1;
      } else if (last && last === todayStr) {
        // already completed today
      } else {
        streak = 1;
      }
      const completed = { ...(stats.completed || {}), [todayStr]: exercise };
      let badges = stats.badges || [];
      if (streak === 3 && !badges.includes("streak_3")) badges.push("streak_3");
      if (streak === 7 && !badges.includes("streak_7")) badges.push("streak_7");
      if (exercise === "kindness" && !badges.includes("kindness")) badges.push("kindness");
      if (exercise === "challenge" && !badges.includes("challenge")) badges.push("challenge");
      const newStats = { lastCompleted: todayStr, streak, badges, completed };
      setMindfulStats(newStats);
      setStats(newStats);
      setFeedback("Your plant feels refreshed! 🌱");
    } catch {
      setFeedback("Failed to reward your plant. Try again.");
    } finally {
      setRewarding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Smile className="h-8 w-8 text-emerald-400 animate-bounce" />
          <h1 className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-200">Mindfulness</h1>
        </div>
        {/* Streak and Badges */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500">Streak</span>
            <span className="text-2xl font-bold text-emerald-600">{stats.streak || 0}</span>
          </div>
          <div className="flex gap-2 items-center">
            {BADGES.filter(b => (stats.badges || []).includes(b.key)).map(badge => (
              <span key={badge.key} className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-800 rounded px-2 py-1 text-base">
                <span>{badge.emoji}</span>
                <span>{badge.label}</span>
              </span>
            ))}
          </div>
        </div>
        <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/40 dark:to-green-950/40 border-emerald-200 dark:border-emerald-800 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-400" />
              Mindfulness Exercises
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedback ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <Smile className="h-10 w-10 text-emerald-400 animate-bounce" />
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-200">{feedback}</div>
                <Button onClick={() => { setExercise(""); setFeedback(""); }} className="mt-4">Do Another</Button>
              </div>
            ) : rewarding ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              </div>
            ) : exercise === "breathing" ? (
              <BreathingExercise onComplete={handleComplete} />
            ) : exercise === "gratitude" ? (
              <GratitudeExercise onComplete={handleComplete} />
            ) : exercise === "kindness" ? (
              <KindnessExercise onComplete={handleComplete} />
            ) : exercise === "challenge" ? (
              <ChallengeExercise onComplete={handleComplete} />
            ) : (
              <div className="flex flex-col gap-4 py-8 items-center">
                <Button className="w-full bg-blue-400 hover:bg-blue-500" onClick={() => setExercise("breathing")}>🌬️ Breathing Exercise</Button>
                <Button className="w-full bg-pink-400 hover:bg-pink-500" onClick={() => setExercise("gratitude")}>💖 Gratitude Exercise</Button>
                <Button className="w-full bg-yellow-400 hover:bg-yellow-500" onClick={() => setExercise("challenge")}>🏆 Daily Challenge</Button>
                <Button className="w-full bg-emerald-400 hover:bg-emerald-500" onClick={() => setExercise("kindness")}>🤝 Kindness Act</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 