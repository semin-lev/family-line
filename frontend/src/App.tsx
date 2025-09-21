import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CreateRoom } from './components/CreateRoom';
import { JoinRoom } from './components/JoinRoom';
import { VideoCall } from './components/VideoCall';
import { DebugInfo } from './components/DebugInfo';
import { CreateRoomResponse } from './types';

function App() {
  const handleRoomCreated = (room: CreateRoomResponse) => {
    // Room creation is handled in the CreateRoom component
    console.log('Room created:', room);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <DebugInfo />
        <Routes>
          <Route 
            path="/" 
            element={
              <div className="min-h-screen flex items-center justify-center">
                <CreateRoom onRoomCreated={handleRoomCreated} />
              </div>
            } 
          />
          <Route path="/join/:roomId" element={<JoinRoom />} />
          <Route path="/call/:roomId" element={<VideoCall />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
