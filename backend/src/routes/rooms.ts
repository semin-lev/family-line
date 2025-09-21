import { Router, Request, Response } from 'express';
import { roomService } from '../services/room.js';
import { CreateRoomRequest, JoinRoomRequest } from '../types/index.js';

const router = Router();

// Create a new room
router.post('/create', async (req: Request<{}, {}, CreateRoomRequest>, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = roomService.createRoom(name.trim());
    
    res.status(201).json({
      roomId: room.id,
      roomName: room.name,
      joinPath: `/join/${room.id}`,
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room information
router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomService.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const participants = roomService.getAllParticipants(roomId);
    
    res.json({
      roomId: room.id,
      roomName: room.name,
      createdAt: room.createdAt,
      participantCount: participants.length,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name,
      })),
    });
  } catch (error) {
    console.error('Error getting room:', error);
    res.status(500).json({ error: 'Failed to get room information' });
  }
});

// Validate room exists (for joining)
router.get('/:roomId/exists', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    console.log(`[ROOMS] Checking room existence for: ${roomId}`);
    console.log(`[ROOMS] Request from: ${req.ip} (${req.get('x-forwarded-for') || req.connection.remoteAddress})`);
    console.log(`[ROOMS] User-Agent: ${req.get('user-agent')}`);
    console.log(`[ROOMS] Origin: ${req.get('origin')}`);
    
    const room = roomService.getRoom(roomId);
    const exists = !!room;
    
    console.log(`[ROOMS] Room ${roomId} exists: ${exists}`);
    res.json({ exists });
  } catch (error) {
    console.error('Error checking room existence:', error);
    res.status(500).json({ error: 'Failed to check room existence' });
  }
});

export default router;
