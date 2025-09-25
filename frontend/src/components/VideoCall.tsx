import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { webRTCService } from '../services/webrtc';
import { CallState } from '../types';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  Users, 
  Copy,
  Share2 
} from 'lucide-react';

export const VideoCall: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [callState, setCallState] = useState<CallState>(webRTCService.getCallState());
  const [isLeaving, setIsLeaving] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    const handleStateChange = (newState: CallState) => {
      setCallState(newState);
    };

    webRTCService.onCallStateChange(handleStateChange);

    return () => {
      // Cleanup is handled by the service
    };
  }, []);

  // Separate effect for setting up video elements when streams change
  useEffect(() => {
    console.log('[VideoCall] Setting up video elements');
    console.log('[VideoCall] Local stream:', callState.localStream);
    console.log('[VideoCall] Remote streams:', callState.remoteStreams);
    
    // Set up local video element
    if (callState.localStream && localVideoRef.current) {
      console.log('[VideoCall] Setting local video srcObject');
      localVideoRef.current.srcObject = callState.localStream;
    }

    // Set up remote video elements
    callState.remoteStreams.forEach((stream, participantId) => {
      const videoElement = remoteVideoRefs.current.get(participantId);
      console.log(`[VideoCall] Setting up remote video for participant ${participantId}:`, stream);
      console.log(`[VideoCall] Video element:`, videoElement);
      console.log(`[VideoCall] Stream tracks:`, stream.getTracks());
      
      if (videoElement && videoElement.srcObject !== stream) {
        console.log(`[VideoCall] Setting remote video srcObject for participant ${participantId}`);
        videoElement.srcObject = stream;
        
        // Add event listeners to debug video element
        videoElement.addEventListener('loadedmetadata', () => {
          console.log(`[VideoCall] Video metadata loaded for participant ${participantId}`);
        });
        
        videoElement.addEventListener('canplay', () => {
          console.log(`[VideoCall] Video can play for participant ${participantId}`);
        });
        
        videoElement.addEventListener('error', (e) => {
          console.error(`[VideoCall] Video error for participant ${participantId}:`, e);
        });
      }
    });
  }, [callState.localStream, callState.remoteStreams]);

  const handleLeaveCall = async () => {
    setIsLeaving(true);
    try {
      await webRTCService.leaveCall();
      navigate('/');
    } catch (error) {
      console.error('Error leaving call:', error);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleToggleMute = () => {
    webRTCService.toggleMute();
  };

  const handleToggleVideo = () => {
    webRTCService.toggleVideo();
  };

  const copyJoinLink = async () => {
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const shareJoinLink = async () => {
    const joinUrl = `${window.location.origin}/join/${roomId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my video call',
          text: 'Join my video call',
          url: joinUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyJoinLink();
    }
  };

  const getRemoteVideoRef = (participantId: string) => (element: HTMLVideoElement | null) => {
    if (element) {
      remoteVideoRefs.current.set(participantId, element);
    } else {
      remoteVideoRefs.current.delete(participantId);
    }
  };

  const totalParticipants = callState.participants.length + 1; // +1 for local participant

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">{totalParticipants} participants</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={copyJoinLink}
            >
              <Copy className="w-4 h-4 mr-1" />
              Copy Link
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={shareJoinLink}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-300">
          Room: {roomId}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
          {/* Local Video */}
          <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
              {callState.participantName} (You)
            </div>
            {callState.isMuted && (
              <div className="absolute top-2 right-2 bg-red-600 p-1 rounded">
                <MicOff className="w-4 h-4" />
              </div>
            )}
            {!callState.isVideoEnabled && (
              <div className="absolute top-2 right-2 bg-red-600 p-1 rounded">
                <VideoOff className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {callState.participants.filter(participant => participant.id !== callState.participantId).map((participant) => {
            const stream = callState.remoteStreams.get(participant.id);
            return (
              <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                {stream ? (
                  <video
                    ref={getRemoteVideoRef(participant.id)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadedMetadata={() => {
                      console.log(`[VideoCall] Video metadata loaded for ${participant.name}`);
                    }}
                    onCanPlay={() => {
                      console.log(`[VideoCall] Video can play for ${participant.name}`);
                    }}
                    onError={(e) => {
                      console.error(`[VideoCall] Video error for ${participant.name}:`, e);
                    }}
                    onLoadStart={() => {
                      console.log(`[VideoCall] Video load started for ${participant.name}`);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-400">{participant.name}</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-sm">
                  {participant.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 px-4 py-4 flex items-center justify-center space-x-4">
        <Button
          variant={callState.isMuted ? 'danger' : 'secondary'}
          size="lg"
          onClick={handleToggleMute}
          className="rounded-full w-12 h-12 p-0"
        >
          {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        <Button
          variant={callState.isVideoEnabled ? 'secondary' : 'danger'}
          size="lg"
          onClick={handleToggleVideo}
          className="rounded-full w-12 h-12 p-0"
        >
          {callState.isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          variant="danger"
          size="lg"
          onClick={handleLeaveCall}
          isLoading={isLeaving}
          className="rounded-full w-12 h-12 p-0"
        >
          <Phone className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
