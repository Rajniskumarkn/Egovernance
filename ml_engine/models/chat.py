import random

def get_chat_response(message: str) -> str:
    """
    Generates a rule-based response for the chat assistant.
    Can be upgraded to use an LLM (e.g., Groq, OpenAI) later.
    """
    msg = message.lower().strip()
    
    # Greetings
    if any(x in msg for x in ["hi", "hello", "hey", "greetings"]):
        return random.choice([
            "Hello! How can I assist you with your land registration today?",
            "Hi there! I'm your E-Governance assistant. What can I do for you?",
            "Greetings! changing the world one block at a time. How can I help?"
        ])
        
    # Status / Health
    if "status" in msg or "system" in msg:
        return "All systems are operational. Blockchain is synced, and the AI engine is online."
        
    # Help / Capabilities
    if "help" in msg or "what can you do" in msg:
        return (
            "I can help you with:\n"
            "- Checking system status\n"
            "- Explaining how to register land\n"
            "- Verifying documents (upload them in the Assets tab)\n"
            "- Tracking your requests"
        )
        
    # Land Registration Help
    if "register" in msg or "land" in msg:
        return (
            "To register land, go to the 'Assets' tab, enter the location and area, "
            "and click 'Register Land'. Make sure your wallet is connected!"
        )
        
    # Default Fallback
    return (
        "I'm not sure I understand that yet. I'm a rule-based assistant for now. "
        "Try asking about 'help', 'status', or 'land registration'."
    )
