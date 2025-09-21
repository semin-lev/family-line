import { v4 as uuidv4 } from 'uuid';
import { Room, Participant } from '../types/index.js';
import { mediaSoupService } from './mediasoup.js';

class RoomService {
  private rooms: Map<string, Room> = new Map();
  private roomRouters: Map<string, any> = new Map();

  createRoom(name: string): Room {
    const roomId = uuidv4();
    const room: Room = {
      id: roomId,
      name,
      createdAt: new Date(),
      participants: new Map(),
    };

    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId} (${name})`);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  async addParticipant(roomId: string, participantName: string, socketId: string): Promise<Participant> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if participant with this socket ID already exists
    for (const [participantId, participant] of room.participants) {
      if (participant.socketId === socketId) {
        console.log(`Participant with socket ${socketId} already exists in room ${roomId}, returning existing participant`);
        return participant;
      }
    }

    const participantId = uuidv4();
    const participant: Participant = {
      id: participantId,
      name: participantName,
      socketId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
    };

    room.participants.set(participantId, participant);
    console.log(`Participant ${participantName} joined room ${roomId} with ID ${participantId}`);
    return participant;
  }

  removeParticipant(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    const participant = room.participants.get(participantId);
    if (participant) {
      // Close all transports
      participant.transports.forEach(transport => {
        transport.close();
      });

      room.participants.delete(participantId);
      console.log(`Participant ${participant.name} left room ${roomId}`);
    }

    // Clean up empty rooms
    if (room.participants.size === 0) {
      this.rooms.delete(roomId);
      // Also clean up the router for this room
      const router = this.roomRouters.get(roomId);
      if (router) {
        router.close();
        this.roomRouters.delete(roomId);
      }
      console.log(`Room ${roomId} deleted (no participants)`);
    }
  }

  getParticipant(roomId: string, participantId: string): Participant | undefined {
    const room = this.rooms.get(roomId);
    return room?.participants.get(participantId);
  }

  getAllParticipants(roomId: string): Participant[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  async getOrCreateRouterForRoom(roomId: string): Promise<any> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Check if router already exists for this room
    let router = this.roomRouters.get(roomId);
    if (!router) {
      router = await mediaSoupService.createRouter();
      this.roomRouters.set(roomId, router);
    }
    return router;
  }

  getRouterForRoom(roomId: string): any {
    return this.roomRouters.get(roomId);
  }

  async createRouterForRoom(roomId: string): Promise<any> {
    return this.getOrCreateRouterForRoom(roomId);
  }
}

export const roomService = new RoomService();
