"""Speech-to-Text API Routes using OpenAI Whisper"""

from fastapi import APIRouter, HTTPException, Header, UploadFile, File
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/speech", tags=["Speech"])


async def verify_user(authorization: str):
    """Verify user token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    
    token = authorization.replace("Bearer ", "")
    
    from utils.auth import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return payload


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    Transcribe audio to text using OpenAI Whisper
    
    Accepts audio files: mp3, mp4, mpeg, mpga, m4a, wav, webm
    Max file size: 25MB
    """
    await verify_user(authorization)
    
    # Validate file type
    allowed_types = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 
                     'audio/webm', 'audio/x-m4a', 'audio/m4a', 'video/webm',
                     'audio/ogg', 'application/octet-stream']
    
    content_type = audio.content_type or 'application/octet-stream'
    
    # Also check file extension
    filename = audio.filename or 'audio.webm'
    allowed_extensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm', '.ogg']
    file_ext = os.path.splitext(filename)[1].lower()
    
    if content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid audio format. Supported: mp3, mp4, mpeg, mpga, m4a, wav, webm. Got: {content_type}, {file_ext}"
        )
    
    # Read file content
    file_content = await audio.read()
    
    # Check file size (25MB limit)
    if len(file_content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 25MB")
    
    if len(file_content) == 0:
        raise HTTPException(status_code=400, detail="Empty audio file")
    
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        import tempfile
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="Speech-to-text service not configured")
        
        # Initialize STT
        stt = OpenAISpeechToText(api_key=api_key)
        
        # Save to temp file (Whisper needs a file)
        with tempfile.NamedTemporaryFile(suffix=file_ext or '.webm', delete=False) as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name
        
        try:
            # Transcribe
            with open(tmp_path, 'rb') as audio_file:
                response = await stt.transcribe(
                    file=audio_file,
                    model="whisper-1",
                    response_format="json",
                    language="en"
                )
            
            transcribed_text = response.text if hasattr(response, 'text') else str(response)
            
            return {
                "success": True,
                "text": transcribed_text,
                "message": "Audio transcribed successfully"
            }
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        print(f"[SPEECH] Transcription error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
