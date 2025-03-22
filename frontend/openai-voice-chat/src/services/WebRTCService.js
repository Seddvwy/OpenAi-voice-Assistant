const WebRTCService = {
    peerConnection: null,
    dataChannel: null,
    mediaStream: null,
    audioElement: null,
  
    async fetchEphemeralToken() {
      try {
        const response = await fetch("/session");
        const data = await response.json();
        return data.client_secret.value;
      } catch (error) {
        console.error("Error fetching ephemeral token:", error);
        throw error;
      }
    },
  
    async initWebRTC(ephemeralToken, audioEl) {
      try {
        this.audioElement = audioEl;
        this.peerConnection = new RTCPeerConnection();
  
        this.peerConnection.ontrack = (e) => {
          if (this.audioElement.srcObject) {
            console.warn("Audio stream already playing. Ignoring additional tracks.");
            return;
          }
          this.audioElement.srcObject = e.streams[0];
        };
  
        this.peerConnection.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", this.peerConnection.iceConnectionState);
        };
  
        this.peerConnection.onconnectionstatechange = () => {
          console.log("Connection state:", this.peerConnection.connectionState);
        };
  
        // Get user media first to ensure we have audio tracks
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Add all audio tracks to the peer connection
        this.mediaStream.getAudioTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.mediaStream);
        });
  
        this.dataChannel = this.peerConnection.createDataChannel("oai-events");
        this.dataChannel.addEventListener("message", (e) => {
          const realtimeEvent = JSON.parse(e.data);
          console.log("Received event:", realtimeEvent);
        });
  
        // Create and set local description (offer)
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
  
        // Ensure we have a complete local description before proceeding
        if (!this.peerConnection.localDescription) {
          throw new Error("Failed to create local description");
        }
  
        // Log the SDP offer for debugging
        console.log("SDP Offer:", this.peerConnection.localDescription.sdp);
  
        // Send the offer to the server
        const baseUrl = "https://api.openai.com/v1/realtime";
        const model = "gpt-4o-realtime-preview-2024-12-17";
        const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
          method: "POST",
          body: this.peerConnection.localDescription.sdp,
          headers: {
            Authorization: `Bearer ${ephemeralToken}`,
            "Content-Type": "application/sdp",
          },
        });
  
        if (!sdpResponse.ok) {
          const errorText = await sdpResponse.text();
          throw new Error(`API error: ${sdpResponse.status} - ${errorText}`);
        }
  
        const answer = {
          type: "answer",
          sdp: await sdpResponse.text(),
        };
  
        await this.peerConnection.setRemoteDescription(answer);
        console.log("WebRTC connection established successfully");
      } catch (error) {
        console.error("WebRTC initialization error:", error);
        this.cleanup();
        throw error;
      }
    },
  
    pauseConversation() {
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
        console.log("Conversation paused");
      }
    },
  
    resumeConversation() {
      if (this.mediaStream) {
        this.mediaStream.getAudioTracks().forEach(track => {
          track.enabled = true;
        });
        console.log("Conversation resumed");
      }
    },
  
    cleanup() {
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      if (this.audioElement) {
        this.audioElement.srcObject = null;
      }
      
      this.dataChannel = null;
      console.log("WebRTC resources cleaned up");
    }
  };
  
  export default WebRTCService;