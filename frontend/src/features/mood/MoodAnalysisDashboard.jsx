import React, { useEffect, useState } from 'react';
import { moodAPI, musicAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, Smile, Meh, Frown, Music, Brain, BarChart3, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar } from 'recharts';

const moodColorMap = {
    euphoric: '#10b981',
    happy: '#34d399',
    upbeat: '#6ee7b7',
    calm: '#93c5fd',
    neutral: '#d1d5db',
    melancholy: '#a78bfa',
    sad: '#f87171',
    low: '#ef4444',
    very_low: '#dc2626',
};

const musicMoodColorMap = {
    happy: '#10b981',
    energetic: '#f59e0b',
    calm: '#3b82f6',
    sad: '#ef4444',
    neutral: '#6b7280',
    euphoric: '#8b5cf6',
    upbeat: '#06b6d4',
    melancholy: '#f97316',
    low: '#dc2626',
};

export default function MoodAnalysisDashboard() {
    const [journalData, setJournalData] = useState(null);
    const [musicData, setMusicData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const [journalResponse, musicResponse] = await Promise.allSettled([
                    moodAPI.getAnalytics(),
                    musicAPI.getMoodAnalysis(7)
                ]);

                if (journalResponse.status === 'fulfilled') {
                    setJournalData(journalResponse.value.data);
                }

                if (musicResponse.status === 'fulfilled') {
                    setMusicData(musicResponse.value.data);
                }

                setLoading(false);
            } catch (err) {
                setError('Failed to load analytics data. This is a premium feature.');
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your mood analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 font-semibold py-8">{error}</div>;
    }

    const formatJournalTimeSeries = journalData?.time_series?.map(item => ({
        ...item,
        day: new Date(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })) || [];

    const formatMusicTimeSeries = musicData?.time_series?.map(item => ({
        ...item,
        day: new Date(item.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        music_score: item.avg_score || item.mood_score || 0.5,
    })) || [];

    const journalAvgScore = journalData?.overall_average_score || 0.5;
    const musicAvgScore = musicData?.overall_mood_score || musicData?.overall_mood || 0.5;
    
    const journalMoodLabel = journalAvgScore > 0.6 ? "Positive" : journalAvgScore < 0.4 ? "Negative" : "Neutral";
    const JournalIcon = journalMoodLabel === "Positive" ? Smile : journalMoodLabel === "Negative" ? Frown : Meh;

    const musicMoodLabel = musicAvgScore > 0.6 ? "Positive" : musicAvgScore < 0.4 ? "Negative" : "Neutral";
    const MusicIcon = musicMoodLabel === "Positive" ? Smile : musicMoodLabel === "Negative" ? Frown : Meh;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {entry.value?.toFixed(2) || 'N/A'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-6 space-y-8">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                    Comprehensive Mood Analytics
                </h1>
                <p className="text-gray-600 mt-2">Track your emotional journey across journaling and music</p>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-emerald-700">
                            <Brain className="h-5 w-5" />
                            <span className="text-sm">Journal Entries</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-emerald-800">{journalData?.total_entries || 0}</p>
                        <p className="text-sm text-emerald-600">Last 30 days</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <Music className="h-5 w-5" />
                            <span className="text-sm">Music Sessions</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-800">{musicData?.mood_breakdown?.total_sessions || 0}</p>
                        <p className="text-sm text-blue-600">Last 7 days</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-purple-700">
                            <JournalIcon className="h-5 w-5" />
                            <span className="text-sm">Journal Mood</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-purple-800">{journalMoodLabel}</p>
                        <p className="text-sm text-purple-600">{(journalAvgScore * 100).toFixed(0)}% score</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-orange-700">
                            <MusicIcon className="h-5 w-5" />
                            <span className="text-sm">Music Mood</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-orange-800">{musicMoodLabel}</p>
                        <p className="text-sm text-orange-600">{(musicAvgScore * 100).toFixed(0)}% score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Combined Mood Timeline */}
            {/* <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-800">
                        <TrendingUp className="h-6 w-6 text-emerald-600" />
                        <span>Mood Timeline Comparison</span>
                    </CardTitle>
                </CardHeader>
                <CardContent style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formatJournalTimeSeries}>
                            <defs>
                                <linearGradient id="journalGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                                </linearGradient>
                                <linearGradient id="musicGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="day" 
                                stroke="#6b7280"
                                fontSize={12}
                            />
                            <YAxis 
                                domain={[0, 1]} 
                                stroke="#6b7280"
                                fontSize={12}
                                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area 
                                type="monotone" 
                                dataKey="avg_score" 
                                name="Journal Mood" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                fill="url(#journalGradient)"
                                fillOpacity={0.6}
                            />
                            {formatMusicTimeSeries.length > 0 && (
                                <Area 
                                    type="monotone" 
                                    dataKey="music_score" 
                                    name="Music Mood" 
                                    stroke="#3b82f6" 
                                    strokeWidth={3}
                                    fill="url(#musicGradient)"
                                    fillOpacity={0.6}
                                />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card> */}

            {/* Journal Mood Distribution */}
            {journalData?.mood_distribution && (
                <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-800">
                            <BarChart3 className="h-6 w-6" />
                            <span>Journal Mood Distribution</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={journalData.mood_distribution} 
                                    dataKey="count" 
                                    nameKey="mood_type" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={120}
                                    innerRadius={60}
                                    label={({ mood_type, count, percent }) => 
                                        `${mood_type}: ${count} (${(percent * 100).toFixed(0)}%)`
                                    }
                                    labelLine={false}
                                >
                                    {journalData.mood_distribution.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={moodColorMap[entry.mood_type] || '#cccccc'} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Music Mood Distribution */}
            {/* {musicData?.top_moods && (
                <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                            <Activity className="h-6 w-6" />
                            <span>Music Mood Distribution</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={musicData.top_moods} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis type="number" domain={[0, 100]} stroke="#6b7280" />
                                <YAxis 
                                    type="category" 
                                    dataKey="mood" 
                                    stroke="#6b7280"
                                    width={80}
                                    tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar 
                                    dataKey="percentage" 
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                >
                                    {musicData.top_moods.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={musicMoodColorMap[entry.mood] || '#6b7280'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )} */}

            {/* Music Listening Stats */}
            {/* {musicData?.mood_breakdown && (
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-800">
                            <Music className="h-6 w-6" />
                            <span>Music Listening Insights</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-6 bg-purple-100 rounded-xl">
                                <div className="text-3xl font-bold text-purple-800">
                                    {musicData.mood_breakdown.total_sessions || 0}
                                </div>
                                <div className="text-sm text-purple-600 mt-1">Listening Sessions</div>
                            </div>
                            <div className="text-center p-6 bg-blue-100 rounded-xl">
                                <div className="text-3xl font-bold text-blue-800">
                                    {Math.round((musicData.mood_breakdown.total_listening_minutes || 0) / 60)}h
                                </div>
                                <div className="text-sm text-blue-600 mt-1">Total Listening Time</div>
                            </div>
                            <div className="text-center p-6 bg-emerald-100 rounded-xl">
                                <div className="text-3xl font-bold text-emerald-800">
                                    {musicData.mood_breakdown.avg_session_length ? 
                                        Math.round(musicData.mood_breakdown.avg_session_length / 60) : 0}m
                                </div>
                                <div className="text-sm text-emerald-600 mt-1">Avg Session Length</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )} */}
        </div>
    );
} 