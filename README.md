## ⚽ DeepVision Soccer

An AI-powered web application for automated football match analysis and live tactical insights.

---

## 📌 Features

✅ **Video Upload & Analysis** - Upload match videos and receive annotated outputs showing players, ball tracking, and formations
✅ **Live Statistics** - View up-to-date league standings, fixtures, and detailed player stats from API-Football.
✅ **Output Management** - Stream, download, or delete analyzed match videos directly from the browser.
✅ **Responsive UI** - Clean, modern interface with dynamic JavaScript features.

---

## 🛠 Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Flask (Python)
- **Models/AI:** PyTorch, OpenCV, Supervision, custom computer vision
- **External API:** API-Football
- **Video Storage:** Filesystem folders (uploaded_videos, output_videos)
- **Deployment:** Local/Server (Python 3.x, Flask)

## 👥 Contributors

---

## 📂 Project Structure 

deepvision-soccer/
│
├── uploaded_videos/        # Raw input videos
├── output_videos/          # Annotated analysis results
├── js/ css/ templates/     # Frontend files
├── app.py                  # Flask backend & API routes
├── models/ utils/          # AI/ML modules
└── README.md

## 🚀 Installation & Setup  
```bash
1. Clone the repository - 
git clone https://github.com/yourusername/deepvision-soccer.git
cd deepvision-soccer

2. Create (and activate) a virtual environment
python -m venv venv
venv\Scripts\activate   # On Windows
source venv/bin/activate # On Linux/Mac

3. Install dependencies
pip install -r requirements.txt

4. Download or prepare your trained model files

5. Run the backend (Flask)
python app.py

6. Open index.html in your browser and start uploading/analyzing videos!
