DeepVision Soccer
AI-powered web platform for automated football match analytics and tactical insights.

Features :
Upload match videos for automated analysis with player, ball, and field detection.
Generate annotated outputs for formations, ball paths, and player tracking.
Live statistics and player data from API-Football (standings, fixtures, top scorers).
View, stream, download, or delete processed videos from the browser.
Responsive frontend (HTML/CSS/JavaScript), Flask backend, PyTorch/OpenCV models.
Secure REST API with backend job management and video streaming support.
GPU acceleration for fast model inference (CUDA/CuDNN compatible).

Tech Stack :
Frontend: HTML, CSS, JavaScript
Backend: Flask (Python)
ML/AI: PyTorch, OpenCV, SciPy, Custom computer vision models
External API: API-Football
Deployment: Works locally on Windows/Linux (Python 3.x, Flask)

Usage :
Clone the repo and install dependencies (pip install -r requirements.txt).
Start the Flask backend (python app.py).
Open index.html or upload.html in your browser.
Upload a match video, trigger analysis, and review the results on the Output page.
Access live stats and player data through dedicated pages.

Project Structure :
/uploaded_videos — Raw input videos
/output_videos — Annotated/processed result videos
/js, /css, /templates — Frontend scripts and styles
app.py — Flask backend and API routes
models/, utils/ — Deep learning/computer vision modules

Feel free to fork, extend, or adapt this project for your own football analytics needs!
