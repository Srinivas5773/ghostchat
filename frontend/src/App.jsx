import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [currentMessage, setCurrentMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isJoined, setIsJoined] = useState(false)
  const [lastSentMessage, setLastSentMessage] = useState('')
  const [ghostMode, setGhostMode] = useState(false)
  const [ghostTimer, setGhostTimer] = useState(5000)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const newSocket = io("https://ghostchat-fv0m.onrender.com", {
      transports: ["websocket"]
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message) => {
      console.log('Received message:', message, 'Last sent:', lastSentMessage);
      
      // Always handle as normal message (remove ghost mode disappearing logic)
      if (message !== lastSentMessage) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: message, 
          isOwn: false,
          isGhost: false 
        }]);
      }
    })

    newSocket.on('ghost_mode_updated', ({ enabled, timer }) => {
      console.log('Ghost mode updated:', enabled, timer);
      setGhostMode(enabled);
      setGhostTimer(timer);
    })

    newSocket.on('clear_chat', () => {
      console.log('Clear chat received');
      setMessages([]);
    })

    newSocket.on('connect', () => {
      console.log('Connected to server');
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    })

    return () => newSocket.close()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCreateRoom = () => {
    if (!socket) return
    
    const newRoomId = Math.random().toString(36).substring(2, 8)
    setRoomId(newRoomId)
    setIsJoined(true)
    socket.emit('join_room', { roomId: newRoomId })
  }

  const handleJoinRoom = () => {
    if (!socket) return
    
    const inputRoomId = prompt('Enter Room ID:')
    if (inputRoomId && inputRoomId.trim()) {
      setRoomId(inputRoomId.trim())
      setIsJoined(true)
      socket.emit('join_room', { roomId: inputRoomId.trim() })
    }
  }

  const handleSend = () => {
    if (!isJoined || !currentMessage.trim() || !socket) return
    
    console.log('Sending message:', currentMessage, 'to room:', roomId);
    setLastSentMessage(currentMessage);
    
    // Always add message as permanent (remove ghost mode disappearing logic)
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      text: currentMessage, 
      isOwn: true,
      isGhost: false 
    }]);
    
    socket.emit('send_message', { roomId, message: currentMessage });
    setCurrentMessage('');
  }

  const toggleGhostMode = () => {
    if (!socket || !roomId) return
    
    const newMode = !ghostMode;
    setGhostMode(newMode);
    
    socket.emit('toggle_ghost_mode', {
      roomId,
      enabled: newMode,
      timer: ghostTimer
    });
  }

  const clearChat = () => {
    if (!socket || !roomId) return
    
    // Clear local messages
    setMessages([]);
    
    // Notify other user to clear their chat
    socket.emit('clear_chat', { roomId });
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      margin: 0,
      padding: 0,
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Left Sidebar */}
      <div style={{
        width: '30%',
        backgroundColor: '#1a1a1a',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #333'
        }}>
          <h2 style={{
            color: 'white',
            margin: 0,
            fontSize: '1.5rem'
          }}>
            Rooms
          </h2>
        </div>
        <div style={{
          padding: '20px'
        }}>
          <button 
            onClick={handleCreateRoom}
            disabled={isJoined}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isJoined ? '#333' : '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: isJoined ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              marginBottom: '10px',
              opacity: isJoined ? 0.5 : 1
            }}
          >
            Create Room
          </button>
          <button 
            onClick={handleJoinRoom}
            disabled={isJoined}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: isJoined ? '#333' : '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: isJoined ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              opacity: isJoined ? 0.5 : 1
            }}
          >
            Join Room
          </button>
          {isJoined && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              color: '#4a9eff',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              Room: {roomId}
            </div>
          )}
        </div>
      </div>

      {/* Right Chat Area */}
      <div style={{
        width: '70%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '20px',
          borderBottom: '1px solid #333'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
          }}>
            <h1 style={{
              color: 'white',
              margin: 0,
              fontSize: '1.8rem'
            }}>
              GhostChat 👻
            </h1>
            {isJoined && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <button
                  onClick={clearChat}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🗑️ Clear Chat
                </button>
                <button
                  onClick={toggleGhostMode}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: ghostMode ? '#4a9eff' : '#2a2a2a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  👻 Ghost Mode
                </button>
              </div>
            )}
          </div>
          {isJoined && ghostMode && (
            <div style={{
              color: '#4a9eff',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              👻 Ghost Mode ON
            </div>
          )}
        </div>

        {/* Messages Section */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: ghostMode ? 'radial-gradient(ellipse at center, rgba(74, 158, 255, 0.05) 0%, transparent 70%)' : 'transparent'
        }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: 'flex',
              justifyContent: msg.isOwn ? 'flex-end' : 'flex-start'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                backgroundColor: msg.isOwn ? '#4a9eff' : '#2a2a2a',
                color: 'white',
                borderRadius: '18px',
                fontSize: '14px',
                wordWrap: 'break-word',
                position: 'relative',
                boxShadow: ghostMode ? '0 0 20px rgba(74, 158, 255, 0.3), 0 0 40px rgba(74, 158, 255, 0.1)' : 'none',
                border: ghostMode ? '1px solid rgba(74, 158, 255, 0.3)' : 'none',
                animation: ghostMode ? 'twinkle 2s ease-in-out infinite alternate' : 'none'
              }}>
                {ghostMode && (
                  <>
                    <span style={{
                      position: 'absolute',
                      top: '-5px',
                      left: '-5px',
                      fontSize: '10px',
                      animation: 'sparkle 1.5s ease-in-out infinite',
                      animationDelay: '0s'
                    }}>✨</span>
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '-8px',
                      fontSize: '8px',
                      animation: 'sparkle 1.5s ease-in-out infinite',
                      animationDelay: '0.5s'
                    }}>⭐</span>
                    <span style={{
                      position: 'absolute',
                      bottom: '-5px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '9px',
                      animation: 'sparkle 1.5s ease-in-out infinite',
                      animationDelay: '1s'
                    }}>💫</span>
                  </>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '20px',
          borderTop: '1px solid #333',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            disabled={!isJoined}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: isJoined ? '#2a2a2a' : '#1a1a1a',
              color: 'white',
              border: '1px solid #444',
              borderRadius: '25px',
              fontSize: '14px',
              outline: 'none',
              opacity: isJoined ? 1 : 0.5,
              cursor: isJoined ? 'text' : 'not-allowed'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!isJoined || !currentMessage.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: (isJoined && currentMessage.trim()) ? '#4a9eff' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              fontSize: '14px',
              cursor: (isJoined && currentMessage.trim()) ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
              opacity: (isJoined && currentMessage.trim()) ? 1 : 0.5
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
