import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { Input } from './Input';
import { ApiService } from '../services/api';
import { webRTCService } from '../services/webrtc';
import { WebRTCError } from './WebRTCError';
import { Users, Video, AlertCircle } from 'lucide-react';

export const JoinRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [participantName, setParticipantName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [isCheckingRoom, setIsCheckingRoom] = useState(true);

  useEffect(() => {
    const checkRoom = async () => {
      if (!roomId) {
        setError('Invalid room ID');
        setIsCheckingRoom(false);
        return;
      }

      try {
        console.log(`[JoinRoom] Testing connectivity first...`);
        await ApiService.testConnectivity();
        
        console.log(`[JoinRoom] Checking if room exists: ${roomId}`);
        const response = await ApiService.checkRoomExists(roomId);
        console.log(`[JoinRoom] Room check response:`, response);
        setRoomExists(response.exists);
        if (!response.exists) {
          setError('Room not found');
        }
      } catch (err) {
        console.error(`[JoinRoom] Failed to check room:`, err);
        setError(`Failed to check room: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsCheckingRoom(false);
      }
    };

    checkRoom();
  }, [roomId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomId) {
      setError('Invalid room ID');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Join the room via WebRTC service
      await webRTCService.joinRoom(roomId, participantName.trim());
      
      // Start the call
      await webRTCService.startCall();
      
      // Navigate to call page
      navigate(`/call/${roomId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      console.error('[JoinRoom] Join error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Check if error is WebRTC-related
  const isWebRTCError = error && (
    error.includes('getUserMedia') || 
    error.includes('secure context') || 
    error.includes('HTTPS') ||
    error.includes('WebRTC')
  );

  if (isWebRTCError) {
    return (
      <WebRTCError 
        error={error} 
        onRetry={() => {
          setError('');
          setIsLoading(false);
        }}
      />
    );
  }

  if (isCheckingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking room...</p>
        </div>
      </div>
    );
  }

  if (roomExists === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Not Found</h2>
          <p className="text-gray-600 mb-6">
            The room you're trying to join doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/')} className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card p-8 max-w-md mx-auto animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Call</h2>
          <p className="text-gray-600">
            Enter your name to join the video call
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Your Name"
            placeholder="Enter your name..."
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            error={error}
            disabled={isLoading}
          />

          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
            disabled={!participantName.trim()}
          >
            <Users className="w-4 h-4 mr-2" />
            Join Call
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
