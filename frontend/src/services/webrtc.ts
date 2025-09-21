import * as mediasoupClient from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';
import { CallState, WebRTCTransport, Consumer } from '../types';

// Use current location for socket connection to work in local network
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    console.log(`[WebRTC] Using VITE_SOCKET_URL: ${import.meta.env.VITE_SOCKET_URL}`);
    return import.meta.env.VITE_SOCKET_URL;
  }
  
  // Use current location but with backend port
  const currentLocation = window.location;
  const backendPort = import.meta.env.VITE_BACKEND_PORT || '3001';
  const socketUrl = `${currentLocation.protocol}//${currentLocation.hostname}:${backendPort}`;
  
  console.log(`[WebRTC] Current location:`, {
    href: currentLocation.href,
    hostname: currentLocation.hostname,
    port: currentLocation.port,
    protocol: currentLocation.protocol
  });
  console.log(`[WebRTC] Generated socket URL: ${socketUrl}`);
  
  return socketUrl;
};

export class WebRTCService {
  private socket: Socket | null = null;
  private device: mediasoupClient.Device | null = null;
  private sendTransport: any | null = null;
  private recvTransport: any | null = null;
  private producers: Map<string, any> = new Map();
  private consumers: Map<string, any> = new Map();
  private localStream: MediaStream | null = null;
  private remoteStreams: Map<string, MediaStream> = new Map();
  private producerToParticipantMap: Map<string, string> = new Map();
  private participantTracks: Map<string, { audio?: MediaStreamTrack; video?: MediaStreamTrack }> = new Map();
  private callState: CallState = {
    isInCall: false,
    participants: [],
    remoteStreams: new Map(),
    isMuted: false,
    isVideoEnabled: true,
  };
  private onStateChange: ((state: CallState) => void) | null = null;
  private transportCreationResolvers: {
    send?: () => void;
    recv?: () => void;
  } | null = null;
  private isJoiningRoom: boolean = false;
  private pendingProducers: Array<{ producerId: string; participantId: string; kind: string }> = [];

  constructor() {
    this.setupSocket();
  }

  private setupSocket(): void {
    const socketUrl = getSocketUrl();
    console.log('Setting up socket connection to:', socketUrl);
    if (this.socket) {
      console.log('Socket already exists, disconnecting first');
      this.socket.disconnect();
    }
    this.socket = io(socketUrl, {
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('Connected to server with socket ID:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.cleanup();
    });

    this.socket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      console.log('Participants in room:', data.participants.length, data.participants.map((p: any) => `${p.name}(${p.id})`));
      this.callState.isInCall = true;
      this.callState.roomId = data.roomId;
      this.callState.participantId = data.participantId;
      this.callState.participants = data.participants;
      this.notifyStateChange();
    });

    this.socket.on('participant-joined', (data) => {
      console.log('Participant joined:', data);
      this.callState.participants.push(data.participant);
      this.notifyStateChange();
    });

    this.socket.on('participant-left', (data) => {
      console.log('Participant left:', data);
      this.callState.participants = this.callState.participants.filter(
        p => p.id !== data.participantId
      );
      this.remoteStreams.delete(data.participantId);
      this.participantTracks.delete(data.participantId);
      // Clean up producer mappings for this participant
      for (const [producerId, participantId] of this.producerToParticipantMap) {
        if (participantId === data.participantId) {
          this.producerToParticipantMap.delete(producerId);
        }
      }
      this.notifyStateChange();
    });

    this.socket.on('rtp-capabilities', async (data) => {
      console.log('[FRONTEND] Received RTP capabilities');
      await this.initializeDevice(data.rtpCapabilities);
    });

    this.socket.on('transport-created', (data) => {
      console.log('[FRONTEND] Transport created:', data);
      this.createTransport(data);
    });

    this.socket.on('transport-connected', (data) => {
      console.log('[FRONTEND] Transport connected:', data);
    });

    this.socket.on('producer-created', (data) => {
      console.log('[FRONTEND] Producer created:', data);
    });

    this.socket.on('consumer-created', async (data) => {
      console.log('[FRONTEND] Consumer created:', data);
      await this.consume(data);
    });

