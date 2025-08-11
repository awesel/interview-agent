#!/usr/bin/env python3
"""
FastAPI Conversation API for Vercel deployment.
Optimized for real-time audio streaming with Next.js frontend.
"""

import asyncio
import os
import tempfile
import uuid
import websockets
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from urllib.parse import urlencode
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Interview Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for your Next.js domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
CHATTERBOX_TTS_URL = "https://ryanrong24--chatterbox-tts-chatterbox-tts.modal.run"
PARAKEET_STT_WS_URL = "wss://ryanrong24--example-parakeet-parakeet-web.modal.run/ws"

# In-memory storage
conversations: Dict[str, Dict] = {}
active_connections: Dict[str, WebSocket] = {}

class ConversationManager:
    """Manages conversation state and flow."""
    
    def __init__(self):
        self.conversations = {}
    
    def create_conversation(self, conversation_id: str = None) -> str:
        if not conversation_id:
            conversation_id = str(uuid.uuid4())
        
        self.conversations[conversation_id] = {
            "id": conversation_id,
            "created_at": datetime.now().isoformat(),
            "messages": [],
            "status": "active"
        }
        return conversation_id
    
    def add_message(self, conversation_id: str, role: str, content: str, audio_path: str = None):
        if conversation_id not in self.conversations:
            self.create_conversation(conversation_id)
        
        message = {
            "id": str(uuid.uuid4()),
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "audio_path": audio_path
        }
        
        self.conversations[conversation_id]["messages"].append(message)
        return message
    
    def get_conversation(self, conversation_id: str) -> Optional[Dict]:
        return self.conversations.get(conversation_id)

conversation_manager = ConversationManager()

async def call_tts_service(text: str) -> Optional[str]:
    """Call Chatterbox TTS service asynchronously."""
    try:
        logger.info(f"Generating speech for: {text[:50]}...")
        
        params = {"prompt": text}
        url = f"{CHATTERBOX_TTS_URL}?" + urlencode(params)
        
        # Use requests for now (consider aiohttp for production)
        response = requests.post(url, stream=True, timeout=30)
        response.raise_for_status()
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
            temp_path = temp_file.name
        
        logger.info(f"Speech generated: {temp_path}")
        return temp_path
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return None

async def call_stt_service(audio_file_path: str) -> Optional[str]:
    """Call the Parakeet STT service and return transcribed text."""
    try:
        logger.info(f"Transcribing audio: {audio_file_path}")
        
        # Process audio file to the format expected by Parakeet
        processed_audio = await process_audio_for_parakeet(audio_file_path)
        if not processed_audio:
            logger.error("Failed to process audio")
            return None
        
        # Use Modal to call the Parakeet transcribe method directly
        import modal
        
        try:
            # Get the Parakeet class and call transcribe
            parakeet = modal.Cls.from_name("example-parakeet", "Parakeet")
            
            # Call transcription with processed audio bytes
            result = parakeet().transcribe.remote(processed_audio)
            
            logger.info(f"Transcription result: {result}")
            return result
            
        except Exception as modal_error:
            logger.error(f"Modal call failed: {modal_error}")
            return None
        
    except Exception as e:
        logger.error(f"Error calling STT service: {e}")
        return None

async def process_audio_for_parakeet(audio_file_path: str) -> Optional[bytes]:
    """Process audio file to int16 format expected by Parakeet."""
    try:
        import librosa
        import numpy as np
        import soundfile as sf
        
        # Load audio file
        audio, sample_rate = librosa.load(audio_file_path, sr=16000, mono=True)
        
        # Convert to int16 format expected by Parakeet
        audio_int16 = (audio * 32767).astype(np.int16)
        
        # Convert to bytes
        return audio_int16.tobytes()
        
    except Exception as e:
        logger.error(f"Audio processing error: {e}")
        return None

def generate_interview_response(conversation_id: str, user_input: str) -> str:
    """Generate contextual interview response."""
    conversation = conversation_manager.get_conversation(conversation_id)
    message_count = len(conversation["messages"]) if conversation else 0
    
    # Interview flow logic
    responses = [
        "Hello! Welcome to your interview. Could you please start by telling me your name and a bit about yourself?",
        "Thank you for that introduction. Can you walk me through your professional background and experience?",
        "That's interesting. What specific skills or technologies are you most passionate about working with?",
        "Great! Can you describe a challenging project you've worked on recently and how you approached it?",
        "How do you typically handle working in a team environment, especially when there are conflicting opinions?",
        "What motivates you about this particular role and our company?",
        "Do you have any questions about the role or our team that I can answer for you?"
    ]
    
    if message_count < len(responses):
        return responses[message_count // 2]  # Every other message is user input
    else:
        return "Thank you for your time today. We'll be in touch soon regarding next steps."

# REST API Endpoints
@app.post("/conversation")
async def create_conversation():
    """Create a new conversation session."""
    conversation_id = conversation_manager.create_conversation()
    return {"conversation_id": conversation_id, "status": "created"}

@app.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation details."""
    conversation = conversation_manager.get_conversation(conversation_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conversation

@app.post("/conversation/{conversation_id}/speak")
async def text_to_speech(conversation_id: str, text: str):
    """Convert text to speech."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    
    audio_path = await call_tts_service(text)
    if not audio_path:
        raise HTTPException(status_code=500, detail="Failed to generate speech")
    
    message = conversation_manager.add_message(conversation_id, "assistant", text, audio_path)
    
    return {
        "message_id": message["id"],
        "text": text,
        "audio_url": f"/api/audio/{message['id']}",
        "timestamp": message["timestamp"]
    }

@app.post("/conversation/{conversation_id}/transcribe")
async def transcribe_audio(conversation_id: str, audio: UploadFile = File(...)):
    """Transcribe uploaded audio file."""
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
        content = await audio.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Transcribe audio
        transcribed_text = await call_stt_service(temp_path)
        if not transcribed_text:
            raise HTTPException(status_code=500, detail="Failed to transcribe audio")
        
        # Add message to conversation
        message = conversation_manager.add_message(
            conversation_id, "user", transcribed_text
        )
        
        return {
            "message_id": message["id"],
            "text": transcribed_text,
            "timestamp": message["timestamp"]
        }
        
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except:
            pass

@app.get("/audio/{message_id}")
async def get_audio(message_id: str):
    """Serve audio file."""
    for conversation in conversation_manager.conversations.values():
        for message in conversation["messages"]:
            if message["id"] == message_id and message.get("audio_path"):
                return FileResponse(message["audio_path"], media_type="audio/wav")
    
    raise HTTPException(status_code=404, detail="Audio not found")

# Health check
@app.get("/")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/health")
async def health_check_alt():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}