import React, { useEffect, useState } from 'react';
import { storeAPI, authAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, ShoppingCart, Loader2 } from 'lucide-react';

const ShopPage = () => {
    const { user, updateUser } = useAuth();
    const [items, setItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyingItemId, setBuyingItemId] = useState(null);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            storeAPI.getStoreItems(),
            storeAPI.getUserInventory(),
        ]).then(([itemsRes, inventoryRes]) => {
            setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
            setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load store data:", err);
            setItems([]);
            setInventory([]);
            setLoading(false);
        });
    }, []);

    const handleBuy = async (itemId) => {
        setBuyingItemId(itemId);
        try {
            await storeAPI.buyStoreItem(itemId);
            // Refresh user and inventory
            const [userRes, inventoryRes] = await Promise.all([
                authAPI.getProfile(),
                storeAPI.getUserInventory()
            ]);
            updateUser(userRes.data);
            setInventory(inventoryRes.data);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to purchase item.');
        } finally {
            setBuyingItemId(null);
        }
    };

    const isOwned = (itemId) => Array.isArray(inventory) ? inventory.some(inv => inv.item.id === itemId) : false;

    const renderItemList = (itemType) => {
        const filteredItems = Array.isArray(items) ? items.filter(item => item.item_type === itemType) : [];
        if (filteredItems.length === 0) {
            return <p>No {itemType.toLowerCase()}s available right now.</p>;
        }
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                    <Card key={item.id}>
                        <CardHeader>
                            <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-md" />
                        </CardHeader>
                        <CardContent>
                            <h3 className="font-bold">{item.name}</h3>
                            <p className="text-sm text-gray-500">{item.description}</p>
                            <div className="flex justify-between items-center mt-4">
                                <div className="flex items-center gap-1 font-bold text-emerald-600">
                                    <Leaf className="h-4 w-4" />
                                    {item.price}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleBuy(item.id)}
                                    disabled={isOwned(item.id) || buyingItemId === item.id}
                                >
                                    {buyingItemId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isOwned(item.id) ? 'Owned' : 'Buy'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="h-10 w-10 animate-spin text-emerald-500" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2"><ShoppingCart /> The Shop</h1>
                <div className="flex items-center gap-2 font-bold text-lg bg-emerald-100 px-3 py-1 rounded-full">
                    <Leaf className="h-5 w-5 text-emerald-500" />
                    {user?.plantpal_leaves || 0}
                </div>
            </div>

            <Tabs defaultValue="POT">
                <TabsList>
                    <TabsTrigger value="POT">Pots</TabsTrigger>
                    <TabsTrigger value="DECORATION">Decorations</TabsTrigger>
                    <TabsTrigger value="AVATAR">Avatars</TabsTrigger>
                </TabsList>
                <TabsContent value="POT">{renderItemList('POT')}</TabsContent>
                <TabsContent value="DECORATION">{renderItemList('DECORATION')}</TabsContent>
                <TabsContent value="AVATAR">{renderItemList('AVATAR')}</TabsContent>
            </Tabs>
        </div>
    );
};

export default ShopPage; 