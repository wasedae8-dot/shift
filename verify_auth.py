import os
import requests

# Mock the environment variable
os.environ["APP_PASSWORD"] = "testpass"

# I'll use a separate script to start the server and then hit it
# But I can also just run the server in the background and test it.

print("Testing backend authentication middleware...")

# Assuming the server is NOT running, I can't test it directly with requests yet.
# I'll create a small FastAPI app and test the middleware logic in a standalone way if needed,
# or just assume the logic in main.py is correct and try to run the actual app.

# Let's try to run the actual backend if possible.
