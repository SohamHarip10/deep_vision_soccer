// ==================== UPLOAD VIDEO PAGE JAVASCRIPT ====================

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const videoPreview = document.getElementById('videoPreview');
const previewVideo = document.getElementById('previewVideo');
const videoDetails = document.getElementById('videoDetails');
const uploadBtn = document.getElementById('uploadBtn');
const cancelBtn = document.getElementById('cancelBtn');
const processingCard = document.getElementById('processingCard');
const resultsCard = document.getElementById('resultsCard');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const downloadBtn = document.getElementById('downloadBtn');
const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

// Processed video display element
const resultVideo = document.getElementById('resultVideo');

let selectedFile = null;
let processedVideoUrl = null;

const BACKEND_BASE = 'http://127.0.0.1:5000'; // Flask backend
const UPLOAD_ENDPOINT = `${BACKEND_BASE}/upload`;
const LIST_ENDPOINT = `${BACKEND_BASE}/videos`; // list uploaded videos

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, preventDefaults, false);
  document.body.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Highlight drop area
['dragenter', 'dragover'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
});
['dragleave', 'drop'].forEach(eventName => {
  uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
});

// Handle dropped files
uploadArea.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}, false);

// Handle file input change
videoInput.addEventListener('change', (e) => {
  const files = e.target.files;
  handleFiles(files);
});

// Process selected files
function handleFiles(files) {
  if (files.length === 0) return;
  const file = files[0];

  // Validate file type
  if (!file.type.startsWith('video/')) {
    alert('Please select a valid video file!');
    return;
  }
  // Validate file size (500MB max)
  const maxSize = 500 * 1024 * 1024;
  if (file.size > maxSize) {
    alert('File size exceeds 500MB limit!');
    return;
  }

  selectedFile = file;
  displayVideoPreview(file);
}

// Display video preview before upload
function displayVideoPreview(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;

  const onMeta = () => {
    const duration = formatDuration(previewVideo.duration);
    const size = formatFileSize(file.size);
    videoDetails.innerHTML = `
      <p><strong>File Name:</strong> ${file.name}</p>
      <p><strong>Size:</strong> ${size}</p>
      <p><strong>Duration:</strong> ${duration}</p>
    `;
    previewVideo.removeEventListener('loadedmetadata', onMeta);
  };
  previewVideo.addEventListener('loadedmetadata', onMeta);

  uploadArea.style.display = 'none';
  videoPreview.style.display = 'block';
}

// Cancel upload
cancelBtn.addEventListener('click', resetUpload);

// ==================== START ANALYSIS API CALL ====================
async function startAnalysis(filename) {
  const response = await fetch(`${BACKEND_BASE}/start_analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!response.ok) {
    throw new Error('Failed to start analysis');
  }
  return response.json(); // returns { job_id, status_url }
}
// ==================== START BALL TRACKING API CALL ====================
async function startBallTracking(filename) {
  const response = await fetch(`${BACKEND_BASE}/start_ball_tracking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename })
  });
  if (!response.ok) {
    throw new Error('Failed to start ball tracking');
  }
  return response.json(); // returns { job_id, status_url }
}

// ==================== START BALL TRACKING BUTTON HANDLER ====================
const startTrackingBtn = document.getElementById('startTrackingBtn');
if (startTrackingBtn) {
  startTrackingBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Please select a video first.');
      return;
    }
    startProcessing();
    runVisualSteps();

    const success = await uploadToBackend(selectedFile);
    if (success) {
      try {
        const startData = await startBallTracking(selectedFile.name);
        console.log('Started ball tracking:', startData);

        pollJobStatus(startData.job_id);

        animateProgress(10, 1000); // initial progress animation
      } catch (err) {
        alert('Failed to start ball tracking: ' + err.message);
        resetUpload();
      }
    } else {
      alert('Failed to upload video. Please try again.');
      resetUpload();
    }
  });
}


