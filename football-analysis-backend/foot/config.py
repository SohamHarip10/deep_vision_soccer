# config.py

import os
from sports.configs.soccer import SoccerPitchConfiguration

# ================================
# Roboflow / Models
# ================================
# ⛔ IMPORTANT: put your own API key here
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "dro9YlvSFRxKF5JmiKsS")

PLAYER_DETECTION_MODEL_ID = "football-players-detection-3zvbc/11"
FIELD_DETECTION_MODEL_ID = "football-field-detection-f07vi/14"

# ================================
# Class IDs (same as in your notebook)
# ================================
BALL_ID = 0
GOALKEEPER_ID = 1
PLAYER_ID = 2
REFEREE_ID = 3

# ================================
# Video / Processing Params
# ================================
FPS = 25
CONFIDENCE_THRESHOLD = 0.3
NMS_THRESHOLD = 0.5

# Ball tracking
MAXLEN = 5
MAX_DISTANCE_THRESHOLD = 500

# ================================
# Soccer Pitch Config
# ================================
CONFIG = SoccerPitchConfiguration()