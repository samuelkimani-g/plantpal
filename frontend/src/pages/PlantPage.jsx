import React from 'react';
import PlantDisplay from '../features/plantGrowth/PlantDisplay';

function PlantPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold text-center text-green-800 mb-8">Your Virtual PlantPal</h1>
                <PlantDisplay />
            </div>
        </div>
    );
}

export default PlantPage;
