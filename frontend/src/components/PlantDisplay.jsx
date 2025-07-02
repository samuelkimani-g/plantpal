import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PlantDisplay.css';

// Map plant states/moods to image paths (using your existing images)
const PLANT_IMAGES = {
    'seedling': '/images/seedling.png',
    'neutral': '/images/neutral.png',
    'happy': '/images/happy.jpg',
    'energetic': '/images/energetic.jpg',
    'stressed': '/images/stressed.jpg',
    'sad': '/images/sad.jpg',
    'dying': '/images/dying.jpg',
    'dead': '/images/dead1.jpg',
    'revived': '/images/revival.jpg',
    'calm': '/images/neutral.png', // Use neutral for calm
    // Default fallback
    'default': '/images/neutral.png',
};

const PlantDisplay = ({ plantData }) => {
    const [currentPlantImage, setCurrentPlantImage] = useState(PLANT_IMAGES.default);
    const [fallingLeaves, setFallingLeaves] = useState([]);
    const [moodEmoji, setMoodEmoji] = useState('😐');
    const leafIntervalRef = useRef(null);

    // Function to determine the plant image based on ACTUAL mood data
    const getPlantImage = useCallback(() => {
        if (!plantData) return PLANT_IMAGES.default;

        // Prioritize critical states
        if (plantData.health_status === 'dead' || plantData.health_score <= 0) {
            return PLANT_IMAGES.dead;
        }
        
        // Check for revived state (if plant was dead but is recovering)
        if (plantData.stage === 'revived' || (plantData.health_score > 0 && plantData.health_score <= 30)) {
            return PLANT_IMAGES.revived;
        }

        // For seedling stage, always show seedling image regardless of mood
        if (plantData.stage === 'seedling' || plantData.stage === 'sprout') {
            return PLANT_IMAGES.seedling;
        }

        // Use ACTUAL mood influence from music/journal, not just health score
        const currentMood = plantData.current_mood_influence || 'neutral';
        
        // Map mood to images
        switch (currentMood) {
            case 'happy':
                return PLANT_IMAGES.happy;
            case 'energetic':
                return PLANT_IMAGES.energetic;
            case 'calm':
                return PLANT_IMAGES.calm;
            case 'sad':
                return PLANT_IMAGES.sad;
            case 'stressed':
                return PLANT_IMAGES.stressed;
            case 'dying':
                return PLANT_IMAGES.dying;
            default:
                // Fallback to health-based if no mood data
                if (plantData.health_score <= 20) {
                    return PLANT_IMAGES.dying;
                } else if (plantData.health_score <= 35) {
                    return PLANT_IMAGES.sad;
                } else if (plantData.health_score <= 50) {
                    return PLANT_IMAGES.stressed;
                } else if (plantData.health_score <= 65) {
                    return PLANT_IMAGES.neutral;
                } else if (plantData.health_score <= 85) {
                    return PLANT_IMAGES.happy;
                } else {
                    return PLANT_IMAGES.energetic;
                }
        }
    }, [plantData]);

    // Function to get mood emoji based on actual mood data
    const getMoodEmoji = useCallback(() => {
        if (!plantData) return '😐';
        
        const currentMood = plantData.current_mood_influence || 'neutral';
        const combinedMoodScore = plantData.combined_mood_score || 0.5;
        
        // Use actual mood influence first
        switch (currentMood) {
            case 'happy':
                return '😊';
            case 'energetic':
                return '⚡';
            case 'calm':
                return '😌';
            case 'sad':
                return '😔';
            case 'stressed':
                return '😰';
            case 'dying':
                return '🥀';
            default:
                // Fallback to mood score
                if (combinedMoodScore > 0.8) return '😊';
                if (combinedMoodScore > 0.6) return '😌';
                if (combinedMoodScore > 0.4) return '😐';
                if (combinedMoodScore > 0.2) return '😔';
                return '😰';
        }
    }, [plantData]);

    // Effect to update plant image when plantData changes
    useEffect(() => {
        setCurrentPlantImage(getPlantImage());
        setMoodEmoji(getMoodEmoji());
    }, [plantData, getPlantImage, getMoodEmoji]);

    // Effect for falling leaves animation - based on mood, not just health
    useEffect(() => {
        // Clear any existing interval
        if (leafIntervalRef.current) {
            clearInterval(leafIntervalRef.current);
            leafIntervalRef.current = null;
        }

        // Determine if plant should have falling leaves based on mood and health
        const shouldHaveFallingLeaves = plantData && (
            plantData.current_mood_influence === 'sad' ||
            plantData.current_mood_influence === 'stressed' ||
            plantData.current_mood_influence === 'dying' ||
            plantData.health_score <= 30 ||
            (plantData.combined_mood_score || 0.5) < 0.3
        );
        
        if (shouldHaveFallingLeaves) {
            // Start adding leaves at an interval
            leafIntervalRef.current = setInterval(() => {
                setFallingLeaves(prevLeaves => {
                    const newLeaf = {
                        id: Date.now() + Math.random(),
                        startX: Math.random() * 80 + 10,
                        duration: 3 + Math.random() * 3,
                        delay: Math.random() * 2,
                        rotation: Math.random() * 360,
                        size: 15 + Math.random() * 10,
                        colorHue: Math.random() * 40 + 20,
                    };
                    return [...prevLeaves, newLeaf];
                });
            }, 1500);

            // Clean up leaves that have fallen off screen
            const cleanupInterval = setInterval(() => {
                setFallingLeaves(prevLeaves => prevLeaves.filter(leaf => {
                    const leafAge = Date.now() - leaf.id;
                    const totalDuration = (leaf.duration + leaf.delay) * 1000;
                    return leafAge < totalDuration;
                }));
            }, 5000);

            return () => {
                clearInterval(leafIntervalRef.current);
                clearInterval(cleanupInterval);
            };
        } else {
            setFallingLeaves([]);
        }
    }, [plantData]);

    // Generate leaf emoji for falling animation
    const leafEmojis = ['🍂', '🍃', '🍁'];

    // Determine container classes based on mood
    const getContainerClasses = () => {
        const mood = plantData?.current_mood_influence || 'neutral';
        const health = plantData?.health_score || 50;
        
        let baseClasses = "plant-display-container relative w-full max-w-md mx-auto aspect-square overflow-hidden rounded-2xl shadow-xl transition-all duration-700";
        
        if (mood === 'happy' || mood === 'energetic' || health > 70) {
            return `${baseClasses} bg-gradient-to-br from-emerald-100 via-green-50 to-blue-100 border-2 border-emerald-200`;
        } else if (mood === 'calm' || (health > 40 && health <= 70)) {
            return `${baseClasses} bg-gradient-to-br from-blue-100 via-sky-50 to-indigo-100 border-2 border-blue-200`;
        } else if (mood === 'sad' || mood === 'stressed' || health <= 40) {
            return `${baseClasses} bg-gradient-to-br from-orange-100 via-red-50 to-pink-100 border-2 border-orange-200`;
        } else {
            return `${baseClasses} bg-gradient-to-br from-gray-100 via-slate-50 to-stone-100 border-2 border-gray-200`;
        }
    };

    return (
        <div className={getContainerClasses()}>
            {/* Mood Indicator */}
            <div className="absolute top-4 right-4 z-10">
                <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-white/50">
                    <div className="text-3xl animate-pulse">{moodEmoji}</div>
                </div>
            </div>

            {/* Plant Image */}
            <div className="plant-image-wrapper w-full h-full flex items-center justify-center p-6">
                <img 
                    src={currentPlantImage} 
                    alt={`${plantData?.name || 'Your Plant'} - ${plantData?.current_mood_influence || 'neutral'}`}
                    className="plant-image max-w-full max-h-full object-contain drop-shadow-2xl transition-all duration-700 ease-in-out hover:scale-105" 
                    onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = PLANT_IMAGES.default;
                        console.error(`Failed to load plant image: ${currentPlantImage}`);
                    }}
                />
            </div>

            {/* Enhanced Plant Info Overlay */}
            {plantData && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-800 text-lg">{plantData.name}</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                Lv.{plantData.level || 1}
                            </span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium capitalize">
                                {plantData.current_mood_influence || 'neutral'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Health</span>
                            <span className="text-sm font-bold text-gray-800">{plantData.health_score || 50}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                                className={`h-2 rounded-full transition-all duration-700 ${
                                    plantData.health_score > 70 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                                    plantData.health_score > 40 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                                    'bg-gradient-to-r from-red-400 to-pink-500'
                                }`}
                                style={{ width: `${Math.max(plantData.health_score || 50, 0)}%` }}
                            ></div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 font-medium">Water</span>
                            <span className="text-sm font-bold text-gray-800">{plantData.water_level || 50}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                                className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-700"
                                style={{ width: `${Math.max(plantData.water_level || 50, 0)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Falling Leaves Animation */}
            {fallingLeaves.map(leaf => (
                <div
                    key={leaf.id}
                    className="falling-leaf absolute pointer-events-none z-20"
                    style={{
                        left: `${leaf.startX}%`,
                        animationDuration: `${leaf.duration}s`,
                        animationDelay: `${leaf.delay}s`,
                        fontSize: `${leaf.size}px`,
                        transform: `rotate(${leaf.rotation}deg)`,
                        filter: `hue-rotate(${leaf.colorHue}deg) saturate(1.5)`,
                    }}
                >
                    {leafEmojis[Math.floor(Math.random() * leafEmojis.length)]}
                </div>
            ))}

            {/* Sparkle effects for happy/energetic plants */}
            {(plantData?.current_mood_influence === 'happy' || plantData?.current_mood_influence === 'energetic') && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="sparkle sparkle-1">✨</div>
                    <div className="sparkle sparkle-2">⭐</div>
                    <div className="sparkle sparkle-3">💫</div>
                </div>
            )}
        </div>
    );
};

export default PlantDisplay; 