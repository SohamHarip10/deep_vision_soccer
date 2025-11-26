# utils/draw_utils.py

import supervision as sv


def create_ellipse_annotator():
    return sv.EllipseAnnotator(
        color=sv.ColorPalette.from_hex(['#00BFFF', '#FF1493', '#FFD700']),
        thickness=2
    )


def create_label_annotator():
    return sv.LabelAnnotator(
        color=sv.ColorPalette.from_hex(['#00BFFF', '#FF1493', '#FFD700']),
        text_color=sv.Color.from_hex('#000000'),
        text_position=sv.Position.BOTTOM_CENTER
    )


def create_triangle_annotator(base: int = 20, height: int = 17):
    return sv.TriangleAnnotator(
        color=sv.Color.from_hex('#FFD700'),
        base=base,
        height=height
    )