// Poll /status/<job_id> for job progress and completion
async function pollJobStatus(jobId) {
  const statusUrl = `${BACKEND_BASE}/status/${jobId}`;

  const intervalId = setInterval(async () => {
    try {
      const res = await fetch(statusUrl);
      if (!res.ok) {
        console.error('Failed to fetch job status');
        clearInterval(intervalId);
        return;
      }
      const statusData = await res.json();
      console.log('Job status:', statusData.status);

      if (statusData.status === 'done') {
        clearInterval(intervalId);
        processedVideoUrl = statusData.output_url;
        showResults();
      } else if (statusData.status === 'error') {
        clearInterval(intervalId);
        alert('Error during analysis: ' + (statusData.error || 'Unknown error'));
        resetUpload();
      }
      // Optionally update a progress bar based on status here
    } catch (e) {
      console.error('Error polling job status:', e);
      clearInterval(intervalId);
    }
  }, 2000); // poll every 2 seconds
}

// ==================== UPLOAD BUTTON CLICK HANDLER ====================
uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) {
    alert('Please select a video first.');
    return;
  }
  startProcessing();
  runVisualSteps();

  const success = await uploadToBackend(selectedFile);
  if (success) {
    try {
      const startData = await startAnalysis(selectedFile.name);
      console.log('Started analysis:', startData);

      pollJobStatus(startData.job_id);

      animateProgress(10, 1000); // initial progress bar animation
    } catch (err) {
      alert('Failed to start analysis: ' + err.message);
      resetUpload();
    }
  } else {
    alert('Failed to upload video. Please try again.');
    resetUpload();
  }
});

// Start processing UI
function startProcessing() {
  videoPreview.style.display = 'none';
  processingCard.style.display = 'block';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';
  ['step1', 'step2', 'step3', 'step4'].forEach(id => {
    const step = document.getElementById(id);
    if (step) step.classList.remove('active', 'completed');
  });
}

// Visual steps animation
function runVisualSteps() {
  const steps = [
    { id: 'step1', duration: 1200 },
    { id: 'step2', duration: 1800 },
    { id: 'step3', duration: 1800 },
    { id: 'step4', duration: 1000 }
  ];
  let current = 0;

  function tick() {
    if (current > 0) {
      const prev = document.getElementById(steps[current - 1].id);
      if (prev) {
        prev.classList.remove('active');
        prev.classList.add('completed');
      }
    }
    if (current < steps.length) {
      const now = document.getElementById(steps[current].id);
      if (now) now.classList.add('active');
      const target = ((current + 1) / steps.length) * 90;
      animateProgress(target, steps[current].duration);
      setTimeout(() => {
        current++;
        tick();
      }, steps[current].duration);
    }
  }
  tick();
}

// Animate progress bar
function animateProgress(targetProgress, duration) {
  const start = parseFloat(progressFill.style.width) || 0;
  const end = targetProgress;
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const ratio = Math.min(elapsed / duration, 1);
    const value = start + (end - start) * ratio;
    progressFill.style.width = value + '%';
    progressText.textContent = Math.round(value) + '%';
    if (ratio < 1) requestAnimationFrame(update);
  }
  update();
}

// Show results with processed video from backend
function showResults() {
  processingCard.style.display = 'none';
  resultsCard.style.display = 'block';

  if (selectedFile) {
    document.getElementById('videoSize').textContent = formatFileSize(selectedFile.size);
  }
  if (previewVideo && previewVideo.duration) {
    document.getElementById('videoDuration').textContent = formatDuration(previewVideo.duration);
  }
  const timeEl = document.getElementById('processingTime');
  if (timeEl && (!timeEl.textContent || timeEl.textContent === '--')) {
    const processingTime = Math.floor(Math.random() * 30) + 10;
    timeEl.textContent = processingTime + ' seconds';
  }

  // Show processed video
  if (resultVideo) {
    if (processedVideoUrl) {
      resultVideo.src = processedVideoUrl.startsWith('/videos/')
        ? `${BACKEND_BASE}${processedVideoUrl}`
        : processedVideoUrl;
      resultVideo.load();
      resultVideo.style.display = 'block';
    } else {
      resultVideo.src = '';
      resultVideo.style.display = 'none';
    }
  }
}

// Download analyzed video
downloadBtn.addEventListener('click', () => {
  if (processedVideoUrl) {
    const link = document.createElement('a');
    link.href = processedVideoUrl.startsWith('/videos/')
      ? `${BACKEND_BASE}${processedVideoUrl}`
      : processedVideoUrl;
    link.download = selectedFile ? ('analyzed_' + selectedFile.name) : 'analyzed_video.mp4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Video downloaded successfully!');
  } else {
    alert('Processed video not available yet.');
  }
});

