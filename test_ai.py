from ml_engine.models.predictive import predict_resource_shortage
from ml_engine.models.fraud import detect_anomalies
from ml_engine.models.ocr import verify_document
import os

def test_models():
    print("Testing Predictive Model...")
    shortage = predict_resource_shortage({"usage_history": [100, 110, 120]})
    print(f"Shortage Prediction: {shortage}")

    print("\nTesting Fraud Model...")
    is_fraud = detect_anomalies({"amount": 10000, "location": "Unknown"})
    print(f"Fraud Detected: {is_fraud}")

    print("\nTesting OCR Model...")
    # Create dummy file
    with open("dummy.jpg", "w") as f:
        f.write("dummy content")
    
    ocr_result = verify_document("dummy.jpg")
    print(f"OCR Result: {ocr_result}")
    
    os.remove("dummy.jpg")

if __name__ == "__main__":
    test_models()
