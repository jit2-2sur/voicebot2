import React, { useState, useEffect, useRef } from 'react';
import './stt.css';

const Transcript = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const mediaRecorderRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Cleanup WebSocket and MediaRecorder on component unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const handleRecording = async () => {
        if (!isRecording) {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                socketRef.current = new WebSocket('wss://api.deepgram.com/v1/listen', ['token', 'ecabf04325f978d5fe80b1df3c845ecc33b325ec']);

                socketRef.current.onopen = () => {
                    console.log('WebSocket connected');
                    mediaRecorderRef.current.addEventListener('dataavailable', event => {
                        if (event.data.size > 0 && socketRef.current.readyState === 1) {
                            socketRef.current.send(event.data);
                        }
                    });
                    mediaRecorderRef.current.start(250);
                };

                socketRef.current.onmessage = (message) => {
                    const received = JSON.parse(message.data);
                    const transcriptPart = received.channel.alternatives[0].transcript;
                    if (transcriptPart && received.is_final) {
                        setTranscript(prev => prev + transcriptPart + ' ');
                        console.log('Speaker: '+transcriptPart);
                    }
                };

                socketRef.current.onclose = () => {
                    console.log('WebSocket closed');
                };

                socketRef.current.onerror = (error) => {
                    console.error('WebSocket error', error);
                };

                setIsRecording(true);
            } catch (error) {
                console.error('Error accessing microphone', error);
            }
        } else {
            // Stop recording
            mediaRecorderRef.current.stop();
            socketRef.current.close();
            setIsRecording(false);
        }
    };

    return (
        <div>
            <button onClick={handleRecording}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <div>
                <h2>Transcript:</h2>
                <p>{transcript}</p>
            </div>
        </div>
    );
};

export default Transcript;
