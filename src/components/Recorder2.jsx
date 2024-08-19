import React, { useState, useEffect, useRef } from 'react';
import './recorder.css';

const socketUrl = "ws://127.0.0.1:8000/ws";

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const audioRef = useRef(null);

    // Load chat history from localStorage when the component mounts
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

    // Save chat history to localStorage whenever messages are updated
    useEffect(() => {
        localStorage.setItem('chatHistory', JSON.stringify(messages));
    }, [messages]);

    const handleSocketMessage = async (event) => {
        if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            if (data.type === "text") {
                setMessages(prev => [...prev, { role: data.role, content: data.content }]);
            } else if (data.type === "audio") {
                console.log("Fetching audio from:", data.content);
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
        // Stop the previous audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = ""; // Reset the source to ensure it stops
            audioRef.current = null;
        }

        const blob = new Blob([audioData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);

        // Create a new audio element
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
        // Save chat history to localStorage before reloading
        localStorage.setItem('chatHistory', JSON.stringify(messages));
        window.location.reload(); // Reload the page
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
            // Save chat history and reload page when stopping recording
            reloadPage();
        } else {
            startRecording();
        }
    };

    return (
        <div className="app">
            <button 
                onClick={toggleRecording} 
                className={`record-button ${isRecording ? "recording" : ""}`}
            >
                {isRecording ? "Stop Recording and Reset" : "Start Recording"}
            </button>
            <div className="transcriptions">
                {messages.map((message, index) => (
                    <div key={index} className={message.role}>
                        {message.content}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
