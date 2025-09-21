import React, { useState, useEffect } from 'react';

export const DebugInfo: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const info = {
      currentLocation: {
        href: window.location.href,
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
      },
      environment: {
        VITE_API_URL: import.meta.env.VITE_API_URL,
        VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
        VITE_BACKEND_PORT: import.meta.env.VITE_BACKEND_PORT,
      },
      generatedUrls: {
        apiUrl: `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_BACKEND_PORT || '3001'}`,
        socketUrl: `${window.location.protocol}//${window.location.hostname}:${import.meta.env.VITE_BACKEND_PORT || '3001'}`,
      },
      webrtcSupport: {
        isSecureContext: window.isSecureContext,
        hasMediaDevices: !!navigator.mediaDevices,
        hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        userAgent: navigator.userAgent,
      }
    };
    setDebugInfo(info);
  }, []);

  if (!debugInfo) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Debug Info</h4>
      <div>
        <strong>Current Location:</strong>
        <pre style={{ margin: '5px 0', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.currentLocation, null, 2)}
        </pre>
      </div>
      <div>
        <strong>Environment:</strong>
        <pre style={{ margin: '5px 0', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.environment, null, 2)}
        </pre>
      </div>
      <div>
        <strong>Generated URLs:</strong>
        <pre style={{ margin: '5px 0', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.generatedUrls, null, 2)}
        </pre>
      </div>
      <div>
        <strong>WebRTC Support:</strong>
        <pre style={{ margin: '5px 0', fontSize: '10px' }}>
          {JSON.stringify(debugInfo.webrtcSupport, null, 2)}
        </pre>
      </div>
    </div>
  );
};
