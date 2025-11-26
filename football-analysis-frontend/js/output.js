// output.js
const outputContainer = document.getElementById('outputVideos');
const BACKEND_BASE = 'http://127.0.0.1:5000';

function renderOutputList(videos) {
    if (!videos.length) {
        outputContainer.textContent = "No output videos found.";
        return;
    }
    outputContainer.innerHTML = '';
    videos.forEach(filename => {
        const card = document.createElement('div');
        card.style.background = "rgba(28,32,54,0.13)";
        card.style.borderRadius = "14px";
        card.style.padding = "18px";
        card.style.boxShadow = "0 2px 14px #2228";
        card.style.maxWidth = "480px";
        card.style.margin = "10px";
        card.innerHTML = `
            <video width="400" controls preload="none" style="display:block;margin-bottom:10px;">
                <source src="${BACKEND_BASE}/output_videos_download/${encodeURIComponent(filename)}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div style="color:#edf0ff;font-size:1.07em;font-weight:600;">${filename}</div>
        `;
        outputContainer.appendChild(card);
    });
}

async function fetchOutputVideos() {
    outputContainer.innerHTML = "Loading...";
    try {
        const res = await fetch(`${BACKEND_BASE}/output_videos`);
        const data = await res.json();
        if (data.videos) {
            renderOutputList(data.videos);
        } else {
            outputContainer.textContent = "No output videos found.";
        }
    } catch (err) {
        outputContainer.textContent = "Error loading videos.";
    }
}
fetchOutputVideos();
