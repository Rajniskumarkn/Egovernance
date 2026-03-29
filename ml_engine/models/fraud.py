from sklearn.ensemble import IsolationForest
import numpy as np

# Mock trained model
clf = IsolationForest(random_state=42)
X_train = list(zip([100] * 50, [1] * 50)) # Normal transactions: Amount 100, Location ID 1
clf.fit(X_train)

def detect_anomalies(transaction_data):
    """
    Detects if a transaction is anomalous using Isolation Forest.
    """
    amount = transaction_data.get('amount', 0)
    # Simplified location logic: use length of string as feature for demo
    location_feature = len(transaction_data.get('location', '')) 
    
    prediction = clf.predict([[amount, location_feature]])
    
    # -1 is anomaly, 1 is normal
    return prediction[0] == -1