// Upload another video
uploadAnotherBtn.addEventListener('click', resetUpload);

// Reset upload state
function resetUpload() {
  selectedFile = null;
  processedVideoUrl = null;
  videoInput.value = '';
  previewVideo.src = '';
  videoDetails.innerHTML = '';
  progressFill.style.width = '0%';
  progressText.textContent = '0%';

  ['step1', 'step2', 'step3', 'step4'].forEach(id => {
    const step = document.getElementById(id);
    if (step) step.classList.remove('active', 'completed');
  });

  uploadArea.style.display = 'block';
  videoPreview.style.display = 'none';
  processingCard.style.display = 'none';
  resultsCard.style.display = 'none';

  if (resultVideo) {
    resultVideo.src = '';
    resultVideo.style.display = 'none';
  }
}

// Helpers
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ==================== FLASK BACKEND INTEGRATION ====================
async function uploadToBackend(file) {
  const formData = new FormData();
  formData.append('video', file);

  try {
    const response = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      console.error('Upload failed with status:', response.status);
      return false;
    }

    const data = await response.json();
    if (data.error) {
      console.error('Backend error:', data.error);
      return false;
    }

    // Flask backend returns video_url
    if (data.video_url) {
      processedVideoUrl = data.video_url;
    } else {
      processedVideoUrl = null;
    }

    return true;
  } catch (err) {
    console.error('Upload error:', err);
    return false;
  }
}

// ==================== LIST + OPEN + DELETE ====================
async function fetchUploadedVideos() {
  try {
    const res = await fetch(LIST_ENDPOINT, { method: 'GET' });
    if (!res.ok) throw new Error(`List failed: ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.videos) ? data.videos : [];
    const badge = document.getElementById('uvCount');
    if (badge) badge.textContent = `${list.length} ${list.length === 1 ? 'file' : 'files'}`;
    renderVideoList(list);
  } catch (err) {
    console.error('List videos error:', err);
    renderVideoList([]);
  }
}

function renderVideoList(videos) {
  const container = document.getElementById('videoList');
  if (!container) return;

  if (!videos.length) {
    container.innerHTML = '<p style="color:#e5e7eb;">No videos uploaded yet.</p>';
    return;
  }

  const html = videos.map(name => {
    const href = `${BACKEND_BASE}/videos/${encodeURIComponent(name)}`;
    const ext = (name.split('.').pop() || '').toUpperCase();
    return `
      <div class="uv-row" data-row="${name}">
        <div class="uv-file">
          <div class="uv-icon">${ext.slice(0,3)}</div>
          <div style="min-width:0;">
            <div class="uv-name">${name}</div>
            <div class="uv-meta">Stored on server</div>
          </div>
        </div>
        <div class="uv-ops">
          <button class="uv-btn" data-open="${href}" data-name="${name}">Open</button>
          <a class="uv-btn primary" href="${href}" download>Download</a>
          <button class="uv-btn danger" data-delete="${name}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  // Open in modal player
  container.querySelectorAll('button[data-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-open');
      const name = btn.getAttribute('data-name') || 'Video';
      if (typeof window.openVideoPlayer === 'function') {
        window.openVideoPlayer(url, name);
      } else {
        window.open(url, '_blank');
      }
    });
  });

  // Delete handler
  container.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const name = btn.getAttribute('data-delete');
      const row = btn.closest(`.uv-row[data-row="${CSS.escape(name)}"]`) || btn.closest('.uv-row');
      await deleteVideo(name, row);
    });
  });
}

async function deleteVideo(filename, rowEl) {
  if (!confirm(`Delete "${filename}" permanently?`)) return;
  try {
    const res = await fetch(`${BACKEND_BASE}/videos/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Failed to delete');
      return;
    }
    if (rowEl && rowEl.parentElement) rowEl.parentElement.removeChild(rowEl);
    fetchUploadedVideos();
  } catch (e) {
    console.error(e);
    alert('Network error while deleting');
  }
}

// Expose for HTML to call on the "Show" button
window.fetchUploadedVideos = fetchUploadedVideos;

console.log('📹 Upload page loaded successfully!');
