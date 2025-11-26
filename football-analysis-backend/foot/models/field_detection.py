# models/field_detection.py

from inference import get_model
from config import ROBOFLOW_API_KEY, FIELD_DETECTION_MODEL_ID

def load_field_detection_model():
    """
    Load the Roboflow football field keypoint detection model.
    """
    if ROBOFLOW_API_KEY == "YOUR_API_KEY_HERE":
        raise RuntimeError("Set ROBOFLOW_API_KEY in config.py or environment variable.")

    model = get_model(
        model_id=FIELD_DETECTION_MODEL_ID,
        api_key=ROBOFLOW_API_KEY
    )
    return model