# models/player_detection.py

import os
from inference import get_model
from config import ROBOFLOW_API_KEY, PLAYER_DETECTION_MODEL_ID

def load_player_detection_model():
    """
    Load the Roboflow player (and ball/referee) detection model.
    """
    # Use GPU if available via ONNX Runtime
    os.environ.setdefault(
        "ONNXRUNTIME_EXECUTION_PROVIDERS",
        "[CUDAExecutionProvider]"
    )

    if ROBOFLOW_API_KEY == "YOUR_API_KEY_HERE":
        raise RuntimeError("Set ROBOFLOW_API_KEY in config.py or environment variable.")

    model = get_model(
        model_id=PLAYER_DETECTION_MODEL_ID,
        api_key=ROBOFLOW_API_KEY
    )
    return model