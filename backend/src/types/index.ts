export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  participants: Map<string, Participant>;
}

export interface Participant {
  id: string;
  name: string;
  socketId: string;
  rtpCapabilities?: any;
  transports: Map<string, any>;
  producers: Map<string, any>;
  consumers: Map<string, any>;
}

export interface CreateRoomRequest {
  name: string;
}

export interface JoinRoomRequest {
  roomId: string;
  participantName: string;
}

export interface SocketEvents {
  'room:created': { roomId: string; roomName: string };
  'room:joined': { roomId: string; participantId: string };
  'room:left': { roomId: string; participantId: string };
  'participant:joined': { participant: Participant };
  'participant:left': { participantId: string };
  'webrtc:rtp-capabilities': { rtpCapabilities: any };
  'webrtc:transport-created': { transport: any; direction: 'send' | 'recv' };
  'webrtc:transport-connected': { transportId: string };
  'webrtc:producer-created': { producer: any };
  'webrtc:consumer-created': { consumer: any };
}
