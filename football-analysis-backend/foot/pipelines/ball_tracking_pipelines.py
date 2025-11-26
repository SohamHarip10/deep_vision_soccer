# pipelines/ball_tracking_pipeline.py

import os
import sys
from collections import deque
import numpy as np
import cv2
from tqdm import tqdm

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import supervision as sv
from sports.annotators.soccer import draw_pitch, draw_paths_on_pitch

from config import (
    BALL_ID, CONFIDENCE_THRESHOLD,
    MAXLEN, MAX_DISTANCE_THRESHOLD, CONFIG
)
from models.player_detection import load_player_detection_model  
from models.field_detection import load_field_detection_model
from models.view_transformer import ViewTransformer

# -------------------------------
# MANUAL PATHS (edit)
# -------------------------------
SOURCE_VIDEO = r"C:\Users\Soham Harip\OneDrive\Desktop\foot\videos\sample1.mp4"
OUTPUT_VIDEO = r"C:\Users\Soham Harip\OneDrive\Desktop\foot\output\sample1_output.mp4"
# Example:
# SOURCE_VIDEO = "videos/121364_0.mp4"
# OUTPUT_VIDEO = "outputs/ball_tracking.mp4"
# -------------------------------


def run_ball_tracking_pipeline(source_video, output_video):

    print("🔄 Loading models...")
    player_model = load_player_detection_model()
    field_model = load_field_detection_model()

    video_info = sv.VideoInfo.from_video_path(source_video)

    raw_positions = []
    homography_history = deque(maxlen=MAXLEN)

    first_frame = next(sv.get_video_frames_generator(source_video))
    h, w = first_frame.shape[:2]

    writer = cv2.VideoWriter(
        output_video,
        cv2.VideoWriter_fourcc(*"mp4v"),
        video_info.fps,
        (w * 2, h)
    )

    for frame in tqdm(
        sv.get_video_frames_generator(source_video),
        total=video_info.total_frames
    ):
        # 1) BALL detection
        res = player_model.infer(frame, confidence=CONFIDENCE_THRESHOLD)[0]
        det = sv.Detections.from_inference(res)

        ball_det = det[det.class_id == BALL_ID]
        if len(ball_det):
            ball_det.xyxy = sv.pad_boxes(ball_det.xyxy, 10)

        # 2) FIELD detection
        f_res = field_model.infer(frame, confidence=CONFIDENCE_THRESHOLD)[0]
        key_pts = sv.KeyPoints.from_inference(f_res)
        mask = key_pts.confidence[0] > 0.5

        if not np.any(mask) or len(ball_det) == 0:
            pitch = draw_pitch(CONFIG)
            pitch = cv2.resize(pitch, (w, h))
            combined = np.hstack((frame, pitch))
            combined = cv2.cvtColor(combined, cv2.COLOR_RGB2BGR)
            writer.write(combined)
            continue

        src = key_pts.xy[0][mask]
        tgt = np.array(CONFIG.vertices)[mask]

        transformer = ViewTransformer(src, tgt)

        homography_history.append(transformer.m)
        transformer.m = np.mean(np.array(homography_history), axis=0)

        ball_xy = ball_det.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
        pitch_xy = transformer.transform_points(ball_xy)

        raw_positions.append(pitch_xy)

        # Remove outliers
        cleaned = []
        last = None
        for p in raw_positions:
            if len(p) == 0:
                cleaned.append(p)
                continue
            if last is None:
                cleaned.append(p)
                last = p
                continue
            if np.linalg.norm(p - last) > MAX_DISTANCE_THRESHOLD:
                cleaned.append(np.array([], dtype=np.float32))
            else:
                cleaned.append(p)
                last = p

        final_path = [p.flatten() for p in cleaned]

        # 4) Draw pitch
        pitch = draw_pitch(CONFIG)

        valid_path = [p for p in final_path if len(p) == 2]

        if len(valid_path):
            temp = draw_paths_on_pitch(
                config=CONFIG,
                paths=[valid_path],
                color=sv.Color.WHITE,
                pitch=pitch
            )
            if temp is not None:
                pitch = temp

        pitch = cv2.resize(pitch, (w, h))

        # 5) Combine
        combined = np.hstack((frame, pitch))
        combined = cv2.cvtColor(combined, cv2.COLOR_RGB2BGR)
        writer.write(combined)

    writer.release()
    print(f"🎉 Ball tracking video saved at: {output_video}")


# --------------------------
# Run manually
# --------------------------
if __name__ == "__main__":
    run_ball_tracking_pipeline(SOURCE_VIDEO, OUTPUT_VIDEO)