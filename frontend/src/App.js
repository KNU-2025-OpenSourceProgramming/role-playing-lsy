// App.js
import React, { useState, useRef } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, Paper, TextField } from '@mui/material';
import { styled } from '@mui/material/styles';

const ChatBubble = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  wordBreak: 'break-word',
}));

const TranscriptionContainer = styled(Box)(({ theme }) => ({
  maxHeight: '300px',
  overflowY: 'auto',
  marginTop: theme.spacing(2),
}));

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptions, setTranscriptions] = useState([]);
  const [websocketUrl, setWebsocketUrl] = useState('ws://127.0.0.1:3000/audio');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const socketRef = useRef(null);

  const handleWebSocketUrlChange = (event) => {
    setWebsocketUrl(event.target.value);
  };

  const handleStartRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorderRef.current.onstop = () => {
      sendAudioData();
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioData = () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const audioArrayBuffer = reader.result;
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(audioArrayBuffer);
      }
      audioChunksRef.current = [];
    };
    reader.readAsArrayBuffer(audioBlob);
  };

  const setupWebSocket = () => {
    socketRef.current = new WebSocket(websocketUrl);

    socketRef.current.onopen = () => {
      console.log('WebSocket is connected.');
    };

    socketRef.current.onmessage = (event) => {
      setTranscriptions((prev) => [...prev, event.data]);
    };

    socketRef.current.onclose = (event) => {
      console.log('WebSocket is closed.', event);
    };

    socketRef.current.onerror = (error) => {
      console.log('WebSocket error:', error);
    };
  };

  React.useEffect(() => {
    setupWebSocket();
    // Clean up the WebSocket connection when the component unmounts
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [websocketUrl]);

  return (
    <Container>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Audio Recorder</Typography>
        </Toolbar>
      </AppBar>
      <Box mt={2}>
        <TextField
          label="WebSocket URL"
          variant="outlined"
          fullWidth
          value={websocketUrl}
          onChange={handleWebSocketUrlChange}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" color="primary" onClick={handleStartRecording} disabled={isRecording}>
          Start Recording
        </Button>
        <Button variant="contained" color="secondary" onClick={handleStopRecording} disabled={!isRecording} sx={{ ml: 2 }}>
          Stop Recording
        </Button>
      </Box>
      <TranscriptionContainer>
        {transcriptions.map((text, index) => (
          <ChatBubble key={index} elevation={2}>
            {text}
          </ChatBubble>
        ))}
      </TranscriptionContainer>
    </Container>
  );
};

export default App;