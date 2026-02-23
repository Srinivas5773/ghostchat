import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'

function App() {
  const [socket, setSocket] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [currentMessage, setCurrentMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isJoined, setIsJoined] = useState(false)
  const [lastSentMessage, setLastSentMessage] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on('receive_message', (message) => {
      console.log('Received message:', message, 'Last sent:', lastSentMessage);
      if (message !== lastSentMessage) {
        setMessages(prev => [...prev, { id: Date.now(), text: message, isOwn: false }])
      }
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
    socket.emit('send_message', { roomId, message: currentMessage })
    setMessages(prev => [...prev, { id: Date.now(), text: currentMessage, isOwn: true }])
    setCurrentMessage('')
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
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1a1a1a',
          padding: '20px',
          borderBottom: '1px solid #333'
        }}>
          <h1 style={{
            color: 'white',
            margin: 0,
            fontSize: '1.8rem'
          }}>
            GhostChat 👻
          </h1>
        </div>

        {/* Messages Section */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
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
                wordWrap: 'break-word'
              }}>
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
