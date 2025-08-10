#!/usr/bin/env python3
"""
Inference client for Chatterbox TTS Modal deployment.
Provides both CLI and programmatic interface to generate speech from text.
"""

import argparse
import sys
from pathlib import Path
import requests
from urllib.parse import urlencode

def generate_speech(prompt: str, output_path: str = "/tmp/chatterbox_output.wav", base_url: str = None):
    """
    Generate speech from text using the deployed Chatterbox TTS service.
    
    Args:
        prompt: Text to convert to speech
        output_path: Path to save the generated audio file
        base_url: Base URL of the Modal deployment (if not provided, uses default)
    
    Returns:
        bool: True if successful, False otherwise
    """
    if not base_url:
        # Default Modal URL from commands.txt
        base_url = "https://ryanrong24--chatterbox-tts-chatterbox-tts.modal.run"
    
    try:
        print(f"< Generating speech for: {prompt[:50]}...")
        
        # Prepare the request
        params = {"prompt": prompt}
        url = f"{base_url}?" + urlencode(params)
        
        # Make the POST request
        response = requests.post(url, stream=True)
        response.raise_for_status()
        
        # Create output directory if it doesn't exist
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Stream the audio content to file
        print(f"= Saving audio to: {output_path}")
        with open(output_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        print(f"Speech generation complete! Audio saved to: {output_path}")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"L Error making request: {e}")
        return False
    except Exception as e:
        print(f"L Error generating speech: {e}")
        return False

def main():
    """CLI interface for the inference client."""
    parser = argparse.ArgumentParser(description="Generate speech using Chatterbox TTS")
    parser.add_argument("prompt", help="Text to convert to speech")
    parser.add_argument("-o", "--output", default="output/chatterbox_output.wav", 
                       help="Output file path (default: output/chatterbox_output.wav)")
    parser.add_argument("--url", help="Base URL of the Modal deployment")
    
    args = parser.parse_args()
    
    success = generate_speech(args.prompt, args.output, args.url)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()