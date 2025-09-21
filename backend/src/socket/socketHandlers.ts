import { Socket } from 'socket.io';
import { roomService } from '../services/room.js';
import { mediaSoupService } from '../services/mediasoup.js';
import { Participant } from '../types/index.js';

export class SocketHandlers {
  private socket: Socket;
  private currentRoomId?: string;
  private currentParticipantId?: string;
  private router?: any;

  constructor(socket: Socket) {
    this.socket = socket;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.socket.on('join-room', this.handleJoinRoom.bind(this));
    this.socket.on('leave-room', this.handleLeaveRoom.bind(this));
    this.socket.on('get-rtp-capabilities', this.handleGetRtpCapabilities.bind(this));
    this.socket.on('create-transport', this.handleCreateTransport.bind(this));
    this.socket.on('connect-transport', this.handleConnectTransport.bind(this));
    this.socket.on('produce', this.handleProduce.bind(this));
    this.socket.on('consume', this.handleConsume.bind(this));
    this.socket.on('resume-consumer', this.handleResumeConsumer.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
  }

  private async handleJoinRoom(data: { roomId: string; participantName: string }): Promise<void> {
    try {
      const { roomId, participantName } = data;
      console.log(`[JOIN-ROOM] Socket ${this.socket.id} attempting to join room ${roomId} as ${participantName}`);
      console.log(`[JOIN-ROOM] Current socket state - roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
      
      // Check if room exists
      const room = roomService.getRoom(roomId);
      if (!room) {
        console.log(`[JOIN-ROOM] Room ${roomId} not found`);
        this.socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if this socket is already in a room
      if (this.currentRoomId && this.currentRoomId !== roomId) {
        console.log(`[JOIN-ROOM] Socket ${this.socket.id} is already in room ${this.currentRoomId}, leaving first`);
        await this.handleLeaveRoom();
      }

      // Add participant to room (will return existing if already exists)
      const participant = await roomService.addParticipant(roomId, participantName, this.socket.id);
      this.currentRoomId = roomId;
      this.currentParticipantId = participant.id;

      // Get or create router for room
      this.router = await roomService.getOrCreateRouterForRoom(roomId);
      console.log(`[JOIN-ROOM] Router for room ${roomId}:`, this.router ? 'created/found' : 'failed');

      // Send RTP capabilities immediately after joining
      if (this.router) {
        console.log(`[JOIN-ROOM] Sending RTP capabilities to participant ${participant.id}`);
        this.socket.emit('rtp-capabilities', { rtpCapabilities: this.router.rtpCapabilities });
      }

      // Notify participant of successful join
      const allParticipants = roomService.getAllParticipants(roomId);
      console.log(`[JOIN-ROOM] Room ${roomId} now has ${allParticipants.length} participants:`, allParticipants.map(p => `${p.name}(${p.id})`));
      
      this.socket.emit('room-joined', {
        roomId,
        participantId: participant.id,
        participants: allParticipants,
      });

      // Notify other participants
      this.socket.to(roomId).emit('participant-joined', {
        participant: {
          id: participant.id,
          name: participant.name,
        },
      });

      // Join socket room for broadcasting
      this.socket.join(roomId);

      // Notify new participant about existing producers
      const existingParticipants = roomService.getAllParticipants(roomId);
      console.log(`[JOIN-ROOM] Existing participants in room ${roomId}:`, existingParticipants.length);
      for (const existingParticipant of existingParticipants) {
        if (existingParticipant.id !== participant.id) {
          console.log(`[JOIN-ROOM] Sending existing producers from participant ${existingParticipant.id}:`, existingParticipant.producers.size);
          // Send existing producers to the new participant
          for (const [producerId, producer] of existingParticipant.producers) {
            console.log(`[JOIN-ROOM] Sending producer ${producerId} of kind ${producer.kind} from participant ${existingParticipant.id}`);
            this.socket.emit('new-producer', {
              producerId: producerId,
              participantId: existingParticipant.id,
              kind: producer.kind,
            });
          }
        }
      }

    } catch (error) {
      console.error('[JOIN-ROOM] Error joining room:', error);
      this.socket.emit('error', { message: 'Failed to join room' });
    }
  }

  private async handleLeaveRoom(): Promise<void> {
    console.log(`handleLeaveRoom called for socket ${this.socket.id}, room: ${this.currentRoomId}, participant: ${this.currentParticipantId}`);
    if (this.currentRoomId && this.currentParticipantId) {
      roomService.removeParticipant(this.currentRoomId, this.currentParticipantId);
      
      this.socket.to(this.currentRoomId).emit('participant-left', {
        participantId: this.currentParticipantId,
      });

      this.socket.leave(this.currentRoomId);
      this.currentRoomId = undefined;
      this.currentParticipantId = undefined;
    }
  }

  private async handleGetRtpCapabilities(): Promise<void> {
    try {
      if (!this.router) {
        this.socket.emit('error', { message: 'No router available' });
        return;
      }

      const rtpCapabilities = this.router.rtpCapabilities;
      this.socket.emit('rtp-capabilities', { rtpCapabilities });
    } catch (error) {
      console.error('Error getting RTP capabilities:', error);
      this.socket.emit('error', { message: 'Failed to get RTP capabilities' });
    }
  }

  private async handleCreateTransport(data: { direction: 'send' | 'recv' }): Promise<void> {
    try {
      console.log(`[CREATE-TRANSPORT] Creating ${data.direction} transport for socket ${this.socket.id}, participant ${this.currentParticipantId}`);
      
      if (!this.router) {
        console.log(`[CREATE-TRANSPORT] No router available for socket ${this.socket.id}`);
        this.socket.emit('error', { message: 'No router available' });
        return;
      }

      if (!this.currentRoomId || !this.currentParticipantId) {
        console.log(`[CREATE-TRANSPORT] Not in a room - roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
        this.socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const transport = await mediaSoupService.createWebRtcTransport(this.router);
      console.log(`[CREATE-TRANSPORT] Created ${data.direction} transport ${transport.id} for participant ${this.currentParticipantId}:`, transport);
      
      // Store transport in participant
      const participant = roomService.getParticipant(this.currentRoomId, this.currentParticipantId);
      if (participant) {
        participant.transports.set(transport.id, transport);
        console.log(`[CREATE-TRANSPORT] Stored transport ${transport.id} in participant ${this.currentParticipantId}. Total transports: ${participant.transports.size}`);
      } else {
        console.log(`[CREATE-TRANSPORT] Participant ${this.currentParticipantId} not found in room ${this.currentRoomId}`);
      }

      this.socket.emit('transport-created', {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        direction: data.direction,
      });
      
      console.log(`[CREATE-TRANSPORT] Sent transport-created event for ${data.direction} transport ${transport.id}`);
    } catch (error) {
      console.error('[CREATE-TRANSPORT] Error creating transport:', error);
      this.socket.emit('error', { message: 'Failed to create transport' });
    }
  }

  private async handleConnectTransport(data: { transportId: string; dtlsParameters: any }): Promise<void> {
    try {
      console.log(`[CONNECT-TRANSPORT] Connecting transport ${data.transportId} for participant ${this.currentParticipantId}`);
      
      if (!this.currentRoomId || !this.currentParticipantId) {
        console.log(`[CONNECT-TRANSPORT] Not in a room - roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
        this.socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const participant = roomService.getParticipant(this.currentRoomId, this.currentParticipantId);
      if (!participant) {
        console.log(`[CONNECT-TRANSPORT] Participant ${this.currentParticipantId} not found in room ${this.currentRoomId}`);
        this.socket.emit('error', { message: 'Participant not found' });
        return;
      }

      const transport = participant.transports.get(data.transportId);
      if (!transport) {
        console.log(`[CONNECT-TRANSPORT] Transport ${data.transportId} not found for participant ${this.currentParticipantId}. Available transports:`, Array.from(participant.transports.keys()));
        this.socket.emit('error', { message: 'Transport not found' });
        return;
      }

      await transport.connect({ dtlsParameters: data.dtlsParameters });
      console.log(`[CONNECT-TRANSPORT] Successfully connected transport ${data.transportId} for participant ${this.currentParticipantId}`);
      this.socket.emit('transport-connected', { transportId: data.transportId });
    } catch (error) {
      console.error('[CONNECT-TRANSPORT] Error connecting transport:', error);
      this.socket.emit('error', { message: 'Failed to connect transport' });
    }
  }

  private async handleProduce(data: { transportId: string; kind: 'audio' | 'video'; rtpParameters: any }): Promise<void> {
    try {
      console.log(`[PRODUCE] Creating ${data.kind} producer for participant ${this.currentParticipantId} on transport ${data.transportId}`);
      
      if (!this.currentRoomId || !this.currentParticipantId) {
        console.log(`[PRODUCE] Not in a room - roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
        this.socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const participant = roomService.getParticipant(this.currentRoomId, this.currentParticipantId);
      if (!participant) {
        console.log(`[PRODUCE] Participant ${this.currentParticipantId} not found in room ${this.currentRoomId}`);
        this.socket.emit('error', { message: 'Participant not found' });
        return;
      }

      const transport = participant.transports.get(data.transportId);
      if (!transport) {
        console.log(`[PRODUCE] Transport ${data.transportId} not found for participant ${this.currentParticipantId}. Available transports:`, Array.from(participant.transports.keys()));
        this.socket.emit('error', { message: 'Transport not found' });
        return;
      }

      const producer = await transport.produce({
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      participant.producers.set(producer.id, producer);
      console.log(`[PRODUCE] Producer created: ${producer.id} of kind ${producer.kind} for participant ${this.currentParticipantId}. Total producers: ${participant.producers.size}`);

      this.socket.emit('producer-created', {
        id: producer.id,
        kind: producer.kind,
      });

      // Notify other participants about new producer
      console.log(`[PRODUCE] Notifying other participants in room ${this.currentRoomId} about new producer ${producer.id} from participant ${this.currentParticipantId}`);
      this.socket.to(this.currentRoomId).emit('new-producer', {
        producerId: producer.id,
        participantId: this.currentParticipantId,
        kind: producer.kind,
      });

    } catch (error) {
      console.error('[PRODUCE] Error producing:', error);
      this.socket.emit('error', { message: 'Failed to produce' });
    }
  }

  private async handleConsume(data: { transportId: string; producerId: string; rtpCapabilities: any }): Promise<void> {
    try {
      console.log(`[CONSUME] Creating consumer for producer ${data.producerId} on transport ${data.transportId} for participant ${this.currentParticipantId}`);
      
      if (!this.router || !this.currentRoomId || !this.currentParticipantId) {
        console.log(`[CONSUME] Missing requirements - router: ${!!this.router}, roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
        this.socket.emit('error', { message: 'No router or not in room' });
        return;
      }

      const participant = roomService.getParticipant(this.currentRoomId, this.currentParticipantId);
      if (!participant) {
        console.log(`[CONSUME] Participant ${this.currentParticipantId} not found in room ${this.currentRoomId}`);
        this.socket.emit('error', { message: 'Participant not found' });
        return;
      }

      const transport = participant.transports.get(data.transportId);
      if (!transport) {
        console.log(`[CONSUME] Transport ${data.transportId} not found for participant ${this.currentParticipantId}. Available transports:`, Array.from(participant.transports.keys()));
        this.socket.emit('error', { message: 'Transport not found' });
        return;
      }

      // Check if we can consume this producer
      if (!this.router.canConsume({ producerId: data.producerId, rtpCapabilities: data.rtpCapabilities })) {
        console.log(`[CONSUME] Cannot consume producer ${data.producerId} with provided RTP capabilities`);
        this.socket.emit('error', { message: 'Cannot consume this producer' });
        return;
      }

      const consumer = await transport.consume({
        producerId: data.producerId,
        rtpCapabilities: data.rtpCapabilities,
        paused: true,
      });

      participant.consumers.set(consumer.id, consumer);
      console.log(`[CONSUME] Consumer created: ${consumer.id} for producer ${consumer.producerId} of kind ${consumer.kind} for participant ${this.currentParticipantId}. Total consumers: ${participant.consumers.size}`);
      console.log(`[CONSUME] Consumer RTP parameters:`, consumer.rtpParameters);
      console.log(`[CONSUME] Consumer paused:`, consumer.paused);

      this.socket.emit('consumer-created', {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });

    } catch (error) {
      console.error('[CONSUME] Error consuming:', error);
      this.socket.emit('error', { message: 'Failed to consume' });
    }
  }

  private async handleResumeConsumer(data: { consumerId: string }): Promise<void> {
    try {
      console.log(`[RESUME-CONSUMER] Resuming consumer ${data.consumerId} for participant ${this.currentParticipantId}`);
      
      if (!this.currentRoomId || !this.currentParticipantId) {
        console.log(`[RESUME-CONSUMER] Not in a room - roomId: ${this.currentRoomId}, participantId: ${this.currentParticipantId}`);
        this.socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const participant = roomService.getParticipant(this.currentRoomId, this.currentParticipantId);
      if (!participant) {
        console.log(`[RESUME-CONSUMER] Participant ${this.currentParticipantId} not found in room ${this.currentRoomId}`);
        this.socket.emit('error', { message: 'Participant not found' });
        return;
      }

      const consumer = participant.consumers.get(data.consumerId);
      if (!consumer) {
        console.log(`[RESUME-CONSUMER] Consumer ${data.consumerId} not found for participant ${this.currentParticipantId}. Available consumers:`, Array.from(participant.consumers.keys()));
        this.socket.emit('error', { message: 'Consumer not found' });
        return;
      }

      await consumer.resume();
      console.log(`[RESUME-CONSUMER] Successfully resumed consumer ${data.consumerId} for participant ${this.currentParticipantId}`);
      this.socket.emit('consumer-resumed', { consumerId: data.consumerId });

    } catch (error) {
      console.error('[RESUME-CONSUMER] Error resuming consumer:', error);
      this.socket.emit('error', { message: 'Failed to resume consumer' });
    }
  }

  private handleDisconnect(): void {
    console.log(`Socket ${this.socket.id} disconnected, cleaning up room ${this.currentRoomId}, participant ${this.currentParticipantId}`);
    this.handleLeaveRoom();
  }
}
