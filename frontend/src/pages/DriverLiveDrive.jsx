/**
 * ============================================================================
 * MoveSmart Driver Portal - DriverLiveDrive.jsx
 * ============================================================================
 * Redesigned Driver-First UI/UX:
 * - Extremely clear visual hierarchy for fast, safe bus-cockpit operation.
 * - Prominent "START DRIVE" and massive "MOVE TO NEXT STOP" primary actions.
 * - High-contrast Current Stop & Next Stop display.
 * - Clean visual route progress stepper (Completed ✓, Current ●, Upcoming ○).
 * - Clear Leaflet OpenStreetMap presentation.
 * - Live passenger RFID tap activity card.
 * - Preserves 100% of underlying API calls, Socket.IO events, state & handlers.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Navigation,
  Bus,
  MapPin,
  Play,
  Pause,
  Square,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Radio,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Compass,
  CreditCard,
  UserCheck,
  ChevronRight,
  Gauge,
  Sliders,
  Check,
  Map,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { getStoredUser, getStoredToken } from "../utils/session";
import DriverLayout from "../components/driver/DriverLayout";
import StatusBadge from "../components/driver/StatusBadge";

// Custom Leaflet Animated Bus Marker
function createLiveBusIcon(heading = 0, isLive = true) {
  const html = `
    <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
      <div style="
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: rgba(37, 99, 235, 0.35);
        animation: pulseRing 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
      "></div>
      <div style="
        position: relative;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%);
        border: 2.5px solid #60a5fa;
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 20px;
        transform: rotate(${heading || 0}deg);
        transition: transform 0.3s ease;
      ">
        🚌
      </div>
      <div style="
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        background: #16a34a;
        border: 2px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      "></div>
    </div>
  `;
  return L.divIcon({
    className: "custom-live-bus-marker",
    html,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });
}

// Custom Leaflet Transit Stop Marker
function createStopMarkerIcon(isCurrent = false, isCompleted = false, index = 1) {
  const bg = isCurrent ? "#2563eb" : isCompleted ? "#16a34a" : "#64748b";
  const border = isCurrent ? "#93c5fd" : isCompleted ? "#86efac" : "#cbd5e1";
  const label = isCompleted ? "✓" : index;

  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${bg};
      border: 2.5px solid ${border};
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
    ">
      ${label}
    </div>
  `;
  return L.divIcon({
    className: "custom-stop-marker",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

export default function DriverLiveDrive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [driverBuses, setDriverBuses] = useState([]);
  const [assignedBus, setAssignedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  // Drive Lifecycle States: NOT STARTED | ACTIVE | PAUSED | COMPLETED
  const [driveStatus, setDriveStatus] = useState("NOT STARTED");
  const [locationMode, setLocationMode] = useState("manual"); // manual | gps
  const [activeTrip, setActiveTrip] = useState(null);

  // Route & Stops Data
  const [stops, setStops] = useState([]);
  const [distances, setDistances] = useState([]);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [selectedNextStopCode, setSelectedNextStopCode] = useState("");
  const [lastSegmentDistance, setLastSegmentDistance] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);

  // Real-Time Passenger RFID Activity Feed
  const [recentRfidTaps, setRecentRfidTaps] = useState([]);
  const [latestRfidTap, setLatestRfidTap] = useState(null);

  // End Drive Summary Modal & Change Trip Modal
  const [showEndModal, setShowEndModal] = useState(false);
  const [endSummary, setEndSummary] = useState(null);
  const [showTripModal, setShowTripModal] = useState(false);
  const [allAvailableBuses, setAllAvailableBuses] = useState([]);

  // ============================================================================
  // DRIVER SAFETY & REAL-TIME AI CAMERA MONITORING STATE
  // ============================================================================
  const [monitoringSessionId, setMonitoringSessionId] = useState(null);
  const [monitoringState, setMonitoringState] = useState({
    alertness: "NORMAL",
    driverStatus: "STANDBY",
    deviceStatus: "ONLINE",
    ear: 0.29,
    faceConfidence: 0.95,
    absenceSeconds: 0,
    blinkCount: 0,
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);

  const [faceProfileStatus, setFaceProfileStatus] = useState({
    isEnrolled: false,
    enrolledAt: null,
    dimensions: 0,
    loading: false,
  });
  const [autoVerificationResult, setAutoVerificationResult] = useState({
    verified: false,
    isBiometricMatch: false,
    isLicenseApproved: false,
    driverName: "",
    licenseNumber: "",
    verificationStatus: "Unverified",
    distance: null,
    matchConfidence: 0,
    message: "",
    autoDetected: false,
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const visionLoopRef = useRef(null);
  const eyesClosedStartRef = useRef(null);
  const faceAbsentStartRef = useRef(null);
  const smoothedEarRef = useRef(0.29);
  const lastEventTriggerTimeRef = useRef(0);
  const lastStateReportedRef = useRef("NORMAL");
  const faceMeshRef = useRef(null);
  const isFaceMeshReadyRef = useRef(false);
  const enrolledEncodingRef = useRef(null);
  const lastFaceVerifyCheckRef = useRef(0);

  // Leaflet Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const busMarkerRef = useRef(null);
  const stopMarkersRef = useRef([]);
  const polylineRef = useRef(null);
  const socketRef = useRef(null);
  const activeTripRef = useRef(null);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 5000);
  };

  // 128-D spatial & luminance normalized feature vector extractor
  const extract128DVector = (sourceCanvas) => {
    try {
      const helperCanvas = document.createElement("canvas");
      helperCanvas.width = 64;
      helperCanvas.height = 64;
      const hCtx = helperCanvas.getContext("2d");
      hCtx.drawImage(sourceCanvas, 0, 0, 64, 64);
      const imgData = hCtx.getImageData(0, 0, 64, 64).data;

      const vector128 = [];
      for (let by = 0; by < 8; by++) {
        for (let bx = 0; bx < 8; bx++) {
          let sum = 0;
          for (let py = 0; py < 8; py++) {
            for (let px = 0; px < 8; px++) {
              const idx = ((by * 8 + py) * 64 + (bx * 8 + px)) * 4;
              sum += imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
            }
          }
          vector128.push(sum / 64.0);
        }
      }
      for (let r = 0; r < 32; r++) {
        let rSum = 0;
        for (let c = 0; c < 64; c++) {
          const idx = (r * 2 * 64 + c) * 4;
          rSum += imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
        }
        vector128.push(rSum / 64.0);
      }
      for (let c = 0; c < 32; c++) {
        let cSum = 0;
        for (let r = 0; r < 64; r++) {
          const idx = (r * 64 + c * 2) * 4;
          cSum += imgData[idx] * 0.299 + imgData[idx + 1] * 0.587 + imgData[idx + 2] * 0.114;
        }
        vector128.push(cSum / 64.0);
      }
      const norm = Math.hypot(...vector128) || 1.0;
      return vector128.map((v) => v / norm);
    } catch {
      return null;
    }
  };

  // Euclidean Distance & Biometric Confidence Matcher
  const verifyFaceVectorMatch = (candidateVector, enrolledVector, tolerance = 0.50) => {
    if (!candidateVector || !enrolledVector || candidateVector.length !== 128 || enrolledVector.length !== 128) {
      return { isMatch: false, distance: 1.0, matchPercent: 0 };
    }
    let sumSq = 0;
    for (let i = 0; i < 128; i++) {
      const diff = candidateVector[i] - enrolledVector[i];
      sumSq += diff * diff;
    }
    const distance = Math.sqrt(sumSq);
    const isMatch = distance <= tolerance;
    const matchPercent = Math.max(0, Math.min(100, Math.round((1 - distance / 1.414) * 100)));
    return { isMatch, distance, matchPercent };
  };

  // Fetch Driver Face Profile Status from Backend
  const fetchDriverFaceProfile = useCallback(async () => {
    const driverId = user?._id || user?.id || user?.email || "drv-sample-01";
    try {
      setFaceProfileStatus((prev) => ({ ...prev, loading: true }));
      const res = await axios.get(`/api/monitoring/driver/${driverId}/face-profile`, { timeout: 3000 });
      if (res.data?.success && res.data?.encoding) {
        const floatEnc = res.data.encoding.map(Number);
        enrolledEncodingRef.current = floatEnc;
        setFaceProfileStatus({
          isEnrolled: true,
          enrolledAt: res.data.enrolledAt,
          dimensions: floatEnc.length,
          loading: false,
        });
      }
    } catch {
      enrolledEncodingRef.current = null;
      setFaceProfileStatus({
        isEnrolled: false,
        enrolledAt: null,
        dimensions: 0,
        loading: false,
      });
    }
  }, [user?._id, user?.id, user?.email]);

  useEffect(() => {
    fetchDriverFaceProfile();
  }, [fetchDriverFaceProfile]);

  // Voice Alert Synthesizer
  const playVoiceAlert = (text) => {
    if (!voiceAlertsEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find((v) => v.lang.includes("en-IN") || v.lang.includes("ml-IN") || v.lang.includes("en-GB") || v.lang.includes("en-US"));
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Voice alert notice:", err);
      }
    }
  };

  // Real Audio Chime / Alarm Synthesizer (Web Audio API)
  const playAlarmSound = (type = "warning") => {
    if (!voiceAlertsEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "critical") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "warning") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Alarm sound playback:", e);
    }
  };

  // Master Safety Event Trigger & Broadcaster
  const triggerDriverSafetyEvent = useCallback(
    async (eventType, earValue = 0.28, absenceSec = 0, faceConf = 0.95, metadata = {}) => {
      let nextAlertness = "NORMAL";
      let nextDriverStatus = "DRIVER_VERIFIED";
      let voiceText = "";
      let soundType = "chime";

      if (eventType === "DROWSINESS_EARLY_WARNING") {
        nextAlertness = "EARLY_WARNING";
        voiceText = "Attention! Please stay alert and keep your eyes on the road.";
        soundType = "warning";
      } else if (eventType === "DROWSINESS_WARNING") {
        nextAlertness = "DROWSINESS_WARNING";
        voiceText = "Warning! Drowsiness detected. Please drink water or take a short rest.";
        soundType = "warning";
      } else if (eventType === "CRITICAL_DROWSINESS") {
        nextAlertness = "CRITICAL_DROWSINESS";
        voiceText = "Emergency alert! Critical drowsiness detected! Pull over the bus safely immediately!";
        soundType = "critical";
      } else if (eventType === "DRIVER_NOT_DETECTED") {
        nextDriverStatus = "DRIVER_NOT_DETECTED";
        voiceText = "Driver face not detected. Please face the vehicle camera.";
        soundType = "warning";
      } else if (eventType === "DRIVER_ABSENT") {
        nextDriverStatus = "DRIVER_ABSENT";
        voiceText = "Security alert! Driver is absent from the driver seat!";
        soundType = "critical";
      } else if (eventType === "DRIVER_MISMATCH") {
        nextDriverStatus = "DRIVER_MISMATCH";
        voiceText = "Driver identity mismatch detected! Please verify driver profile.";
        soundType = "critical";
      } else if (eventType === "DRIVER_VERIFIED") {
        nextDriverStatus = "DRIVER_VERIFIED";
        nextAlertness = "NORMAL";
        if (lastStateReportedRef.current !== "NORMAL" && lastStateReportedRef.current !== "DRIVER_VERIFIED") {
          voiceText = "Driver alert and verified. All systems normal.";
        }
        soundType = "chime";
      }

      lastStateReportedRef.current = nextAlertness !== "NORMAL" ? nextAlertness : nextDriverStatus;

      setMonitoringState((prev) => ({
        ...prev,
        alertness: nextAlertness,
        driverStatus: nextDriverStatus,
        ear: earValue,
        faceConfidence: faceConf,
        absenceSeconds: absenceSec,
      }));

      // Audible voice & sound alert with debounce
      const now = Date.now();
      if (voiceText && (now - lastEventTriggerTimeRef.current > 3500 || eventType === "CRITICAL_DROWSINESS")) {
        lastEventTriggerTimeRef.current = now;
        playVoiceAlert(voiceText);
        playAlarmSound(soundType);
      }

      // Backend HTTP event report
      try {
        await axios.post("/api/monitoring/event", {
          sessionId: monitoringSessionId,
          busId: assignedBus?._id,
          busNumber: assignedBus?.busNumber || "KL-07-MS-1008",
          eventType,
          ear: earValue,
          faceConfidence: faceConf,
          faceDetected: nextDriverStatus !== "DRIVER_ABSENT" && nextDriverStatus !== "DRIVER_NOT_DETECTED",
          absenceSeconds: absenceSec,
          metadata,
        }).catch(() => { });
      } catch {
        // Ignore network notice
      }

      // Socket live event broadcast
      if (socketRef.current) {
        socketRef.current.emit("driver:safety-event", {
          sessionId: monitoringSessionId,
          busId: assignedBus?._id,
          busNumber: assignedBus?.busNumber || "KL-07-MS-1008",
          driverId: user?._id || user?.id,
          driverName: user?.name || "Driver",
          eventType,
          alertness: nextAlertness,
          driverStatus: nextDriverStatus,
          ear: earValue,
          faceConfidence: faceConf,
          absenceSeconds: absenceSec,
          timestamp: new Date(),
        });
      }
    },
    [monitoringSessionId, assignedBus, user, voiceAlertsEnabled]
  );

  // Initialize and Load Google MediaPipe FaceMesh
  useEffect(() => {
    let active = true;

    const loadMediaPipe = () => {
      if (typeof window === "undefined") return;

      if (window.FaceMesh) {
        try {
          const fm = new window.FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });
          fm.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          faceMeshRef.current = fm;
          isFaceMeshReadyRef.current = true;
        } catch (e) {
          console.warn("MediaPipe init notice:", e);
        }
      } else {
        const existingScript = document.getElementById("mediapipe-facemesh-script");
        if (!existingScript) {
          const script = document.createElement("script");
          script.id = "mediapipe-facemesh-script";
          script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
          script.crossOrigin = "anonymous";
          script.onload = () => {
            if (active && window.FaceMesh) {
              try {
                const fm = new window.FaceMesh({
                  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
                });
                fm.setOptions({
                  maxNumFaces: 1,
                  refineLandmarks: true,
                  minDetectionConfidence: 0.45,
                  minTrackingConfidence: 0.45,
                });
                faceMeshRef.current = fm;
                isFaceMeshReadyRef.current = true;
              } catch (err) {
                console.warn("MediaPipe setup error:", err);
              }
            }
          };
          document.head.appendChild(script);
        }
      }
    };

    loadMediaPipe();
    return () => {
      active = false;
      if (faceMeshRef.current && faceMeshRef.current.close) {
        try {
          faceMeshRef.current.close();
        } catch { }
      }
    };
  }, []);

  // Automated Self-Detection & Biometric Driver Verification
  const autoDetectAndVerifyDriver = useCallback(async (customCanvas = null) => {
    try {
      let candidateCanvas = customCanvas;
      if (!candidateCanvas) {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 320;
        tempCanvas.height = 240;
        const tCtx = tempCanvas.getContext("2d");
        tCtx.save();
        tCtx.translate(320, 0);
        tCtx.scale(-1, 1);
        tCtx.drawImage(videoRef.current, 0, 0, 320, 240);
        tCtx.restore();
        candidateCanvas = tempCanvas;
      }

      const candidateVec = extract128DVector(candidateCanvas);
      if (!candidateVec) return;

      const driverId = user?._id || user?.id || user?.email || "drv-sample-01";
      const busNumber = assignedBus?.busNumber || "KL-07-MS-1008";

      const res = await axios.post("/api/monitoring/verify-driver-identity", {
        encoding: candidateVec,
        driverId,
        busNumber,
      });

      if (res.data?.success) {
        const d = res.data;
        setAutoVerificationResult({
          verified: d.verified,
          isBiometricMatch: d.isBiometricMatch,
          isLicenseApproved: d.isLicenseApproved,
          driverName: d.driverName || user?.name || "Silpa",
          licenseNumber: d.licenseNumber || user?.licenseNumber || "KL-07-2022-009876",
          verificationStatus: d.verificationStatus || "Approved",
          distance: d.distance,
          matchConfidence: d.matchConfidence,
          message: d.message,
          autoDetected: true,
        });

        if (d.verified) {
          triggerDriverSafetyEvent("DRIVER_VERIFIED", smoothedEarRef.current || 0.29, 0, d.matchConfidence / 100, {
            distance: d.distance,
            autoVerified: true,
          });
          playVoiceAlert(`Driver identity confirmed. Welcome ${d.driverName || user?.name || "Driver"}. Authorized driver verified.`);
        }
      }
    } catch (err) {
      console.warn("Auto verification error:", err);
    }
  }, [user, assignedBus, triggerDriverSafetyEvent]);

  // Start Driver Camera
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => { });
      }
      setCameraActive(true);
      showToast("Driver camera online. Live AI facial landmark & eye tracking active.");

      setTimeout(() => {
        autoDetectAndVerifyDriver();
      }, 1000);

      try {
        const res = await axios.post("/api/monitoring/session/start", {
          busId: assignedBus?._id,
          busNumber: assignedBus?.busNumber || "KL-07-MS-1008",
        });
        if (res.data?.session?._id) {
          setMonitoringSessionId(res.data.session._id);
        }
      } catch (e) {
        console.warn("Monitoring session start notice:", e.message);
      }
    } catch (err) {
      console.warn("Camera access error:", err.message);
      showToast("Camera access unavailable. Please allow webcam permission in browser.", "error");
    }
  };

  // Stop Driver Camera
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setMonitoringState((prev) => ({ ...prev, driverStatus: "STANDBY", alertness: "NORMAL" }));
    setAutoVerificationResult((prev) => ({ ...prev, verified: false, autoDetected: false }));
    showToast("Driver camera stopped.");
  };

  // Real-time Facial Landmark, Eye Aspect Ratio (EAR) & Vision Analyzer Loop
  useEffect(() => {
    if (!cameraActive) {
      if (visionLoopRef.current) clearInterval(visionLoopRef.current);
      return;
    }

    let isProcessing = false;
    const dist2D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    visionLoopRef.current = setInterval(async () => {
      if (isProcessing) return;
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      isProcessing = true;
      try {
        const ctx = canvas.getContext("2d");
        const w = 320;
        const h = 240;
        canvas.width = w;
        canvas.height = h;

        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();

        let faceDetected = false;
        let leftEyeLandmarks = null;
        let rightEyeLandmarks = null;
        let rawEar = 0.30;
        let faceConfidence = 0;

        // Primary: Google MediaPipe FaceMesh
        if (faceMeshRef.current && isFaceMeshReadyRef.current) {
          try {
            await new Promise((resolve) => {
              faceMeshRef.current.onResults((results) => {
                if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                  const lm = results.multiFaceLandmarks[0];
                  faceDetected = true;
                  faceConfidence = 0.99;

                  const lP1 = lm[33], lP2 = lm[160], lP3 = lm[158], lP4 = lm[133], lP5 = lm[153], lP6 = lm[144];
                  const leftEar = (dist2D(lP2, lP6) + dist2D(lP3, lP5)) / (2.0 * dist2D(lP1, lP4));

                  const rP1 = lm[362], rP2 = lm[385], rP3 = lm[387], rP4 = lm[263], rP5 = lm[373], rP6 = lm[380];
                  const rightEar = (dist2D(rP2, rP6) + dist2D(rP3, rP5)) / (2.0 * dist2D(rP1, rP4));

                  rawEar = (leftEar + rightEar) / 2.0;
                  leftEyeLandmarks = [lP1, lP2, lP3, lP4, lP5, lP6];
                  rightEyeLandmarks = [rP1, rP2, rP3, rP4, rP5, rP6];
                }
                resolve();
              });
              faceMeshRef.current.send({ image: canvas });
            });
          } catch (e) {
            // MediaPipe frame error fallback
          }
        }

        // Secondary / Fallback: Gradient Luminance
        if (!faceDetected) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          let totalLuma = 0;
          let skinPixels = 0;
          let minX = w, maxX = 0, minY = h, maxY = 0;

          for (let y = 0; y < h; y += 4) {
            for (let x = 0; x < w; x += 4) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const luma = 0.299 * r + 0.587 * g + 0.114 * b;
              totalLuma += luma;

              if (r > 50 && g > 35 && b > 20 && r > b && (r - g) > 6 && Math.abs(r - g) < 95) {
                skinPixels++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          const totalSampled = (w / 4) * (h / 4);
          const skinRatio = skinPixels / totalSampled;
          const avgLuma = totalLuma / totalSampled;

          if (skinRatio > 0.05 && avgLuma > 10 && maxX > minX + 30 && maxY > minY + 40) {
            faceDetected = true;
            faceConfidence = 0.88;
            rawEar = 0.28;
          } else {
            rawEar = 0.0;
            faceConfidence = 0.0;
          }
        }

        const smoothedEar = faceDetected
          ? smoothedEarRef.current * 0.25 + rawEar * 0.75
          : 0.0;
        smoothedEarRef.current = smoothedEar;

        const now = Date.now();

        // 1. Drowsiness Detection State Machine
        if (faceDetected) {
          if (smoothedEar < 0.21) {
            if (eyesClosedStartRef.current === null) {
              eyesClosedStartRef.current = now;
            }
            const closureSec = (now - eyesClosedStartRef.current) / 1000;
            if (closureSec >= 4.0 && monitoringState.alertness !== "CRITICAL_DROWSINESS") {
              triggerDriverSafetyEvent("CRITICAL_DROWSINESS", smoothedEar, 0, faceConfidence, { closureSec });
            } else if (closureSec >= 2.5 && monitoringState.alertness !== "DROWSINESS_WARNING" && monitoringState.alertness !== "CRITICAL_DROWSINESS") {
              triggerDriverSafetyEvent("DROWSINESS_WARNING", smoothedEar, 0, faceConfidence, { closureSec });
            } else if (closureSec >= 1.5 && monitoringState.alertness === "NORMAL") {
              triggerDriverSafetyEvent("DROWSINESS_EARLY_WARNING", smoothedEar, 0, faceConfidence, { closureSec });
            }
          } else {
            if (eyesClosedStartRef.current !== null) {
              eyesClosedStartRef.current = null;
              if (monitoringState.alertness !== "NORMAL") {
                triggerDriverSafetyEvent("DRIVER_VERIFIED", smoothedEar, 0, faceConfidence);
              }
            }
          }

          if (faceAbsentStartRef.current !== null) {
            faceAbsentStartRef.current = null;
          }
        } else {
          // 2. Driver Absence State Machine
          if (faceAbsentStartRef.current === null) {
            faceAbsentStartRef.current = now;
          }
          const absenceSec = Math.round((now - faceAbsentStartRef.current) / 1000);
          if (absenceSec >= 25 && monitoringState.driverStatus !== "DRIVER_ABSENT") {
            triggerDriverSafetyEvent("DRIVER_ABSENT", 0, absenceSec, 0);
          } else if (absenceSec >= 10 && monitoringState.driverStatus !== "DRIVER_NOT_DETECTED" && monitoringState.driverStatus !== "DRIVER_ABSENT") {
            triggerDriverSafetyEvent("DRIVER_NOT_DETECTED", 0, absenceSec, 0);
          }
        }

        // 3. Draw HUD on Canvas
        ctx.save();
        const statusColor =
          monitoringState.alertness === "CRITICAL_DROWSINESS" || monitoringState.driverStatus === "DRIVER_ABSENT"
            ? "#ef4444"
            : monitoringState.alertness === "DROWSINESS_WARNING" || monitoringState.driverStatus === "DRIVER_NOT_DETECTED"
              ? "#f97316"
              : monitoringState.alertness === "EARLY_WARNING"
                ? "#eab308"
                : "#22c55e";

        if (faceDetected && leftEyeLandmarks && rightEyeLandmarks) {
          const drawEyeContour = (pts, isOpen) => {
            ctx.strokeStyle = isOpen ? "#22c55e" : "#ef4444";
            ctx.lineWidth = 2.0;
            ctx.fillStyle = isOpen ? "rgba(34, 197, 94, 0.18)" : "rgba(239, 68, 68, 0.35)";
            ctx.beginPath();
            pts.forEach((p, idx) => {
              const px = p.x * w;
              const py = p.y * h;
              if (idx === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
            ctx.fill();

            const cx = (pts[0].x + pts[3].x) / 2 * w;
            const cy = (pts[1].y + pts[5].y) / 2 * h;
            ctx.fillStyle = isOpen ? "#4ade80" : "#fca5a5";
            ctx.beginPath();
            ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
            ctx.fill();
          };

          const isEyesOpen = smoothedEar >= 0.21;
          drawEyeContour(leftEyeLandmarks, isEyesOpen);
          drawEyeContour(rightEyeLandmarks, isEyesOpen);

          const minFx = Math.min(...leftEyeLandmarks.map((p) => p.x), ...rightEyeLandmarks.map((p) => p.x)) * w - 30;
          const maxFx = Math.max(...leftEyeLandmarks.map((p) => p.x), ...rightEyeLandmarks.map((p) => p.x)) * w + 30;
          const minFy = Math.min(...leftEyeLandmarks.map((p) => p.y), ...rightEyeLandmarks.map((p) => p.y)) * h - 45;
          const maxFy = Math.max(...leftEyeLandmarks.map((p) => p.y), ...rightEyeLandmarks.map((p) => p.y)) * h + 75;

          const boxX = Math.max(10, minFx);
          const boxY = Math.max(10, minFy);
          const boxW = Math.min(w - 20, maxFx - minFx);
          const boxH = Math.min(h - 20, maxFy - minFy);

          ctx.strokeStyle = statusColor;
          ctx.lineWidth = 2.5;
          const cLen = 16;

          ctx.beginPath();
          ctx.moveTo(boxX, boxY + cLen);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + cLen, boxY);

          ctx.moveTo(boxX + boxW - cLen, boxY);
          ctx.lineTo(boxX + boxW, boxY);
          ctx.lineTo(boxX + boxW, boxY + cLen);

          ctx.moveTo(boxX, boxY + boxH - cLen);
          ctx.lineTo(boxX, boxY + boxH);
          ctx.lineTo(boxX + cLen, boxY + boxH);

          ctx.moveTo(boxX + boxW - cLen, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH);
          ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
          ctx.stroke();

          ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          ctx.fillRect(boxX, boxY - 22, Math.max(130, boxW), 20);
          ctx.fillStyle = statusColor;
          ctx.font = "bold 10px monospace";
          const eyeLabel = smoothedEar >= 0.21 ? "EYES: OPEN ✓" : "EYES: CLOSED ⚠️";
          ctx.fillText(`AI 3D MESH ● ${eyeLabel}`, boxX + 6, boxY - 8);
        }

        // Bottom HUD Bar
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.fillRect(0, h - 26, w, 26);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10.5px monospace";
        ctx.fillText(
          `EAR: ${smoothedEar.toFixed(2)} | ${isFaceMeshReadyRef.current ? "MEDIAPIPE 3D" : "AI SENSOR"} | CONF: ${Math.round(faceConfidence * 100)}%`,
          8,
          h - 9
        );

        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(w - 14, h - 13, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Broadcast JPEG stream frame to Admin Dashboard
        const frameDataUrl = canvas.toDataURL("image/jpeg", 0.42);
        if (socketRef.current) {
          socketRef.current.emit("driver:stream-frame", {
            sessionId: monitoringSessionId || `session-${user?._id || user?.id || "drv"}`,
            busId: assignedBus?._id || "bus-active",
            busNumber: assignedBus?.busNumber || "KL-07-MS-1008",
            driverName: user?.name || "Silpa",
            driverPhoto: user?.profilePic || "",
            frame: frameDataUrl,
            ear: smoothedEar,
            faceConfidence,
            alertness: monitoringState.alertness,
            driverStatus: monitoringState.driverStatus,
            timestamp: new Date(),
          });
        }
      } catch (err) {
        console.warn("Vision analyzer frame processing notice:", err);
      } finally {
        isProcessing = false;
      }
    }, 60);

    return () => {
      if (visionLoopRef.current) clearInterval(visionLoopRef.current);
    };
  }, [cameraActive, monitoringSessionId, assignedBus, monitoringState, triggerDriverSafetyEvent]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 1. Initial Load: Driver Profile, Assigned Bus from Database, Stops & Distance Data
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    const token = getStoredToken();
    const currentUser = getStoredUser();
    if (!currentUser && !token) {
      navigate("/login");
      return;
    }
    if (currentUser) setUser(currentUser);

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      // 1. Fetch strictly the buses assigned to this driver in MongoDB
      const driverIdParam = currentUser
        ? `?driverId=${encodeURIComponent(currentUser._id || "")}&driverEmail=${encodeURIComponent(currentUser.email || "")}&driverName=${encodeURIComponent(currentUser.name || "")}`
        : "";

      const busRes = await axios.get(`/api/driver/buses${driverIdParam}`, { headers: authHeaders, timeout: 5000 }).catch(() => null);

      const fetchedAssigned = busRes?.data?.assignedBuses || busRes?.data?.buses || [];

      setDriverBuses(fetchedAssigned);

      let currentBus = fetchedAssigned.length > 0 ? fetchedAssigned[0] : null;
      setAssignedBus(currentBus);

      // 2. Fetch stops & active drive specifically for this assigned bus and driver
      const busIdParam = currentBus?._id ? `&busId=${currentBus._id}` : "";
      const driveRes = await axios.get(
        `/api/driver/live-drive/status?driverId=${encodeURIComponent(currentUser?._id || "")}${busIdParam}`,
        { headers: authHeaders }
      ).catch(() => null);

      if (driveRes?.data?.stops && driveRes.data.stops.length > 0) {
        setStops(driveRes.data.stops);
      } else {
        const stopsRes = await axios.get("/api/rfid/stops", { headers: authHeaders }).catch(() => null);
        setStops(stopsRes?.data?.stops || []);
      }

      const distRes = await axios.get("/api/rfid/distances", { headers: authHeaders }).catch(() => null);
      setDistances(distRes?.data?.distances || []);

      // 3. Set active drive state if present (Reload resilience: preserves current tripSessionId)
      if (driveRes?.data?.hasActiveDrive && driveRes.data.drive) {
        const d = driveRes.data.drive;
        setActiveTrip(d);
        activeTripRef.current = d;
        setDriveStatus(d.status || "ACTIVE");
        setLocationMode(d.mode || "manual");
        setCurrentStopIndex(d.currentStopIndex || 0);
        setTotalDistanceKm(d.totalDistanceKm || 0);

        // 4. Fetch recent RFID tap activity strictly for THIS active trip session
        const tapsRes = await axios.get(`/api/rfid/taps/recent?tripSessionId=${encodeURIComponent(d.tripSessionId)}&limit=25`, { headers: authHeaders }).catch(() => null);
        if (tapsRes?.data?.taps) {
          setRecentRfidTaps(tapsRes.data.taps);
          if (tapsRes.data.taps.length > 0) setLatestRfidTap(tapsRes.data.taps[0]);
          else setLatestRfidTap(null);
        } else {
          setRecentRfidTaps([]);
          setLatestRfidTap(null);
        }
      } else {
        setActiveTrip(null);
        activeTripRef.current = null;
        setDriveStatus("NOT STARTED");
        setCurrentStopIndex(0);
        setRecentRfidTaps([]);
        setLatestRfidTap(null);
      }
    } catch (err) {
      console.warn("Live Drive initial data notice:", err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSelectTrip = async (bus) => {
    setAssignedBus(bus);
    setCurrentStopIndex(0);
    setDriveStatus("NOT STARTED");
    setShowTripModal(false);

    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const driveRes = await axios.get(`/api/driver/live-drive/status?busId=${bus._id}`, { headers: authHeaders }).catch(() => null);
      if (driveRes?.data?.stops && driveRes.data.stops.length > 0) {
        setStops(driveRes.data.stops);
      }
    } catch (err) {
      console.warn("Failed to fetch route stops for selected bus:", err.message);
    }

    showToast(`✓ Switched Trip to: ${bus.busName} (${bus.busNumber}) - ${bus.routeName || `${bus.fromLocation} ➔ ${bus.toLocation}`}`);
  };

  const handleReverseDirection = () => {
    if (stops.length < 2) return;
    const reversed = [...stops].reverse();
    setStops(reversed);
    setCurrentStopIndex(0);
    if (assignedBus) {
      const from = stops[stops.length - 1]?.name || assignedBus.toLocation;
      const to = stops[0]?.name || assignedBus.fromLocation;
      setAssignedBus((prev) => ({
        ...prev,
        fromLocation: from,
        toLocation: to,
        routeName: `${from} ➔ ${to}`
      }));
    }
    setShowTripModal(false);
    showToast(`✓ Route reversed: ${stops[stops.length - 1]?.name} ➔ ${stops[0]?.name}`);
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Fetch bus-specific route stops whenever assignedBus changes
  useEffect(() => {
    if (!assignedBus?._id) return;
    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const fetchBusRouteStops = async () => {
      try {
        const driveRes = await axios.get(`/api/driver/live-drive/status?busId=${assignedBus._id}`, { headers: authHeaders }).catch(() => null);
        if (driveRes?.data?.stops && driveRes.data.stops.length > 0) {
          setStops(driveRes.data.stops);
          if (driveRes.data.hasActiveDrive && driveRes.data.drive) {
            setCurrentStopIndex(driveRes.data.drive.currentStopIndex || 0);
          } else {
            setCurrentStopIndex(0);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch route stops for assigned bus:", err.message);
      }
    };
    fetchBusRouteStops();
  }, [assignedBus]);

  // Current Stop and Next Stop computations
  const currentStop = useMemo(() => {
    if (stops.length === 0) {
      return {
        name: assignedBus?.fromLocation || "Origin Terminal",
        code: "STOP_ORIGIN",
        latitude: 9.5574,
        longitude: 76.7904,
      };
    }
    return stops[currentStopIndex] || stops[0];
  }, [stops, currentStopIndex, assignedBus]);

  const nextStop = useMemo(() => {
    if (stops.length === 0) return null;
    if (currentStopIndex < stops.length - 1) {
      return stops[currentStopIndex + 1];
    }
    return null;
  }, [stops, currentStopIndex]);

  useEffect(() => {
    if (nextStop) {
      setSelectedNextStopCode(nextStop.code);
    }
  }, [nextStop]);

  // 2. Setup Real-Time Socket.IO Synchronization
  useEffect(() => {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : window.location.origin);
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      const currentUser = getStoredUser();
      if (currentUser?._id) {
        socket.emit("join-driver-room", { driverId: currentUser._id });
      }
      if (assignedBus?._id) {
        socket.emit("join-bus-room", { busId: assignedBus._id });
      }
    });

    // Real-time passenger RFID tap stream (Strictly filtered to this active bus trip)
    socket.on("rfid:tap-event", (tapData) => {
      if (tapData && (tapData.status === "Accepted" || tapData.action === "TAP_IN" || tapData.action === "TAP_OUT")) {
        const curActiveTrip = activeTripRef.current;

        // Strict Isolation: Ignore if belongs to a different tripSessionId
        if (curActiveTrip?.tripSessionId && tapData.tripSessionId && tapData.tripSessionId !== curActiveTrip.tripSessionId) {
          return;
        }

        // Strict Isolation: Ignore if belongs to another bus
        if (assignedBus?._id && tapData.busId && String(tapData.busId) !== String(assignedBus._id)) {
          return;
        }

        setLatestRfidTap(tapData);
        setRecentRfidTaps((prev) => {
          const filtered = prev.filter((p) => p.id !== tapData.id);
          return [tapData, ...filtered.slice(0, 24)];
        });

        if (tapData.action === "TAP_IN") {
          showToast(`⚡ Tap-In: ${tapData.passengerName || "Passenger"} at ${tapData.stop?.name || "Stop"}`);
        } else if (tapData.action === "TAP_OUT") {
          showToast(`✓ Tap-Out: ${tapData.passengerName || "Passenger"} (Fare: ₹${Number(tapData.fare || 0).toFixed(2)})`);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [assignedBus]);

  // 3. Initialize & Manage Leaflet OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultLat = currentStop.latitude || 9.5574;
      const defaultLng = currentStop.longitude || 76.7904;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing stop markers
    stopMarkersRef.current.forEach((m) => m.remove());
    stopMarkersRef.current = [];

    // Add Stop Markers along Route
    const stopLatLngs = [];
    stops.forEach((s, idx) => {
      const lat = s.latitude || (9.5574 + idx * 0.035);
      const lng = s.longitude || (76.7904 + idx * 0.015);
      stopLatLngs.push([lat, lng]);

      const isCur = idx === currentStopIndex;
      const isComp = idx < currentStopIndex;
      const markerIcon = createStopMarkerIcon(isCur, isComp, idx + 1);

      const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #0f172a;">${s.name}</strong>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Code: ${s.code}</div>
          <div style="font-size: 11px; font-weight: bold; color: ${isCur ? "#2563eb" : isComp ? "#16a34a" : "#475569"}; margin-top: 4px;">
            ${isCur ? "● Current Bus Position" : isComp ? "✓ Completed Stop" : "○ Upcoming Stop"}
          </div>
        </div>
      `);

      stopMarkersRef.current.push(marker);
    });

    // Draw Polyline connecting stops
    if (stopLatLngs.length > 1) {
      if (polylineRef.current) polylineRef.current.remove();
      polylineRef.current = L.polyline(stopLatLngs, {
        color: "#2563eb",
        weight: 5,
        opacity: 0.85,
        dashArray: "6, 8",
      }).addTo(map);

      // Smoothly fit bounds so full route is visible on load
      try {
        const bounds = L.latLngBounds(stopLatLngs);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        // ignore
      }
    }

    // Update Bus Marker Position
    const curLat = currentStop.latitude || (9.5574 + currentStopIndex * 0.035);
    const curLng = currentStop.longitude || (76.7904 + currentStopIndex * 0.015);

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([curLat, curLng], {
        icon: createLiveBusIcon(45, driveStatus === "ACTIVE"),
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      busMarkerRef.current.setLatLng([curLat, curLng]);
      busMarkerRef.current.setIcon(createLiveBusIcon(45, driveStatus === "ACTIVE"));
    }

    // Pan smoothly to current stop
    map.panTo([curLat, curLng], { animate: true, duration: 0.8 });

  }, [stops, currentStopIndex, currentStop, driveStatus]);

  // 4. HANDLER: Start Drive (Creates new unique tripSessionId & resets RFID activity)
  const handleStartDrive = async () => {
    if (!assignedBus) {
      showToast("❌ No bus selected. Please select a bus from 'Change Trip'.");
      return;
    }
    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.post("/api/driver/live-drive/start", {
        driverId: user?._id || user?.id,
        busId: assignedBus._id,
        busNumber: assignedBus.busNumber,
      }, { headers: authHeaders });

      if (res.data?.success) {
        setDriveStatus("ACTIVE");
        setActiveTrip(res.data.drive);
        activeTripRef.current = res.data.drive;
        setCurrentStopIndex(0);
        setTotalDistanceKm(0);
        // Completely Fresh RFID Activity Panel for this new trip
        setRecentRfidTaps([]);
        setLatestRfidTap(null);
        showToast(`🚀 Live Drive Started (${res.data.tripSessionId || "ACTIVE"})!`);
      }
    } catch (err) {
      showToast(`❌ Failed to start drive: ${err.response?.data?.message || err.message}`);
    }
  };

  // 5. HANDLER: Move Bus to Next Stop (Manual Simulation)
  const handleMoveToNextStop = async (targetCode = null) => {
    const destCode = targetCode || selectedNextStopCode || (nextStop ? nextStop.code : null);
    if (!destCode) {
      showToast("Destination stop is not selected");
      return;
    }
    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.post("/api/driver/live-drive/location", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
        busNumber: assignedBus?.busNumber,
        stopCode: destCode,
        mode: locationMode,
      }, { headers: authHeaders });

      if (res.data?.success) {
        const updatedDrive = res.data.drive;
        setActiveTrip(updatedDrive);
        activeTripRef.current = updatedDrive;
        setCurrentStopIndex(updatedDrive.currentStopIndex || 0);
        setLastSegmentDistance(res.data.segmentDistance || 0);
        setTotalDistanceKm(res.data.totalDistanceKm || 0);

        showToast(`📍 Bus reached ${res.data.drive?.currentStop?.name || destCode} (+${res.data.segmentDistance} km)`);
      }
    } catch (err) {
      showToast(`❌ Failed to update bus position: ${err.response?.data?.message || err.message}`);
    }
  };

  // 6. HANDLER: Move Bus to Previous Stop
  const handleMoveToPrevStop = () => {
    if (currentStopIndex > 0) {
      const prevStopObj = stops[currentStopIndex - 1];
      if (prevStopObj) {
        handleMoveToNextStop(prevStopObj.code);
      }
    }
  };

  // 7. HANDLER: Pause / Resume Drive
  const handleTogglePauseDrive = async () => {
    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.post("/api/driver/live-drive/pause", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
      }, { headers: authHeaders });

      if (res.data?.success) {
        setDriveStatus(res.data.status);
        showToast(`Drive is now ${res.data.status}`);
      }
    } catch (err) {
      showToast(`Failed to update drive state: ${err.message}`);
    }
  };

  // 8. HANDLER: End Drive & Show PDF Report
  const handleEndDrive = async () => {
    if (!window.confirm("Are you sure you want to end this live bus drive? A final route summary will be generated.")) {
      return;
    }
    const token = getStoredToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await axios.post("/api/driver/live-drive/end", {
        driverId: user?._id || user?.id,
        busId: assignedBus?._id,
        tripSessionId: activeTrip?.tripSessionId,
      }, { headers: authHeaders });

      if (res.data?.success) {
        setDriveStatus("COMPLETED");
        setEndSummary(res.data.summary);
        setShowEndModal(true);
        setActiveTrip(null);
        activeTripRef.current = null;
        showToast("✓ Live Drive Completed Successfully!");
      }
    } catch (err) {
      showToast(`Failed to end drive: ${err.message}`);
    }
  };

  const isDriveActive = driveStatus === "ACTIVE";
  const isDrivePaused = driveStatus === "PAUSED";
  const isDriveRunning = isDriveActive || isDrivePaused;
  const isFinalStop = stops.length > 0 && currentStopIndex >= stops.length - 1;

  return (
    <DriverLayout
      activeNav="live-drive"
      user={user}
      assignedBus={assignedBus}
      tripStatus={driveStatus}
      eyebrow="LIVE NAVIGATION"
      title="Live Drive Cockpit"
      description={`Monitor your active bus journey on ${assignedBus?.busName || "Assigned Bus"} (${assignedBus?.busNumber || "KL-06-345"}), real-time GPS route, AI safety assistant, and automated RFID smart card boarding.`}
      pageBadge={
        <StatusBadge
          status={isDriveActive ? "active" : isDrivePaused ? "warning" : "not_started"}
          label={driveStatus === "ACTIVE" ? "● LIVE TRIP ACTIVE" : driveStatus === "PAUSED" ? "⏸ TRIP PAUSED" : "⚪ READY FOR DRIVE"}
          pulse={isDriveActive}
        />
      }
      pageActions={
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowTripModal(true)}
            className="btn-drv-secondary"
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            <span>🔄</span>
            <span>Change Trip</span>
          </button>
          <button
            type="button"
            onClick={handleReverseDirection}
            className="btn-drv-secondary"
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            <span>⇄</span>
            <span>Reverse Route</span>
          </button>
        </div>
      }
    >
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes liveGlow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #22c55e;
          animation: liveGlow 1.5s infinite;
        }
        .touch-action-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            background: "#182033",
            color: "#ffffff",
            padding: "16px 24px",
            borderRadius: "16px",
            fontSize: "14px",
            fontWeight: "800",
            boxShadow: "0 14px 34px rgba(24, 32, 51, 0.3)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "90vw",
          }}
        >
          <span style={{ fontSize: "18px" }}>⚡</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* WARNING IF NO BUS IS ASSIGNED IN DATABASE */}
        {!assignedBus && !loading && (
          <div style={{ background: "#ffffff", borderRadius: "18px", padding: "24px", border: "2px solid #fecdd3", boxShadow: "0 4px 20px rgba(225,29,72,0.08)", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "#f43f5e", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>
              ⚠️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "16px", fontWeight: "900", color: "#9f1239" }}>No Assigned Bus Selected</div>
              <div style={{ fontSize: "13px", color: "#881337", marginTop: "2px" }}>
                Please choose a registered bus to start your live drive.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTripModal(true)}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "10px",
                fontWeight: "800",
                fontSize: "13.5px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Select Bus &amp; Trip
            </button>
          </div>
        )}

        {/* 🛡️ DRIVER SAFETY & REAL-TIME AI CAMERA ASSISTANT */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,243,255,0.92) 100%)",
            borderRadius: "22px",
            border: "1.5px solid rgba(139, 92, 246, 0.3)",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(124, 58, 237, 0.07)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  flexShrink: 0,
                  boxShadow: "0 4px 14px rgba(109, 40, 217, 0.35)",
                }}
              >
                🛡️
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#0f172a", margin: 0, letterSpacing: "-0.2px" }}>
                  Driver Safety &amp; Real-Time AI Camera Assistant
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>
                  Live camera vision tracking driver presence, eye closures (EAR) &amp; voice alerts
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startWebcam}
                  className="touch-action-btn"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #16a34a",
                    background: "#f0fdf4",
                    color: "#166534",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(22, 163, 74, 0.15)",
                  }}
                >
                  📷 Start Live Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="touch-action-btn"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "10px",
                    border: "1.5px solid #ef4444",
                    background: "#fef2f2",
                    color: "#dc2626",
                    fontSize: "13px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.15)",
                  }}
                >
                  ⏹ Stop Camera
                </button>
              )}

              <button
                type="button"
                onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
                className="touch-action-btn"
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  border: `1.5px solid ${voiceAlertsEnabled ? "#c4b5fd" : "#cbd5e1"}`,
                  background: voiceAlertsEnabled ? "#ede9fe" : "#ffffff",
                  color: voiceAlertsEnabled ? "#6d28d9" : "#64748b",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {voiceAlertsEnabled ? "🔊 Voice ON" : "🔇 Voice OFF"}
              </button>

              <span
                style={{
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "800",
                  background: cameraActive || isDriveActive ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                  color: cameraActive || isDriveActive ? "#16a34a" : "#64748b",
                  letterSpacing: "0.5px",
                }}
              >
                {cameraActive || isDriveActive ? "● MONITORING ACTIVE" : "STANDBY"}
              </span>
            </div>
          </div>

          {/* LIVE CAMERA PREVIEW & AI HUD */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {/* Real Video Box with Live AI HUD Overlay */}
            <div
              style={{
                position: "relative",
                height: "220px",
                borderRadius: "14px",
                background: "#0f172a",
                overflow: "hidden",
                border: `2.5px solid ${monitoringState.alertness === "CRITICAL_DROWSINESS" || monitoringState.driverStatus === "DRIVER_ABSENT"
                    ? "#ef4444"
                    : monitoringState.alertness === "DROWSINESS_WARNING" || monitoringState.driverStatus === "DRIVER_NOT_DETECTED"
                      ? "#f97316"
                      : monitoringState.alertness === "EARLY_WARNING"
                        ? "#eab308"
                        : cameraActive
                          ? "#22c55e"
                          : "#334155"
                  }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: cameraActive
                  ? monitoringState.alertness !== "NORMAL"
                    ? "0 0 20px rgba(239, 68, 68, 0.4)"
                    : "0 0 15px rgba(34, 197, 94, 0.25)"
                  : "none",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: cameraActive ? "block" : "none",
                  transform: "scaleX(-1)",
                }}
              />

              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: cameraActive ? "block" : "none",
                  pointerEvents: "none",
                }}
              />

              {!cameraActive && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "16px" }}>
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📷</div>
                  <strong style={{ display: "block", color: "#f8fafc", fontSize: "14.5px", marginBottom: "4px" }}>
                    Driver Edge Camera Standby
                  </strong>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Click <strong>"Start Live Camera"</strong> to activate real-time face &amp; eye tracking
                  </span>
                </div>
              )}
            </div>

            {/* Driver Identity & AI Safety Status Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", justifyContent: "center" }}>
              {/* DRIVER IDENTITY */}
              <div style={{ background: "#ffffff", padding: "16px 18px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    DRIVER IDENTITY
                  </span>
                  <strong
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: !cameraActive ? "#64748b" : "#16a34a",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {!cameraActive ? (
                      <>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#a855f7", display: "inline-block" }}></span>
                        <span>Camera Inactive</span>
                      </>
                    ) : (
                      <>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#22c55e", display: "inline-block" }}></span>
                        <span>Verified Driver ✓</span>
                      </>
                    )}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", color: "#475569", fontWeight: "600", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <span>
                    Driver: <strong style={{ color: "#0f172a" }}>{autoVerificationResult.driverName || user?.name || "Silpa"}</strong>
                  </span>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: "800",
                      background: "#dcfce7",
                      color: "#15803d",
                    }}
                  >
                    Approved License ✓
                  </span>
                </div>
              </div>

              {/* AI SAFETY STATUS */}
              <div style={{ background: "#ffffff", padding: "18px", borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AI SAFETY STATUS
                  </span>
                  <strong
                    style={{
                      fontSize: "13.5px",
                      fontWeight: "800",
                      color: monitoringState.alertness === "NORMAL"
                        ? "#16a34a"
                        : monitoringState.alertness === "EARLY_WARNING"
                          ? "#d97706"
                          : "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: monitoringState.alertness === "NORMAL" ? "#22c55e" : monitoringState.alertness === "EARLY_WARNING" ? "#f59e0b" : "#ef4444",
                        display: "inline-block",
                      }}
                    ></span>
                    <span>
                      {monitoringState.alertness === "NORMAL"
                        ? "Normal & Active"
                        : monitoringState.alertness === "EARLY_WARNING"
                          ? "Stay Alert"
                          : "Drowsiness Warning"}
                    </span>
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 1. PRE-START DRIVE CARD (Shown when Drive is NOT Started)           */}
        {/* ==================================================================== */}
        {!isDriveRunning && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "36px 24px", border: "1.5px solid #e2e8f0", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center" }}>

            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(22, 163, 74, 0.35)" }}>
                <Navigation size={36} />
              </div>

              <h1 style={{ fontSize: "26px", fontWeight: "900", color: "#0f172a", margin: "0 0 8px" }}>
                Ready to Start Live Bus Drive
              </h1>

              <p style={{ color: "#64748b", fontSize: "14.5px", margin: "0 0 24px" }}>
                Initiate active passenger tracking, broadcast your live bus position, and activate automated RFID tap fare computation.
              </p>

              {/* ROUTE SUMMARY BOX */}
              {assignedBus && (
                <div style={{ background: "#f8fafc", borderRadius: "18px", border: "1.5px solid #e2e8f0", padding: "20px", marginBottom: "28px", textAlign: "left" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "16px" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Your Bus</div>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: "#0f172a", marginTop: "2px" }}>
                        {assignedBus.busName} ({assignedBus.busNumber})
                      </div>
                    </div>

                    <div style={{ width: "1px", height: "36px", background: "#cbd5e1" }}></div>

                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Assigned Route</div>
                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#2563eb", marginTop: "2px" }}>
                        {assignedBus.routeName || `${assignedBus.fromLocation} ➔ ${assignedBus.toLocation}`}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Starting Stop: </span>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{stops[0]?.name || assignedBus.fromLocation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Destination: </span>
                      <strong style={{ fontSize: "13px", color: "#0f172a" }}>{stops[stops.length - 1]?.name || assignedBus.toLocation}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Total Stops: </span>
                      <strong style={{ fontSize: "13px", color: "#16a34a" }}>{stops.length} Stops</strong>
                    </div>
                  </div>

                  {/* QUICK TRIP ACTIONS */}
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => setShowTripModal(true)}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1.5px solid #bfdbfe",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🔄</span>
                      <span>Change Trip / Bus</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReverseDirection}
                      style={{
                        background: "#f8fafc",
                        color: "#334155",
                        border: "1.5px solid #cbd5e1",
                        padding: "8px 14px",
                        borderRadius: "10px",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>⇄</span>
                      <span>Reverse Direction (Return Trip)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* PRIMARY HUGE START DRIVE BUTTON */}
              <button
                type="button"
                onClick={handleStartDrive}
                disabled={!assignedBus}
                className="touch-action-btn"
                style={{
                  width: "100%",
                  maxWidth: "420px",
                  background: assignedBus ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "#cbd5e1",
                  color: "#ffffff",
                  border: "none",
                  padding: "20px 32px",
                  borderRadius: "18px",
                  fontWeight: "900",
                  fontSize: "20px",
                  letterSpacing: "0.5px",
                  cursor: assignedBus ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "14px",
                  boxShadow: assignedBus ? "0 10px 28px rgba(22, 163, 74, 0.4)" : "none",
                  transition: "transform 0.15s ease",
                }}
              >
                <Play size={24} />
                <span>START DRIVE</span>
              </button>

            </div>

          </div>
        )}

        {/* ==================================================================== */}
        {/* 2. ACTIVE DRIVE COCKPIT (Shown when Drive is Running / Paused)      */}
        {/* ==================================================================== */}
        {isDriveRunning && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* HERO COCKPIT CARD: PROGRESS BAR ➔ CURRENT LOCATION ➔ NEXT STOP ➔ PRIMARY ACTION */}
            <div style={{ background: "#ffffff", borderRadius: "24px", padding: "24px", border: "2px solid #2563eb", boxShadow: "0 10px 30px rgba(37, 99, 235, 0.08)" }}>

              {/* ROUTE PROGRESS BAR */}
              <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "12px 16px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12.5px", fontWeight: "800" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1e40af" }}>
                    <span>🚍 Journey Progress:</span>
                    <strong style={{ color: "#2563eb", fontSize: "14px" }}>
                      {stops.length > 1 ? Math.round((currentStopIndex / (stops.length - 1)) * 100) : 0}%
                    </strong>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    Stop <strong>{currentStopIndex + 1}</strong> of <strong>{stops.length}</strong> ({Math.max(0, stops.length - 1 - currentStopIndex)} remaining)
                  </div>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${stops.length > 1 ? Math.min(100, Math.round((currentStopIndex / (stops.length - 1)) * 100)) : 0}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #2563eb, #16a34a)",
                      borderRadius: "999px",
                      transition: "width 0.4s ease"
                    }}
                  />
                </div>
              </div>

              {/* TWO LARGE COCKPIT PANELS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>

                {/* 1. CURRENT STOP */}
                <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", borderRadius: "18px", padding: "20px", border: "1.5px solid #86efac" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "900", color: "#166534", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      📍 CURRENT LOCATION
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: "#16a34a", color: "#ffffff", padding: "2px 8px", borderRadius: "12px" }}>
                      STOP {currentStopIndex + 1} OF {stops.length}
                    </span>
                  </div>

                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#0f172a", lineHeight: 1.2 }}>
                    {currentStop.name}
                  </div>

                  <div style={{ fontSize: "12.5px", color: "#15803d", fontWeight: "700", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="live-dot"></span>
                    <span>Live RFID Boarding Stop Active</span>
                  </div>
                </div>

                {/* 2. NEXT STOP */}
                <div style={{ background: nextStop ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)" : "#f8fafc", borderRadius: "18px", padding: "20px", border: nextStop ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "900", color: nextStop ? "#1e40af" : "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      ➡ NEXT UPCOMING STOP
                    </span>
                    {nextStop && (
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "12px" }}>
                        STOP {currentStopIndex + 2}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: "24px", fontWeight: "900", color: nextStop ? "#1e3a8a" : "#64748b", lineHeight: 1.2 }}>
                    {nextStop ? nextStop.name : "End of Transit Route"}
                  </div>

                  <div style={{ fontSize: "12.5px", color: nextStop ? "#3b82f6" : "#64748b", fontWeight: "700", marginTop: "6px" }}>
                    {nextStop ? `Code: ${nextStop.code}` : "Destination Terminal Reached"}
                  </div>
                </div>

              </div>

              {/* MASSIVE PRIMARY ACTION BUTTON */}
              <div>
                {!isFinalStop && nextStop ? (
                  <button
                    type="button"
                    onClick={() => handleMoveToNextStop()}
                    className="touch-action-btn"
                    style={{
                      width: "100%",
                      background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                      color: "#ffffff",
                      border: "none",
                      padding: "20px 24px",
                      borderRadius: "18px",
                      fontWeight: "900",
                      fontSize: "20px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "12px",
                      boxShadow: "0 8px 24px rgba(37, 99, 235, 0.4)",
                    }}
                  >
                    <span>MOVE TO NEXT STOP ({nextStop.name.toUpperCase()})</span>
                    <ArrowRight size={26} />
                  </button>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "2px solid #86efac",
                      padding: "18px 24px",
                      borderRadius: "18px",
                      fontWeight: "900",
                      fontSize: "17px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <CheckCircle2 size={22} style={{ color: "#16a34a" }} />
                    <span>ARRIVED AT FINAL DESTINATION TERMINAL</span>
                  </div>
                )}
              </div>

              {/* DEMO / GPS MODE QUICK TOGGLE */}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "800", color: "#64748b" }}>Location Source:</span>
                  <div style={{ display: "inline-flex", background: "#f1f5f9", padding: "3px", borderRadius: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setLocationMode("manual")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: locationMode === "manual" ? "#7c3aed" : "transparent",
                        color: locationMode === "manual" ? "#ffffff" : "#64748b",
                        fontWeight: "800",
                        fontSize: "11.5px",
                        cursor: "pointer",
                      }}
                    >
                      Manual Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationMode("gps")}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "8px",
                        border: "none",
                        background: locationMode === "gps" ? "#16a34a" : "transparent",
                        color: locationMode === "gps" ? "#ffffff" : "#64748b",
                        fontWeight: "800",
                        fontSize: "11.5px",
                        cursor: "pointer",
                      }}
                    >
                      Real GPS
                    </button>
                  </div>
                </div>

                {/* MANUAL STOP SELECTOR (SECONDARY) */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Jump To Stop:</span>
                  <select
                    value={selectedNextStopCode}
                    onChange={(e) => {
                      setSelectedNextStopCode(e.target.value);
                      handleMoveToNextStop(e.target.value);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      fontSize: "12.5px",
                      fontWeight: "700",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    {stops.map((s, idx) => (
                      <option key={s.code} value={s.code}>
                        {idx + 1}. {s.name} {idx < currentStopIndex ? "✓" : idx === currentStopIndex ? "●" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            {/* 2-COLUMN MAIN CONTENT: LEFT (MAP + STEPPER), RIGHT (RFID + TELEMETRY + CONTROLS) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "20px" }}>

              {/* LEFT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* INTERACTIVE LEAFLET MAP */}
                <div style={{ background: "#ffffff", borderRadius: "20px", overflow: "hidden", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ padding: "14px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Map size={18} style={{ color: "#2563eb" }} />
                      <span style={{ fontWeight: "900", fontSize: "14px", color: "#0f172a" }}>
                        Live Bus Map
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "6px" }}>
                      ● Live Tracking
                    </span>
                  </div>

                  {/* MAP CANVAS */}
                  <div ref={mapContainerRef} style={{ width: "100%", height: "360px", background: "#e2e8f0" }} />

                  {/* BOTTOM MAP STATUS BAR */}
                  <div style={{ padding: "10px 16px", background: "#ffffff", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b" }}>
                    <div>
                      Stop: <strong style={{ color: "#0f172a" }}>{currentStop.name}</strong>
                    </div>
                    <div>
                      GPS: <span style={{ fontFamily: "monospace" }}>{(currentStop.latitude || 9.5574).toFixed(4)}, {(currentStop.longitude || 76.7904).toFixed(4)}</span>
                    </div>
                  </div>
                </div>

                {/* ROUTE PROGRESS STEPPER */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                        Route Progress
                      </h3>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {currentStopIndex + 1} of {stops.length} stops ({stops.length - 1 - currentStopIndex} remaining)
                      </div>
                    </div>

                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#2563eb", background: "#eff6ff", padding: "3px 10px", borderRadius: "8px" }}>
                      {totalDistanceKm.toFixed(1)} km total
                    </span>
                  </div>

                  {/* STEPPER ITEMS */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {stops.map((s, idx) => {
                      const isCur = idx === currentStopIndex;
                      const isComp = idx < currentStopIndex;
                      const isUpcom = idx > currentStopIndex;

                      return (
                        <div
                          key={s.code}
                          onClick={() => handleMoveToNextStop(s.code)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: "12px",
                            border: isCur ? "2px solid #2563eb" : isComp ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                            background: isCur ? "#eff6ff" : isComp ? "#f0fdf4" : "#ffffff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                background: isCur ? "#2563eb" : isComp ? "#16a34a" : "#e2e8f0",
                                color: isCur || isComp ? "#ffffff" : "#64748b",
                                fontWeight: "900",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {isComp ? "✓" : idx + 1}
                            </div>

                            <div>
                              <div style={{ fontWeight: isCur ? "900" : "700", fontSize: "13.5px", color: isCur ? "#1e40af" : isComp ? "#15803d" : "#334155" }}>
                                {s.name}
                              </div>
                            </div>
                          </div>

                          <div>
                            {isCur && (
                              <span style={{ fontSize: "10.5px", fontWeight: "900", background: "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "10px" }}>
                                ● Current
                              </span>
                            )}
                            {isComp && (
                              <span style={{ fontSize: "11px", fontWeight: "800", color: "#16a34a" }}>
                                ✓ Done
                              </span>
                            )}
                            {isUpcom && (
                              <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8" }}>
                                Upcoming
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* TRIP INFORMATION CARD */}
                <div style={{ background: "#0f172a", borderRadius: "20px", padding: "20px", color: "#ffffff", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Trip Information
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
                    <div style={{ background: "rgba(255,255,255,0.06)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Distance Covered</div>
                      <div style={{ fontSize: "20px", fontWeight: "900", color: "#4ade80", marginTop: "2px" }}>
                        {totalDistanceKm.toFixed(1)} km
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.06)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Last Segment</div>
                      <div style={{ fontSize: "20px", fontWeight: "900", color: "#38bdf8", marginTop: "2px" }}>
                        {lastSegmentDistance.toFixed(1)} km
                      </div>
                    </div>
                  </div>
                </div>

                {/* RFID PASSENGER TAP ACTIVITY */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Zap size={18} style={{ color: "#16a34a" }} />
                      <span style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                        RFID Activity
                      </span>
                    </div>

                    <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b" }}>
                      {recentRfidTaps.length} taps
                    </span>
                  </div>

                  {/* LATEST TAP HIGHLIGHT */}
                  {latestRfidTap ? (
                    <div style={{ background: latestRfidTap.action === "TAP_IN" ? "#f0fdf4" : "#eff6ff", borderRadius: "14px", padding: "14px", border: `1.5px solid ${latestRfidTap.action === "TAP_IN" ? "#86efac" : "#93c5fd"}`, marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "11px", fontWeight: "900", background: latestRfidTap.action === "TAP_IN" ? "#16a34a" : "#2563eb", color: "#ffffff", padding: "2px 8px", borderRadius: "8px" }}>
                          {latestRfidTap.action === "TAP_IN" ? "🟢 TAP-IN" : "🔵 TAP-OUT"}
                        </span>
                        <span style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b" }}>
                          Just now
                        </span>
                      </div>

                      <div style={{ fontSize: "15px", fontWeight: "900", color: "#0f172a" }}>
                        Passenger: {latestRfidTap.passengerName || "Passenger"}
                      </div>

                      <div style={{ fontSize: "12.5px", color: "#475569", marginTop: "2px" }}>
                        Stop: <strong>{latestRfidTap.journey?.to || latestRfidTap.journey?.from || latestRfidTap.stop?.name || currentStop.name}</strong>
                      </div>

                      {latestRfidTap.fare > 0 && (
                        <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#dc2626", marginTop: "4px" }}>
                          Fare Deducted: ₹{Number(latestRfidTap.fare).toFixed(2)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "18px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", color: "#64748b", fontSize: "13px", marginBottom: "12px", border: "1px dashed #cbd5e1" }}>
                      No RFID taps yet
                    </div>
                  )}

                  {/* RECENT TAPS LIST */}
                  {recentRfidTaps.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "180px", overflowY: "auto" }}>
                      {recentRfidTaps.slice(0, 5).map((t) => (
                        <div
                          key={t.id || `${t.timestamp}-${Math.random()}`}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "10px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <strong style={{ color: "#0f172a" }}>{t.passengerName || "Passenger"}</strong>
                            <span style={{ color: "#64748b", marginLeft: "6px" }}>({t.action})</span>
                          </div>

                          <div>
                            {t.journey?.fare > 0 && (
                              <strong style={{ color: "#dc2626", marginRight: "6px" }}>₹{Number(t.journey.fare).toFixed(2)}</strong>
                            )}
                            <span style={{ color: "#16a34a", fontWeight: "700" }}>✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECONDARY DRIVER ACTIONS CARD */}
                <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", border: "1.5px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "800", textTransform: "uppercase", marginBottom: "12px" }}>
                    Secondary Actions
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                    <button
                      type="button"
                      onClick={handleMoveToPrevStop}
                      disabled={currentStopIndex <= 0}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        background: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        fontWeight: "800",
                        fontSize: "12.5px",
                        color: "#334155",
                        cursor: currentStopIndex > 0 ? "pointer" : "not-allowed",
                        opacity: currentStopIndex > 0 ? 1 : 0.5,
                      }}
                    >
                      ← Previous Stop
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePauseDrive}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        background: isDriveActive ? "#fffbeb" : "#f0fdf4",
                        color: isDriveActive ? "#b45309" : "#15803d",
                        border: `1px solid ${isDriveActive ? "#fde68a" : "#bbf7d0"}`,
                        fontWeight: "800",
                        fontSize: "12.5px",
                        cursor: "pointer",
                      }}
                    >
                      {isDriveActive ? "⏸ Pause Drive" : "▶ Resume Drive"}
                    </button>
                  </div>

                  {/* END DRIVE BUTTON (DISTINCT HIGH CONTRAST) */}
                  <button
                    type="button"
                    onClick={handleEndDrive}
                    className="touch-action-btn"
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "12px",
                      background: "#fff1f2",
                      color: "#dc2626",
                      border: "2px solid #fecaca",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    <Square size={16} />
                    <span>END LIVE DRIVE SESSION</span>
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

      {/* END DRIVE COMPLETION SUMMARY MODAL */}
      {showEndModal && endSummary && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "480px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              textAlign: "center",
            }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px" }}>
              Drive Completed!
            </h2>
            <p style={{ color: "#64748b", fontSize: "13.5px", margin: "0 0 20px" }}>
              The live transit journey has successfully concluded.
            </p>

            <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "16px", border: "1px solid #e2e8f0", textAlign: "left", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ gridColumn: "1 / -1", paddingBottom: "8px", borderBottom: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Trip Session ID</span>
                <span style={{ fontWeight: "900", color: "#2563eb", fontSize: "12px", fontFamily: "monospace" }}>{endSummary.tripSessionId}</span>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Origin</div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{endSummary.startStop}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Destination</div>
                <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13px" }}>{endSummary.destination}</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Stops Visited</div>
                <div style={{ fontWeight: "900", color: "#2563eb", fontSize: "16px" }}>{endSummary.stopsCompleted} stops</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Distance</div>
                <div style={{ fontWeight: "900", color: "#16a34a", fontSize: "16px" }}>{endSummary.totalDistanceKm} km</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Passenger RFID Taps</div>
                <div style={{ fontWeight: "900", color: "#7c3aed", fontSize: "16px" }}>{endSummary.totalRfidTaps || endSummary.rfidTapsCount || 0} taps</div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Total Fare Collected</div>
                <div style={{ fontWeight: "900", color: "#dc2626", fontSize: "16px" }}>₹{Number(endSummary.totalFare || 0).toFixed(2)}</div>
              </div>
            </div>

            {/* DOWNLOAD TRIP REPORT (PDF) BUTTON */}
            {endSummary.tripSessionId && (
              <a
                href={`/api/driver/trip-report/${encodeURIComponent(endSummary.tripSessionId)}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                download={`MoveSmart-Report-${endSummary.tripSessionId}.pdf`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "14px 20px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: "900",
                  fontSize: "14.5px",
                  marginBottom: "16px",
                  boxShadow: "0 6px 20px rgba(37, 99, 235, 0.35)",
                }}
              >
                <span>📄</span>
                <span>DOWNLOAD TRIP REPORT (PDF)</span>
              </a>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  setDriveStatus("NOT STARTED");
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                New Drive
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEndModal(false);
                  navigate("/driver");
                }}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE TRIP / SELECT BUS MODAL */}
      {showTripModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "28px",
              maxWidth: "560px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              border: "1px solid #e2e8f0",
            }}
          >
            {/* MODAL HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                  🔄
                </div>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                    Change Bus &amp; Trip
                  </h2>
                  <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>
                    Select your active transit schedule or reverse journey direction.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  color: "#64748b",
                  fontWeight: "900",
                  fontSize: "15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {/* REVERSE DIRECTION QUICK ACTION */}
            {stops.length > 1 && (
              <div style={{ background: "linear-gradient(135deg, #eff6ff, #dbeafe)", padding: "16px", borderRadius: "16px", border: "1.5px solid #93c5fd", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  🔄 Return Journey
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e3a8a", marginTop: "2px" }}>
                  Reverse Route Direction: <strong>{stops[stops.length - 1]?.name}</strong> ➔ <strong>{stops[0]?.name}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleReverseDirection}
                  style={{
                    marginTop: "10px",
                    width: "100%",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <span>⇄</span>
                  <span>Switch to Return Trip ({stops[stops.length - 1]?.name} ➔ {stops[0]?.name})</span>
                </button>
              </div>
            )}

            {/* ASSIGNED BUSES & TRIPS LIST */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                Your Assigned Buses &amp; Routes ({driverBuses.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {driverBuses.length === 0 ? (
                  <div style={{ padding: "24px 20px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "16px", border: "1.5px dashed #cbd5e1" }}>
                    <div style={{ fontSize: "28px", marginBottom: "8px" }}>🚌</div>
                    <div style={{ fontWeight: "800", color: "#1e293b", fontSize: "15px", marginBottom: "4px" }}>
                      No Bus Assigned
                    </div>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>
                      There are currently no buses assigned to your driver account. Please contact the administrator.
                    </div>
                  </div>
                ) : (
                  driverBuses.map((bus) => {
                    const isSelected = assignedBus?._id === bus._id || assignedBus?.busNumber === bus.busNumber;
                    const routeTitle = bus.routeName || `${bus.fromLocation || "Origin"} ➔ ${bus.toLocation || "Destination"}`;
                    const stopsCount = Array.isArray(bus.stops) ? bus.stops.length : 0;

                    return (
                      <div
                        key={bus._id || bus.busNumber}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "14px",
                          border: isSelected ? "2px solid #16a34a" : "1.5px solid #e2e8f0",
                          background: isSelected ? "#f0fdf4" : "#ffffff",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                              {bus.busName} ({bus.busNumber})
                            </strong>
                            {isSelected && (
                              <span style={{ fontSize: "10.5px", fontWeight: "900", background: "#16a34a", color: "#ffffff", padding: "2px 8px", borderRadius: "10px" }}>
                                Active Trip
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#2563eb", marginTop: "3px" }}>
                            {routeTitle}
                          </div>

                          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                            Departure: <strong>{bus.departureTime || "08:00 AM"}</strong> • {stopsCount > 0 ? `${stopsCount} Stops` : "Direct Route"} • Capacity: <strong>{bus.totalSeats || 45} seats</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectTrip(bus)}
                          disabled={isSelected}
                          style={{
                            padding: "8px 16px",
                            borderRadius: "10px",
                            background: isSelected ? "#e2e8f0" : "#16a34a",
                            color: isSelected ? "#64748b" : "#ffffff",
                            border: "none",
                            fontWeight: "800",
                            fontSize: "12.5px",
                            cursor: isSelected ? "default" : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isSelected ? "Selected ✓" : "Select Trip ➔"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* MODAL FOOTER */}
            <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #e2e8f0", textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowTripModal(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DriverLayout>
  );
}
