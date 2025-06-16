import React, { useEffect, useState, useCallback } from 'react';
import { getJournalEntries, markJournalEntryFavorite } from '../../services/api';

function JournalEntryList({ refreshTrigger }) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getJournalEntries();
            setEntries(data);
        } catch (err) {
            console.error('Failed to fetch journal entries:', err);
            setError('Failed to load journal entries. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries, refreshTrigger]);

    const handleFavoriteToggle = async (entryId, currentStatus) => {
        setError(null); // Clear potential previous errors related to favorite
        try {
            // Optimistically update the UI
            setEntries(prevEntries =>
                prevEntries.map(entry =>
                    entry.id === entryId ? { ...entry, is_favorite: !currentStatus } : entry
                )
            );
            
            // Call the API
            const updatedEntry = await markJournalEntryFavorite(entryId, !currentStatus);
            console.log(`Entry ${entryId} favorite status toggled. New status: ${updatedEntry.is_favorite}`);
            // No need to setEntries again here if optimistic update is correct,
            // but good for confirming the server's response.
            // If the server's response differs from optimistic, uncomment below:
            // setEntries(prevEntries => 
            //     prevEntries.map(entry => 
            //         entry.id === entryId ? updatedEntry : entry
            //     )
            // );

        } catch (err) {
            console.error(`Failed to toggle favorite status for entry ${entryId}:`, err);
            // Revert UI if API call fails
            setEntries(prevEntries =>
                prevEntries.map(entry =>
                    entry.id === entryId ? { ...entry, is_favorite: currentStatus } : entry
                )
            );
            setError('Failed to update favorite status. Please try again.');
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-deep-forest-green text-lg font-semibold">Loading journal entries...</div>;
    }

    if (error) {
        return <div className="text-center py-8 text-red-600 text-lg font-semibold">Error: {error}</div>;
    }

    if (entries.length === 0) {
        return <div className="text-center py-8 text-muted-earth-brown text-lg">No journal entries found. Start writing in the form above!</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-deep-forest-green mb-6 text-center">Your Journal Entries</h2>
            {entries.map((entry) => (
                <div key={entry.id} className="bg-white p-6 shadow-xl rounded-xl border border-sage-green/50 relative group">
                    <p className="text-charcoal-gray text-lg mb-3 leading-relaxed">{entry.text}</p>
                    <p className="text-muted-earth-brown text-sm font-medium">
                        {new Date(entry.date).toLocaleString()}
                        {entry.mood && <span className="ml-3 px-2 py-1 bg-soft-leaf-green/20 text-soft-leaf-green rounded-md text-xs font-semibold">Mood: {entry.mood}</span>}
                    </p>

                    <button
                        onClick={() => handleFavoriteToggle(entry.id, entry.is_favorite)}
                        className={`absolute top-4 right-4 text-3xl transition-transform duration-200 transform
                            ${entry.is_favorite ? 'text-yellow-500 scale-110' : 'text-gray-300 hover:text-yellow-400 group-hover:scale-110'}
                            focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded-full
                            /* Removed: z-50 bg-blue-200 p-1 rounded-full */
                        `}
                        aria-label={entry.is_favorite ? 'Unfavorite this entry' : 'Favorite this entry'}
                    >
                        ★
                    </button>
                </div>
            ))}
        </div>
    );
}

export default JournalEntryList;