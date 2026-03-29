from fastapi.testclient import TestClient
from ml_engine.main import app
import os

client = TestClient(app)

def test_integration():
    print("Testing Integration...")

    # Test 1: Predictive Model -> Blockchain Trigger
    print("\n[1] Testing Shortage Prediction & Fund Request...")
    # Increase history to trigger high prediction (mock model uses length)
    payload = {
        "date": "2023-10-27",
        "location": "CityCenter",
        "usage_history": [100] * 20 # Length 20 -> x=21 -> y > 150
    }
    response = client.post("/predict-shortage", json=payload)
    data = response.json()
    print(f"Response: {data}")
    
    assert response.status_code == 200
    if data["shortage_risk"] > 0.5:
        assert data["blockchain_tx"] is not None
        print(f"Blockchain Transaction Triggered: {data['blockchain_tx']}")
    else:
        print("Risk too low to trigger blockchain.")


    # Test 2: OCR -> Blockchain Verification
    print("\n[2] Testing Document Verification & On-Chain Record...")
    # Create dummy file
    with open("deed.jpg", "w") as f:
        f.write("mock content")
    
    with open("deed.jpg", "rb") as f:
        response = client.post("/verify-document", files={"file": ("deed.jpg", f, "image/jpeg")})
    
    try:
        data = response.json()
        print(f"Response: {data}")
    except:
        print("Response is not JSON")

    print(f"Status Code: {response.status_code}")
    print(f"Response Text: {response.text}")

    assert response.status_code == 200
    if data.get("verified"):
        assert data["blockchain_tx"] is not None
        print(f"Verification Recorded on Blockchain: {data['blockchain_tx']}")
    
    os.remove("deed.jpg")

if __name__ == "__main__":
    test_integration()
