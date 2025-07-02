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
    // Default fallback
    'default': '/images/neutral.png',
};

const PlantDisplay = ({ plantData }) => {
    const [currentPlantImage, setCurrentPlantImage] = useState(PLANT_IMAGES.default);
    const [fallingLeaves, setFallingLeaves] = useState([]);
    const leafIntervalRef = useRef(null);

    // Function to determine the plant image based on its state
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

        // Map health_score to mood labels
        let moodLabel = 'neutral'; // Default
        if (plantData.health_score <= 20) {
            moodLabel = 'dying';
        } else if (plantData.health_score <= 35) {
            moodLabel = 'sad';
        } else if (plantData.health_score <= 50) {
            moodLabel = 'stressed';
        } else if (plantData.health_score <= 65) {
            moodLabel = 'neutral';
        } else if (plantData.health_score <= 85) {
            moodLabel = 'happy';
        } else if (plantData.health_score > 85) {
            moodLabel = 'energetic';
        }

        // For seedling stage, always show seedling image regardless of health
        if (plantData.stage === 'seedling' || plantData.stage === 'sprout') {
            return PLANT_IMAGES.seedling;
        }
        
        // Otherwise use mood-based images
        return PLANT_IMAGES[moodLabel] || PLANT_IMAGES.default;

    }, [plantData]);

    // Effect to update plant image when plantData changes
    useEffect(() => {
        setCurrentPlantImage(getPlantImage());
    }, [plantData, getPlantImage]);

    // Effect for falling leaves animation
    useEffect(() => {
        // Clear any existing interval
        if (leafIntervalRef.current) {
            clearInterval(leafIntervalRef.current);
            leafIntervalRef.current = null;
        }

        // Determine if plant should have falling leaves
        const shouldHaveFallingLeaves = plantData && (
            plantData.health_score <= 50 || // Stressed, sad, dying
            plantData.health_status === 'stressed' ||
            plantData.health_status === 'sad' ||
            plantData.health_status === 'dying'
        );
        
        if (shouldHaveFallingLeaves) {
            // Start adding leaves at an interval
            leafIntervalRef.current = setInterval(() => {
                setFallingLeaves(prevLeaves => {
                    const newLeaf = {
                        id: Date.now() + Math.random(), // Unique ID
                        startX: Math.random() * 80 + 10, // Random start X percentage (10-90%)
                        duration: 3 + Math.random() * 3, // Random duration 3-6 seconds
                        delay: Math.random() * 2, // Random delay 0-2 seconds
                        rotation: Math.random() * 360, // Initial rotation
                        size: 15 + Math.random() * 10, // Size between 15px and 25px
                        colorHue: Math.random() * 40 + 20, // Yellowish/brownish hues
                    };
                    return [...prevLeaves, newLeaf];
                });
            }, 1500); // Add a new leaf every 1.5 seconds

            // Clean up leaves that have fallen off screen
            const cleanupInterval = setInterval(() => {
                setFallingLeaves(prevLeaves => prevLeaves.filter(leaf => {
                    // Remove leaves older than their animation duration
                    const leafAge = Date.now() - leaf.id;
                    const totalDuration = (leaf.duration + leaf.delay) * 1000;
                    return leafAge < totalDuration;
                }));
            }, 5000); // Clean up every 5 seconds

            return () => {
                clearInterval(leafIntervalRef.current);
                clearInterval(cleanupInterval);
            };
        } else {
            // If plant is healthy, clear all falling leaves
            setFallingLeaves([]);
        }
    }, [plantData]);

    // Generate leaf emoji for falling animation
    const leafEmojis = ['🍂', '🍃', '🍁'];

    return (
        <div className="plant-display-container relative w-full max-w-md mx-auto aspect-square overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 to-green-50 shadow-lg">
            {/* Plant Image */}
            <div className="plant-image-wrapper w-full h-full flex items-center justify-center p-4">
                <img 
                    src={currentPlantImage} 
                    alt={`${plantData?.name || 'Your Plant'} - ${plantData?.stage || 'growing'}`}
                    className="plant-image max-w-full max-h-full object-contain drop-shadow-lg transition-all duration-500 ease-in-out" 
                    onError={(e) => {
                        e.target.onerror = null; // Prevent infinite loop
                        e.target.src = PLANT_IMAGES.default; // Fallback to default if image not found
                        console.error(`Failed to load plant image: ${currentPlantImage}`);
                    }}
                />
            </div>

            {/* Plant Info Overlay */}
            {plantData && (
                <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-md">
                    <h3 className="font-semibold text-gray-800 text-lg">{plantData.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-gray-600">Health: {plantData.health_score}%</span>
                        <span className="text-sm text-gray-600 capitalize">{plantData.stage}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                                plantData.health_score > 70 ? 'bg-green-500' :
                                plantData.health_score > 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(plantData.health_score, 0)}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Falling Leaves Animation */}
            {fallingLeaves.map(leaf => (
                <div
                    key={leaf.id}
                    className="falling-leaf absolute pointer-events-none"
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
        </div>
    );
};

export default PlantDisplay; 