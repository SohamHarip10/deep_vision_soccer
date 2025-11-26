# utils/video_utils.py

import cv2
import supervision as sv
from config import FPS


def get_video_info(path: str) -> sv.VideoInfo:
    return sv.VideoInfo.from_video_path(path)


def get_first_frame(path: str):
    generator = sv.get_video_frames_generator(path)
    return next(generator)


def create_side_by_side_writer(
    output_path: str,
    frame_width: int,
    frame_height: int,
    fps: int = FPS
) -> cv2.VideoWriter:
    """
    Creates a VideoWriter that outputs frames of size (2 * width, height).
    """
    return cv2.VideoWriter(
        output_path,
        cv2.VideoWriter_fourcc(*"mp4v"),
        fps,
        (frame_width * 2, frame_height)
    )