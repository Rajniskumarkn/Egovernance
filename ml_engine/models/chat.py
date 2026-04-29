import os
import random
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini if API key is present
API_KEY = os.getenv("GEMINI_API_KEY")
model = None

if API_KEY:
    try:
        genai.configure(api_key=API_KEY)
        # We use gemini-1.5-flash as it's the fast, standard model for chat tasks
        model = genai.GenerativeModel('gemini-1.5-flash')
    except Exception as e:
        print(f"Failed to initialize Gemini: {e}")

SYSTEM_PROMPT = """
You are an E-Governance Assistant for a modern blockchain-based city platform.
Your job is to help citizens navigate the platform. 
Keep your responses helpful, concise, and friendly.

Key details about the platform:
- To register land, users must go to the 'Assets' tab and ensure their MetaMask wallet is connected. 
- If their wallet is not registered on the blockchain, they must click 'Register on Blockchain' first.
- The platform uses a Hybrid AI engine to verify documents before recording them on the blockchain.
- Citizens can apply for funds/aid in the 'Requests' tab. They will be pending until an Admin approves.
- If users want to check system health, say all systems are operational and the blockchain is synced.
"""

def fallback_chat_response(message: str) -> str:
    """Original rule-based fallback."""
    msg = message.lower().strip()
    if any(x in msg for x in ["hi", "hello", "hey", "greetings"]):
        return random.choice([
            "Hello! How can I assist you with your land registration today?",
            "Hi there! I'm your E-Governance assistant. What can I do for you?"
        ])
    if "status" in msg or "system" in msg:
        return "All systems are operational. Blockchain is synced, and the AI engine is online."
    if "help" in msg or "what can you do" in msg:
        return (
            "I can help you with checking system status, explaining how to register land, "
            "verifying documents, and tracking requests."
        )
    if "register" in msg or "land" in msg:
        return "To register land, go to the 'Assets' tab. Make sure your wallet is connected!"
    
    return "I'm a simple fallback assistant right now (API key missing). Try asking about 'help', 'status', or 'land registration'."

def get_chat_response(message: str) -> str:
    """
    Generates a response using Gemini, falling back to rule-based if not configured.
    """
    if model:
        try:
            full_prompt = f"{SYSTEM_PROMPT}\n\nUser: {message}\nAssistant:"
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            return fallback_chat_response(message)
    else:
        return fallback_chat_response(message)
