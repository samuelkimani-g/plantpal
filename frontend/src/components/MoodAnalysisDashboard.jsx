import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Leaf, Loader2 } from 'lucide-react';

const COLORS = {
    "happy": '#82ca9d', // Greenish
    "energetic": '#8884d8', // Purplish
    "calm": '#a4de6c', // Light green
    "sad": '#FF8042',   // Orangeish
    "neutral": '#00C49F', // Teal
    // Add more colors if you have more moods
};

const MoodAnalysisDashboard = ({ isLoading, moodSummary }) => {
    if (isLoading && !moodSummary) {
        return (
            <Card className="col-span-full">
                <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500 mb-4" />
                    <p className="text-gray-600">Loading mood analysis...</p>
                </CardContent>
            </Card>
        );
    }

    if (!moodSummary || !moodSummary.mood_distribution || Object.keys(moodSummary.mood_distribution).length === 0) {
        return (
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle className="flex items-center text-green-700">
                        <Leaf className="h-5 w-5 mr-2" /> Mood Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center text-gray-500">
                    <p>No mood data available yet. Listen to more music to generate a mood profile for your plant!</p>
                </CardContent>
            </Card>
        );
    }

    const data = Object.entries(moodSummary.mood_distribution)
        .map(([mood, percentage]) => ({
            name: mood.charAt(0).toUpperCase() + mood.slice(1), // Capitalize
            value: parseFloat(percentage),
        }))
        .sort((a, b) => b.value - a.value); // Sort by percentage descending

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                    <Leaf className="h-5 w-5 mr-2" /> Plant Mood Analysis (Last 30 Days)
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase()] || '#CCCCCC'} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 text-center">
                    <p className="text-lg font-semibold text-gray-800">
                        Current Plant Mood: 
                        <span className="ml-2 text-2xl">
                            {getMoodEmoji(moodSummary.current_mood_label)} {moodSummary.current_mood_label}
                        </span>
                    </p>
                    <p className="text-sm text-gray-600">
                        This is the most dominant mood from your recent listening history.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

// Helper function for mood emojis
const getMoodEmoji = (moodLabel) => {
    switch (moodLabel.toLowerCase()) {
        case 'happy': return '😊';
        case 'energetic': return '⚡';
        case 'calm': return '😌';
        case 'sad': return '😢';
        case 'neutral': return '😐';
        default: return '❓';
    }
};

export default MoodAnalysisDashboard; 