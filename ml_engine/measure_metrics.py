import time
import requests
import json
from blockchain_client import BlockchainClient
from web3 import Web3

# Configuration
API_URL = "http://127.0.0.1:8000"
blockchain = BlockchainClient()

def measure_api_latency():
    print("--- Measuring API Latency ---")
    
    # 1. Prediction Endpoint
    start_time = time.time()
    payload = {
        "date": "2023-10-27",
        "location": "BenchmarkCity",
        "usage_history": [100, 150, 200, 250]
    }
    requests.post(f"{API_URL}/predict-shortage", json=payload)
    end_time = time.time()
    print(f"Prediction API Latency: {(end_time - start_time) * 1000:.2f} ms")

    # 2. Verification Endpoint
    with open("temp_test.txt", "w") as f:
        f.write("test content")
    
    start_time = time.time()
    with open("temp_test.txt", "rb") as f:
        requests.post(f"{API_URL}/verify-document", files={"file": ("temp_test.txt", f, "text/plain")})
    end_time = time.time()
    print(f"Verification API Latency: {(end_time - start_time) * 1000:.2f} ms")


def measure_blockchain_metrics():
    print("\n--- Measuring Blockchain Metrics ---")
    
    if not blockchain.contract:
        print("Blockchain not connected.")
        return

    # 1. Measure Gas Cost for Register Land
    # We use estimate_gas if possible, or send a tx and check receipt
    print("Estimating Gas for registerLand...")
    try:
        # Create a random location to avoid collision
        import random
        loc = f"Loc_{random.randint(1000, 9999)}"
        
        # Estimate Gas
        gas_estimate = blockchain.contract.functions.registerLand(loc, 500).estimate_gas({'from': blockchain.w3.eth.default_account})
        print(f"Gas Used (registerLand): {gas_estimate} wei")
        
        # Measure Transaction Confirmation Time
        print("Sending Transaction...")
        start_time = time.time()
        tx_hash = blockchain.contract.functions.registerLand(loc, 500).transact({'from': blockchain.w3.eth.default_account})
        receipt = blockchain.w3.eth.wait_for_transaction_receipt(tx_hash)
        end_time = time.time()
        
        print(f"Transaction Mining Time: {(end_time - start_time):.2f} seconds")
        print(f"Block Number: {receipt.blockNumber}")
        
    except Exception as e:
        print(f"Error measuring blockchain: {e}")

if __name__ == "__main__":
    measure_api_latency()
    measure_blockchain_metrics()
