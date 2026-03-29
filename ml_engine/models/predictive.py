import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np

# Mock trained model for demonstration
# In a real scenario, you'd load a pickled model here
model = LinearRegression()

# Training on dummy data to ensure it's "fitted"
X_train = np.array([[1], [2], [3], [4], [5]]) # Months
y_train = np.array([100, 110, 105, 120, 130]) # Usage
model.fit(X_train, y_train)

def predict_resource_shortage(data):
    """
    Predicts if there will be a resource shortage based on usage history.
    """
    history = data.get('usage_history', [])
    if not history:
        return 0.0
    
    # Simple logic: assume next month is the target
    next_month = len(history) + 1
    prediction = model.predict([[next_month]])[0]
    
    # Threshold logic
    if prediction > 150: # Arbitrary threshold
        return 0.9 # High risk
    return 0.1 # Low risk
