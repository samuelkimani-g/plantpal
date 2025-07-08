import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Loader2, Send, Bot, Sparkles, Leaf, Heart, Brain } from 'lucide-react';
import { chatbotAPI } from '../services/api';

const PremiumChatbot = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([
        { 
            sender: 'bot', 
            text: `Hello ${user?.username || 'there'}! 🌱 I'm your PlantPal AI companion. I'm here to support you with emotional wellness and plant care. What's on your mind today?`,
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking) return;

        const userMessage = { 
            sender: 'user', 
            text: input.trim(),
            timestamp: new Date()
        };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsThinking(true);

        try {
            console.log('Sending message to chatbot:', userMessage.text);
            const response = await chatbotAPI.sendMessage(newMessages);
            console.log('Raw chatbot response:', response);
            
            // Simplified response handling
            let botText = "I'm here to listen and support you. What's on your mind?";
            
            if (response && response.data && response.data.reply) {
                botText = response.data.reply;
            } else if (response && response.data && typeof response.data === 'string') {
                botText = response.data;
            } else if (response && typeof response === 'string') {
                botText = response;
            }
            
            console.log('Bot response text:', botText);
            
            const botResponse = { 
                sender: 'bot', 
                text: botText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
        } catch (error) {
            console.error("Chatbot error details:", {
                error: error,
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data
            });
            
            // Always provide a helpful response
            let errorMessage = "I'm here to listen and support you. What's on your mind?";
            
            if (error.response?.status === 403) {
                errorMessage = "This feature requires premium access. Please upgrade your account.";
            } else if (error.response?.status === 500) {
                errorMessage = "I'm experiencing some technical difficulties, but I'm still here to listen. What would you like to talk about?";
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = "I'm having trouble connecting right now, but I'm here to listen. What's on your mind?";
            }
            
            const errorResponse = { 
                sender: 'bot', 
                text: errorMessage,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsThinking(false);
        }
    };

    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const getBotIcon = (message) => {
        const text = message.text.toLowerCase();
        if (text.includes('plant') || text.includes('leaf') || text.includes('water') || text.includes('soil')) {
            return <Leaf className="h-6 w-6 text-green-600" />;
        } else if (text.includes('feel') || text.includes('emotion') || text.includes('sad') || text.includes('happy')) {
            return <Heart className="h-6 w-6 text-pink-600" />;
        } else {
            return <Brain className="h-6 w-6 text-blue-600" />;
        }
    };

    return (
        <div className="container mx-auto p-4 flex flex-col h-[calc(100vh-80px)]">
            <Card className="flex-grow flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
                <CardHeader className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                    <CardTitle className="flex items-center">
                        <Sparkles className="h-5 w-5 mr-2 text-yellow-300" /> 
                        PlantPal AI Companion
                    </CardTitle>
                    <p className="text-sm text-green-100 mt-1">
                        Your personal wellness & plant care assistant
                    </p>
                </CardHeader>
                
                <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'bot' && (
                                <div className="flex-shrink-0">
                                    {getBotIcon(msg)}
                                </div>
                            )}
                            <div className={`max-w-md p-4 rounded-2xl shadow-sm ${
                                msg.sender === 'user' 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                    : 'bg-white text-gray-800 border border-gray-200'
                            }`}>
                                <p className="text-sm leading-relaxed">{msg.text}</p>
                                <p className={`text-xs mt-2 ${
                                    msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                    
                    {isThinking && (
                        <div className="flex items-end gap-3 justify-start">
                            <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
                            <div className="max-w-md p-4 rounded-2xl bg-white border border-gray-200">
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </CardContent>
                
                <div className="p-4 border-t bg-white">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Share your thoughts, ask about plants, or tell me how you're feeling..."
                            disabled={isThinking}
                            className="flex-1 rounded-full border-2 focus:border-green-500"
                        />
                        <Button 
                            type="submit" 
                            disabled={isThinking || !input.trim()}
                            className="rounded-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                        >
                            {isThinking ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </Button>
                    </form>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setInput("I'm feeling a bit down today")}
                            className="text-xs rounded-full"
                        >
                            😔 Feeling down
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setInput("My plant's leaves are turning yellow")}
                            className="text-xs rounded-full"
                        >
                            🌿 Plant help
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setInput("I need some motivation")}
                            className="text-xs rounded-full"
                        >
                            💪 Motivation
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PremiumChatbot; 