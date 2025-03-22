import React, { useState, useEffect, useRef } from "react";
import WebRTCService from '../services/WebRTCService';
import "./WebRTCComponent.css";

const WebRTCComponent = () => {
  const [connectionState, setConnectionState] = useState("disconnected"); // disconnected, connecting, connected
  const [conversationActive, setConversationActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isIframe, setIsIframe] = useState(false);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioElementRef = useRef(null);

  useEffect(() => {
    // Check if running inside an iframe
    setIsIframe(window.self !== window.top);

    // Create audio element reference for the WebRTCService to use
    audioElementRef.current = document.createElement("audio");
    audioElementRef.current.id = "audio-stream";
    audioElementRef.current.autoplay = true;
    document.body.appendChild(audioElementRef.current);

    // Handle window resize for canvas
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing

    // Clean up on component unmount
    return () => {
      if (audioElementRef.current) {
        document.body.removeChild(audioElementRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const initializeWebRTC = async () => {
    try {
      setConnectionState("connecting");
      setErrorMessage("");
      
      // Special handling for iframe permission management
      if (isIframe) {
        try {
          // Using permissions API to check/request permissions explicitly in iframe context
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
          if (permissionStatus.state === 'denied') {
            throw new Error("Microphone permission denied. Please allow microphone access.");
          }
        } catch (permErr) {
          console.warn("Permission check failed, will try direct access:", permErr);
        }
      }
      
      const ephemeralToken = await WebRTCService.fetchEphemeralToken();
      if (ephemeralToken) {
        await WebRTCService.initWebRTC(ephemeralToken, audioElementRef.current);
        setConnectionState("connected");
        startAudioVisualization();
        setConversationActive(true);
      } else {
        throw new Error("Failed to retrieve ephemeral token");
      }
    } catch (error) {
      console.error("Error initializing WebRTC:", error);
      setErrorMessage(`Error initializing WebRTC: ${error.message || "Unknown error"}`);
      setConnectionState("disconnected");
      
      // Special handling for common iframe permission errors
      if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
        setErrorMessage("Microphone access denied. Please allow microphone access in your browser and try again.");
      }
    }
  };

  const toggleConversation = () => {
    if (connectionState === "disconnected") {
      initializeWebRTC();
    } else if (conversationActive) {
      setConversationActive(false);
      WebRTCService.pauseConversation();
    } else {
      setConversationActive(true);
      WebRTCService.resumeConversation();
    }
  };

  const startAudioVisualization = () => {
    if (!audioElementRef.current.srcObject) {
      return;
    }

    try {
      if (!audioContextRef.current) {
        // Create audio context with fallbacks for different browsers
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;

        const source = audioContextRef.current.createMediaStreamSource(audioElementRef.current.srcObject);
        source.connect(analyserRef.current);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const drawVisualizer = () => {
        if (!canvasRef.current) return;

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Adjust for device pixel ratio for sharper rendering
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        // Handle canvas size changes
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          ctx.scale(dpr, dpr);
        }

        ctx.clearRect(0, 0, rect.width, rect.height);

        const barWidth = (rect.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i] / 2;
          
          // Create a gradient blue color for the visualizer bars
          const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
          gradient.addColorStop(0, '#4facfe');
          gradient.addColorStop(1, '#00f2fe');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, rect.height - barHeight, barWidth, barHeight);

          x += barWidth + 1;
        }
      };

      drawVisualizer();
    } catch (error) {
      console.error("Error starting audio visualization:", error);
      // Fail gracefully - visualization is not critical to functionality
    }
  };

  let buttonText = "Start Conversation";
  let buttonClass = "start-button";

  if (connectionState === "connecting") {
    buttonText = "Connecting...";
    buttonClass = "connecting-button";
  } else if (connectionState === "connected") {
    buttonText = conversationActive ? "Pause Conversation" : "Resume Conversation";
    buttonClass = conversationActive ? "pause-button" : "resume-button";
  }

  // Simpler UI for very small iframes
  const isSmallIframe = isIframe && window.innerHeight < 300;

  return (
    <div className="webrtc-container">
      <div className="webrtc-card">
        {!isSmallIframe && <h1 className="webrtc-title">AI Voice Assistant</h1>}
        
        <div className="visualizer-container">
          <canvas ref={canvasRef} className="audio-visualizer"></canvas>
          
          {connectionState === "connected" && conversationActive && (
            <div className="listening-indicator">
              <span className="pulse-dot"></span> Listening...
            </div>
          )}
          
          {connectionState !== "connected" && (
            <div className="visualizer-placeholder">
              {isSmallIframe ? "Click to start" : "Audio visualizer will appear here"}
            </div>
          )}
        </div>
        
        {!isSmallIframe && (
          <div className="connection-status">
            <span className={`status-indicator ${connectionState}`}></span>
            {connectionState === "connected" ? "Connected to AI" : connectionState === "connecting" ? "Connecting..." : "Disconnected"}
          </div>
        )}
        
        <button 
          className={`conversation-button ${buttonClass}`} 
          onClick={toggleConversation}
          disabled={connectionState === "connecting"}
        >
          {buttonText}
        </button>
        
        {errorMessage && (
          <div className="error-message">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebRTCComponent;