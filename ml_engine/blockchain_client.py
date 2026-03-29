from web3 import Web3
import json
import os

class BlockchainClient:
    def __init__(self, rpc_url="http://127.0.0.1:8545"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not self.w3.is_connected():
            raise Exception("Failed to connect to Blockchain")
        
        # Load ABI and Address
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        abi_path = os.path.join(base_dir, "governance_abi.json")
        try:
            with open(abi_path, "r") as f:
                self.abi = json.load(f)
        except:
             print(f"Warning: ABI not found at {abi_path}")
             self.abi = []

        address_path = os.path.join(base_dir, "contract_address.txt")
        try:
            with open(address_path, "r") as f:
                self.contract_address = f.read().strip()
        except:
            print(f"Warning: Address not found at {address_path}")
            self.contract_address = None

        if self.contract_address and self.abi:
            self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)
        else:
            self.contract = None

        # Set default account (first one from local node)
        self.w3.eth.default_account = self.w3.eth.accounts[0]

    def submit_shortage_alert(self, location, severity):
        """
        Example: Calls a contract function related to resource updates.
        Since we don't have a direct 'reportShortage' function, we might request funds.
        """
        if not self.contract:
            return "Blockchain not connected"
        
        # Mock logic: Request funds for "Emergency Resource: [Location]"
        tx_hash = self.contract.functions.requestFunds(
            f"Emergency Resource: {location} (Sev: {severity})", 
            1000
        ).transact()
        
        return self.w3.to_hex(tx_hash)

    def record_verification(self, doc_hash, is_valid):
        """
        Record document verification result on-chain.
        Using 'createServiceRequest' as a placeholder for verification record.
        """
        if not self.contract:
            return "Blockchain not connected"
            
        if is_valid:
            # Service ID 99 for Verification
            tx_hash = self.contract.functions.createServiceRequest(99, doc_hash).transact()
            return self.w3.to_hex(tx_hash)
        return "Verification failed, not recording."
