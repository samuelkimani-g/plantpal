import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { AlertCircle, Music, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import musicAPI from '../../../services/music/musicApi';

const SpotifyConnect = ({ onConnectionChange }) => {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isLoading: true,
    profile: null,
    moodProfile: null,
    error: null
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setConnectionState(prev => ({ ...prev, isLoading: true, error: null }));
      const status = await musicAPI.getConnectionStatus();
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: status.is_connected,
        profile: status.profile,
        moodProfile: status.mood_profile,
        isLoading: false
      }));

      // Notify parent component
      if (onConnectionChange) {
        onConnectionChange(status.is_connected, status);
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Failed to check connection status',
        isLoading: false
      }));
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setConnectionState(prev => ({ ...prev, error: null }));

      // Get authorization URL
      const authData = await musicAPI.getAuthUrl();
      
      // Open Spotify authorization in a new window
      const popup = window.open(
        authData.auth_url,
        'spotify_auth',
        'width=500,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for the callback
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          // Check if connection was successful
          setTimeout(checkConnectionStatus, 1000);
        }
      }, 1000);

      // Handle the callback URL if we're in development
      if (process.env.NODE_ENV === 'development') {
        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'SPOTIFY_CALLBACK') {
            popup.close();
            handleCallback(event.data.code, event.data.state);
            window.removeEventListener('message', handleMessage);
          }
        };
        
        window.addEventListener('message', handleMessage);
      }

    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Failed to connect to Spotify'
      }));
      setIsConnecting(false);
    }
  };

  const handleCallback = async (code, state) => {
    try {
      const result = await musicAPI.handleCallback(code, state);
      
      if (result.is_connected) {
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          profile: result.profile,
          moodProfile: result.mood_profile
        }));

        if (onConnectionChange) {
          onConnectionChange(true, result);
        }
      }
    } catch (error) {
      console.error('Error handling callback:', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Failed to complete Spotify connection'
      }));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      setConnectionState(prev => ({ ...prev, error: null }));

      await musicAPI.disconnect();

      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        profile: null,
        moodProfile: null
      }));

      if (onConnectionChange) {
        onConnectionChange(false, null);
      }
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      setConnectionState(prev => ({
        ...prev,
        error: 'Failed to disconnect from Spotify'
      }));
    } finally {
      setIsDisconnecting(false);
    }
  };

  const renderConnectionStatus = () => {
    if (connectionState.isLoading) {
      return (
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking connection...</span>
        </div>
      );
    }

    if (connectionState.isConnected && connectionState.profile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-700">Connected to Spotify</span>
            <Badge variant="success" className="ml-2">Active</Badge>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            {connectionState.profile.profile_image_url && (
              <img 
                src={connectionState.profile.profile_image_url} 
                alt="Profile" 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{connectionState.profile.display_name}</p>
              <p className="text-sm text-gray-600">{connectionState.profile.email}</p>
              {connectionState.profile.product && (
                <Badge variant="outline" className="mt-1">
                  {connectionState.profile.product}
                </Badge>
              )}
            </div>
          </div>

          {connectionState.moodProfile && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Current Mood</h4>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">
                  {musicAPI.getMoodEmoji(connectionState.moodProfile.current_mood_label)}
                </span>
                <div>
                  <p className="font-medium">{musicAPI.formatMoodScore(connectionState.moodProfile.current_mood_score)}</p>
                  <p className="text-sm text-gray-600">
                    Score: {(connectionState.moodProfile.current_mood_score * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-gray-600">
        <AlertCircle className="h-5 w-5" />
        <span>Not connected to Spotify</span>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Music className="h-6 w-6 text-green-500" />
          <span>Spotify Integration</span>
        </CardTitle>
        <CardDescription>
          Connect your Spotify account to enable mood-based plant growth and personalized journaling suggestions.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {connectionState.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{connectionState.error}</p>
          </div>
        )}

        {renderConnectionStatus()}

        <div className="flex space-x-2 pt-4">
          {!connectionState.isConnected ? (
            <Button 
              onClick={handleConnect}
              disabled={isConnecting || connectionState.isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music className="h-4 w-4 mr-2" />
                  Connect Spotify
                </>
              )}
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
              
              <Button 
                onClick={checkConnectionStatus}
                variant="outline"
                disabled={connectionState.isLoading}
              >
                Refresh Status
              </Button>
            </>
          )}
        </div>

        {connectionState.isConnected && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">What's enabled:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Mood analysis from your listening history</li>
              <li>• Plant growth influenced by your music mood</li>
              <li>• Personalized journal prompts based on your music</li>
              <li>• Weekly mood reports and insights</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SpotifyConnect;