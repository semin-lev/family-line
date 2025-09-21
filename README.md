# WebRTC Calling App

A modern audio/video calling application built with React, Node.js, and mediasoup WebRTC server. This app allows users to create video calls and share links for others to join with unlimited participants.

## Features

- 🎥 **Video & Audio Calls**: High-quality WebRTC video and audio communication
- 🔗 **Easy Sharing**: Create rooms and share links for others to join
- 👥 **Unlimited Participants**: Support for multiple participants in a single call
- 🎛️ **Call Controls**: Mute/unmute audio, enable/disable video
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🚀 **Modern Stack**: Built with React 18, TypeScript, and Node.js

## Tech Stack

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **mediasoup** for WebRTC server
- **Socket.IO** for real-time communication
- **UUID** for room ID generation

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **mediasoup-client** for WebRTC client
- **Socket.IO Client** for real-time communication

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Modern web browser with WebRTC support

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd webrtc-calling-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the backend directory:
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit the `.env` file with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   MEDIASOUP_MIN_PORT=40000
   MEDIASOUP_MAX_PORT=49999
   MEDIASOUP_ANNOUNCED_IP=127.0.0.1
   ```

   Create a `.env` file in the frontend directory:
   ```bash
   cd frontend
   cp .env.example .env
   ```
   
   Edit the `.env` file:
   ```env
   VITE_API_URL=http://localhost:3001
   VITE_SOCKET_URL=http://localhost:3001
   ```

## Development

### Start Development Servers

From the root directory, run:
```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 3000) servers concurrently.

### Individual Server Commands

**Backend only:**
```bash
npm run dev:backend
```

**Frontend only:**
```bash
npm run dev:frontend
```

## Production Build

1. **Build both applications:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## Usage

1. **Create a Call**
   - Open the app in your browser (http://localhost:3000)
   - Enter a room name
   - Click "Create Room"
   - Copy the generated join link

2. **Join a Call**
   - Click on a join link or navigate to `/join/{roomId}`
   - Enter your name
   - Click "Join Call"

3. **During the Call**
   - Use the microphone button to mute/unmute audio
   - Use the video button to enable/disable video
   - Use the phone button to leave the call
   - Copy or share the join link with others

## API Endpoints

### Rooms
- `POST /api/rooms/create` - Create a new room
- `GET /api/rooms/:roomId` - Get room information
- `GET /api/rooms/:roomId/exists` - Check if room exists

### Health
- `GET /health` - Health check endpoint

## WebSocket Events

### Client to Server
- `join-room` - Join a room
- `leave-room` - Leave current room
- `get-rtp-capabilities` - Get RTP capabilities
- `create-transport` - Create WebRTC transport
- `connect-transport` - Connect transport
- `produce` - Start producing media
- `consume` - Start consuming media
- `resume-consumer` - Resume a consumer

### Server to Client
- `room-joined` - Successfully joined room
- `participant-joined` - New participant joined
- `participant-left` - Participant left
- `rtp-capabilities` - RTP capabilities received
- `transport-created` - Transport created
- `transport-connected` - Transport connected
- `producer-created` - Producer created
- `consumer-created` - Consumer created
- `new-producer` - New producer available
- `error` - Error occurred

## Architecture

### Backend Architecture
```
backend/
├── src/
│   ├── config/          # Configuration
│   ├── services/        # Business logic
│   │   ├── mediasoup.ts # MediaSoup service
│   │   └── room.ts      # Room management
│   ├── socket/          # WebSocket handlers
│   ├── routes/          # REST API routes
│   ├── types/           # TypeScript types
│   └── index.ts         # Main server file
├── package.json
└── tsconfig.json
```

### Frontend Architecture
```
frontend/
├── src/
│   ├── components/      # React components
│   ├── services/        # API and WebRTC services
│   ├── types/           # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── package.json
└── vite.config.ts
```

## Configuration

### MediaSoup Configuration
The MediaSoup server is configured with the following codecs:
- **Audio**: Opus (48kHz, 2 channels)
- **Video**: VP8, VP9, H.264

### Network Configuration
- **UDP/TCP**: Both protocols supported
- **ICE**: Interactive Connectivity Establishment
- **DTLS**: Datagram Transport Layer Security

## Troubleshooting

### Common Issues

1. **Camera/Microphone Access**
   - Ensure browser permissions are granted
   - Check if other applications are using the camera/microphone

2. **Connection Issues**
   - Verify firewall settings
   - Check if ports 3001 and 40000-49999 are accessible
   - Ensure WebRTC is supported in your browser

3. **Audio/Video Quality**
   - Check network bandwidth
   - Verify camera/microphone quality
   - Consider adjusting MediaSoup codec settings

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Search existing issues
3. Create a new issue with detailed information

---

Built with ❤️ using modern web technologies
