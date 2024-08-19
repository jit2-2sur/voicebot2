import React, { useState } from 'react';
import './App.css'; 
import Transcript from './Stt';

const App = () => {
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

    const toggleChatHistory = () => {
        setIsChatHistoryOpen(!isChatHistoryOpen);
    };

    return (
        <div className="container">
            <header className="header">
                <h1>Your Website Heading</h1>
                <button className="chat-history-button" onClick={toggleChatHistory}>
                    {isChatHistoryOpen ? 'Close Chat History' : 'Open Chat History'}
                </button>
            </header>

            {isChatHistoryOpen && (
                <div className="chat-history-panel">
                    <h2>Chat History</h2>
                    <p>This is where the chat history will be displayed.</p>
                    <button className="close-button" onClick={toggleChatHistory}>Close</button>
                </div>
            )}

            <main className="main-content">
                <Transcript/>
            </main>
        </div>
    );
};

export default App;
