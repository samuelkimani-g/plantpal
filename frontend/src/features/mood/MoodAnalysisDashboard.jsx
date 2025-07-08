import React, { useEffect, useState } from 'react';
import { moodAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Smile, Meh, Frown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const moodColorMap = {
    euphoric: '#4ade80',
    happy: '#86efac',
    upbeat: '#a7f3d0',
    calm: '#a5f3fc',
    neutral: '#d1d5db',
    melancholy: '#93c5fd',
    sad: '#60a5fa',
    low: '#3b82f6',
    very_low: '#2563eb',
};

export default function MoodAnalysisDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        moodAPI.getAnalytics()
            .then(response => {
                setData(response.data);
                setLoading(false);
            })
            .catch(err => {
                setError('Failed to load analytics data. This is a premium feature.');
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 font-semibold py-8">{error}</div>;
    }

    const formattedTimeSeries = data.time_series.map(item => ({
        ...item,
        day: new Date(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
    
    const avgScore = data.overall_average_score || 0.5;
    const overallMoodLabel = avgScore > 0.6 ? "Positive" : avgScore < 0.4 ? "Negative" : "Neutral";
    const OverallIcon = overallMoodLabel === "Positive" ? Smile : overallMoodLabel === "Negative" ? Frown : Meh;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Mood Analytics</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader><CardTitle>Total Entries (Last 30d)</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{data.total_entries}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Overall Mood</CardTitle></CardHeader>
                    <CardContent className="flex items-center gap-2">
                        <OverallIcon className="h-8 w-8" />
                        <p className="text-3xl font-bold">{overallMoodLabel}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Average Score</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{(data.overall_average_score || 0.5).toFixed(2)}</p></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp /> Mood Over Time</CardTitle>
                </CardHeader>
                <CardContent style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedTimeSeries}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis domain={[0, 1]} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="avg_score" name="Average Mood Score" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mood Distribution</CardTitle>
                </CardHeader>
                <CardContent style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.mood_distribution || []} dataKey="count" nameKey="mood_type" cx="50%" cy="50%" outerRadius={150} fill="#8884d8" label>
                                {(data.mood_distribution || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={moodColorMap[entry.mood_type] || '#cccccc'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
} 