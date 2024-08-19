import React, { useState, useEffect, useRef } from 'react';
import './recorder.css';

const socketUrl = "ws://127.0.0.1:8000/ws";

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');

    const audioRef = useRef(null);

    useEffect(() => {
        const storedMessages = JSON.parse(localStorage.getItem('chatHistory'));
        if (storedMessages) {
            setMessages(storedMessages);
        }

        const socketInstance = new WebSocket(socketUrl);
        setSocket(socketInstance);

        socketInstance.onopen = () => {
            console.log("WebSocket connected");
        };

        socketInstance.onmessage = handleSocketMessage;

        socketInstance.onclose = () => {
            console.log("WebSocket closed");
        };

        socketInstance.onerror = (error) => {
            console.error("WebSocket error:", error);
            socketInstance.close();
        };

        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }, [messages]);

    const handleSocketMessage = async (event) => {
        if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            if (data.type === "text") {
                setMessages(prev => [...prev, { role: data.role, content: data.content }]);
                setLiveTranscript(data.content);
            } else if (data.type === "audio") {
                try {
                    const response = await fetch(data.content);
                    const audioBlob = await response.blob();
                    playAudio(audioBlob);
                } catch (error) {
                    console.error("Error fetching audio file:", error);
                }
            }
        }
    };

    const playAudio = (audioData) => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
            audioRef.current = null;
        }

        const blob = new Blob([audioData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        const newAudio = new Audio(audioUrl);
        audioRef.current = newAudio;

        setIsSpeaking(true);

        newAudio.oncanplaythrough = () => {
            newAudio.play().catch(error => console.error("Error playing audio:", error));
        };

        newAudio.onended = () => {
            setIsSpeaking(false);
        };

        newAudio.onerror = (event) => console.error("Audio playback error:", event);
    };

    const reloadPage = () => {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        window.location.reload();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0 && socket) {
                    socket.send(event.data);
                }
            };
            mediaRecorder.start(1000);
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            reloadPage();
        } else {
            startRecording();
        }
    };

    const toggleChatHistory = () => {
        setShowHistory(!showHistory);
    };

    return (
        <div className="app">
            <div className="controls">
                <button 
                    onClick={toggleRecording} 
                    className={`record-button ${isRecording ? "recording" : ""}`}
                >
                    {isRecording ? "Stop Recording and Reset" : "Start Recording"}
                </button>
                <button 
                    onClick={toggleChatHistory} 
                    className="toggle-history-button"
                >
                    {showHistory ? "Hide Chat History" : "Show Chat History"}
                </button>
            </div>
            <div className="live-transcript">
                <h3>Live Transcript:</h3>
                <p>{liveTranscript || "Waiting for response..."}</p>
            </div>
            {showHistory && (
                <div className="chat-container">
                    <div className="transcriptions">
                        {messages.map((message, index) => (
                            <div 
                                key={index} 
                                className={`message-container ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
                            >
                                <div className={`message-role ${message.role}`}>{message.role === 'user' ? 'You' : 'Bot'}</div>
                                <div className="message-content">{message.content}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
