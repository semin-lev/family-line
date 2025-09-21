import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { ApiService } from '../services/api';
import { CreateRoomResponse } from '../types';
import { Copy, Users, Video } from 'lucide-react';

interface CreateRoomProps {
  onRoomCreated: (room: CreateRoomResponse) => void;
}

export const CreateRoom: React.FC<CreateRoomProps> = ({ onRoomCreated }) => {
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdRoom, setCreatedRoom] = useState<CreateRoomResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      setError('Room name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const room = await ApiService.createRoom({ name: roomName.trim() });
      setCreatedRoom(room);
      onRoomCreated(room);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getFullJoinUrl = (joinPath: string) => {
    const currentLocation = window.location;
    return `${currentLocation.protocol}//${currentLocation.host}${joinPath}`;
  };

  if (createdRoom) {
    return (
      <div className="card p-8 max-w-md mx-auto animate-fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Room Created!</h2>
          <p className="text-gray-600 mb-6">
            Share this link with others to join your call
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-2">Room Name:</p>
            <p className="font-semibold text-gray-900">{createdRoom.roomName}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Join Link:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getFullJoinUrl(createdRoom.joinPath)}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(getFullJoinUrl(createdRoom.joinPath))}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <Button
            onClick={() => {
              setCreatedRoom(null);
              setRoomName('');
            }}
            variant="secondary"
            className="w-full"
          >
            Create Another Room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 max-w-md mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Video className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create a Call</h2>
        <p className="text-gray-600">
          Start a new video call and invite others to join
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Room Name"
          placeholder="Enter room name..."
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          error={error}
          disabled={isLoading}
        />

        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full"
          disabled={!roomName.trim()}
        >
          <Users className="w-4 h-4 mr-2" />
          Create Room
        </Button>
      </form>
    </div>
  );
};
