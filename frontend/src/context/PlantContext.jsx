import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    getAllUserPlants, 
    createPlant as createPlantApi, 
    getPlantDetail, 
    updatePlant, 
    deletePlant,
    createPlantLog, 
    getAllPlantLogs, 
} from '../services/api'; 
import { useAuth } from './AuthContext'; // Corrected path (it's in the same context folder)
import { useToast } from "@/components/ui/use-toast";

const PlantContext = createContext();

export const usePlant = () => {
    const context = useContext(PlantContext);
    if (!context) {
        throw new Error("usePlant must be used within a PlantProvider");
    }
    return context;
};

export const PlantProvider = ({ children }) => {
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const [plants, setPlants] = useState([]);
    const [currentPlant, setCurrentPlant] = useState(null);
    const [plantLogs, setPlantLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            fetchPlantsAndLogs();
        } else if (!isAuthenticated && !authLoading) {
            setPlants([]);
            setCurrentPlant(null);
            setPlantLogs([]);
            setLoading(false);
        }
    }, [isAuthenticated, authLoading]);

    const fetchPlantsAndLogs = async () => {
        setLoading(true);
        try {
            const fetchedPlants = await getAllUserPlants();
            setPlants(fetchedPlants);
            if (fetchedPlants.length > 0) {
                setCurrentPlant(fetchedPlants[0]);
                const fetchedLogs = await getAllPlantLogs();
                setPlantLogs(fetchedLogs.filter(log => log.plant === fetchedPlants[0].id));
            } else {
                setCurrentPlant(null);
                setPlantLogs([]);
            }
        } catch (error) {
            console.error("Error fetching plant data:", error.response?.data || error.message);
            toast({
                title: "Error fetching plants",
                description: error.response?.data?.detail || "Could not load your plant data.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const createNewPlant = async (name, species = "Default Species") => {
        setLoading(true);
        try {
            const newPlant = await createPlantApi(name, species);
            setPlants(prevPlants => [...prevPlants, newPlant]);
            setCurrentPlant(newPlant);
            toast({
                title: "Plant Created!",
                description: `${newPlant.name} has joined your garden!`,
                variant: "success",
            });
            return newPlant;
        } catch (error) {
            console.error("Error creating plant:", error.response?.data || error.message);
            toast({
                title: "Plant Creation Failed",
                description: error.response?.data?.detail || "Could not create your plant.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const updateExistingPlant = async (plantId, plantData) => {
        setLoading(true);
        try {
            const updated = await updatePlant(plantId, plantData);
            setPlants(prevPlants => prevPlants.map(p => p.id === plantId ? updated : p));
            if (currentPlant && currentPlant.id === plantId) {
                setCurrentPlant(updated);
            }
            toast({
                title: "Plant Updated!",
                description: `${updated.name}'s details have been updated.`,
            });
            return updated;
        } catch (error) {
            console.error("Error updating plant:", error.response?.data || error.message);
            toast({
                title: "Plant Update Failed",
                description: error.response?.data?.detail || "Could not update plant.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const deleteExistingPlant = async (plantId) => {
        setLoading(true);
        try {
            await deletePlant(plantId);
            setPlants(prevPlants => prevPlants.filter(p => p.id !== plantId));
            if (currentPlant && currentPlant.id === plantId) {
                setCurrentPlant(null);
            }
            toast({
                title: "Plant Deleted",
                description: "Your plant has been removed from the garden.",
            });
        } catch (error) {
            console.error("Error deleting plant:", error.response?.data || error.message);
            toast({
                title: "Plant Deletion Failed",
                description: error.response?.data?.detail || "Could not delete plant.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const addPlantLog = async (plantId, note, watered, fertilized) => {
        setLoading(true);
        try {
            const newLog = await createPlantLog(plantId, note, watered, fertilized);
            setPlantLogs(prevLogs => [...prevLogs, newLog]);
            await fetchPlantsAndLogs(); 
            toast({
                title: "Plant Logged!",
                description: "Care activity recorded.",
            });
            return newLog;
        } catch (error) {
            console.error("Error adding plant log:", error.response?.data || error.message);
            toast({
                title: "Log Failed",
                description: error.response?.data?.detail || "Could not record plant activity.",
                variant: "destructive",
            });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        plants,
        currentPlant,
        plantLogs,
        loading,
        fetchPlantsAndLogs,
        createNewPlant,
        updateExistingPlant,
        deleteExistingPlant,
        addPlantLog,
    };

    return (
        <PlantContext.Provider value={value}>
            {children}
        </PlantContext.Provider>
    );
};