    this.socket.on('new-producer', async (data) => {
      console.log('[FRONTEND] New producer:', data);
      await this.consumeNewProducer(data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  private async initializeDevice(rtpCapabilities: any): Promise<void> {
    console.log('[FRONTEND] Initializing device with RTP capabilities');
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    console.log('[FRONTEND] Device initialized successfully');
  }

  private async createTransport(transportData: WebRTCTransport): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    console.log(`[FRONTEND] Creating ${transportData.direction} transport ${transportData.id}`);

    if (transportData.direction === 'send') {
      const transport = await this.device.createSendTransport({
        id: transportData.id,
        iceParameters: transportData.iceParameters,
        iceCandidates: transportData.iceCandidates,
        dtlsParameters: transportData.dtlsParameters,
      });
      
      this.sendTransport = transport;
      
      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log(`[FRONTEND] Connecting send transport ${transport.id}`);
          this.socket?.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          console.error(`[FRONTEND] Error connecting send transport:`, error);
          errback(error as Error);
        }
      });

      transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          console.log(`[FRONTEND] Producing ${kind} on transport ${transport.id}`);
          this.socket?.emit('produce', {
            transportId: transport.id,
            kind,
            rtpParameters,
          });
          callback({ id: 'temp-id' }); // Will be updated when producer is created
        } catch (error) {
          console.error(`[FRONTEND] Error producing:`, error);
          errback(error as Error);
        }
      });
    } else {
      const transport = await this.device.createRecvTransport({
        id: transportData.id,
        iceParameters: transportData.iceParameters,
        iceCandidates: transportData.iceCandidates,
        dtlsParameters: transportData.dtlsParameters,
      });
      
      this.recvTransport = transport;
      
      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          console.log(`[FRONTEND] Connecting recv transport ${transport.id}`);
          this.socket?.emit('connect-transport', {
            transportId: transport.id,
            dtlsParameters,
          });
          callback();
        } catch (error) {
          console.error(`[FRONTEND] Error connecting recv transport:`, error);
          errback(error as Error);
        }
      });
      
      // Process any pending producers now that recv transport is ready
      this.processPendingProducers();
    }

    // Resolve the transport creation promise if we're waiting for it
    if (this.transportCreationResolvers) {
      if (transportData.direction === 'send' && this.transportCreationResolvers.send) {
        console.log(`[FRONTEND] Resolving send transport creation`);
        this.transportCreationResolvers.send();
        this.transportCreationResolvers.send = undefined;
      } else if (transportData.direction === 'recv' && this.transportCreationResolvers.recv) {
        console.log(`[FRONTEND] Resolving recv transport creation`);
        this.transportCreationResolvers.recv();
        this.transportCreationResolvers.recv = undefined;
      }
    } else {
      console.warn('[FRONTEND] Transport created but no resolvers set up yet');
    }
  }

  async joinRoom(roomId: string, participantName: string): Promise<void> {
    console.log(`joinRoom called: roomId=${roomId}, participantName=${participantName}, socketId=${this.socket?.id}`);
    
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    if (this.isJoiningRoom) {
      console.log('Already joining a room, ignoring duplicate request');
      return;
    }

    this.isJoiningRoom = true;
    this.callState.participantName = participantName;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.isJoiningRoom = false;
        reject(new Error('Timeout waiting for room join'));
      }, 10000);

      const handleRoomJoined = () => {
        clearTimeout(timeout);
        this.socket?.off('room-joined', handleRoomJoined);
        this.socket?.off('error', handleError);
        this.isJoiningRoom = false;
        // Don't resolve immediately, let the existing handler process the data first
        setTimeout(() => resolve(), 100);
      };

      const handleError = (error: any) => {
        clearTimeout(timeout);
        this.socket?.off('room-joined', handleRoomJoined);
        this.socket?.off('error', handleError);
        this.isJoiningRoom = false;
        reject(new Error(error.message || 'Failed to join room'));
      };

      this.socket?.on('room-joined', handleRoomJoined);
      this.socket?.on('error', handleError);
      this.socket?.emit('join-room', { roomId, participantName });
    });
  }

  private async waitForTransports(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set up resolvers for transport creation
      this.transportCreationResolvers = {
        send: undefined,
        recv: undefined,
      };

      let sendResolved = false;
      let recvResolved = false;

      const checkComplete = () => {
        if (sendResolved && recvResolved) {
          console.log('[FRONTEND] Both transports created, resolving waitForTransports');
          // Don't set to null here, let the individual resolvers handle cleanup
          resolve();
        }
      };

      this.transportCreationResolvers.send = () => {
        console.log('[FRONTEND] Send transport resolver called');
        sendResolved = true;
        checkComplete();
      };

      this.transportCreationResolvers.recv = () => {
        console.log('[FRONTEND] Recv transport resolver called');
        recvResolved = true;
        checkComplete();
      };

      // Create send transport
      console.log('[FRONTEND] Requesting send transport creation');
      this.socket?.emit('create-transport', { direction: 'send' });

      // Create recv transport
      console.log('[FRONTEND] Requesting recv transport creation');
      this.socket?.emit('create-transport', { direction: 'recv' });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!sendResolved || !recvResolved) {
          console.error('[FRONTEND] Timeout waiting for transports - send:', sendResolved, 'recv:', recvResolved);
          this.transportCreationResolvers = null;
          reject(new Error('Timeout waiting for transports to be created'));
        }
      }, 10000);
    });
  }

  async startCall(): Promise<void> {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported. This usually means the page is not served over HTTPS or the browser does not support WebRTC.');
      }

      // Check if we're in a secure context
      if (!window.isSecureContext) {
        throw new Error('WebRTC requires a secure context (HTTPS). Please access the app over HTTPS or use localhost.');
      }

      console.log('[WebRTC] Requesting user media...');
      
      // Get user media first
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      console.log('[WebRTC] User media obtained successfully');
      this.callState.localStream = this.localStream;
      this.notifyStateChange();

      // RTP capabilities are automatically sent when joining the room
      // Set up transport creation resolvers and create transports
      await this.waitForTransports();

      // Start producing audio and video
      await this.produceAudio();
      await this.produceVideo();

    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  private async produceAudio(): Promise<void> {
    if (!this.sendTransport || !this.localStream) {
      console.warn('Cannot produce audio: sendTransport or localStream not available');
      return;
    }

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      console.warn('No audio track available');
      return;
    }

    try {
      const producer = await this.sendTransport.produce({
        track: audioTrack,
      });

      this.producers.set('audio', producer);
      console.log('Audio producer created successfully');
    } catch (error) {
      console.error('Error creating audio producer:', error);
    }
  }

  private async produceVideo(): Promise<void> {
    if (!this.sendTransport || !this.localStream) {
      console.warn('Cannot produce video: sendTransport or localStream not available');
      return;
    }

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) {
      console.warn('No video track available');
      return;
    }

    try {
      const producer = await this.sendTransport.produce({
        track: videoTrack,
      });

      this.producers.set('video', producer);
      console.log('Video producer created successfully');
    } catch (error) {
      console.error('Error creating video producer:', error);
    }
  }

  private async consume(consumerData: Consumer): Promise<void> {
    console.log(`[FRONTEND] Consuming consumer:`, consumerData);
    
    if (!this.recvTransport || !this.device) {
      console.log(`[FRONTEND] Cannot consume - recvTransport: ${!!this.recvTransport}, device: ${!!this.device}`);
      return;
    }

    try {
      const consumer = await this.recvTransport.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters,
      });

      this.consumers.set(consumerData.id, consumer);
      console.log(`[FRONTEND] Consumer ${consumerData.id} created and stored`);
      console.log(`[FRONTEND] Consumer track:`, consumer.track);
      console.log(`[FRONTEND] Consumer track state:`, consumer.track.readyState);
      console.log(`[FRONTEND] Consumer track enabled:`, consumer.track.enabled);

      // Resume consumer
      this.socket?.emit('resume-consumer', { consumerId: consumerData.id });
      console.log(`[FRONTEND] Requested to resume consumer ${consumerData.id}`);

      // Find the participant ID for this producer
      const participantId = this.findParticipantIdByProducerId(consumerData.producerId);
      console.log(`[FRONTEND] Found participant ID for producer ${consumerData.producerId}:`, participantId);
      
      if (participantId) {
        // Store the track for this participant
        const tracks = this.participantTracks.get(participantId) || {};
        tracks[consumerData.kind] = consumer.track;
        this.participantTracks.set(participantId, tracks);
        
        console.log(`[FRONTEND] Stored ${consumerData.kind} track for participant ${participantId}`);
        console.log(`[FRONTEND] Participant tracks:`, tracks);
        
        // Create or update the stream with all available tracks
        const allTracks = Object.values(tracks).filter(Boolean);
        const stream = new MediaStream(allTracks);
        
        console.log(`[FRONTEND] Created MediaStream with ${allTracks.length} tracks:`, allTracks.map(t => t.kind));
        
        this.remoteStreams.set(participantId, stream);
        this.callState.remoteStreams = new Map(this.remoteStreams);
        console.log(`[FRONTEND] Remote streams updated:`, Array.from(this.remoteStreams.keys()));
        console.log(`[FRONTEND] Stream for participant ${participantId}:`, stream);
        this.notifyStateChange();
      } else {
        console.warn(`[FRONTEND] No participant ID found for producer: ${consumerData.producerId}`);
      }
    } catch (error) {
      console.error(`[FRONTEND] Error consuming consumer ${consumerData.id}:`, error);
    }
  }

  private async consumeNewProducer(data: { producerId: string; participantId: string; kind: string }): Promise<void> {
    console.log(`[FRONTEND] Consuming new producer ${data.producerId} of kind ${data.kind} from participant ${data.participantId}`);
    
    if (!this.device || !this.recvTransport) {
      console.log(`[FRONTEND] Cannot consume - device: ${!!this.device}, recvTransport: ${!!this.recvTransport}. Queuing producer.`);
      this.pendingProducers.push(data);
      return;
    }

    // Map producer ID to participant ID
    this.producerToParticipantMap.set(data.producerId, data.participantId);
    console.log(`[FRONTEND] Mapped producer ${data.producerId} to participant ${data.participantId}`);

    this.socket?.emit('consume', {
      transportId: this.recvTransport.id,
      producerId: data.producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });
  }

  private findParticipantIdByProducerId(producerId: string): string | undefined {
    return this.producerToParticipantMap.get(producerId);
  }

  private async processPendingProducers(): Promise<void> {
    if (this.pendingProducers.length === 0) {
      return;
    }

    console.log(`[FRONTEND] Processing ${this.pendingProducers.length} pending producers`);
    
    const producersToProcess = [...this.pendingProducers];
    this.pendingProducers = [];

    for (const producerData of producersToProcess) {
      await this.consumeNewProducer(producerData);
    }
  }

  toggleMute(): void {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.callState.isMuted = !audioTrack.enabled;
      this.notifyStateChange();
    }
  }

  toggleVideo(): void {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.callState.isVideoEnabled = videoTrack.enabled;
      this.notifyStateChange();
    }
  }

  async leaveCall(): Promise<void> {
    this.socket?.emit('leave-room');
    this.isJoiningRoom = false;
    this.cleanup();
  }

  private cleanup(): void {
    console.log('Cleaning up WebRTC service');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close producers
    this.producers.forEach(producer => producer.close());
    this.producers.clear();

    // Close consumers
    this.consumers.forEach(consumer => consumer.close());
    this.consumers.clear();

    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }

    // Reset state
    this.callState = {
      isInCall: false,
      participants: [],
      remoteStreams: new Map(),
      isMuted: false,
      isVideoEnabled: true,
    };
    this.remoteStreams.clear();
    this.producerToParticipantMap.clear();
    this.participantTracks.clear();
    this.pendingProducers = [];
    this.isJoiningRoom = false;

    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.callState });
    }
  }

  onCallStateChange(callback: (state: CallState) => void): void {
    this.onStateChange = callback;
  }

  getCallState(): CallState {
    return { ...this.callState };
  }
}

export const webRTCService = new WebRTCService();
