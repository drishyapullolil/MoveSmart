import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Calendar,
  Phone,
  FileText,
  Tag,
  Eye,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Lock,
  Sparkles,
  Bell,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  Info,
  Camera,
  Upload,
  CheckSquare,
  Building,
  UserCheck,
  Layers
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { getStoredUser, getStoredToken } from "../utils/session";

const LF_CATEGORIES = [
  "Mobile Phone",
  "Wallet/Purse",
  "ID Card",
  "Bag",
  "Keys",
  "Documents",
  "Electronics",
  "Clothing",
  "Other",
];

export default function LostFound() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [activeTab, setActiveTab] = useState("reportLost"); // reportLost | reportFound | publicLost | publicFound | myLost | myFound | myMatches

  // Toast / Alert Notification State
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type: "info" });
    }, 4500);
  };

  // Loading States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // In-Site Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Universal Client-Side Image Compressor ───────────────────
  // Handles ANY image size (e.g. 10MB+ phone camera captures) smoothly
  const compressImage = (file, maxWidth = 1280, maxHeight = 1280, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith("image/")) {
        return reject(new Error("Please select a valid image file."));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read image file."));
      reader.onload = (readerEvent) => {
        const image = new Image();
        image.onerror = () => reject(new Error("Failed to process image format."));
        image.onload = () => {
          let width = image.width;
          let height = image.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(image, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        };
        image.src = readerEvent.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // ─────────────────────────────────────────────────────────────
  // 1. REPORT LOST ITEM STATE
  // ─────────────────────────────────────────────────────────────
  const [lostForm, setLostForm] = useState({
    itemName: "",
    category: "Mobile Phone",
    description: "",
    lostDate: new Date().toISOString().split("T")[0],
    lostTime: "",
    busNumber: "",
    route: "",
    location: "",
    ownerPhone: user?.phone || "",
    brand: "",
    color: "",
    serialNumber: "",
    identifyingDetails: "",
  });
  const [lostPhoto, setLostPhoto] = useState("");
  const [lostPhotoName, setLostPhotoName] = useState("");
  const [isProcessingLostPhoto, setIsProcessingLostPhoto] = useState(false);
  const [lostSuccessId, setLostSuccessId] = useState("");

  const handleLostPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingLostPhoto(true);
    try {
      const compressed = await compressImage(file);
      setLostPhoto(compressed);
      setLostPhotoName(file.name || "lost_item_photo.jpg");
      showToast("✓ Photo attached successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to process photo.", "error");
    } finally {
      setIsProcessingLostPhoto(false);
    }
  };

  const handleReportLostSubmit = async (e) => {
    e.preventDefault();
    if (!lostForm.itemName.trim()) { showToast("Item Name is mandatory.", "error"); return; }
    if (!lostForm.description.trim()) { showToast("Detailed description is mandatory.", "error"); return; }
    if (!lostForm.lostDate) { showToast("Date lost is mandatory.", "error"); return; }
    if (!lostForm.location.trim()) { showToast("Location is mandatory.", "error"); return; }
    if (!lostForm.ownerPhone.trim()) { showToast("Private phone number is mandatory for Admin verification.", "error"); return; }

    const token = getStoredToken();
    if (!token) {
      showToast("Please sign in to submit a Lost Item report.", "error");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...lostForm,
        photo: lostPhoto, // Photo is optional
      };

      const res = await axios.post("/api/lostfound/lost", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const repId = res.data.reportId || "LOST-REPORT";
      setLostSuccessId(repId);
      showToast(`Lost item report submitted! Reference: ${repId}`, "success");

      setLostForm({
        itemName: "",
        category: "Mobile Phone",
        description: "",
        lostDate: new Date().toISOString().split("T")[0],
        lostTime: "",
        busNumber: "",
        route: "",
        location: "",
        ownerPhone: user?.phone || "",
        brand: "",
        color: "",
        serialNumber: "",
        identifyingDetails: "",
      });
      setLostPhoto("");
      setLostPhotoName("");
      fetchMyLostReports();
      fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to submit report. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 2. REPORT FOUND ITEM STATE
  // ─────────────────────────────────────────────────────────────
  const [foundForm, setFoundForm] = useState({
    itemName: "",
    category: "Mobile Phone",
    description: "",
    foundDate: new Date().toISOString().split("T")[0],
    foundTime: "",
    busNumber: "",
    route: "",
    location: "",
    finderPhone: user?.phone || "",
    foundDetails: "",
  });
  const [foundPhoto, setFoundPhoto] = useState("");
  const [foundPhotoName, setFoundPhotoName] = useState("");
  const [isProcessingFoundPhoto, setIsProcessingFoundPhoto] = useState(false);
  const [foundSuccessId, setFoundSuccessId] = useState("");

  const handleFoundPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingFoundPhoto(true);
    try {
      const compressed = await compressImage(file);
      setFoundPhoto(compressed);
      setFoundPhotoName(file.name || "found_item_photo.jpg");
      showToast("✓ Photo attached successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to process photo.", "error");
    } finally {
      setIsProcessingFoundPhoto(false);
    }
  };

  const handleReportFoundSubmit = async (e) => {
    e.preventDefault();
    if (!foundForm.itemName.trim()) { showToast("Item Name is mandatory.", "error"); return; }
    if (!foundForm.description.trim()) { showToast("Detailed description is mandatory.", "error"); return; }
    if (!foundForm.foundDate) { showToast("Date found is mandatory.", "error"); return; }
    if (!foundForm.location.trim()) { showToast("Location found is mandatory.", "error"); return; }
    if (!foundForm.finderPhone.trim()) { showToast("Private phone number is mandatory for Admin communication.", "error"); return; }

    const token = getStoredToken();
    if (!token) {
      showToast("Please sign in to submit a Found Item report.", "error");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...foundForm,
        photo: foundPhoto, // Photo is optional/recommended
      };

      const res = await axios.post("/api/lostfound/found", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const repId = res.data.reportId || "FOUND-REPORT";
      setFoundSuccessId(repId);
      showToast(`Found item registered! Reference: ${repId}`, "success");

      setFoundForm({
        itemName: "",
        category: "Mobile Phone",
        description: "",
        foundDate: new Date().toISOString().split("T")[0],
        foundTime: "",
        busNumber: "",
        route: "",
        location: "",
        finderPhone: user?.phone || "",
        foundDetails: "",
      });
      setFoundPhoto("");
      setFoundPhotoName("");
      fetchMyFoundReports();
      fetchPublicFound();
      fetchNotifications();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to submit found report.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 3. PUBLIC DIRECTORIES (SAFE VIEWS)
  // ─────────────────────────────────────────────────────────────
  const [publicLostItems, setPublicLostItems] = useState([]);
  const [publicLostSearch, setPublicLostSearch] = useState("");
  const [publicLostCat, setPublicLostCat] = useState("All");

  const [publicFoundItems, setPublicFoundItems] = useState([]);
  const [publicFoundSearch, setPublicFoundSearch] = useState("");
  const [publicFoundCat, setPublicFoundCat] = useState("All");

  const fetchPublicLost = useCallback(async () => {
    try {
      const params = {};
      if (publicLostCat && publicLostCat !== "All") params.category = publicLostCat;
      if (publicLostSearch.trim()) params.search = publicLostSearch.trim();
      const res = await axios.get("/api/lostfound/public/lost", { params });
      setPublicLostItems(res.data.items || []);
    } catch (e) {
      console.warn("fetchPublicLost:", e.message);
    }
  }, [publicLostCat, publicLostSearch]);

  const fetchPublicFound = useCallback(async () => {
    try {
      const params = {};
      if (publicFoundCat && publicFoundCat !== "All") params.category = publicFoundCat;
      if (publicFoundSearch.trim()) params.search = publicFoundSearch.trim();
      const res = await axios.get("/api/lostfound/public/found", { params });
      setPublicFoundItems(res.data.items || []);
    } catch (e) {
      console.warn("fetchPublicFound:", e.message);
    }
  }, [publicFoundCat, publicFoundSearch]);

  // ─────────────────────────────────────────────────────────────
  // 4. "I THINK THIS FOUND ITEM IS MINE" MODAL
  // ─────────────────────────────────────────────────────────────
  const [matchRequestModalFoundItem, setMatchRequestModalFoundItem] = useState(null);
  const [matchRequestLostItemId, setMatchRequestLostItemId] = useState("");
  const [matchRequestExplanation, setMatchRequestExplanation] = useState("");

  const handleOwnerMatchRequestSubmit = async (e) => {
    e.preventDefault();
    if (!matchRequestLostItemId) { showToast("Please select your lost item report.", "error"); return; }
    if (!matchRequestExplanation.trim()) { showToast("Please provide identifying explanation/proof.", "error"); return; }

    setIsSubmitting(true);
    try {
      const token = getStoredToken();
      await axios.post("/api/lostfound/match/owner-request", {
        lostItemId: matchRequestLostItemId,
        foundItemId: matchRequestModalFoundItem._id,
        explanation: matchRequestExplanation.trim(),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Match request submitted! MoveSmart Admin will review your identifying details.", "success");
      setMatchRequestModalFoundItem(null);
      setMatchRequestLostItemId("");
      setMatchRequestExplanation("");
      fetchMyLostReports();
      fetchMyMatches();
      setActiveTab("myMatches");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit match request.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4B. DIRECT "I FOUND THIS LOST ITEM" MODAL STATE & HANDLER
  // ─────────────────────────────────────────────────────────────
  const [directFoundModalLostItem, setDirectFoundModalLostItem] = useState(null);
  const [directFoundPhone, setDirectFoundPhone] = useState(user?.phone || "");
  const [directFoundPhoto, setDirectFoundPhoto] = useState("");
  const [directFoundPhotoName, setDirectFoundPhotoName] = useState("");
  const [isProcessingDirectPhoto, setIsProcessingDirectPhoto] = useState(false);
  const [directFoundDetails, setDirectFoundDetails] = useState("");
  const [directFoundDate, setDirectFoundDate] = useState(new Date().toISOString().split("T")[0]);

  const handleDirectFoundPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingDirectPhoto(true);
    try {
      const compressed = await compressImage(file);
      setDirectFoundPhoto(compressed);
      setDirectFoundPhotoName(file.name || "found_photo.jpg");
      showToast("✓ Found item photo attached successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to process photo.", "error");
    } finally {
      setIsProcessingDirectPhoto(false);
    }
  };

  const handleDirectFoundSubmit = async (e) => {
    e.preventDefault();
    if (!directFoundPhone.trim()) {
      showToast("Please provide your contact phone for Admin verification.", "error");
      return;
    }
    if (!directFoundPhoto) {
      showToast("Please upload a photo of the found item so Admin can check and verify the match.", "error");
      return;
    }

    const token = getStoredToken();
    if (!token) {
      showToast("Please sign in to submit a Found Item report.", "error");
      navigate("/login");
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post("/api/lostfound/found-direct", {
        lostItemId: directFoundModalLostItem._id,
        finderPhone: directFoundPhone.trim(),
        photo: directFoundPhoto,
        foundDetails: directFoundDetails.trim(),
        foundDate: directFoundDate,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Found report & verification photo submitted to MoveSmart Admin!", "success");
      setDirectFoundModalLostItem(null);
      setDirectFoundPhoto("");
      setDirectFoundPhotoName("");
      setDirectFoundDetails("");
      fetchPublicLost();
      fetchMyFoundReports();
      setActiveTab("myFound");
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to submit direct found report.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 5. MY REPORTS & PROGRESS STEPPERS
  // ─────────────────────────────────────────────────────────────
  const [myLostReports, setMyLostReports] = useState([]);
  const [myFoundReports, setMyFoundReports] = useState([]);
  const [myMatches, setMyMatches] = useState([]);

  // Match Confirmation Dialog State
  const [confirmMatchModal, setConfirmMatchModal] = useState(null); // match object

  // Owner Proof of Receiving Modal
  const [proofModalHandover, setProofModalHandover] = useState(null);
  const [proofReceivedPhoto, setProofReceivedPhoto] = useState("");
  const [proofReceiptDoc, setProofReceiptDoc] = useState("");
  const [proofConfirmedCheck, setProofConfirmedCheck] = useState(false);

  const fetchMyLostReports = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await axios.get("/api/lostfound/my-lost", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyLostReports(res.data.items || []);
    } catch (e) {
      console.warn("fetchMyLostReports:", e.message);
    }
  }, []);

  const fetchMyFoundReports = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await axios.get("/api/lostfound/my-found", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyFoundReports(res.data.items || []);
    } catch (e) {
      console.warn("fetchMyFoundReports:", e.message);
    }
  }, []);

  const fetchMyMatches = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await axios.get("/api/lostfound/my-matches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyMatches(res.data.matches || []);
    } catch (e) {
      console.warn("fetchMyMatches:", e.message);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (!token) return;
      const res = await axios.get("/api/lostfound/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notifs = res.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch (e) {
      console.warn("fetchNotifications:", e.message);
    }
  }, []);

  const markAllRead = async () => {
    try {
      const token = getStoredToken();
      await axios.put("/api/lostfound/notifications/read", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const handleOwnerConfirmDecision = async (matchId, confirmation) => {
    try {
      const token = getStoredToken();
      await axios.put(`/api/lostfound/match/owner-confirm/${matchId}`, { confirmation }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(confirmation === "Confirmed" ? "Match confirmed! MoveSmart Admin alerted for handover." : "Match declined.", "success");
      setConfirmMatchModal(null);
      fetchMyMatches();
      fetchMyLostReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed.", "error");
    }
  };

  const handleOwnerSubmitReceivingProof = async (e) => {
    e.preventDefault();
    if (!proofReceivedPhoto || !proofReceiptDoc || !proofConfirmedCheck) {
      showToast("Please upload photo of the received item, receiving proof, and check the confirmation box.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getStoredToken();
      await axios.post(`/api/lostfound/handover/owner-proof/${proofModalHandover._id}`, {
        receivedItemPhoto: proofReceivedPhoto,
        receivingProof: proofReceiptDoc,
        ownerConfirmedReceived: true,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Receiving proof uploaded! Admin will verify and close the case.", "success");
      setProofModalHandover(null);
      setProofReceivedPhoto("");
      setProofReceiptDoc("");
      setProofConfirmedCheck(false);
      fetchMyLostReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to upload proof.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchPublicLost();
    fetchPublicFound();
    fetchMyLostReports();
    fetchMyFoundReports();
    fetchMyMatches();
    fetchNotifications();
  }, [fetchPublicLost, fetchPublicFound, fetchMyLostReports, fetchMyFoundReports, fetchMyMatches, fetchNotifications]);

  // Stepper helper for lost items
  const renderLostStepper = (status) => {
    const steps = [
      { key: "PENDING_ADMIN_VERIFICATION", label: "Report Submitted" },
      { key: "LOST", label: "Admin Verified" },
      { key: "MATCHED", label: "Match Found" },
      { key: "OWNER_CONFIRMED", label: "Owner Confirmed" },
      { key: "ITEM_IN_ADMIN_CUSTODY", label: "In Admin Custody" },
      { key: "READY_FOR_OWNER_COLLECTION", label: "Ready for Pickup" },
      { key: "RECEIVING_PROOF_SUBMITTED", label: "Proof Uploaded" },
      { key: "RETURNED", label: "Returned & Closed" },
    ];

    const statusWeights = {
      "PENDING_ADMIN_VERIFICATION": 1,
      "LOST": 2,
      "MATCHED": 3,
      "OWNER_CONFIRMED": 4,
      "ADMIN_APPROVED": 4,
      "HANDOVER_TO_ADMIN_PENDING": 4,
      "HANDED_TO_ADMIN": 5,
      "ITEM_IN_ADMIN_CUSTODY": 5,
      "READY_FOR_OWNER_COLLECTION": 6,
      "OWNER_COLLECTED": 6,
      "RECEIVING_PROOF_SUBMITTED": 7,
      "RETURNED": 8,
      "CLOSED": 8,
      "REJECTED": 0,
    };

    const currentWeight = statusWeights[status] || 1;

    if (status === "REJECTED") {
      return (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: "800" }}>
          ❌ Report Rejected by Admin Verification
        </div>
      );
    }

    return (
      <div style={{ margin: "14px 0 10px", padding: "12px 14px", background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
          Custody &amp; Return Progress:
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {steps.map((st, idx) => {
            const stepWeight = idx + 1;
            const isDone = currentWeight >= stepWeight;
            const isCurrent = currentWeight === stepWeight;

            return (
              <div key={st.key} style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "4px 10px",
                    borderRadius: "16px",
                    fontSize: "11px",
                    fontWeight: "800",
                    background: isDone ? (isCurrent ? "#6d28d9" : "#dcfce7") : "#f1f5f9",
                    color: isDone ? (isCurrent ? "#ffffff" : "#15803d") : "#94a3b8",
                  }}
                >
                  {isDone && !isCurrent ? <Check size={11} /> : <span>{idx + 1}.</span>}
                  <span>{st.label}</span>
                </div>
                {idx < steps.length - 1 && <span style={{ color: "#cbd5e1", fontSize: "12px" }}>&rarr;</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      <Header />

      {/* Floating Toast Notification */}
      {toast.show && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            zIndex: 99999,
            background: toast.type === "error" ? "#7f1d1d" : toast.type === "success" ? "#14532d" : "#1e1b4b",
            color: "#ffffff",
            padding: "14px 22px",
            borderRadius: "16px",
            boxShadow: "0 14px 35px rgba(0,0,0,0.25)",
            fontSize: "13.5px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            maxWidth: "460px",
          }}
        >
          {toast.type === "error" ? <AlertCircle size={18} color="#fca5a5" /> : <CheckCircle2 size={18} color="#86efac" />}
          <span>{toast.message}</span>
        </div>
      )}

      <main style={{ flex: 1, padding: "26px 16px 60px", maxWidth: "1240px", margin: "0 auto", width: "100%" }}>
        
        {/* Hero Section */}
        <section
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
            borderRadius: "24px",
            padding: "32px 30px",
            color: "#ffffff",
            marginBottom: "26px",
            boxShadow: "0 10px 30px rgba(30, 27, 75, 0.16)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.12)", padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "800", letterSpacing: "0.5px", marginBottom: "10px" }}>
                <ShieldCheck size={14} color="#86efac" />
                <span>ADMIN-VERIFIED &amp; PRIVACY-PROTECTED TRANSIT RECOVERY</span>
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "0 0 8px 0" }}>
                MoveSmart Lost &amp; Found Portal
              </h1>
              <p style={{ margin: 0, fontSize: "14px", color: "#e0e7ff", maxWidth: "660px", lineHeight: "1.5" }}>
                A secure chain-of-custody recovery system. All reports are verified by MoveSmart Admin, sensitive contact info is kept strictly private, and items are safely handed over through authorized station counters.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "12px 18px", borderRadius: "16px", backdropFilter: "blur(6px)" }}>
                <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>MY LOST ITEMS</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>{myLostReports.length}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "12px 18px", borderRadius: "16px", backdropFilter: "blur(6px)" }}>
                <div style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.7)", fontWeight: "700" }}>MY FOUND REPORTS</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#ffffff" }}>{myFoundReports.length}</div>
              </div>
            </div>
          </div>

          {/* Notifications Ribbon */}
          {notifications.length > 0 && (
            <div style={{ marginTop: "22px", background: "rgba(0,0,0,0.22)", borderRadius: "14px", padding: "12px 16px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: "800", color: "#fef08a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Bell size={13} /> Activity Updates &amp; Notifications ({notifications.length})
                </span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ background: "none", border: "none", color: "#e0e7ff", fontSize: "11px", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}>
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {notifications.slice(0, 2).map((n) => (
                  <div key={n._id} style={{ fontSize: "12px", color: "#f1f5f9", display: "flex", justifyContent: "space-between", gap: "8px" }}>
                    <span>• <strong>{n.title}</strong>: {n.message}</span>
                    <span style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Main Tab Navigation */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
          {[
            { id: "reportLost", label: "📋 Report Lost Item" },
            { id: "reportFound", label: "📦 Report Found Item" },
            { id: "publicLost", label: "🔍 Lost Items Directory" },
            { id: "publicFound", label: "📦 Found Items Directory" },
            { id: "myLost", label: `📁 My Lost Reports (${myLostReports.length})` },
            { id: "myFound", label: `📁 My Found Reports (${myFoundReports.length})` },
            { id: "myMatches", label: `🏷️ My Matches & Collections (${myMatches.length})` },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "11px 18px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  fontWeight: "800",
                  cursor: "pointer",
                  border: `2px solid ${isActive ? "#6d28d9" : "#e2e8f0"}`,
                  background: isActive ? "linear-gradient(135deg, #4c1d95, #6d28d9)" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  boxShadow: isActive ? "0 4px 14px rgba(109, 40, 217, 0.22)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: REPORT LOST ITEM                                                 */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "reportLost" && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            {lostSuccessId ? (
              <div style={{ textAlign: "center", padding: "40px 20px", maxWidth: "540px", margin: "0 auto" }}>
                <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle2 size={38} />
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#166534", margin: "0 0 6px 0" }}>
                  Lost Report Submitted to Admin!
                </h3>
                <p style={{ fontSize: "14px", color: "#4b7a55", marginBottom: "16px" }}>
                  Your official MoveSmart reference ID:
                </p>
                <div style={{ background: "#f0fdf4", border: "2px dashed #86efac", borderRadius: "12px", padding: "12px", fontSize: "20px", fontWeight: "900", color: "#15803d", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "20px" }}>
                  {lostSuccessId}
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px", lineHeight: "1.5" }}>
                  Initial Status: <strong>PENDING_ADMIN_VERIFICATION</strong>. Our team will verify the details and publish the lost report. You will receive an alert as soon as a potential match is found.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button onClick={() => setLostSuccessId("")} style={{ padding: "11px 20px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Report Another Item
                  </button>
                  <button onClick={() => { setLostSuccessId(""); setActiveTab("myLost"); }} style={{ padding: "11px 22px", borderRadius: "10px", background: "#6d28d9", color: "#ffffff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Track My Report &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportLostSubmit}>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "14px", marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: "0 0 4px 0" }}>
                    📋 Report a Lost Belonging
                  </h2>
                  <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
                    Please provide sufficient identifying information. Fields marked with <strong>*</strong> are mandatory.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                  
                  {/* Item Name */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Item Name / Title * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Black Leather Bi-fold Wallet, iPhone 13, College ID Card"
                      value={lostForm.itemName}
                      onChange={(e) => setLostForm({ ...lostForm, itemName: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Category * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <select
                      value={lostForm.category}
                      onChange={(e) => setLostForm({ ...lostForm, category: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none", background: "#fff" }}
                    >
                      {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Date Lost */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Date Lost * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={lostForm.lostDate}
                      onChange={(e) => setLostForm({ ...lostForm, lostDate: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Approx Time */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Approx. Time Lost <span style={{ color: "#94a3b8" }}>(Optional)</span>
                    </label>
                    <input
                      type="time"
                      value={lostForm.lostTime}
                      onChange={(e) => setLostForm({ ...lostForm, lostTime: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Location Lost */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Location Where It Was Lost * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inside bus rear seat, Vyttila Hub Concourse"
                      value={lostForm.location}
                      onChange={(e) => setLostForm({ ...lostForm, location: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Bus Number */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Bus Number <span style={{ color: "#94a3b8" }}>(Optional, if known)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. KL-07-MS-1008"
                      value={lostForm.busNumber}
                      onChange={(e) => setLostForm({ ...lostForm, busNumber: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Route */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Route / Service <span style={{ color: "#94a3b8" }}>(Optional, if known)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kanjirappally → Erattupetta"
                      value={lostForm.route}
                      onChange={(e) => setLostForm({ ...lostForm, route: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Private Phone Number */}
                  <div style={{ gridColumn: "1/-1", background: "#f0fdf4", border: "1.5px solid #86efac", padding: "16px", borderRadius: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <Lock size={16} color="#15803d" />
                      <label style={{ fontSize: "12px", fontWeight: "900", color: "#166534", textTransform: "uppercase" }}>
                        Owner Contact Phone Number * <span style={{ color: "#dc2626" }}>(Strictly Private for Admin Only)</span>
                      </label>
                    </div>
                    <p style={{ fontSize: "12px", color: "#15803d", margin: "0 0 10px 0" }}>
                      🔒 This number will <strong>NEVER</strong> be shown publicly, to drivers, or to the finder. It is strictly used by MoveSmart Admin to contact you for claim verification.
                    </p>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={lostForm.ownerPhone}
                      onChange={(e) => setLostForm({ ...lostForm, ownerPhone: e.target.value })}
                      style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1.5px solid #86efac", padding: "0 14px", fontSize: "14px", outline: "none", background: "#fff" }}
                    />
                  </div>

                  {/* Detailed Description */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Detailed Description * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe color, size, brand, material, and any general visual details..."
                      value={lostForm.description}
                      onChange={(e) => setLostForm({ ...lostForm, description: e.target.value })}
                      style={{ width: "100%", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "12px", fontSize: "14px", outline: "none", resize: "vertical" }}
                    />
                  </div>

                  {/* Brand & Color (Optional) */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Brand <span style={{ color: "#94a3b8" }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Wildcraft, Titan, Apple"
                      value={lostForm.brand}
                      onChange={(e) => setLostForm({ ...lostForm, brand: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Color <span style={{ color: "#94a3b8" }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Navy Blue with red strap"
                      value={lostForm.color}
                      onChange={(e) => setLostForm({ ...lostForm, color: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Serial Number & Private Identifying details */}
                  <div style={{ gridColumn: "1/-1", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1.5px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <Lock size={15} color="#6d28d9" />
                      <label style={{ fontSize: "12px", fontWeight: "800", color: "#1e293b", textTransform: "uppercase" }}>
                        Private Identifying Characteristics <span style={{ color: "#6d28d9" }}>(Kept hidden from public to prevent fake claims)</span>
                      </label>
                    </div>
                    <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
                      These details (e.g. inner scratches, specific card names, lockscreen wallpaper, serial number) will only be visible to Admin to verify your rightful ownership.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>Serial Number / IMEI (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. SN-8829-1029"
                          value={lostForm.serialNumber}
                          onChange={(e) => setLostForm({ ...lostForm, serialNumber: e.target.value })}
                          style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1.5px solid #cbd5e1", padding: "0 12px", fontSize: "13px", outline: "none", background: "#fff" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "11px", fontWeight: "700", color: "#475569", display: "block", marginBottom: "4px" }}>Unique Distinguishing Marks (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. Small tear on left pocket, initials 'DP' etched"
                          value={lostForm.identifyingDetails}
                          onChange={(e) => setLostForm({ ...lostForm, identifyingDetails: e.target.value })}
                          style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1.5px solid #cbd5e1", padding: "0 12px", fontSize: "13px", outline: "none", background: "#fff" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo (NOT MANDATORY) */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Photo of the Lost Item <span style={{ color: "#16a34a", fontWeight: "900" }}>(Optional – Not Mandatory)</span>
                    </label>
                    <div style={{ border: "2px dashed #cbd5e1", borderRadius: "14px", padding: "16px", background: "#f8fafc", textAlign: "center" }}>
                      {isProcessingLostPhoto ? (
                        <div style={{ color: "#4c1d95", fontWeight: "800", fontSize: "13px", padding: "10px" }}>
                          ⏳ Optimizing &amp; attaching photo...
                        </div>
                      ) : lostPhoto ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "12px", padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img src={lostPhoto} alt="Lost Preview" style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "1px solid #86efac" }} />
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: "13px", fontWeight: "800", color: "#166534" }}>✓ Photo Attached Successfully</div>
                              <div style={{ fontSize: "11px", color: "#475569" }}>{lostPhotoName || "lost_item_photo.jpg"}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setLostPhoto(""); setLostPhotoName(""); }}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            id="lost-photo-input"
                            onChange={handleLostPhotoUpload}
                            style={{ display: "none" }}
                          />
                          <label
                            htmlFor="lost-photo-input"
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "#4c1d95", color: "#fff", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                          >
                            📷 Select Photo from Device
                          </label>
                          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px" }}>
                            Supports JPG, PNG, WEBP from camera or gallery (Auto-compressed)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div style={{ marginTop: "28px" }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: "14px 32px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #312e81, #4c1d95)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "900",
                      fontSize: "15px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: "0 6px 20px rgba(49, 46, 129, 0.25)",
                    }}
                  >
                    {isSubmitting ? "Submitting to Admin..." : "Submit Lost Item Report →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: REPORT FOUND ITEM                                                */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "reportFound" && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            {foundSuccessId ? (
              <div style={{ textAlign: "center", padding: "40px 20px", maxWidth: "540px", margin: "0 auto" }}>
                <div style={{ width: "68px", height: "68px", borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Package size={38} />
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#1e40af", margin: "0 0 6px 0" }}>
                  Found Item Registered with Admin!
                </h3>
                <p style={{ fontSize: "14px", color: "#3b5998", marginBottom: "16px" }}>
                  Your registered found-item ID:
                </p>
                <div style={{ background: "#eff6ff", border: "2px dashed #93c5fd", borderRadius: "12px", padding: "12px", fontSize: "20px", fontWeight: "900", color: "#1d4ed8", fontFamily: "monospace", letterSpacing: "1px", marginBottom: "20px" }}>
                  {foundSuccessId}
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "24px", lineHeight: "1.5" }}>
                  MoveSmart Admin will verify this report and attempt to match it with verified owner lost reports. Once matched, you will be requested to hand over the item to authorized staff.
                </p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button onClick={() => setFoundSuccessId("")} style={{ padding: "11px 20px", borderRadius: "10px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Report Another Found Item
                  </button>
                  <button onClick={() => { setFoundSuccessId(""); setActiveTab("myFound"); }} style={{ padding: "11px 22px", borderRadius: "10px", background: "#1d4ed8", color: "#ffffff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Track My Found Items &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportFoundSubmit}>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "14px", marginBottom: "24px" }}>
                  <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: "0 0 4px 0" }}>
                    📦 Report an Item Found on Transit
                  </h2>
                  <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
                    Anyone (passenger, driver, or staff) can register an item found on transit.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px" }}>
                  
                  {/* Item Name */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Found Item Name * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Black Wallet with cards, Blue Fastrack Bag, Samsung Phone"
                      value={foundForm.itemName}
                      onChange={(e) => setFoundForm({ ...foundForm, itemName: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Category * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <select
                      value={foundForm.category}
                      onChange={(e) => setFoundForm({ ...foundForm, category: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none", background: "#fff" }}
                    >
                      {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Date Found */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Date Found * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={foundForm.foundDate}
                      onChange={(e) => setFoundForm({ ...foundForm, foundDate: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Approx Time */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Approx. Time Found <span style={{ color: "#94a3b8" }}>(Optional)</span>
                    </label>
                    <input
                      type="time"
                      value={foundForm.foundTime}
                      onChange={(e) => setFoundForm({ ...foundForm, foundTime: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Bus Number */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Bus Number * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KL-05-1234"
                      value={foundForm.busNumber}
                      onChange={(e) => setFoundForm({ ...foundForm, busNumber: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Route */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Route * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kanjirappally → Erattupetta"
                      value={foundForm.route}
                      onChange={(e) => setFoundForm({ ...foundForm, route: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Location Found */}
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Location Where Found * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Under seat row 4, near driver cabin"
                      value={foundForm.location}
                      onChange={(e) => setFoundForm({ ...foundForm, location: e.target.value })}
                      style={{ width: "100%", height: "46px", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "0 14px", fontSize: "14px", outline: "none" }}
                    />
                  </div>

                  {/* Private Finder Phone */}
                  <div style={{ gridColumn: "1/-1", background: "#eff6ff", border: "1.5px solid #93c5fd", padding: "16px", borderRadius: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <Lock size={16} color="#1d4ed8" />
                      <label style={{ fontSize: "12px", fontWeight: "900", color: "#1e40af", textTransform: "uppercase" }}>
                        Finder Contact Phone * <span style={{ color: "#dc2626" }}>(Strictly Private for Admin Only)</span>
                      </label>
                    </div>
                    <p style={{ fontSize: "12px", color: "#1e40af", margin: "0 0 10px 0" }}>
                      🔒 This number is never exposed to other commuters or the owner. MoveSmart Admin will contact you to coordinate safe handover.
                    </p>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98765 43211"
                      value={foundForm.finderPhone}
                      onChange={(e) => setFoundForm({ ...foundForm, finderPhone: e.target.value })}
                      style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1.5px solid #93c5fd", padding: "0 14px", fontSize: "14px", outline: "none", background: "#fff" }}
                    />
                  </div>

                  {/* Detailed Description */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Detailed Description * <span style={{ color: "#dc2626" }}>(Mandatory)</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Describe the visible physical condition, color, material..."
                      value={foundForm.description}
                      onChange={(e) => setFoundForm({ ...foundForm, description: e.target.value })}
                      style={{ width: "100%", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "12px", fontSize: "14px", outline: "none", resize: "vertical" }}
                    />
                  </div>

                  {/* Private Details on Where/How Found */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Private Found Details <span style={{ color: "#94a3b8" }}>(Optional – visible to Admin for verification)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Wrapped in a plastic pouch with specific tickets inside..."
                      value={foundForm.foundDetails}
                      onChange={(e) => setFoundForm({ ...foundForm, foundDetails: e.target.value })}
                      style={{ width: "100%", borderRadius: "12px", border: "1.5px solid #cbd5e1", padding: "12px", fontSize: "14px", outline: "none", resize: "vertical" }}
                    />
                  </div>

                  {/* Photo (OPTIONAL BUT ENCOURAGED) */}
                  <div style={{ gridColumn: "1/-1" }}>
                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Photo of Found Item <span style={{ color: "#1d4ed8", fontWeight: "900" }}>(Optional, Strongly Recommended)</span>
                    </label>
                    <div style={{ border: "2px dashed #cbd5e1", borderRadius: "14px", padding: "16px", background: "#f8fafc", textAlign: "center" }}>
                      {isProcessingFoundPhoto ? (
                        <div style={{ color: "#1d4ed8", fontWeight: "800", fontSize: "13px", padding: "10px" }}>
                          ⏳ Optimizing &amp; attaching photo...
                        </div>
                      ) : foundPhoto ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: "12px", padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img src={foundPhoto} alt="Found Preview" style={{ width: "64px", height: "64px", borderRadius: "8px", objectFit: "cover", border: "1px solid #93c5fd" }} />
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: "13px", fontWeight: "800", color: "#1e40af" }}>✓ Photo Attached Successfully</div>
                              <div style={{ fontSize: "11px", color: "#475569" }}>{foundPhotoName || "found_item_photo.jpg"}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setFoundPhoto(""); setFoundPhotoName(""); }}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            id="found-photo-input"
                            onChange={handleFoundPhotoUpload}
                            style={{ display: "none" }}
                          />
                          <label
                            htmlFor="found-photo-input"
                            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "10px", background: "#1d4ed8", color: "#fff", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                          >
                            📷 Select Photo from Device
                          </label>
                          <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px" }}>
                            Supports JPG, PNG, WEBP from camera or gallery (Auto-compressed)
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div style={{ marginTop: "28px" }}>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: "14px 32px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #1e40af, #2563eb)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "900",
                      fontSize: "15px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: "0 6px 20px rgba(30, 64, 175, 0.25)",
                    }}
                  >
                    {isSubmitting ? "Registering Found Item..." : "Submit Found Item Report →"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PUBLIC LOST ITEMS DIRECTORY (SAFE VIEW)                          */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "publicLost" && (
          <div>
            {/* Search & Filter Bar */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "18px 24px", marginBottom: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Search Lost Items
                </label>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "14px" }} />
                  <input
                    type="text"
                    placeholder="Search by name, bus number, route..."
                    value={publicLostSearch}
                    onChange={(e) => setPublicLostSearch(e.target.value)}
                    style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 14px 0 40px", fontSize: "13.5px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ minWidth: "180px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Category
                </label>
                <select
                  value={publicLostCat}
                  onChange={(e) => setPublicLostCat(e.target.value)}
                  style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 14px", fontSize: "13.5px", outline: "none", background: "#ffffff" }}
                >
                  <option value="All">All Categories</option>
                  {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchPublicLost}
                style={{ height: "44px", padding: "0 22px", borderRadius: "12px", background: "linear-gradient(135deg, #4c1d95, #6d28d9)", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "13.5px", cursor: "pointer" }}
              >
                Filter 🔍
              </button>
            </div>

            {publicLostItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
                <Package size={48} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#334155", margin: 0 }}>No Verified Lost Items Found</h3>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {publicLostItems.map((item) => (
                  <div key={item._id} style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}>
                    <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ffffff" }}>
                      <span style={{ fontSize: "12px", fontWeight: "900", fontFamily: "monospace" }}>{item.reportId}</span>
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: "12px" }}>{item.category}</span>
                    </div>

                    {item.photo && (
                      <div style={{ height: "140px", width: "100%", background: "#f1f5f9", overflow: "hidden" }}>
                        <img src={item.photo} alt={item.itemName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}

                    <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b", margin: "0 0 8px 0" }}>{item.itemName}</h4>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0", flex: 1, lineHeight: "1.4" }}>{item.description}</p>

                      <div style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", padding: "12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div><strong>Lost on:</strong> {item.lostDate}</div>
                        {item.busNumber && <div><strong>Bus:</strong> {item.busNumber}</div>}
                        {item.route && <div><strong>Route:</strong> {item.route}</div>}
                        <div><strong>Location:</strong> {item.location}</div>
                      </div>

                      <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: "900", padding: "4px 10px", borderRadius: "12px", background: item.status === "LOST" ? "#fee2e2" : "#fef3c7", color: item.status === "LOST" ? "#dc2626" : "#b45309" }}>
                          Status: {item.status}
                        </span>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>🔒 Contact Hidden</span>
                      </div>

                      {/* 1-CLICK: REPORT DIRECTLY AS FOUND WITH PHOTO */}
                      <button
                        type="button"
                        onClick={() => {
                          setDirectFoundModalLostItem(item);
                          setDirectFoundPhone(user?.phone || "");
                          setDirectFoundPhoto("");
                          setDirectFoundDetails("");
                        }}
                        style={{
                          marginTop: "12px",
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #15803d, #16a34a)",
                          color: "#ffffff",
                          border: "none",
                          fontWeight: "800",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(22, 163, 74, 0.2)",
                          transition: "transform 0.15s ease",
                        }}
                      >
                        <Package size={15} />
                        <span>📦 I Found This Item! (Upload Photo)</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: PUBLIC FOUND ITEMS DIRECTORY (WITH MATCH REQUEST)                */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "publicFound" && (
          <div>
            {/* Search & Filter Bar */}
            <div style={{ background: "#ffffff", borderRadius: "20px", padding: "18px 24px", marginBottom: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0", display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Search Found Items
                </label>
                <div style={{ position: "relative" }}>
                  <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "14px", top: "14px" }} />
                  <input
                    type="text"
                    placeholder="Search by item name, bus (KL-05...), location..."
                    value={publicFoundSearch}
                    onChange={(e) => setPublicFoundSearch(e.target.value)}
                    style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 14px 0 40px", fontSize: "13.5px", outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ minWidth: "180px" }}>
                <label style={{ fontSize: "11.5px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Category
                </label>
                <select
                  value={publicFoundCat}
                  onChange={(e) => setPublicFoundCat(e.target.value)}
                  style={{ width: "100%", height: "44px", borderRadius: "12px", border: "1.5px solid #e2e8f0", padding: "0 14px", fontSize: "13.5px", outline: "none", background: "#ffffff" }}
                >
                  <option value="All">All Categories</option>
                  {LF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchPublicFound}
                style={{ height: "44px", padding: "0 22px", borderRadius: "12px", background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "13.5px", cursor: "pointer" }}
              >
                Filter 🔍
              </button>
            </div>

            {publicFoundItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", background: "#ffffff", borderRadius: "20px", border: "1px dashed #cbd5e1" }}>
                <Package size={48} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: "#334155", margin: 0 }}>No Verified Found Items</h3>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "20px" }}>
                {publicFoundItems.map((item) => (
                  <div key={item._id} style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", display: "flex", flexDirection: "column" }}>
                    <div style={{ background: "linear-gradient(135deg, #1e3a8a, #2563eb)", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ffffff" }}>
                      <span style={{ fontSize: "12px", fontWeight: "900", fontFamily: "monospace" }}>{item.reportId}</span>
                      <span style={{ fontSize: "11px", fontWeight: "800", background: "rgba(255,255,255,0.18)", padding: "3px 10px", borderRadius: "12px" }}>{item.category}</span>
                    </div>

                    {item.photo && (
                      <div style={{ height: "140px", width: "100%", background: "#f1f5f9", overflow: "hidden" }}>
                        <img src={item.photo} alt={item.itemName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}

                    <div style={{ padding: "18px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b", margin: "0 0 8px 0" }}>{item.itemName}</h4>
                      <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 14px 0", flex: 1, lineHeight: "1.4" }}>{item.description}</p>

                      <div style={{ fontSize: "12px", color: "#475569", background: "#f8fafc", padding: "12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "5px", marginBottom: "14px" }}>
                        <div><strong>Found Date:</strong> {item.dateFound || item.foundDate}</div>
                        <div><strong>Bus:</strong> {item.busNumber}</div>
                        <div><strong>Route:</strong> {item.route}</div>
                        <div><strong>Location:</strong> {item.location}</div>
                      </div>

                      {/* Action Button: I Think This Found Item Is Mine */}
                      <button
                        type="button"
                        onClick={() => setMatchRequestModalFoundItem(item)}
                        style={{
                          width: "100%",
                          padding: "11px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #4c1d95, #6d28d9)",
                          color: "#ffffff",
                          border: "none",
                          fontWeight: "800",
                          fontSize: "13px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(109, 40, 217, 0.2)",
                        }}
                      >
                        <span>🙋 I Think This Found Item Is Mine</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: MY LOST REPORTS (STEPPER PROGRESS TRACKING)                       */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "myLost" && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: "0 0 16px 0" }}>
              📁 My Lost Reports &amp; Live Tracking
            </h2>

            {myLostReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📋</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#475569" }}>You have not reported any lost items.</div>
                <button onClick={() => setActiveTab("reportLost")} style={{ marginTop: "14px", padding: "10px 20px", borderRadius: "10px", background: "#6d28d9", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                  Report a Lost Item Now
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {myLostReports.map((item) => {
                  const handover = item.matchedHandoverId;
                  const isReadyForPickup = item.status === "READY_FOR_OWNER_COLLECTION" || handover?.status === "Ready_For_Collection";
                  const isInCustody = item.status === "ITEM_IN_ADMIN_CUSTODY" || handover?.status === "In_Admin_Custody";

                  return (
                    <div key={item._id} style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "18px", padding: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: "900", color: "#6d28d9", fontSize: "14px" }}>{item.reportId}</span>
                            <span style={{ background: "#e0e7ff", color: "#4338ca", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "8px" }}>{item.category}</span>
                          </div>
                          <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#1e293b", margin: "0 0 4px 0" }}>{item.itemName}</h3>
                          <div style={{ fontSize: "12.5px", color: "#64748b" }}>Lost on {item.lostDate} &bull; {item.location} {item.busNumber ? `&bull; Bus ${item.busNumber}` : ""}</div>
                        </div>

                        <span style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", background: item.status === "RETURNED" ? "#dcfce7" : item.status === "READY_FOR_OWNER_COLLECTION" ? "#dbeafe" : "#fef3c7", color: item.status === "RETURNED" ? "#15803d" : item.status === "READY_FOR_OWNER_COLLECTION" ? "#1d4ed8" : "#b45309" }}>
                          Status: {item.status}
                        </span>
                      </div>

                      {/* Visual Stepper Progress Bar */}
                      {renderLostStepper(item.status)}

                      {/* Ready For Pickup CTA & Proof Upload Button */}
                      {(isReadyForPickup || isInCustody) && handover && (
                        <div style={{ background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: "14px", padding: "16px", marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#1e40af" }}>
                              🏢 Item In Admin Custody – Ready for Collection
                            </div>
                            <div style={{ fontSize: "12px", color: "#3b5998" }}>
                              Please visit the MoveSmart Station Counter with your Photo ID. After collecting, upload your receiving proof below.
                            </div>
                          </div>

                          <button
                            onClick={() => setProofModalHandover(handover)}
                            style={{ padding: "10px 20px", borderRadius: "10px", background: "linear-gradient(135deg, #15803d, #16a34a)", color: "#fff", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                          >
                            📷 Confirm Item Received &amp; Upload Proof &rarr;
                          </button>
                        </div>
                      )}

                      {item.status === "RECEIVING_PROOF_SUBMITTED" && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "12px 16px", marginTop: "12px", fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
                          ✓ Receiving proof uploaded. MoveSmart Admin is completing final verification to close the case.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 6: MY FOUND REPORTS (FINDER PROGRESS TRACKING)                       */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "myFound" && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: "0 0 16px 0" }}>
              📦 My Found Item Reports &amp; Handover Status
            </h2>

            {myFoundReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>📦</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#475569" }}>You haven't reported any found items.</div>
                <button onClick={() => setActiveTab("reportFound")} style={{ marginTop: "14px", padding: "10px 20px", borderRadius: "10px", background: "#1d4ed8", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                  Report a Found Item
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {myFoundReports.map((item) => {
                  const isAwaitingHandover = item.status === "HANDOVER_TO_ADMIN_PENDING";
                  return (
                    <div key={item._id} style={{ background: "#ffffff", border: "1.5px solid #e2e8f0", borderRadius: "18px", padding: "22px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <span style={{ fontFamily: "monospace", fontWeight: "900", color: "#1d4ed8", fontSize: "14px" }}>{item.reportId}</span>
                            <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "11px", fontWeight: "800", padding: "2px 8px", borderRadius: "8px" }}>{item.category}</span>
                          </div>
                          <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#1e293b", margin: "0 0 4px 0" }}>{item.itemName}</h3>
                          <div style={{ fontSize: "12.5px", color: "#64748b" }}>Found on {item.foundDate} &bull; Bus {item.busNumber} &bull; Route: {item.route}</div>
                        </div>

                        <span style={{ padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "900", background: item.status === "RETURNED" ? "#dcfce7" : isAwaitingHandover ? "#fef3c7" : "#f1f5f9", color: item.status === "RETURNED" ? "#15803d" : isAwaitingHandover ? "#b45309" : "#475569" }}>
                          Status: {item.status}
                        </span>
                      </div>

                      {/* Finder Handover Banner */}
                      {isAwaitingHandover && (
                        <div style={{ background: "#fef3c7", border: "1.5px solid #fde68a", borderRadius: "14px", padding: "16px", marginTop: "14px" }}>
                          <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#92400e", marginBottom: "4px" }}>
                            📢 Action Required: Hand Item to MoveSmart Admin
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#78350f" }}>
                            This found item has been successfully matched with a verified owner! Please hand the physical item over to the MoveSmart Station Master / Collection Counter so we can securely complete the return.
                          </div>
                        </div>
                      )}

                      {item.status === "HANDED_TO_ADMIN" && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "12px", padding: "12px 16px", marginTop: "14px", fontSize: "12.5px", color: "#166534", fontWeight: "700" }}>
                          ✓ Item safely received into MoveSmart Admin custody. The owner has been invited for collection.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* TAB 7: MY MATCHES & COLLECTIONS                                         */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {activeTab === "myMatches" && (
          <div style={{ background: "#ffffff", borderRadius: "24px", padding: "32px", boxShadow: "0 4px 20px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: "0 0 16px 0" }}>
              🏷️ My Item Matches &amp; Verification Requests
            </h2>

            {myMatches.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: "40px", marginBottom: "10px" }}>🏷️</div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#475569" }}>No active matches found.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {myMatches.map((m) => {
                  const isPendingOwnerConfirm = m.isOwner && m.ownerConfirmation === "Pending";

                  return (
                    <div key={m._id} style={{ background: isPendingOwnerConfirm ? "#faf5ff" : "#f8fafc", border: `1.5px solid ${isPendingOwnerConfirm ? "#c084fc" : "#e2e8f0"}`, borderRadius: "18px", padding: "22px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: "900", color: "#6d28d9", fontSize: "13.5px" }}>{m.matchId}</div>
                          <h4 style={{ fontSize: "16px", fontWeight: "900", color: "#1e293b", margin: "2px 0 0 0" }}>
                            Lost: {m.lostItem?.itemName || "Item"} &harr; Found: {m.foundItem?.itemName || "Item"}
                          </h4>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "800", background: m.ownerConfirmation === "Confirmed" ? "#dcfce7" : "#fef3c7", color: m.ownerConfirmation === "Confirmed" ? "#15803d" : "#b45309" }}>
                            Owner: {m.ownerConfirmation}
                          </span>
                          <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "11.5px", fontWeight: "800", background: m.adminStatus === "Approved" ? "#dbeafe" : "#f1f5f9", color: m.adminStatus === "Approved" ? "#1d4ed8" : "#475569" }}>
                            Admin: {m.adminStatus}
                          </span>
                        </div>
                      </div>

                      <div style={{ background: "#ffffff", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12.5px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                        <div><strong>Bus Number:</strong> {m.foundItem?.busNumber || m.lostItem?.busNumber || "N/A"}</div>
                        <div><strong>Route:</strong> {m.foundItem?.route || m.lostItem?.route || "N/A"}</div>
                        <div><strong>Found Date:</strong> {m.foundItem?.foundDate || "N/A"}</div>
                        <div><strong>Finder Contact:</strong> <span style={{ color: "#94a3b8", fontStyle: "italic" }}>🔒 Hidden for Privacy</span></div>
                      </div>

                      {/* Owner Decision Actions */}
                      {isPendingOwnerConfirm && (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                          <button
                            onClick={() => handleOwnerConfirmDecision(m._id, "Confirmed")}
                            style={{ padding: "10px 22px", borderRadius: "10px", background: "#16a34a", color: "#fff", border: "none", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                          >
                            ✓ This Is My Item
                          </button>
                          <button
                            onClick={() => handleOwnerConfirmDecision(m._id, "Declined")}
                            style={{ padding: "10px 22px", borderRadius: "10px", background: "#f1f5f9", color: "#dc2626", border: "1px solid #fca5a5", fontWeight: "800", fontSize: "13px", cursor: "pointer" }}
                          >
                            ✕ This Is Not My Item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* MODAL: "I THINK THIS FOUND ITEM IS MINE"                                */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {matchRequestModalFoundItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "24px", padding: "30px", maxWidth: "520px", width: "100%", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: 0 }}>
                  🙋 Request Match for Found Item
                </h3>
                <button onClick={() => setMatchRequestModalFoundItem(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer" }}>
                  <X size={16} color="#64748b" />
                </button>
              </div>

              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12.5px", marginBottom: "18px" }}>
                <div><strong>Found Item:</strong> {matchRequestModalFoundItem.itemName} ({matchRequestModalFoundItem.reportId})</div>
                <div><strong>Bus:</strong> {matchRequestModalFoundItem.busNumber} &bull; <strong>Found Date:</strong> {matchRequestModalFoundItem.foundDate}</div>
              </div>

              <form onSubmit={handleOwnerMatchRequestSubmit}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Select Your Matching Lost Report *
                  </label>
                  <select
                    required
                    value={matchRequestLostItemId}
                    onChange={(e) => setMatchRequestLostItemId(e.target.value)}
                    style={{ width: "100%", height: "44px", borderRadius: "10px", border: "1.5px solid #cbd5e1", padding: "0 12px", fontSize: "13.5px", outline: "none", background: "#fff" }}
                  >
                    <option value="">-- Choose from your reported lost items --</option>
                    {myLostReports.map((lr) => (
                      <option key={lr._id} value={lr._id}>
                        {lr.reportId} — {lr.itemName} ({lr.category}, Lost: {lr.lostDate})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Why do you believe this item is yours? (Identifying Details / Proof) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe specific contents, colors, serial number, or identifying features that prove this item is yours for Admin to verify..."
                    value={matchRequestExplanation}
                    onChange={(e) => setMatchRequestExplanation(e.target.value)}
                    style={{ width: "100%", borderRadius: "10px", border: "1.5px solid #cbd5e1", padding: "10px 12px", fontSize: "13.5px", outline: "none", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setMatchRequestModalFoundItem(null)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #4c1d95, #6d28d9)", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    {isSubmitting ? "Submitting..." : "Submit Match Request to Admin →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* MODAL: OWNER PROOF OF RECEIVING / COLLECTION                            */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {proofModalHandover && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "24px", padding: "30px", maxWidth: "520px", width: "100%", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "900", color: "#1e293b", margin: 0 }}>
                  Confirm Item Received &amp; Upload Proof
                </h3>
                <button onClick={() => setProofModalHandover(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer" }}>
                  <X size={16} color="#64748b" />
                </button>
              </div>

              <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "12px", border: "1px solid #86efac", fontSize: "12.5px", color: "#166534", marginBottom: "18px" }}>
                Please provide proof that you have collected the item directly from MoveSmart Admin to close the case.
              </div>

              <form onSubmit={handleOwnerSubmitReceivingProof}>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    1. Photo of Received Item *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setProofReceivedPhoto(compressed);
                        } catch (err) {
                          showToast("Failed to process photo.", "error");
                        }
                      }
                    }}
                    style={{ fontSize: "12px" }}
                  />
                  {proofReceivedPhoto && <img src={proofReceivedPhoto} alt="Proof" style={{ maxHeight: "70px", borderRadius: "8px", marginTop: "6px", border: "1px solid #16a34a" }} />}
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    2. Receiving Proof / Receipt / Staff Slip *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const compressed = await compressImage(file);
                          setProofReceiptDoc(compressed);
                        } catch (err) {
                          showToast("Failed to process receipt.", "error");
                        }
                      }
                    }}
                    style={{ fontSize: "12px" }}
                  />
                  {proofReceiptDoc && <img src={proofReceiptDoc} alt="Receipt" style={{ maxHeight: "70px", borderRadius: "8px", marginTop: "6px", border: "1px solid #2563eb" }} />}
                </div>

                <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "800", color: "#1e293b", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={proofConfirmedCheck}
                      onChange={(e) => setProofConfirmedCheck(e.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "#16a34a" }}
                    />
                    <span>☑ I confirm that I have received my lost item from MoveSmart Admin.</span>
                  </label>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={() => setProofModalHandover(null)} style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "12px", borderRadius: "12px", background: "linear-gradient(135deg, #15803d, #16a34a)", color: "#fff", border: "none", fontWeight: "800", cursor: "pointer" }}>
                    {isSubmitting ? "Uploading..." : "Submit Proof & Close →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════════ */}
        {/* MODAL: DIRECT "I FOUND THIS ITEM" FROM LOST DIRECTORY                   */}
        {/* ════════════════════════════════════════════════════════════════════════ */}
        {directFoundModalLostItem && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
            <div style={{ background: "#ffffff", borderRadius: "24px", padding: "28px 30px", maxWidth: "560px", width: "100%", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", maxHeight: "90vh", overflowY: "auto" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: "900", color: "#1e293b", margin: 0 }}>
                      Report Finding This Item
                    </h3>
                    <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                      Details auto-fetched from Lost Report {directFoundModalLostItem.reportId}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDirectFoundModalLostItem(null)}
                  style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* Auto-Fetched Summary Banner */}
              <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "14px", padding: "14px 16px", marginBottom: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "14.5px", fontWeight: "900", color: "#14532d", margin: "0 0 4px 0" }}>
                      {directFoundModalLostItem.itemName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5" }}>
                      <div><strong>Category:</strong> {directFoundModalLostItem.category} &bull; <strong>Bus:</strong> {directFoundModalLostItem.busNumber || "N/A"}</div>
                      <div><strong>Route:</strong> {directFoundModalLostItem.route || "N/A"} &bull; <strong>Location:</strong> {directFoundModalLostItem.location}</div>
                    </div>
                  </div>
                  {directFoundModalLostItem.photo && (
                    <img
                      src={directFoundModalLostItem.photo}
                      alt="Lost reference"
                      style={{ width: "52px", height: "52px", borderRadius: "8px", objectFit: "cover", border: "1px solid #86efac" }}
                      title="Lost Item Reference"
                    />
                  )}
                </div>
              </div>

              <form onSubmit={handleDirectFoundSubmit}>
                {/* 1. Finder Photo Upload (REQUIRED SO ADMIN CAN CHECK MATCH) */}
                <div style={{ marginBottom: "16px", background: "#f8fafc", padding: "16px", borderRadius: "14px", border: "1.5px dashed #cbd5e1", textAlign: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: "900", color: "#1e293b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    📷 Upload Photo of the Item You Found * <span style={{ color: "#dc2626" }}>(Required for Admin Verification)</span>
                  </label>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 12px 0" }}>
                    Admin will visually compare your photo with the owner's description and photo to verify the match before scheduling handover.
                  </p>

                  {isProcessingDirectPhoto ? (
                    <div style={{ color: "#15803d", fontWeight: "800", fontSize: "13.5px", padding: "14px" }}>
                      ⏳ Optimizing &amp; attaching photo...
                    </div>
                  ) : directFoundPhoto ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "2px solid #16a34a", borderRadius: "12px", padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <img src={directFoundPhoto} alt="Found Item" style={{ width: "70px", height: "70px", borderRadius: "10px", objectFit: "cover", border: "1.5px solid #16a34a" }} />
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontSize: "13.5px", fontWeight: "900", color: "#166534" }}>✓ Photo Attached &amp; Verified</div>
                          <div style={{ fontSize: "11.5px", color: "#475569" }}>{directFoundPhotoName || "found_photo.jpg"}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setDirectFoundPhoto(""); setDirectFoundPhotoName(""); }}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "6px 12px", borderRadius: "8px", fontWeight: "800", fontSize: "12px", cursor: "pointer" }}
                      >
                        ✕ Remove / Change
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        id="direct-found-photo-input"
                        required
                        onChange={handleDirectFoundPhotoUpload}
                        style={{ display: "none" }}
                      />
                      <label
                        htmlFor="direct-found-photo-input"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "12px 24px",
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #15803d, #16a34a)",
                          color: "#fff",
                          fontWeight: "900",
                          fontSize: "13.5px",
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(22, 163, 74, 0.25)",
                        }}
                      >
                        📷 Select / Take Photo from Device
                      </label>
                      <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "8px" }}>
                        Takes photos from phone camera or gallery (JPG, PNG, WEBP auto-optimized)
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Finder Private Phone */}
                <div style={{ marginBottom: "14px", background: "#eff6ff", border: "1.5px solid #93c5fd", padding: "14px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                    <Lock size={15} color="#1d4ed8" />
                    <label style={{ fontSize: "12px", fontWeight: "900", color: "#1e40af", textTransform: "uppercase" }}>
                      Your Contact Phone * <span style={{ color: "#dc2626" }}>(Strictly Private for Admin)</span>
                    </label>
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={directFoundPhone}
                    onChange={(e) => setDirectFoundPhone(e.target.value)}
                    style={{ width: "100%", height: "42px", borderRadius: "8px", border: "1.5px solid #93c5fd", padding: "0 12px", fontSize: "13.5px", outline: "none", background: "#fff" }}
                  />
                </div>

                {/* 3. Additional Finder Notes */}
                <div style={{ marginBottom: "18px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                    Where &amp; How Did You Find It? (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Found on seat 4 near window, handed to driver or kept safely"
                    value={directFoundDetails}
                    onChange={(e) => setDirectFoundDetails(e.target.value)}
                    style={{ width: "100%", height: "42px", borderRadius: "10px", border: "1.5px solid #cbd5e1", padding: "0 12px", fontSize: "13px", outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setDirectFoundModalLostItem(null)}
                    style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "#f1f5f9", color: "#475569", border: "none", fontWeight: "800", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      flex: 2,
                      padding: "12px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #15803d, #16a34a)",
                      color: "#fff",
                      border: "none",
                      fontWeight: "900",
                      fontSize: "14px",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)",
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Send Photo & Match to Admin →"}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
