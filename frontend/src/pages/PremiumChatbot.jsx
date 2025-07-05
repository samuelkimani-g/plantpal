import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2, Send, Bot, Sparkles } from 'lucide-react';

const PremiumChatbot = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([{ sender: 'bot', text: 'Welcome to your premium chatbot! How can I help you reflect today?' }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMessage = { sender: 'user', text: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            // This is where you would call the Gemini API
            // For now, we will simulate a response.
            setTimeout(() => {
                const botResponse = { sender: 'bot', text: `That's a very interesting thought about "${userMessage.text}". Let's explore that further.` };
                setMessages(prev => [...prev, botResponse]);
                setIsThinking(false);
            }, 1500);
        } catch (error) {
            console.error("Error with chatbot:", error);
            const errorResponse = { sender: 'bot', text: "I'm having a little trouble thinking right now. Please try again in a moment." };
            setMessages(prev => [...prev, errorResponse]);
            setIsThinking(false);
        }
    };

    return (
        <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
            <Card className="flex-grow flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center"><Sparkles className="h-5 w-5 mr-2 text-yellow-500" /> PlantPal AI Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'bot' && <Bot className="h-8 w-8 text-green-600" />}
                            <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                         <div className="flex items-end gap-2 justify-start">
                            <Bot className="h-8 w-8 text-green-600" />
                            <div className="max-w-md p-3 rounded-lg bg-gray-200 text-gray-800">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>
                <div className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask me anything about your day..."
                            disabled={isThinking}
                        />
                        <Button type="submit" disabled={isThinking}>
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default PremiumChatbot; 