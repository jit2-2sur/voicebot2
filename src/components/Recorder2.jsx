import React, { useState, useEffect } from 'react';
import './recorder.css';

const socketUrl = "ws://127.0.0.1:8000/ws";

const App = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [microphone, setMicrophone] = useState(null);
    const [messages, setMessages] = useState([]);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
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
        } else if (event.data instanceof Blob) {
            playAudio(event.data);
        }
    };
    
    const playAudio = (audioData) => {
        const blob = new Blob([audioData], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
    
        audio.oncanplaythrough = () => audio.play().catch(error => console.error("Error playing audio:", error));
        audio.onerror = (event) => console.error("Audio playback error:", event);
    };

    const getMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return new MediaRecorder(stream, { mimeType: "audio/webm" });
        } catch (error) {
            console.error("Error accessing microphone:", error);
            throw error;
        }
    };

    const openMicrophone = (mic) => {
        return new Promise((resolve) => {
            mic.onstart = () => {
                console.log("Microphone opened");
                setIsRecording(true);
                resolve();
            };

            mic.ondataavailable = async (event) => {
                if (event.data.size > 0 && socket) {
                    socket.send(event.data);
                }
            };

            mic.start(1000); // Collect data every second
        });
    };

    const startRecording = async () => {
        try {
            const mic = await getMicrophone();
            setMicrophone(mic);
            await openMicrophone(mic);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    };

    const stopRecording = () => {
        if (microphone) {
            microphone.stop();
            microphone.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            setMicrophone(null);
            console.log("Microphone closed");
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
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
                {isRecording ? "Stop Recording" : "Start Recording"}
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
