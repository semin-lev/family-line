import React from 'react';
import { AlertCircle, Wifi, Shield } from 'lucide-react';

interface WebRTCErrorProps {
  error: string;
  onRetry?: () => void;
}

export const WebRTCError: React.FC<WebRTCErrorProps> = ({ error, onRetry }) => {
  const isHttpsError = error.includes('secure context') || error.includes('HTTPS');
  const isNetworkError = error.includes('network') || error.includes('connect');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isHttpsError ? (
            <Shield className="w-8 h-8 text-red-600" />
          ) : isNetworkError ? (
            <Wifi className="w-8 h-8 text-red-600" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-600" />
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isHttpsError ? 'HTTPS Required' : isNetworkError ? 'Connection Error' : 'WebRTC Error'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {error}
        </p>
        
        {isHttpsError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-yellow-800 mb-2">Solutions:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Use <code className="bg-yellow-100 px-1 rounded">localhost:3000</code> instead of IP address</li>
              <li>• Enable HTTPS in development (see HTTPS_SETUP.md)</li>
              <li>• Use ngrok for HTTPS tunneling</li>
            </ul>
          </div>
        )}
        
        {isNetworkError && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-800 mb-2">Check:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Backend server is running on port 3001</li>
              <li>• Firewall allows connections to port 3001</li>
              <li>• Network connectivity between devices</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Try Again
            </button>
          )}
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
};
