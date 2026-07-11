import os
os.environ.setdefault("MONGO_URL", os.environ.get("MONGO_URL", "").replace("mongodb+srv://", "mongodb+srv://") )

import ssl
import certifi

from server import app
