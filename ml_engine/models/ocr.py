import os

# Tesseract would be imported here if installed
# import pytesseract
# from PIL import Image

def verify_document(image_path):
    """
    Verifies a document. 
    In a real implementation, this would use OCR to extract text and match it against a database.
    For this demo, we simulate verification.
    """
    
    # Mock Logic: Validate if file exists and has size
    if os.path.getsize(image_path) > 0:
        return {
            "verified": True,
            "extracted_text": "MOCK TEXT: Property owned by Alice.",
            "confidence": 0.95
        }
    
    return {
        "verified": False,
        "reason": "Empty or invalid file"
    }
