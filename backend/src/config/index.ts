import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  serverHost: process.env.SERVER_HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://webrtc-fe-app-aqdwe.ondigitalocean.app' : true),
  mediasoup: {
    minPort: parseInt(process.env.MEDIASOUP_MIN_PORT || '40000'),
    maxPort: parseInt(process.env.MEDIASOUP_MAX_PORT || '49999'),
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || (process.env.NODE_ENV === 'production' ? 'webrtc-fe-app-aqdwe.ondigitalocean.app' : '0.0.0.0'),
  },
};
