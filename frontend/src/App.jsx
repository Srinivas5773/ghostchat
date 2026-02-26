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
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showScrollButtons, setShowScrollButtons] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    const newSocket = io("https://ghostchat-fv0m.onrender.com", {
      transports: ["websocket"]
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message) => {
      console.log('Received message:', message, 'Last sent:', lastSentMessage);
      
      // Handle as object or string
      const messageText = message.text || message;
      
      if (messageText !== lastSentMessage) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: messageText,
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

    newSocket.on('typing', () => {
      console.log('Other user is typing');
      setOtherUserTyping(true);
    })

    newSocket.on('stop_typing', () => {
      console.log('Other user stopped typing');
      setOtherUserTyping(false);
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

  const handleTyping = () => {
    if (!isTyping && socket && roomId) {
      setIsTyping(true);
      socket.emit('typing', { roomId });
    }
  }

  const handleStopTyping = () => {
    if (isTyping && socket && roomId) {
      setIsTyping(false);
      socket.emit('stop_typing', { roomId });
    }
  }

  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'],
    'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️'],
    'Animals': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈'],
    'Food': ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🧂'],
    'Activities': ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'],
    'Objects': ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '🚀', '✈️', '🛩️', '🛫', '🛬', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁'],
    'Symbols': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '👁️‍🗨️', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '⚪', '⚫', '🔴', '🔵', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄']
  }

  const insertEmoji = (emoji) => {
    setCurrentMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }

  const scrollUp = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollBy({
        top: -200,
        behavior: 'smooth'
      });
    }
  }

  const scrollDown = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollBy({
        top: 200,
        behavior: 'smooth'
      });
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isScrollable = scrollHeight > clientHeight;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
      
      setShowScrollButtons(isScrollable && !isAtBottom);
    }
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
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: ghostMode ? 'radial-gradient(ellipse at center, rgba(74, 158, 255, 0.05) 0%, transparent 70%)' : 'transparent',
            position: 'relative'
          }}
        >
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
          {otherUserTyping && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start'
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                backgroundColor: ghostMode ? 'rgba(74, 158, 255, 0.1)' : '#2a2a2a',
                color: ghostMode ? '#4a9eff' : '#888',
                borderRadius: '18px',
                fontSize: '14px',
                fontStyle: 'italic',
                position: 'relative',
                boxShadow: ghostMode ? '0 0 15px rgba(74, 158, 255, 0.2)' : 'none',
                border: ghostMode ? '1px solid rgba(74, 158, 255, 0.2)' : 'none',
                animation: ghostMode ? 'twinkle 1.5s ease-in-out infinite alternate' : 'none'
              }}>
                {ghostMode ? (
                  <>
                    <span style={{
                      position: 'absolute',
                      top: '-3px',
                      left: '-3px',
                      fontSize: '8px',
                      animation: 'sparkle 1s ease-in-out infinite'
                    }}>👻</span>
                    <span style={{ marginLeft: '8px' }}>A ghost is typing...</span>
                  </>
                ) : (
                  'User is typing...'
                )}
              </div>
            </div>
          )}
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
            onChange={(e) => {
              setCurrentMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            onBlur={handleStopTyping}
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
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!isJoined}
            style={{
              padding: '12px',
              backgroundColor: isJoined ? '#2a2a2a' : '#1a1a1a',
              color: isJoined ? '#4a9eff' : '#666',
              border: isJoined ? '1px solid #444' : '1px solid #333',
              borderRadius: '50%',
              fontSize: '20px',
              cursor: isJoined ? 'pointer' : 'not-allowed',
              opacity: isJoined ? 1 : 0.5,
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            😊
          </button>
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
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div style={{
            position: 'absolute',
            bottom: '80px',
            right: '20px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            borderRadius: '12px',
            padding: '10px',
            maxWidth: '350px',
            maxHeight: '300px',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            zIndex: 1000
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              borderBottom: '1px solid #333',
              paddingBottom: '5px'
            }}>
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>Emojis</span>
              <button
                onClick={() => setShowEmojiPicker(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '0'
                }}
              >
                ✕
              </button>
            </div>
            
            {Object.entries(emojiCategories).map(([category, emojis]) => (
              <div key={category} style={{ marginBottom: '10px' }}>
                <div style={{
                  color: '#4a9eff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '5px',
                  textTransform: 'uppercase'
                }}>
                  {category}
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '5px'
                }}>
                  {emojis.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => insertEmoji(emoji)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        padding: '5px',
                        borderRadius: '4px',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#333';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Scroll Buttons */}
        {showScrollButtons && (
          <div style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 100
          }}>
            <button
              onClick={scrollUp}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(74, 158, 255, 0.9)',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(74, 158, 255, 1)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ↑
            </button>
            <button
              onClick={scrollToBottom}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(74, 158, 255, 0.9)',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(74, 158, 255, 1)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(74, 158, 255, 0.9)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ↓
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
