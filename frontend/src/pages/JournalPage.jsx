import React, { useState } from 'react';
import JournalEntryForm from '../features/journaling/JournalEntryForm';
import JournalEntryList from '../features/journaling/JournalEntryList';

function JournalPage() {
    // State to trigger a refresh of the JournalEntryList when a new entry is added
    const [refreshListTrigger, setRefreshListTrigger] = useState(0);

    // Callback function passed to JournalEntryForm
    const handleEntryAdded = () => {
        setRefreshListTrigger(prev => prev + 1); // Increment to trigger useEffect in JournalEntryList
    };

    return (
        <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-extrabold text-center text-green-800 mb-8">My Journal</h1>
                <JournalEntryForm onEntryAdded={handleEntryAdded} />
                <JournalEntryList refreshTrigger={refreshListTrigger} />
            </div>
        </div>
    );
}

export default JournalPage;