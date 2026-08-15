# MoveSmart Edge AI Driver Monitoring Service

This folder contains the standalone Python / OpenCV edge monitoring daemon that connects directly to the MoveSmart Backend API.

## Architecture

```
Camera / RTSP Stream
      ↓
OpenCV / MediaPipe Face & Eye Landmark Pipeline
      ↓
Eye Aspect Ratio (EAR) + Face Embeddings Matcher
      ↓
HTTP POST /api/monitoring/heartbeat & /api/monitoring/event
      ↓
MoveSmart Node.js / Express Backend + Socket.IO
      ↓
Admin Live Safety Console & Driver Assistant
```

## How to Run

1. **Install Python dependencies**:
   ```bash
   pip install opencv-python numpy requests
   ```

2. **Run with an active bus**:
   ```bash
   python ai_monitoring_service.py --bus-number KL-07-MS-1008 --camera 0 --server http://localhost:5000
   ```

3. **Key Features**:
   - Fetches dynamic thresholds from `/api/monitoring/config`.
   - Sends periodic keepalive heartbeats (`/api/monitoring/heartbeat`).
   - Automatically detects prolonged eye closures (EAR < 0.22) and emits `EARLY_WARNING`, `DROWSINESS_WARNING`, or `CRITICAL_DROWSINESS`.
   - Detects driver absence with 15s warning and 30s critical escalation.
   - Detects face mismatch against registered driver profile.
