from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from models.predictive import predict_resource_shortage
from models.fraud import detect_anomalies
from models.ocr import verify_document
from blockchain_client import BlockchainClient
import shutil
import os
import random

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


blockchain = BlockchainClient() # Initialized with new address 

class PredictiveInput(BaseModel):
    date: str
    location: str
    usage_history: list[float]

class FraudInput(BaseModel):
    transaction_id: str
    amount: float
    sender: str
    receiver: str
    location: str

from models.chat import get_chat_response

class ChatInput(BaseModel):
    message: str

@app.post("/chat")
def chat_endpoint(data: ChatInput):
    try:
        response = get_chat_response(data.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights")
def get_insights():
    """Generates AI-driven insights for the dashboard."""
    suggestions = [
        "Upload deed for 'Green Valley' land to secure ownership.",
        "Check status of flood relief request #102.",
        "Energy usage in Sector 7 is 15% above average.",
        "Verify identity documents for faster processing."
    ]
    notifications = [
        "No critical fraud alerts detected.",
        "System maintenance scheduled for Sunday 2 AM."
    ]
    return {
        "suggestions": random.sample(suggestions, 2),
        "notifications": notifications
    }

@app.post("/predict-shortage")
def predict_shortage_endpoint(data: PredictiveInput):
    try:
        prediction = predict_resource_shortage(data.dict())
        tx_hash = None
        if prediction > 0.5:
             # Auto-request funds if shortage is likely
             tx_hash = blockchain.submit_shortage_alert(data.location, "High")
        
        return {"shortage_risk": prediction, "blockchain_tx": tx_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-fraud")
def detect_fraud_endpoint(data: FraudInput):
    try:
        is_fraud = detect_anomalies(data.dict())
        return {"fraud_detected": is_fraud}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify-document")
async def verify_document_endpoint(file: UploadFile = File(...)):
    try:
        if not os.path.exists("temp"):
            os.makedirs("temp")
        
        file_path = f"temp/{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        verification_result = verify_document(file_path)
        
        tx_hash = None
        if verification_result.get("verified"):
            # Record verification on-chain
            # Mock hash of document content
            doc_hash = "QmHashOfDocument123" 
            tx_hash = blockchain.record_verification(doc_hash, True)

        os.remove(file_path) # Cleanup
        return {**verification_result, "blockchain_tx": tx_hash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
