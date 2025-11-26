import os
import cv2
import numpy as np
from tqdm import tqdm
import supervision as sv

import torch

if torch.cuda.is_available():
    print("✅ CUDA is available. Running on GPU.")
else:
    print("⚠️ CUDA is not available. Running on CPU.")

from inference import get_model

# ============================================================
# HARD-CODED API + MODEL IDs (as requested)
# ============================================================
ROBOFLOW_API_KEY = "dro9YlvSFRxKF5JmiKsS"
PLAYER_DETECTION_MODEL_ID = "football-players-detection-3zvbc/11"
FIELD_DETECTION_MODEL_ID = "football-field-detection-f07vi/14"

# ============================================================
# INPUT / OUTPUT VIDEO PATHS  (EDIT THESE TO YOUR FILES)
# ============================================================
SOURCE_VIDEO_PATH = r"uploaded_videos\\trial.mp4"
OUTPUT_VIDEO_PATH = r"output_videos\\output_with_radar.mp4"

# ============================================================
# CLASS IDS FROM YOUR MODEL
# ============================================================
BALL_ID = 0
GOALKEEPER_ID = 1
PLAYER_ID = 2
REFEREE_ID = 3

# ============================================================
# LOAD MODELS
# ============================================================
PLAYER_DETECTION_MODEL = get_model(
    model_id=PLAYER_DETECTION_MODEL_ID,
    api_key=ROBOFLOW_API_KEY,
    device="cuda"
)

FIELD_DETECTION_MODEL = get_model(
    model_id=FIELD_DETECTION_MODEL_ID,
    api_key=ROBOFLOW_API_KEY,
    device="cuda"
)

print("✅ Models Loaded Successfully")

# ============================================================
# ANNOTATORS + TRACKER
# ============================================================
ellipse_annotator = sv.EllipseAnnotator(
    color=sv.ColorPalette.from_hex(['#00BFFF', '#FF1493', '#FFD700']),
    thickness=2
)
label_annotator = sv.LabelAnnotator(
    color=sv.ColorPalette.from_hex(['#00BFFF', '#FF1493', '#FFD700']),
    text_color=sv.Color.from_hex('#000000'),
    text_position=sv.Position.BOTTOM_CENTER
)
triangle_annotator = sv.TriangleAnnotator(
    color=sv.Color.from_hex('#FFD700'),
    base=20, height=17
)

tracker = sv.ByteTrack()

# ============================================================
# VIDEO SETUP
# ============================================================
cap = cv2.VideoCapture(SOURCE_VIDEO_PATH)
fps = cap.get(cv2.CAP_PROP_FPS) or 25
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

writer = cv2.VideoWriter(
    OUTPUT_VIDEO_PATH,
    cv2.VideoWriter_fourcc(*"mp4v"),
    fps,
    (width * 2, height)
)

# ============================================================
# SIMPLE GREEN RADAR PITCH CANVAS
# ============================================================
def make_pitch():
    pitch = np.full((height, width, 3), (0, 110, 0), dtype=np.uint8)
    cv2.rectangle(pitch, (20, 20), (width-20, height-20), (255, 255, 255), 3)
    return pitch

# ============================================================
# PROCESS VIDEO
# ============================================================
for _ in tqdm(range(int(cap.get(cv2.CAP_PROP_FRAME_COUNT)))):
    ret, frame_bgr = cap.read()
    if not ret:
        break

    frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    # ---- PLAYER + BALL DETECTION ----
    result = PLAYER_DETECTION_MODEL.infer(frame, confidence=0.3)[0]
    detections = sv.Detections.from_inference(result)

    ball = detections[detections.class_id == BALL_ID]
    players = detections[detections.class_id == PLAYER_ID]
    goalkeepers = detections[detections.class_id == GOALKEEPER_ID]
    referees = detections[detections.class_id == REFEREE_ID]

    tracked = tracker.update_with_detections(
        detections=detections.with_nms(threshold=0.5, class_agnostic=True)
    )

    # ---- CAMERA VIEW ANNOTATION ----
    annotated = frame.copy()
    annotated = ellipse_annotator.annotate(annotated, tracked)
    labels = [f"#{tid}" if tid is not None else "" for tid in tracked.tracker_id]
    annotated = label_annotator.annotate(annotated, tracked, labels=labels)
    annotated = triangle_annotator.annotate(annotated, ball)

    # ---- SIMPLE RADAR (just plot players + ball) ----
    pitch = make_pitch()

    if len(players) > 0:
        pts = players.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
        for (x, y) in pts.astype(int):
            cv2.circle(pitch, (x % width, y % height), 10, (255, 255, 255), -1)

    if len(ball) > 0:
        bx, by = ball.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)[0]
        cv2.circle(pitch, (int(bx % width), int(by % height)), 12, (255, 215, 0), -1)

    # ---- COMBINE FRAMES ----
    pitch = cv2.cvtColor(pitch, cv2.COLOR_RGB2BGR)
    annotated = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)
    combined = np.hstack((annotated, pitch))
    writer.write(combined)

cap.release()
writer.release()

print(f"✅ Done! Video saved to: {OUTPUT_VIDEO_PATH}")
