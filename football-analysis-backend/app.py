from flask import Flask, request, jsonify, send_from_directory, Response, abort
from flask_cors import CORS
import os
import mimetypes
import requests

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]}})

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploaded_videos")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

OUTPUT_FOLDER = r"C:\Users\Soham Harip\OneDrive\Desktop\football-analysis-backend\output_videos"

API_FOOTBALL_KEY = "dbf1b460d823dcb022ec3549a0f3977a"
API_BASE = "https://v3.football.api-sports.io"

LEAGUE_CODE_MAP = {
    "EPL": 39,
    "LL": 140,
    "UCL": 2,
    "SA": 135,
    "BL": 78,
    "L1": 61,
    "PORTUGAL": 94,
    "ILEAGUE": 325,
    "SPL": 307,
    "UEL": 3,
    "CL": 2
}

def api_headers():
    return {"x-apisports-key": API_FOOTBALL_KEY}

def proxy_get(path, params):
    try:
        r = requests.get(f"{API_BASE}{path}", params=params, headers=api_headers(), timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "upstream_error", "status": r.status_code, "data": r.json()}), r.status_code
        return jsonify(r.json())
    except requests.Timeout:
        return jsonify({"error": "timeout"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------- Video Upload/Streaming ----------------------
@app.route("/upload", methods=["POST"])
def upload_video():
    if "video" not in request.files:
        return jsonify({"error": "No video part in the request"}), 400
    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    filename = file.filename
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(file_path)
    return jsonify({"message": "Video uploaded successfully", "filename": filename, "video_url": f"/videos/{filename}"}), 200

@app.route("/videos", methods=["GET"])
def list_videos():
    try:
        videos = sorted(os.listdir(app.config["UPLOAD_FOLDER"]))
        return jsonify({"videos": videos}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def _partial_response(path, start, end, total, mime):
    length = end - start + 1
    with open(path, 'rb') as f:
        f.seek(start)
        data = f.read(length)
    rv = Response(data, 206, mimetype=mime, direct_passthrough=True)
    rv.headers.add('Content-Range', f'bytes {start}-{end}/{total}')
    rv.headers.add('Accept-Ranges', 'bytes')
    rv.headers.add('Content-Length', str(length))
    return rv

@app.route("/videos/<path:filename>", methods=["GET"])
def get_video(filename):
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404
    total_size = os.path.getsize(file_path)
    mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    range_header = request.headers.get('Range', None)
    if range_header is None:
        resp = send_from_directory(app.config["UPLOAD_FOLDER"], filename, mimetype=mime, as_attachment=False)
        resp.headers.add('Accept-Ranges', 'bytes')
        resp.headers.add('Content-Length', str(total_size))
        return resp
    try:
        units, rng = range_header.split("=", 1)
        if units != "bytes":
            return abort(416)
        start_str, end_str = rng.split("-", 1)
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else total_size - 1
        end = min(end, total_size - 1)
        if start > end or start < 0:
            return abort(416)
    except Exception:
        return abort(416)
    return _partial_response(file_path, start, end, total_size, mime)

@app.route("/videos/<path:filename>", methods=["DELETE"])
def delete_video(filename):
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({"message": f"{filename} deleted successfully"}), 200
    else:
        return jsonify({"error": "File not found"}), 404

# ---------------------- Standings Endpoint ----------------------
@app.route("/api/get_standings", methods=["GET"])
def get_standings():
    league = request.args.get("league", "")
    season = request.args.get("season", "")
    if not league or not season:
        return jsonify({"error": "Missing league or season parameter"}), 400
    try:
        try:
            league_id = int(league)
        except ValueError:
            league_id = LEAGUE_CODE_MAP.get(league.upper())
        if not league_id:
            return jsonify({"error": "Invalid league code"}), 400
        params = {"league": league_id, "season": season}
        r = requests.get(f"{API_BASE}/standings", params=params, headers=api_headers(), timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "API-Football error", "status": r.status_code, "data": r.json()}), r.status_code
        api_data = r.json()
        standings = []
        if api_data.get("response"):
            try:
                standings = api_data["response"][0]["league"]["standings"][0]
            except Exception:
                standings = []
        return jsonify({"standings": standings})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------- Fixtures Endpoint ----------------------
@app.route("/api/get_fixtures", methods=["GET"])
def get_fixtures():
    league = request.args.get("league", "")
    season = request.args.get("season", "")
    timezone = request.args.get("timezone", "Asia/Kolkata")
    if not league or not season:
        return jsonify({"error": "Missing league or season parameter"}), 400
    try:
        try:
            league_id = int(league)
        except ValueError:
            league_id = LEAGUE_CODE_MAP.get(league.upper())
        if not league_id:
            return jsonify({"error": "Invalid league code"}), 400
        params = {"league": league_id, "season": season, "timezone": timezone}
        r = requests.get(f"{API_BASE}/fixtures", params=params, headers=api_headers(), timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "API-Football error", "status": r.status_code, "data": r.json()}), r.status_code
        api_data = r.json()
        fixtures = []
        if api_data.get("response"):
            fixtures = api_data["response"]
        return jsonify({"fixtures": fixtures})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------- API-FOOTBALL PLAYER/TEAM DATA PROXIES ----------------------
@app.route("/api/players/topscorers", methods=["GET"])
def api_topscorers():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players/topscorers", params)

@app.route("/api/players/topassists", methods=["GET"])
def api_topassists():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players/topassists", params)

@app.route("/api/players/topyellowcards", methods=["GET"])
def api_top_yellowcards():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players/topyellowcards", params)

@app.route("/api/players/topredcards", methods=["GET"])
def api_top_redcards():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players/topredcards", params)

@app.route("/api/players", methods=["GET"])
def api_players():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players", params)

@app.route("/api/players/squads", methods=["GET"])
def api_players_squads():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/players/squads", params)

@app.route("/api/coachs", methods=["GET"])
def api_coachs():
    params = {k: v for k, v in request.args.items()}
    return proxy_get("/coachs", params)

# ============ OUTPUT VIDEO BROWSING/STREAMING/DELETING ===============

@app.route("/output_videos", methods=["GET"])
def list_output_videos():
    try:
        videos = sorted(os.listdir(OUTPUT_FOLDER))
        return jsonify({"videos": videos}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/output_videos_download/<path:filename>", methods=["GET"])
def download_output_video(filename):
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    if not os.path.isfile(file_path):
        return jsonify({"error": "File not found"}), 404
    total_size = os.path.getsize(file_path)
    mime = mimetypes.guess_type(file_path)[0] or "video/mp4"
    range_header = request.headers.get('Range', None)
    if not range_header:
        resp = send_from_directory(OUTPUT_FOLDER, filename, mimetype=mime, as_attachment=False)
        resp.headers.add('Accept-Ranges', 'bytes')
        resp.headers.add('Content-Length', str(total_size))
        return resp
    try:
        units, rng = range_header.split("=", 1)
        if units != "bytes":
            return abort(416)
        start_str, end_str = rng.split("-", 1)
        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else total_size - 1
        end = min(end, total_size - 1)
        if start > end or start < 0:
            return abort(416)
    except Exception:
        return abort(416)
    length = end - start + 1
    with open(file_path, 'rb') as f:
        f.seek(start)
        data = f.read(length)
    rv = Response(data, 206, mimetype=mime, direct_passthrough=True)
    rv.headers.add('Content-Range', f'bytes {start}-{end}/{total_size}')
    rv.headers.add('Accept-Ranges', 'bytes')
    rv.headers.add('Content-Length', str(length))
    return rv

@app.route("/output_videos/<path:filename>", methods=["DELETE"])
def delete_output_video(filename):
    file_path = os.path.join(OUTPUT_FOLDER, filename)
    if os.path.isfile(file_path):
        os.remove(file_path)
        return jsonify({"message": f"{filename} deleted from output_videos"}), 200
    else:
        return jsonify({"error": "File not found"}), 404

#------------------------------------------------------------ xxxxx------------------------------------------------
# analysis_service.py
import os
import uuid 
import traceback
from flask import Flask, request, jsonify, send_from_directory, current_app
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from functools import partial
from foot.pipelines.ball_tracking_pipelines import run_ball_tracking_pipeline
from foot.pipelines.players_field_pipelines import run_player_field_pipeline
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

# --- CONFIG: adjust to your backend paths ---
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploaded_videos"        # where uploaded videos are stored
OUTPUT_FOLDER = BASE_DIR / "output_videos"         # where model outputs should go
OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
# ------------------------------------------------

# Simple in-memory job store (job_id -> {status, input, output, error})
# For production use Redis/DB to persist across restarts.
jobs = {}

# Thread pool for running model jobs in background
executor = ThreadPoolExecutor(max_workers=2)  # tune number of workers

# ---- Replace / adapt this wrapper to call your model ----
# I expect your model code to provide a callable like `analyze_video(input_path, output_path)`
# If your model code currently reads a hard-coded path, create a wrapper function that accepts paths.
def analyze_video_wrapper(input_path: str, output_path: str):
    """
    Call your real model here. This wrapper's contract:
    - input_path: path to input video file (string)
    - output_path: where to save the analyzed/annotated output video.
    """
    # Example placeholder - replace with your real model call.
    run_player_field_pipeline(input_path, output_path)

    # END placeholder
# ---------------------------------------------------------

def run_job(job_id, input_path, output_path):
    jobs[job_id]["status"] = "running"
    try:
        # call the model (replace with your real model call)
        analyze_video_wrapper(str(input_path), str(output_path))

        # After successful completion:
        jobs[job_id]["status"] = "done"
        jobs[job_id]["output"] = output_path.name
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = traceback.format_exc()

@app.route("/start_analysis", methods=["POST"])
def start_analysis():
    """
    Request body example (JSON):
    { "filename": "match_1.mp4" }
    where filename is the name of the already-uploaded file in UPLOAD_FOLDER.
    """
    data = request.get_json(force=True)
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "filename is required"}), 400

    input_path = UPLOAD_FOLDER / filename
    if not input_path.exists():
        return jsonify({"error": "file not found", "path": str(input_path)}), 404

    # create job id and output filename
    job_id = str(uuid.uuid4())
    # prefix output so we don't overwrite: analyzed_<original name>
    output_name = f"analyzed_{filename}"
    output_path = OUTPUT_FOLDER / output_name

    # register job
    jobs[job_id] = {
        "status": "queued",
        "input": filename,
        "output": None,
        "error": None,
    }

    # submit the job to thread pool (non-blocking)
    executor.submit(partial(run_job, job_id, input_path, output_path))

    return jsonify({"job_id": job_id, "status_url": f"/status/{job_id}"}), 202

