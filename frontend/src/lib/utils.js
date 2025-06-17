import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function getMoodColor(mood) {
  const moodColors = {
    Positive: "bg-green-500",
    Negative: "bg-red-500",
    Neutral: "bg-gray-400",
    happy: "bg-mood-happy",
    sad: "bg-mood-sad",
    stressed: "bg-mood-stressed",
    calm: "bg-mood-calm",
    excited: "bg-mood-excited",
    anxious: "bg-mood-anxious",
  }
  return moodColors[mood] || "bg-gray-400"
}

export function getMoodEmoji(mood) {
  const moodEmojis = {
    Positive: "😊",
    Negative: "😢",
    Neutral: "😐",
    happy: "😊",
    sad: "😢",
    stressed: "😰",
    calm: "😌",
    excited: "🤩",
    anxious: "😟",
  }
  return moodEmojis[mood] || "😐"
}
