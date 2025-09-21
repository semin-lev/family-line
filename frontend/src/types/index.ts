export interface Room {
  roomId: string;
  roomName: string;
  createdAt: string;
  participantCount: number;
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
}

export interface CreateRoomRequest {
  name: string;
}

export interface CreateRoomResponse {
  roomId: string;
  roomName: string;
  joinPath: string;
}

export interface JoinRoomRequest {
  roomId: string;
  participantName: string;
}

export interface WebRTCTransport {
  id: string;
  iceParameters: any;
  iceCandidates: any[];
  dtlsParameters: any;
  direction: 'send' | 'recv';
}

export interface Producer {
  id: string;
  kind: 'audio' | 'video';
}

export interface Consumer {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
}

export interface CallState {
  isInCall: boolean;
  roomId?: string;
  participantId?: string;
  participantName?: string;
  participants: Participant[];
  localStream?: MediaStream;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoEnabled: boolean;
}
