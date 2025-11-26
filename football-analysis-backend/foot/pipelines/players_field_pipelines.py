# pipelines/player_field_pipeline.py

import os
import sys
from tqdm import tqdm
import numpy as np
import cv2

# Make project root importable
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import supervision as sv
from sports.annotators.soccer import draw_pitch, draw_points_on_pitch

from config import (
    BALL_ID, GOALKEEPER_ID, PLAYER_ID, REFEREE_ID,
    CONFIDENCE_THRESHOLD, NMS_THRESHOLD, CONFIG
)

from models.player_detection import load_player_detection_model
from models.field_detection import load_field_detection_model
from models.team_classifier import fit_team_classifier_from_video
from models.view_transformer import ViewTransformer
from utils.resolve_goalkeepers import resolve_goalkeepers_team_id
from utils.draw_utils import (
    create_ellipse_annotator,
    create_label_annotator,
    create_triangle_annotator,
)
from utils.video_utils import get_first_frame, create_side_by_side_writer

# --------------------------------------------
# MANUAL VIDEO PATHS (EDIT THESE)
# --------------------------------------------
SOURCE_VIDEO = r"C:\Users\Soham Harip\OneDrive\Desktop\foot\videos\sample1.mp4"
OUTPUT_VIDEO = r"C:\Users\Soham Harip\OneDrive\Desktop\foot\output\sample1_output.mp4"
# --------------------------------------------


def run_player_field_pipeline(source_video, output_video):

    print("🔄 Loading models...")
    player_model = load_player_detection_model()
    field_model = load_field_detection_model()

    print("🔄 Training team classifier...")
    team_classifier = fit_team_classifier_from_video(
        source_video_path=source_video,
        player_detection_model=player_model,
        stride=30,
    )

    ellipse_annotator = create_ellipse_annotator()
    label_annotator = create_label_annotator()
    triangle_annotator = create_triangle_annotator()

    tracker = sv.ByteTrack()
    tracker.reset()

    first_frame = get_first_frame(source_video)
    height, width = first_frame.shape[:2]

    writer = create_side_by_side_writer(
        output_path=output_video,
        frame_width=width,
        frame_height=height,
    )

    frame_gen = sv.get_video_frames_generator(source_video)

    print(f"🎥 Processing video: {source_video}")
    for frame in tqdm(frame_gen, desc="processing"):

        # ------- DETECTIONS -------
        result = player_model.infer(frame, confidence=CONFIDENCE_THRESHOLD)[0]
        detections = sv.Detections.from_inference(result)

        ball_det = detections[detections.class_id == BALL_ID]
        if len(ball_det):
            ball_det.xyxy = sv.pad_boxes(ball_det.xyxy, 10)

        others = detections[detections.class_id != BALL_ID]
        others = others.with_nms(NMS_THRESHOLD, class_agnostic=True)
        others = tracker.update_with_detections(others)

        goalkeepers = others[others.class_id == GOALKEEPER_ID]
        players = others[others.class_id == PLAYER_ID]
        referees = others[others.class_id == REFEREE_ID]

        # ------- TEAM ASSIGNMENT -------
        if len(players):
            crops = [sv.crop_image(frame, xyxy) for xyxy in players.xyxy]
            players.class_id = team_classifier.predict(crops)

        if len(goalkeepers) and len(players):
            goalkeepers.class_id = resolve_goalkeepers_team_id(players, goalkeepers)

        if len(referees):
            referees.class_id -= 1

        combined_det = sv.Detections.merge([players, goalkeepers, referees])

        labels = [f"#{tid}" for tid in combined_det.tracker_id]
        if len(combined_det):
            combined_det.class_id = combined_det.class_id.astype(int)

        # ------- CAMERA VIEW -------
        annotated = frame.copy()

        if len(combined_det):
            annotated = ellipse_annotator.annotate(annotated, combined_det)
            annotated = label_annotator.annotate(annotated, combined_det, labels)

        if len(ball_det):
            annotated = triangle_annotator.annotate(annotated, ball_det)

        # ------- FIELD DETECTION -------
        field_res = field_model.infer(frame, confidence=CONFIDENCE_THRESHOLD)[0]
        key_points = sv.KeyPoints.from_inference(field_res)
        mask = key_points.confidence[0] > 0.5

        if not np.any(mask):
            pitch_view = draw_pitch(CONFIG)

        else:
            src_pts = key_points.xy[0][mask]
            tgt_pts = np.array(CONFIG.vertices)[mask]

            transformer = ViewTransformer(source=src_pts, target=tgt_pts)

            # --- Project objects ---
            ball_xy = (
                ball_det.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
                if len(ball_det) else np.empty((0, 2))
            )
            pitch_ball = transformer.transform_points(ball_xy)

            players_xy = (
                players.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
                if len(players) else np.empty((0, 2))
            )
            pitch_players = transformer.transform_points(players_xy)

            refs_xy = (
                referees.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
                if len(referees) else np.empty((0, 2))
            )
            pitch_refs = transformer.transform_points(refs_xy)

            pitch_view = draw_pitch(CONFIG)

            # --- Draw ball ---
            if len(pitch_ball):
                pitch_view = draw_points_on_pitch(
                    config=CONFIG,
                    xy=pitch_ball,
                    face_color=sv.Color.WHITE,
                    edge_color=sv.Color.BLACK,
                    radius=int(8),
                    pitch=pitch_view
                )

            # --- Draw players ---
            if len(players):
                # team 0
                team0 = pitch_players[players.class_id == 0]
                if len(team0):
                    pitch_view = draw_points_on_pitch(
                        config=CONFIG,
                        xy=team0,
                        face_color=sv.Color.from_hex('00BFFF'),
                        edge_color=sv.Color.BLACK,
                        radius=int(16),
                        pitch=pitch_view
                    )

                # team 1
                team1 = pitch_players[players.class_id == 1]
                if len(team1):
                    pitch_view = draw_points_on_pitch(
                        config=CONFIG,
                        xy=team1,
                        face_color=sv.Color.from_hex('FF1493'),
                        edge_color=sv.Color.BLACK,
                        radius=int(16),
                        pitch=pitch_view
                    )

            # --- Draw referees ---
            if len(pitch_refs):
                pitch_view = draw_points_on_pitch(
                    config=CONFIG,
                    xy=pitch_refs,
                    face_color=sv.Color.from_hex('FFD700'),
                    edge_color=sv.Color.BLACK,
                    radius=int(14),
                    pitch=pitch_view
                )

        # ------- COMBINE -------
        radar = cv2.resize(pitch_view, (width, height))
        out = np.hstack((annotated, radar))
        out = cv2.cvtColor(out, cv2.COLOR_RGB2BGR)
        writer.write(out)

    writer.release()
    print(f"✅ Done! Saved to: {output_video}")


# ---------------------------
# RUN PIPELINE
# ---------------------------
if __name__ == "__main__":
    run_player_field_pipeline(SOURCE_VIDEO, OUTPUT_VIDEO)