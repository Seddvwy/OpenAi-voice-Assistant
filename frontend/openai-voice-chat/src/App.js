import React from "react";
import WebRTCComponent from "./components/WebRTCComponent";
import "./App.css";

const App = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI Voice Assistant</h1>
      </header>
      <main className="app-main">
        <WebRTCComponent />
      </main>
      <footer className="app-footer">
        <p>Powered by OpenAI Realtime API</p>
      </footer>
    </div>
  );
};

export default App;