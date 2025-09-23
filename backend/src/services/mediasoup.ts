import mediasoup from 'mediasoup';
import type { Worker, Router, WebRtcTransport, Producer, Consumer } from 'mediasoup/node/lib/types';
import { config } from '../config/index.js';

class MediaSoupService {
  private workers: Worker[] = [];
  private nextWorkerIndex = 0;

  async initialize(): Promise<void> {
    const numWorkers = 1; // For simplicity, using single worker
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: config.mediasoup.minPort,
        rtcMaxPort: config.mediasoup.maxPort,
        dtlsCertificateFile: undefined,
        dtlsPrivateKeyFile: undefined,
      });

      worker.on('died', () => {
        console.error('MediaSoup worker died, exiting in 2 seconds...');
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
    }

    console.log(`MediaSoup service initialized with ${numWorkers} workers`);
  }

  getWorker(): Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRouter(): Promise<Router> {
    const worker = this.getWorker();
    return await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });
  }

  async createWebRtcTransport(router: Router): Promise<WebRtcTransport> {
    console.log(`[MEDIASOUP] Creating WebRTC transport with announced IP: ${config.mediasoup.announcedIp}`);
    const transport = await router.createWebRtcTransport({
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: config.mediasoup.announcedIp,
        },
      ],
      enableUdp: false,
      enableTcp: true,
      preferUdp: false,
    });
    
    // Log transport details for debugging
    console.log(`[MEDIASOUP] Transport created - ID: ${transport.id}`);
    console.log(`[MEDIASOUP] Transport ICE candidates:`, transport.iceCandidates.map(candidate => ({
      foundation: candidate.foundation,
      priority: candidate.priority,
      ip: candidate.ip,
      protocol: candidate.protocol,
      port: candidate.port,
      type: candidate.type
    })));
    console.log(`[MEDIASOUP] Transport ICE parameters:`, {
      usernameFragment: transport.iceParameters.usernameFragment,
      password: transport.iceParameters.password
    });
    console.log(`[MEDIASOUP] Transport DTLS parameters:`, {
      role: transport.dtlsParameters.role,
      fingerprints: transport.dtlsParameters.fingerprints
    });
    
    return transport;
  }

  async createProducer(
    transport: WebRtcTransport,
    rtpParameters: any,
    kind: 'audio' | 'video'
  ): Promise<Producer> {
    return await transport.produce({
      kind,
      rtpParameters,
    });
  }

  async createConsumer(
    router: Router,
    transport: WebRtcTransport,
    producerId: string,
    rtpCapabilities: any
  ): Promise<Consumer> {
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume this producer');
    }

    return await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map(worker => worker.close()));
  }
}

export const mediaSoupService = new MediaSoupService();
