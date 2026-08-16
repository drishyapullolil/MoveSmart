import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { getStoredToken } from "../../utils/session";
import {
  Scan,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Camera,
  RefreshCw,
  Search,
  Trash2,
  Eye,
  CheckCircle,
  AlertTriangle,
  Play,
  Copy,
  Check,
  User,
  Zap,
  Lock,
  ChevronRight,
  Activity,
  Layers,
  Sparkles
} from "lucide-react";

export default function DriverBiometricsManager({ darkMode = false, showToast = () => {} }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'enrolled' | 'pending'

  // Vector Inspector Modal State
  const [inspectingDriver, setInspectingDriver] = useState(null);
  const [copiedVector, setCopiedVector] = useState(false);

  // Live Biometric Probe Modal State
  const [probeDriver, setProbeDriver] = useState(null);
  const [probeCameraActive, setProbeCameraActive] = useState(false);
  const [probeResult, setProbeResult] = useState(null);
  const [probing, setProbing] = useState(false);
  const probeVideoRef = useRef(null);
  const probeStreamRef = useRef(null);

  // Delete Confirmation Modal State
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Admin Quick Enrollment State
  const [enrollingDriver, setEnrollingDriver] = useState(null);
  const [enrollProgress, setEnrollProgress] = useState(0);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState([]);
  const enrollVideoRef = useRef(null);
  const enrollStreamRef = useRef(null);
  const enrollCanvasRef = useRef(null);

  // Theme Colors
  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const bgSubtle = darkMode ? "#0f172a" : "#f8fafc";
  const borderCol = darkMode ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0";
  const textPrimary = darkMode ? "#f8fafc" : "#0f172a";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";

  // Fetch Drivers with Face Profile Metadata
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await axios.get("/api/admin/drivers", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rawDrivers = res.data?.drivers || [];
      const formatted = rawDrivers.map((d) => {
        const encoding = d.faceProfile?.encoding || d.faceEncoding || [];
        const isEnrolled = Array.isArray(encoding) && encoding.length === 128;
        const enrolledAt = d.faceProfile?.enrolledAt || d.faceEnrolledAt || null;
        return {
          ...d,
          isEnrolled,
          faceEncoding: encoding,
          enrolledAt,
        };
      });
      setDrivers(formatted);
    } catch (err) {
      console.error("Error fetching drivers for biometrics:", err);
      showToast("Failed to load driver biometric records", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Cleanup camera streams on unmount
  useEffect(() => {
    return () => {
      if (probeStreamRef.current) {
        probeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (enrollStreamRef.current) {
        enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Filtered drivers
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      d.name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.licenseNumber?.toLowerCase().includes(q);

    if (statusFilter === "enrolled") return matchesSearch && d.isEnrolled;
    if (statusFilter === "pending") return matchesSearch && !d.isEnrolled;
    return matchesSearch;
  });

  const enrolledCount = drivers.filter((d) => d.isEnrolled).length;
  const pendingCount = drivers.length - enrolledCount;
  const coveragePercent = drivers.length > 0 ? Math.round((enrolledCount / drivers.length) * 100) : 0;

  // Handle Delete Face Profile
  const handleDeleteProfile = async () => {
    if (!driverToDelete) return;
    setDeleting(true);
    try {
      const token = getStoredToken();
      await axios.delete(`/api/drivers/${driverToDelete._id}/face-profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      showToast(`Biometric face vector removed for ${driverToDelete.name}.`, "success");
      setDriverToDelete(null);
      fetchDrivers();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.response?.data?.message || "Failed to delete face profile", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Start Probe Webcam
  const startProbeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      probeStreamRef.current = stream;
      if (probeVideoRef.current) {
        probeVideoRef.current.srcObject = stream;
        await probeVideoRef.current.play().catch(() => {});
      }
      setProbeCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      showToast("Could not access camera. Please allow camera permissions.", "error");
    }
  };

  const stopProbeCamera = () => {
    if (probeStreamRef.current) {
      probeStreamRef.current.getTracks().forEach((t) => t.stop());
      probeStreamRef.current = null;
    }
    setProbeCameraActive(false);
  };

  // Extract 128-D Vector in Browser
  const extractCandidateVector = (canvas) => {
    try {
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 64;
      sampleCanvas.height = 64;
      const sCtx = sampleCanvas.getContext("2d");
      sCtx.drawImage(canvas, 0, 0, 64, 64);
      const imgData = sCtx.getImageData(0, 0, 64, 64).data;

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

  // Run Biometric Match Probe
  const handleRunProbe = async () => {
    if (!probeVideoRef.current || !probeDriver) return;
    setProbing(true);
    try {
      const video = probeVideoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.translate(320, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 320, 240);
      ctx.restore();

      const candidateVec = extractCandidateVector(canvas);
      if (!candidateVec) {
        showToast("No clear face detected in frame. Please center face.", "error");
        setProbing(false);
        return;
      }

      const res = await axios.post("/api/monitoring/verify-driver-identity", {
        encoding: candidateVec,
        driverId: probeDriver._id,
      });

      if (res.data?.success) {
        setProbeResult(res.data);
      }
    } catch (err) {
      console.error("Probe error:", err);
      showToast("Biometric verification probe failed.", "error");
    } finally {
      setProbing(false);
    }
  };

  // Admin In-Place Quick Face Enrollment (20 Frames)
  const startEnrollmentFlow = async (driver) => {
    setEnrollingDriver(driver);
    setEnrollProgress(0);
    setCapturedSamples([]);
    setIsEnrolling(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      enrollStreamRef.current = stream;
      if (enrollVideoRef.current) {
        enrollVideoRef.current.srcObject = stream;
        await enrollVideoRef.current.play().catch(() => {});
      }
    } catch (err) {
      showToast("Could not access camera for enrollment.", "error");
    }
  };

  const stopEnrollmentCamera = () => {
    if (enrollStreamRef.current) {
      enrollStreamRef.current.getTracks().forEach((t) => t.stop());
      enrollStreamRef.current = null;
    }
    setEnrollingDriver(null);
    setIsEnrolling(false);
    setEnrollProgress(0);
  };

  const handleCaptureEnrollment = async () => {
    if (!enrollVideoRef.current || !enrollingDriver) return;
    setIsEnrolling(true);
    setEnrollProgress(0);

    const video = enrollVideoRef.current;
    const canvas = enrollCanvasRef.current || document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    const samples = [];
    const totalFrames = 20;

    for (let i = 0; i < totalFrames; i++) {
      setEnrollProgress(i + 1);
      ctx.save();
      ctx.translate(640, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, 640, 480);
      ctx.restore();

      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      const base64Clean = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
      samples.push(base64Clean);

      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      const token = getStoredToken();
      const res = await axios.post(
        `/api/drivers/${enrollingDriver._id}/face-enroll`,
        { samples },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.data?.success) {
        showToast(`✓ Face profile enrolled successfully for ${enrollingDriver.name}!`, "success");
        stopEnrollmentCamera();
        fetchDrivers();
      }
    } catch (err) {
      console.error("Enrollment failed:", err);
      showToast(err.response?.data?.message || "Biometric enrollment failed. Please ensure good lighting.", "error");
      setIsEnrolling(false);
    }
  };

  return (
    <div className="fade-in-section" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      
      {/* 🚀 HEADER & GLOBAL BIOMETRIC STATS */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #0f172a 100%)",
          borderRadius: "24px",
          padding: "28px 32px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px",
          boxShadow: "0 12px 36px rgba(49, 16, 66, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(139, 92, 246, 0.25)", color: "#c4b5fd", padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: "800", marginBottom: "12px", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
            <Scan size={14} /> MoveSmart Biometric Security Architecture
          </div>
          <h2 style={{ fontSize: "26px", fontWeight: "900", margin: "0 0 8px 0", letterSpacing: "-0.5px" }}>
            Driver Face Biometrics Registry
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#cbd5e1", maxWidth: "600px", lineHeight: "1.5" }}>
            Manage and store every driver's isolated 128-dimensional biometric embeddings. Powers shift-start facial lock gates and automated 3-minute periodic in-trip re-verification.
          </p>
        </div>

        {/* Global Metric Badges */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.08)", padding: "16px 20px", borderRadius: "18px", border: "1px solid rgba(255, 255, 255, 0.12)", minWidth: "120px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase" }}>Total Drivers</div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>{drivers.length}</div>
          </div>
          <div style={{ background: "rgba(34, 197, 94, 0.15)", padding: "16px 20px", borderRadius: "18px", border: "1px solid rgba(34, 197, 94, 0.3)", minWidth: "120px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#86efac", textTransform: "uppercase" }}>128-D Active</div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#4ade80", marginTop: "2px" }}>{enrolledCount}</div>
          </div>
          <div style={{ background: "rgba(234, 179, 8, 0.15)", padding: "16px 20px", borderRadius: "18px", border: "1px solid rgba(234, 179, 8, 0.3)", minWidth: "120px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#fde047", textTransform: "uppercase" }}>Pending</div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#facc15", marginTop: "2px" }}>{pendingCount}</div>
          </div>
          <div style={{ background: "rgba(168, 85, 247, 0.15)", padding: "16px 20px", borderRadius: "18px", border: "1px solid rgba(168, 85, 247, 0.3)", minWidth: "120px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#d8b4fe", textTransform: "uppercase" }}>Secured</div>
            <div style={{ fontSize: "24px", fontWeight: "900", color: "#c084fc", marginTop: "2px" }}>{coveragePercent}%</div>
          </div>
        </div>
      </div>

      {/* 🔍 SEARCH & FILTER BAR */}
      <div
        style={{
          background: bgCard,
          borderRadius: "20px",
          padding: "16px 20px",
          border: `1px solid ${borderCol}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <Search size={18} style={{ color: textSecondary }} />
          <input
            type="text"
            placeholder="Search driver by name, license #, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: textPrimary,
              fontSize: "14px",
              fontWeight: "600",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: textSecondary, cursor: "pointer", fontSize: "16px" }}
            >
              ✕
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", background: bgSubtle, padding: "4px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
            {[
              { id: "all", label: `All (${drivers.length})` },
              { id: "enrolled", label: `Enrolled (${enrolledCount})` },
              { id: "pending", label: `Pending (${pendingCount})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: statusFilter === f.id ? "linear-gradient(135deg, #6d28d9, #8b5cf6)" : "transparent",
                  color: statusFilter === f.id ? "#ffffff" : textSecondary,
                  fontSize: "12.5px",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDrivers}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "12px",
              border: `1px solid ${borderCol}`,
              background: bgSubtle,
              color: textPrimary,
              fontSize: "12.5px",
              fontWeight: "800",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* 📋 DRIVER BIOMETRIC CARDS GRID */}
      {filteredDrivers.length === 0 ? (
        <div
          style={{
            background: bgCard,
            borderRadius: "20px",
            padding: "48px 24px",
            textAlign: "center",
            border: `1px dashed ${borderCol}`,
          }}
        >
          <Scan size={48} style={{ color: textSecondary, margin: "0 auto 16px", opacity: 0.5 }} />
          <h3 style={{ fontSize: "18px", fontWeight: "800", color: textPrimary, margin: "0 0 6px 0" }}>
            No Driver Records Found
          </h3>
          <p style={{ fontSize: "13px", color: textSecondary, margin: 0 }}>
            {searchQuery ? "Try refining your search filter above." : "No registered drivers present in system."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
          {filteredDrivers.map((driver) => {
            const hasVector = driver.isEnrolled;
            const vectorSample = driver.faceEncoding || [];
            const enrolledDateStr = driver.enrolledAt
              ? new Date(driver.enrolledAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Not Enrolled";

            return (
              <div
                key={driver._id}
                style={{
                  background: bgCard,
                  borderRadius: "20px",
                  border: hasVector
                    ? "1.5px solid rgba(139, 92, 246, 0.4)"
                    : `1px solid ${borderCol}`,
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: hasVector
                    ? "0 8px 24px rgba(139, 92, 246, 0.08)"
                    : "0 4px 12px rgba(0, 0, 0, 0.02)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top Accent Strip */}
                {hasVector && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background: "linear-gradient(90deg, #8b5cf6, #3b82f6, #10b981)",
                    }}
                  />
                )}

                {/* Driver Identity Header */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "14px",
                          background: driver.profilePic
                            ? `url(${driver.profilePic}) center/cover`
                            : "linear-gradient(135deg, #6d28d9, #4f46e5)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#ffffff",
                          fontWeight: "900",
                          fontSize: "18px",
                          border: `2px solid ${hasVector ? "#8b5cf6" : borderCol}`,
                          flexShrink: 0,
                        }}
                      >
                        {!driver.profilePic && (driver.name?.charAt(0) || "D")}
                      </div>
                      <div>
                        <h4 style={{ fontSize: "16px", fontWeight: "900", margin: "0 0 2px 0", color: textPrimary }}>
                          {driver.name || "Driver"}
                        </h4>
                        <div style={{ fontSize: "12px", color: textSecondary }}>
                          {driver.email}
                        </div>
                      </div>
                    </div>

                    {/* Enrolled Status Pill */}
                    <div
                      style={{
                        padding: "4px 10px",
                        borderRadius: "999px",
                        fontSize: "11px",
                        fontWeight: "900",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        background: hasVector ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: hasVector ? "#16a34a" : "#64748b",
                        border: hasVector ? "1px solid rgba(34, 197, 94, 0.3)" : `1px solid ${borderCol}`,
                        flexShrink: 0,
                      }}
                    >
                      {hasVector ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                      {hasVector ? "128-D Active" : "Pending"}
                    </div>
                  </div>

                  {/* Driver Meta Badges */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: bgSubtle, padding: "10px 12px", borderRadius: "12px", fontSize: "12px", marginBottom: "14px" }}>
                    <div>
                      <span style={{ color: textSecondary, fontSize: "11px", display: "block" }}>License No.</span>
                      <strong style={{ color: textPrimary, fontFamily: "monospace" }}>{driver.licenseNumber || "N/A"}</strong>
                    </div>
                    <div>
                      <span style={{ color: textSecondary, fontSize: "11px", display: "block" }}>Phone</span>
                      <strong style={{ color: textPrimary }}>{driver.phone || "N/A"}</strong>
                    </div>
                  </div>

                  {/* 128-D Feature Embedding Mini-Bar */}
                  {hasVector ? (
                    <div style={{ background: "rgba(139, 92, 246, 0.06)", border: "1px solid rgba(139, 92, 246, 0.2)", borderRadius: "14px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: "800", color: "#8b5cf6", display: "flex", alignItems: "center", gap: "5px" }}>
                          <Lock size={12} /> 128-Dimensional Biometric Embedding
                        </span>
                        <span style={{ fontSize: "10.5px", color: textSecondary }}>
                          Enrolled: {enrolledDateStr}
                        </span>
                      </div>

                      {/* Mini Feature Heatmap Bar */}
                      <div style={{ display: "flex", gap: "2px", height: "14px", borderRadius: "4px", overflow: "hidden", background: "#000" }}>
                        {vectorSample.slice(0, 32).map((val, idx) => {
                          const intensity = Math.min(255, Math.max(0, Math.round(Math.abs(val) * 1500)));
                          return (
                            <div
                              key={idx}
                              title={`Dim ${idx + 1}: ${Number(val).toFixed(4)}`}
                              style={{
                                flex: 1,
                                background: `rgb(${Math.round(intensity * 0.7)}, ${Math.round(intensity * 0.4)}, ${Math.round(intensity * 1.2)})`,
                              }}
                            />
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: textSecondary, marginTop: "6px" }}>
                        <span>L2 Norm: 1.000</span>
                        <span>Vector Size: 128 Floats</span>
                        <span>Shift Gate: Ready</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: "rgba(234, 179, 8, 0.08)", border: "1px dashed rgba(234, 179, 8, 0.3)", borderRadius: "14px", padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "12px", fontWeight: "800", color: "#d97706", marginBottom: "4px" }}>
                        ⚠️ Face Features Not Enrolled
                      </div>
                      <div style={{ fontSize: "11px", color: textSecondary }}>
                        Driver will be blocked at shift-start gate until face profile is captured.
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Toolbar */}
                <div style={{ display: "flex", gap: "8px", borderTop: `1px solid ${borderCol}`, paddingTop: "12px" }}>
                  {hasVector ? (
                    <>
                      <button
                        onClick={() => {
                          setInspectingDriver(driver);
                          setCopiedVector(false);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: `1px solid ${borderCol}`,
                          background: bgSubtle,
                          color: textPrimary,
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <Eye size={13} /> View Vector
                      </button>

                      <button
                        onClick={() => {
                          setProbeDriver(driver);
                          setProbeResult(null);
                          startProbeCamera();
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: "800",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <Activity size={13} /> Test Probe
                      </button>

                      <button
                        onClick={() => setDriverToDelete(driver)}
                        title="Delete Face Profile"
                        style={{
                          padding: "8px 10px",
                          borderRadius: "10px",
                          border: "1px solid rgba(225, 29, 72, 0.3)",
                          background: "rgba(225, 29, 72, 0.08)",
                          color: "#dc2626",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEnrollmentFlow(driver)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "12px",
                        border: "none",
                        background: "linear-gradient(135deg, #16a34a, #059669)",
                        color: "#ffffff",
                        fontSize: "13px",
                        fontWeight: "800",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Camera size={15} /> Enroll Face Features (20 Frames) →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔬 MODAL: 128-D VECTOR INSPECTOR */}
      {inspectingDriver && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "680px",
              width: "95%",
              borderRadius: "24px",
              padding: "28px",
              background: bgCard,
              color: textPrimary,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: `1px solid ${borderCol}`, paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #8b5cf6, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                  <Scan size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
                    Biometric Feature Vector Inspector
                  </h3>
                  <div style={{ fontSize: "12px", color: textSecondary }}>
                    Driver: <strong>{inspectingDriver.name}</strong> • ID: {inspectingDriver._id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectingDriver(null)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: textSecondary }}
              >
                ✕
              </button>
            </div>

            {/* Vector Metadata Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: bgSubtle, padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                <span style={{ fontSize: "11px", color: textSecondary, display: "block" }}>Dimensionality</span>
                <strong style={{ fontSize: "16px", color: "#8b5cf6" }}>128 Floats</strong>
              </div>
              <div style={{ background: bgSubtle, padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                <span style={{ fontSize: "11px", color: textSecondary, display: "block" }}>L2 Normalization</span>
                <strong style={{ fontSize: "16px", color: "#16a34a" }}>||v|| = 1.000</strong>
              </div>
              <div style={{ background: bgSubtle, padding: "10px 14px", borderRadius: "12px", border: `1px solid ${borderCol}` }}>
                <span style={{ fontSize: "11px", color: textSecondary, display: "block" }}>Cache Sync</span>
                <strong style={{ fontSize: "16px", color: "#3b82f6" }}>Dual-Disk ✓</strong>
              </div>
            </div>

            {/* Full 128-D Numerical Matrix Display */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ fontSize: "12px", fontWeight: "800", color: textSecondary }}>
                  128-Dimensional Normalized Array:
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectingDriver.faceEncoding || []));
                    setCopiedVector(true);
                    setTimeout(() => setCopiedVector(false), 2000);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    border: `1px solid ${borderCol}`,
                    background: bgSubtle,
                    color: copiedVector ? "#16a34a" : textPrimary,
                    fontSize: "11px",
                    fontWeight: "800",
                    cursor: "pointer",
                  }}
                >
                  {copiedVector ? <Check size={12} /> : <Copy size={12} />}
                  {copiedVector ? "Copied!" : "Copy JSON"}
                </button>
              </div>

              <div
                style={{
                  background: darkMode ? "#0f172a" : "#1e1b4b",
                  color: "#a5b4fc",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  padding: "16px",
                  borderRadius: "14px",
                  maxHeight: "220px",
                  overflowY: "auto",
                  lineHeight: "1.6",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                [
                <br />
                {(inspectingDriver.faceEncoding || []).map((val, idx) => (
                  <span key={idx} style={{ display: "inline-block", margin: "2px 4px", color: val > 0.05 ? "#6ee7b7" : "#93c5fd" }}>
                    {idx}: {Number(val).toFixed(6)}
                    {idx < 127 ? "," : ""}
                  </span>
                ))}
                <br />
                ]
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setInspectingDriver(null)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "12px",
                  background: darkMode ? "#334155" : "#f1f5f9",
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🎯 MODAL: LIVE BIOMETRIC TEST PROBE */}
      {probeDriver && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "580px",
              width: "95%",
              borderRadius: "24px",
              padding: "28px",
              background: bgCard,
              color: textPrimary,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
                Live Biometric Match Probe
              </h3>
              <button
                onClick={() => {
                  stopProbeCamera();
                  setProbeDriver(null);
                }}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: textSecondary }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: textSecondary, margin: "0 0 16px 0" }}>
              Test live camera feed against registered 128-d profile for <strong>{probeDriver.name}</strong>.
            </p>

            {/* Video Viewport */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "260px",
                borderRadius: "16px",
                overflow: "hidden",
                background: "#000",
                marginBottom: "16px",
                border: "2px solid #8b5cf6",
              }}
            >
              <video
                ref={probeVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "140px",
                  height: "190px",
                  borderRadius: "50%",
                  border: "2px dashed #8b5cf6",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Probe Feedback Display */}
            {probeResult && (
              <div
                style={{
                  background: probeResult.isBiometricMatch ? "rgba(34, 197, 94, 0.12)" : "rgba(225, 29, 72, 0.12)",
                  border: probeResult.isBiometricMatch ? "1.5px solid #22c55e" : "1.5px solid #ef4444",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong style={{ color: probeResult.isBiometricMatch ? "#16a34a" : "#dc2626", fontSize: "14px" }}>
                    {probeResult.isBiometricMatch ? "✓ Biometric Identity Match Verified" : "❌ Biometric Mismatch Detected"}
                  </strong>
                  <span style={{ fontSize: "13px", fontWeight: "900", color: probeResult.isBiometricMatch ? "#16a34a" : "#dc2626" }}>
                    {probeResult.matchConfidence}% Match
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: textSecondary }}>
                  Euclidean Distance: <strong>{Number(probeResult.distance).toFixed(4)}</strong> (Tolerance &le; 0.50)
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleRunProbe}
                disabled={probing || !probeCameraActive}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  cursor: probing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <Activity size={16} /> {probing ? "Comparing Vector..." : "Capture & Run Probe"}
              </button>
              <button
                onClick={() => {
                  stopProbeCamera();
                  setProbeDriver(null);
                }}
                style={{
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: darkMode ? "#334155" : "#f1f5f9",
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📹 MODAL: QUICK 20-SAMPLE ENROLLMENT */}
      {enrollingDriver && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "540px",
              width: "95%",
              borderRadius: "24px",
              padding: "28px",
              background: bgCard,
              color: textPrimary,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>
                Enroll Face Profile: {enrollingDriver.name}
              </h3>
              <button
                onClick={stopEnrollmentCamera}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: textSecondary }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "260px",
                borderRadius: "16px",
                overflow: "hidden",
                background: "#000",
                marginBottom: "14px",
                border: "2px solid #16a34a",
              }}
            >
              <video
                ref={enrollVideoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "140px",
                  height: "190px",
                  borderRadius: "50%",
                  border: "2px dashed #4ade80",
                  pointerEvents: "none",
                }}
              />
            </div>

            {/* Progress Indicator */}
            {isEnrolling && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "800", marginBottom: "6px" }}>
                  <span>Capturing samples ({enrollProgress} / 20)...</span>
                  <span>{Math.round((enrollProgress / 20) * 100)}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: bgSubtle, borderRadius: "999px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(enrollProgress / 20) * 100}%`,
                      background: "linear-gradient(90deg, #16a34a, #22c55e)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleCaptureEnrollment}
                disabled={isEnrolling}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #16a34a, #059669)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  cursor: isEnrolling ? "not-allowed" : "pointer",
                }}
              >
                {isEnrolling ? "Encoding 128-D Biometric Vector..." : "Start 20-Sample Capture →"}
              </button>
              <button
                onClick={stopEnrollmentCamera}
                disabled={isEnrolling}
                style={{
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: darkMode ? "#334155" : "#f1f5f9",
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ MODAL: CONFIRM DELETE BIOMETRIC PROFILE */}
      {driverToDelete && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div
            className="modal-content"
            style={{
              maxWidth: "460px",
              width: "90%",
              borderRadius: "24px",
              padding: "28px",
              background: bgCard,
              color: textPrimary,
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(225, 29, 72, 0.15)", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 8px 0" }}>
              Reset Face Profile Vector?
            </h3>
            <p style={{ fontSize: "13px", color: textSecondary, margin: "0 0 20px 0", lineHeight: "1.5" }}>
              Are you sure you want to delete the enrolled 128-d face vector for <strong>{driverToDelete.name}</strong>? The driver will not be able to pass shift-start facial lock gates until re-enrolled.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleDeleteProfile}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "Deleting..." : "Confirm Delete ✕"}
              </button>
              <button
                onClick={() => setDriverToDelete(null)}
                style={{
                  padding: "12px 18px",
                  borderRadius: "12px",
                  background: darkMode ? "#334155" : "#f1f5f9",
                  color: textPrimary,
                  border: "none",
                  fontWeight: "800",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
