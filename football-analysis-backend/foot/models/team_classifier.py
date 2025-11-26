# models/team_classifier.py

import torch
import supervision as sv
from tqdm import tqdm
from sports.common.team import TeamClassifier
from config import PLAYER_ID, CONFIDENCE_THRESHOLD, NMS_THRESHOLD


def _get_device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def fit_team_classifier_from_video(
    source_video_path: str,
    player_detection_model,
    stride: int = 30
) -> TeamClassifier:
    """
    Sample frames from the video, detect players, crop their images,
    and fit TeamClassifier on those crops.
    """

    frame_generator = sv.get_video_frames_generator(
        source_path=source_video_path,
        stride=stride
    )

    crops = []
    for frame in tqdm(frame_generator, desc="collecting crops for team classifier"):
        result = player_detection_model.infer(
            frame,
            confidence=CONFIDENCE_THRESHOLD
        )[0]
        detections = sv.Detections.from_inference(result)

        # Optional NMS
        detections = detections.with_nms(
            threshold=NMS_THRESHOLD,
            class_agnostic=True
        )
        detections = detections[detections.class_id == PLAYER_ID]

        players_crops = [sv.crop_image(frame, xyxy) for xyxy in detections.xyxy]
        crops += players_crops

    if len(crops) == 0:
        raise RuntimeError("No player crops collected for team classifier training.")

    device = _get_device()
    team_classifier = TeamClassifier(device=device)
    team_classifier.fit(crops)
    return team_classifier