@app.route("/status/<job_id>", methods=["GET"])
def job_status(job_id):
    info = jobs.get(job_id)
    if not info:
        return jsonify({"error": "job not found"}), 404
    # If done, include URL to output file
    response = {
        "job_id": job_id,
        "status": info["status"],
        "input": info["input"],
    }
    if info.get("output"):
        response["output_filename"] = info["output"]
        response["output_url"] = f"/output_videos/{info['output']}"
    if info.get("error"):
        response["error"] = info["error"]
    return jsonify(response)

@app.route("/output_videos/<path:filename>", methods=["GET"])
def serve_output(filename):
    # Serves result videos from OUTPUT_FOLDER
    return send_from_directory(str(OUTPUT_FOLDER), filename, as_attachment=False)

# -- minimal health endpoint
@app.route("/jobs", methods=["GET"])
def list_jobs():
    return jsonify(jobs)

#---------------------------------------------------------------xx------------------------------
def run_ball_tracking_job(job_id, input_path, output_path):
    jobs[job_id]["status"] = "running"
    try:
        # Run ball tracking pipeline only!
        run_ball_tracking_pipeline(str(input_path), str(output_path))
        jobs[job_id]["status"] = "done"
        jobs[job_id]["output"] = output_path.name
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = traceback.format_exc()

@app.route("/start_ball_tracking", methods=["POST"])
def start_ball_tracking():
    """
    Request body (JSON):
    { "filename": "your_video.mp4" }
    Where filename is the name of the uploaded file in UPLOAD_FOLDER.
    """
    data = request.get_json(force=True)
    filename = data.get("filename")
    if not filename:
        return jsonify({"error": "filename is required"}), 400

    input_path = UPLOAD_FOLDER / filename
    if not input_path.exists():
        return jsonify({"error": "file not found", "path": str(input_path)}), 404

    # Create job id and output filename
    job_id = str(uuid.uuid4())
    output_name = f"tracked_{filename}"  # Prefix to avoid clash
    output_path = OUTPUT_FOLDER / output_name

    # Register job
    jobs[job_id] = {
        "status": "queued",
        "input": filename,
        "output": None,
        "error": None,
    }

    # Run pipeline in the background
    executor.submit(partial(run_ball_tracking_job, job_id, input_path, output_path))

    return jsonify({"job_id": job_id, "status_url": f"/status/{job_id}"}), 202


if __name__ == "__main__":
    app.run(debug=True, port=5000, host='0.0.0.0')
