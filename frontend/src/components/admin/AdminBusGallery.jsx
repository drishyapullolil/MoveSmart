import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Camera,
  Film,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  Edit2,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  Bus,
  RefreshCw,
  Eye,
  Info,
  Layers,
  Upload,
  Image as ImageIcon
} from "lucide-react";
import { getStoredToken } from "../../utils/session";

// Helper to extract YouTube Video ID for live preview in Admin
const extractYouTubeId = (url) => {
  if (!url) return null;
  const cleanUrl = String(url).trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);
  if (match && match[2] && match[2].length === 11) return match[2];
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
  return null;
};

// Client-side image compressor for local file uploads
const compressImageFile = (file, maxWidth = 1280, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const elem = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(elem.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function AdminBusGallery({ darkMode = false }) {
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState("");
  const [selectedBus, setSelectedBus] = useState(null);
  const [loadingBuses, setLoadingBuses] = useState(true);

  // Gallery items state
  const [galleryItems, setGalleryItems] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  // Add Photo Modal / Form State
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoDesc, setPhotoDesc] = useState("");
  const [photoUploadMode, setPhotoUploadMode] = useState("file"); // "file" | "url"
  const [uploadingLocalFile, setUploadingLocalFile] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Add Video Modal / Form State
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoDesc, setVideoDesc] = useState("");
  const [isSampleVideo, setIsSampleVideo] = useState(true);
  const [savingVideo, setSavingVideo] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Preview Player Modal State
  const [previewVideo, setPreviewVideo] = useState(null);

  // Toast / Alert Messages
  const [statusMessage, setStatusMessage] = useState(null);
  const showStatus = (msg, type = "success") => {
    setStatusMessage({ msg, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // 1. Fetch All Active Fleet Buses for dropdown
  const fetchBusesList = useCallback(async () => {
    setLoadingBuses(true);
    try {
      const res = await axios.get("/api/buses");
      const list = res.data?.buses || [];
      setBuses(list);
      if (list.length > 0 && !selectedBusId) {
        setSelectedBusId(String(list[0]._id));
        setSelectedBus(list[0]);
      }
    } catch (err) {
      console.warn("Error fetching buses for gallery:", err.message);
      showStatus("Could not load buses list", "error");
    } finally {
      setLoadingBuses(false);
    }
  }, [selectedBusId]);

  useEffect(() => {
    fetchBusesList();
  }, [fetchBusesList]);

  // 2. Fetch Gallery Items for Selected Bus
  const fetchGalleryItems = useCallback(async (busId) => {
    if (!busId) return;
    setLoadingGallery(true);
    try {
      const res = await axios.get(`/api/bus-gallery/${busId}`);
      if (res.data && res.data.success) {
        setGalleryItems(res.data.gallery || []);
      }
    } catch (err) {
      console.warn("Error fetching gallery items:", err.message);
      setGalleryItems([]);
    } finally {
      setLoadingGallery(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBusId) {
      fetchGalleryItems(selectedBusId);
      const found = buses.find((b) => String(b._id) === String(selectedBusId));
      setSelectedBus(found || null);
    }
  }, [selectedBusId, buses, fetchGalleryItems]);

  // Handle Bus Selection Change
  const handleBusChange = (e) => {
    const newBusId = e.target.value;
    setSelectedBusId(newBusId);
    const found = buses.find((b) => String(b._id) === String(newBusId));
    setSelectedBus(found || null);
  };

  // Handle Local File Upload Selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLocalFile(true);
    try {
      const compressedBase64 = await compressImageFile(file, 1200, 0.8);
      setPhotoUrl(compressedBase64);
      if (!photoTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setPhotoTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    } catch (err) {
      console.error("Image processing error:", err);
      showStatus("Could not process selected image file.", "error");
    } finally {
      setUploadingLocalFile(false);
    }
  };

  // 3. Handle Add Photo Submit
  const handleAddPhotoSubmit = async (e) => {
    e.preventDefault();
    if (!photoTitle.trim()) {
      showStatus("Please provide a photo title/caption.", "error");
      return;
    }
    if (!photoUrl || !photoUrl.trim()) {
      showStatus("Please upload a photo file or enter an image URL.", "error");
      return;
    }

    setSavingPhoto(true);
    try {
      const token = getStoredToken();
      await axios.post(
        "/api/bus-gallery",
        {
          busId: String(selectedBusId),
          busNumber: selectedBus?.busNumber || "Fleet Bus",
          busName: selectedBus?.busName || "MoveSmart Bus",
          type: "photo",
          title: photoTitle.trim(),
          description: photoDesc.trim(),
          imageUrl: photoUrl.trim(),
          isSample: false,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      showStatus("Bus photo saved to database successfully!", "success");
      setPhotoTitle("");
      setPhotoUrl("");
      setPhotoDesc("");
      setShowAddPhotoModal(false);
      fetchGalleryItems(selectedBusId);
    } catch (err) {
      console.error("Save photo error:", err);
      showStatus(err.response?.data?.message || "Failed to save photo in database", "error");
    } finally {
      setSavingPhoto(false);
    }
  };

  // 4. Handle Add Video Submit
  const handleAddVideoSubmit = async (e) => {
    e.preventDefault();
    const videoId = extractYouTubeId(videoUrl);
    if (!videoTitle.trim() || !videoUrl.trim()) {
      showStatus("Please provide video title and YouTube URL.", "error");
      return;
    }
    if (!videoId) {
      showStatus("Invalid YouTube URL. Please enter a valid watch or youtu.be link.", "error");
      return;
    }

    setSavingVideo(true);
    try {
      const token = getStoredToken();
      await axios.post(
        "/api/bus-gallery",
        {
          busId: String(selectedBusId),
          busNumber: selectedBus?.busNumber || "Fleet Bus",
          busName: selectedBus?.busName || "MoveSmart Bus",
          type: "video",
          title: videoTitle.trim(),
          description: videoDesc.trim(),
          youtubeUrl: videoUrl.trim(),
          isSample: isSampleVideo,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      showStatus("YouTube video added successfully to database!", "success");
      setVideoTitle("");
      setVideoUrl("");
      setVideoDesc("");
      setIsSampleVideo(true);
      setShowAddVideoModal(false);
      fetchGalleryItems(selectedBusId);
    } catch (err) {
      console.error("Save video error:", err);
      showStatus(err.response?.data?.message || "Failed to save YouTube video", "error");
    } finally {
      setSavingVideo(false);
    }
  };

  // 5. Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    try {
      const token = getStoredToken();
      await axios.put(
        `/api/bus-gallery/${editingItem._id}`,
        {
          title: editTitle.trim(),
          description: editDesc.trim(),
          ...(editingItem.type === "video" ? { youtubeUrl: editUrl.trim() } : { imageUrl: editUrl.trim() }),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      showStatus("Gallery item updated successfully!", "success");
      setEditingItem(null);
      fetchGalleryItems(selectedBusId);
    } catch (err) {
      showStatus(err.response?.data?.message || "Failed to update item", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  // 6. Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setDeletingLoading(true);
    try {
      const token = getStoredToken();
      await axios.delete(`/api/bus-gallery/${deletingItem._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      showStatus("Item deleted successfully from database.", "success");
      setDeletingItem(null);
      fetchGalleryItems(selectedBusId);
    } catch (err) {
      showStatus(err.response?.data?.message || "Failed to delete item", "error");
    } finally {
      setDeletingLoading(false);
    }
  };

  const bgCard = darkMode ? "#1e293b" : "#ffffff";
  const textPrimary = darkMode ? "#f8fafc" : "#1e293b";
  const textSecondary = darkMode ? "#94a3b8" : "#64748b";
  const borderCol = darkMode ? "#334155" : "#e2e8f0";

  const photosList = galleryItems.filter((i) => i.type === "photo");
  const videosList = galleryItems.filter((i) => i.type === "video");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* STATUS TOAST NOTIFICATION */}
      {statusMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: statusMessage.type === "error" ? "#dc2626" : "#059669",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            fontWeight: "800",
            fontSize: "13.5px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "slideIn 0.25s ease-out"
          }}
        >
          {statusMessage.type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{statusMessage.msg}</span>
        </div>
      )}

      {/* HEADER CARD */}
      <div
        style={{
          background: bgCard,
          borderRadius: "20px",
          padding: "24px 28px",
          border: `1.5px solid ${borderCol}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>📸</span>
            <h2 style={{ fontSize: "20px", fontWeight: "900", color: textPrimary, margin: 0 }}>
              Bus Gallery Management
            </h2>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: textSecondary }}>
            Upload real bus photos &amp; manage YouTube demo videos stored in MongoDB for fleet coaches.
          </p>
        </div>

        {/* BUS SELECTOR DROPDOWN */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <label style={{ fontSize: "13px", fontWeight: "800", color: textPrimary, display: "flex", alignItems: "center", gap: "6px" }}>
            <Bus size={16} style={{ color: "#7c3aed" }} /> Select Bus:
          </label>
          <select
            value={selectedBusId}
            onChange={handleBusChange}
            disabled={loadingBuses}
            style={{
              padding: "10px 16px",
              borderRadius: "12px",
              border: `1.5px solid ${borderCol}`,
              background: darkMode ? "#334155" : "#f8fafc",
              color: textPrimary,
              fontWeight: "700",
              fontSize: "13.5px",
              outline: "none",
              cursor: "pointer",
              minWidth: "260px"
            }}
          >
            {buses.map((bus) => (
              <option key={bus._id} value={bus._id}>
                {bus.busNumber} — {bus.busName} ({bus.from} ➔ {bus.to})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SELECTED BUS BANNER */}
      {selectedBus && (
        <div
          style={{
            background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            borderRadius: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            boxShadow: "0 8px 20px rgba(76, 29, 149, 0.25)"
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "#d8b4fe", textTransform: "uppercase", fontWeight: "800", letterSpacing: "0.6px" }}>
              Managing Fleet Coach Gallery
            </div>
            <div style={{ fontSize: "18px", fontWeight: "900", marginTop: "2px", display: "flex", alignItems: "center", gap: "10px" }}>
              <span>{selectedBus.busNumber}</span>
              <span>•</span>
              <span>{selectedBus.busName}</span>
            </div>
            <div style={{ fontSize: "13px", color: "#e9d5ff", marginTop: "2px" }}>
              Route: <strong>{selectedBus.from}</strong> ➔ <strong>{selectedBus.to}</strong>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={() => setShowAddPhotoModal(true)}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                background: "#10b981",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)"
              }}
            >
              <Plus size={15} /> Add Photo
            </button>
            <button
              type="button"
              onClick={() => setShowAddVideoModal(true)}
              style={{
                padding: "9px 16px",
                borderRadius: "10px",
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "13px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 10px rgba(239, 68, 68, 0.3)"
              }}
            >
              <Plus size={15} /> Add YouTube Video
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: PHOTOS MANAGEMENT */}
      <div
        style={{
          background: bgCard,
          borderRadius: "20px",
          padding: "24px",
          border: `1.5px solid ${borderCol}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: `1px solid ${borderCol}`, paddingBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "900", color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Camera size={20} style={{ color: "#059669" }} />
              Bus Photos ({photosList.length})
            </h3>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "2px 0 0" }}>
              Coach photos stored in database for passenger preview.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPhotoModal(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(5, 150, 105, 0.1)",
              color: "#059669",
              border: "1px solid rgba(5, 150, 105, 0.3)",
              fontWeight: "800",
              fontSize: "12.5px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Plus size={14} /> Add Photo
          </button>
        </div>

        {loadingGallery ? (
          <div style={{ textAlign: "center", padding: "32px", color: textSecondary }}>Loading photos...</div>
        ) : photosList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 20px", background: darkMode ? "#334155" : "#f8fafc", borderRadius: "14px", border: `1.5px dashed ${borderCol}` }}>
            <Camera size={32} style={{ color: textSecondary, margin: "0 auto 8px" }} />
            <h4 style={{ fontSize: "15px", fontWeight: "800", color: textPrimary, margin: 0 }}>No photos added for this bus yet</h4>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "4px 0 14px" }}>Upload coach photos from your computer or enter an image URL.</p>
            <button
              type="button"
              onClick={() => setShowAddPhotoModal(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "12.5px",
                cursor: "pointer"
              }}
            >
              + Add First Photo
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
            {photosList.map((photo) => (
              <div
                key={photo._id}
                style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  border: `1px solid ${borderCol}`,
                  background: darkMode ? "#0f172a" : "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ position: "relative", width: "100%", height: "140px", background: "#0f172a" }}>
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      display: "flex",
                      gap: "4px"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(photo);
                        setEditTitle(photo.title);
                        setEditDesc(photo.description || "");
                        setEditUrl(photo.imageUrl || "");
                      }}
                      style={{
                        background: "rgba(15, 23, 42, 0.8)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px",
                        cursor: "pointer"
                      }}
                      title="Edit Photo"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(photo)}
                      style={{
                        background: "rgba(220, 38, 38, 0.9)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px",
                        cursor: "pointer"
                      }}
                      title="Delete Photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h5 style={{ fontSize: "13.5px", fontWeight: "800", color: textPrimary, margin: 0, lineHeight: "1.3" }}>
                      {photo.title}
                    </h5>
                    {photo.description && (
                      <p style={{ fontSize: "11.5px", color: textSecondary, margin: "4px 0 0", lineHeight: "1.4" }}>
                        {photo.description}
                      </p>
                    )}
                  </div>
                  <div style={{ marginTop: "8px", paddingTop: "6px", borderTop: `1px solid ${borderCol}`, fontSize: "10.5px", color: textSecondary }}>
                    Added: {new Date(photo.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: YOUTUBE VIDEOS MANAGEMENT */}
      <div
        style={{
          background: bgCard,
          borderRadius: "20px",
          padding: "24px",
          border: `1.5px solid ${borderCol}`,
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: `1px solid ${borderCol}`, paddingBottom: "12px" }}>
          <div>
            <h3 style={{ fontSize: "17px", fontWeight: "900", color: textPrimary, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Film size={20} style={{ color: "#dc2626" }} />
              YouTube Videos ({videosList.length})
            </h3>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "2px 0 0" }}>
              Embedded YouTube video walk-throughs &amp; route documentation clips.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddVideoModal(true)}
            style={{
              padding: "8px 16px",
              borderRadius: "10px",
              background: "rgba(220, 38, 38, 0.1)",
              color: "#dc2626",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              fontWeight: "800",
              fontSize: "12.5px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Plus size={14} /> Add YouTube Video
          </button>
        </div>

        {loadingGallery ? (
          <div style={{ textAlign: "center", padding: "32px", color: textSecondary }}>Loading videos...</div>
        ) : videosList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 20px", background: darkMode ? "#334155" : "#f8fafc", borderRadius: "14px", border: `1.5px dashed ${borderCol}` }}>
            <Film size={32} style={{ color: textSecondary, margin: "0 auto 8px" }} />
            <h4 style={{ fontSize: "15px", fontWeight: "800", color: textPrimary, margin: 0 }}>No YouTube videos linked yet</h4>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "4px 0 14px" }}>Add YouTube URLs (e.g. https://www.youtube.com/watch?v=...) to embed videos.</p>
            <button
              type="button"
              onClick={() => setShowAddVideoModal(true)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                fontWeight: "800",
                fontSize: "12.5px",
                cursor: "pointer"
              }}
            >
              + Add First YouTube Video
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {videosList.map((video) => {
              const thumbUrl = video.youtubeVideoId
                ? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
                : "";

              return (
                <div
                  key={video._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderRadius: "16px",
                    background: darkMode ? "#0f172a" : "#ffffff",
                    border: `1px solid ${borderCol}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    flexWrap: "wrap",
                    gap: "14px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1, minWidth: "260px" }}>
                    {/* Thumbnail */}
                    <div
                      style={{
                        position: "relative",
                        width: "110px",
                        height: "70px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: "#0f172a",
                        flexShrink: 0
                      }}
                    >
                      {thumbUrl && (
                        <img src={thumbUrl} alt={video.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        <Play size={18} fill="#ffffff" color="#ffffff" />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "800", color: textPrimary, margin: 0 }}>
                          {video.title}
                        </h4>
                        {video.isSample && (
                          <span style={{ fontSize: "10.5px", fontWeight: "800", background: "rgba(234, 179, 8, 0.15)", color: "#ca8a04", padding: "2px 6px", borderRadius: "6px" }}>
                            Sample Video
                          </span>
                        )}
                      </div>
                      {video.description && (
                        <p style={{ fontSize: "12px", color: textSecondary, margin: "2px 0 4px" }}>
                          {video.description}
                        </p>
                      )}
                      <div style={{ fontSize: "11px", color: textSecondary, display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>ID: {video.youtubeVideoId}</span>
                        <span>•</span>
                        <a
                          href={video.youtubeUrl || `https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
                        >
                          <ExternalLink size={11} /> {video.youtubeUrl || "YouTube Link"}
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setPreviewVideo(video)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: darkMode ? "#334155" : "#f1f5f9",
                        color: textPrimary,
                        border: `1px solid ${borderCol}`,
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Eye size={13} /> Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(video);
                        setEditTitle(video.title);
                        setEditDesc(video.description || "");
                        setEditUrl(video.youtubeUrl || `https://www.youtube.com/watch?v=${video.youtubeVideoId}`);
                      }}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: darkMode ? "#334155" : "#f1f5f9",
                        color: "#2563eb",
                        border: `1px solid ${borderCol}`,
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Edit2 size={13} /> Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingItem(video)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        background: "rgba(220, 38, 38, 0.1)",
                        color: "#dc2626",
                        border: "1px solid rgba(220, 38, 38, 0.3)",
                        fontWeight: "700",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD PHOTO (FILE UPLOAD OR URL) ================= */}
      {showAddPhotoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setShowAddPhotoModal(false)}
        >
          <div
            style={{
              background: bgCard,
              borderRadius: "22px",
              padding: "28px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: `1.5px solid ${borderCol}`,
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddPhotoModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: textSecondary, cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: "900", color: textPrimary, margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Camera size={20} style={{ color: "#059669" }} /> Add Photo to Bus Gallery
            </h3>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "0 0 16px" }}>
              Bus: <strong>{selectedBus?.busNumber} ({selectedBus?.busName})</strong>
            </p>

            {/* Mode Switch: Upload File vs Enter URL */}
            <div style={{ display: "flex", background: darkMode ? "#334155" : "#f1f5f9", padding: "4px", borderRadius: "10px", gap: "4px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={() => setPhotoUploadMode("file")}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  background: photoUploadMode === "file" ? "#059669" : "transparent",
                  color: photoUploadMode === "file" ? "#ffffff" : textSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Upload size={14} /> Upload Image File
              </button>
              <button
                type="button"
                onClick={() => setPhotoUploadMode("url")}
                style={{
                  flex: 1,
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  background: photoUploadMode === "url" ? "#059669" : "transparent",
                  color: photoUploadMode === "url" ? "#ffffff" : textSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <ImageIcon size={14} /> Image URL Link
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Photo Title / Caption *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Modern Exterior Front View"
                    value={photoTitle}
                    onChange={(e) => setPhotoTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13.5px"
                    }}
                  />
                </div>

                {photoUploadMode === "file" ? (
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                      Choose Photo from Device *
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${photoUrl ? "#059669" : borderCol}`,
                        borderRadius: "12px",
                        padding: "20px",
                        textAlign: "center",
                        cursor: "pointer",
                        background: darkMode ? "#1e293b" : "#f8fafc",
                        transition: "all 0.2s"
                      }}
                    >
                      {uploadingLocalFile ? (
                        <div style={{ color: "#059669", fontWeight: "700", fontSize: "13px" }}>
                          <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 6px" }} />
                          Processing image...
                        </div>
                      ) : photoUrl ? (
                        <div>
                          <img src={photoUrl} alt="Preview" style={{ maxHeight: "140px", maxWidth: "100%", objectFit: "contain", borderRadius: "8px", margin: "0 auto" }} />
                          <div style={{ marginTop: "8px", fontSize: "12px", color: "#059669", fontWeight: "700" }}>
                            ✓ Image Selected (Click to change)
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: textSecondary }}>
                          <Upload size={28} style={{ margin: "0 auto 6px", color: "#059669" }} />
                          <div style={{ fontSize: "13px", fontWeight: "700", color: textPrimary }}>Click to browse or drop bus image</div>
                          <div style={{ fontSize: "11.5px", marginTop: "2px" }}>Supports PNG, JPG, JPEG, WEBP</div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                      Image URL *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://images.unsplash.com/photo-..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: `1.5px solid ${borderCol}`,
                        background: darkMode ? "#334155" : "#f8fafc",
                        color: textPrimary,
                        fontSize: "13.5px"
                      }}
                    />
                    {photoUrl && (
                      <div style={{ marginTop: "10px", height: "120px", borderRadius: "10px", overflow: "hidden", background: "#f1f5f9", border: `1px solid ${borderCol}` }}>
                        <img src={photoUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Highlight features e.g. Push-back seats, AC vents, luggage bay..."
                    value={photoDesc}
                    onChange={(e) => setPhotoDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13px",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddPhotoModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPhoto || uploadingLocalFile}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #059669, #10b981)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {savingPhoto ? "Saving to Database..." : "Save Photo"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD YOUTUBE VIDEO ================= */}
      {showAddVideoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setShowAddVideoModal(false)}
        >
          <div
            style={{
              background: bgCard,
              borderRadius: "22px",
              padding: "28px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: `1.5px solid ${borderCol}`,
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowAddVideoModal(false)}
              style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: textSecondary, cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: "900", color: textPrimary, margin: "0 0 6px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Film size={20} style={{ color: "#dc2626" }} /> Add YouTube Video to Bus Gallery
            </h3>
            <p style={{ fontSize: "12.5px", color: textSecondary, margin: "0 0 20px" }}>
              Bus: <strong>{selectedBus?.busNumber} ({selectedBus?.busName})</strong>
            </p>

            <form onSubmit={handleAddVideoSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Video Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scenic Highway Route Walkthrough"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13.5px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    YouTube URL *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13.5px"
                    }}
                  />

                  {/* Live YouTube Verification Preview */}
                  {extractYouTubeId(videoUrl) ? (
                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "10px 14px", borderRadius: "10px" }}>
                      <img
                        src={`https://img.youtube.com/vi/${extractYouTubeId(videoUrl)}/hqdefault.jpg`}
                        alt="Thumbnail"
                        style={{ width: "80px", height: "48px", objectFit: "cover", borderRadius: "6px" }}
                      />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "800", color: "#059669" }}>✓ Valid YouTube Video Detected</div>
                        <div style={{ fontSize: "11px", color: textSecondary }}>Video ID: {extractYouTubeId(videoUrl)}</div>
                      </div>
                    </div>
                  ) : videoUrl.trim() ? (
                    <div style={{ marginTop: "6px", fontSize: "11.5px", color: "#dc2626" }}>
                      ⚠️ Enter a valid standard YouTube URL or Video ID
                    </div>
                  ) : null}
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Description (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional details or highlights..."
                    value={videoDesc}
                    onChange={(e) => setVideoDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13px",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: darkMode ? "#334155" : "#f8fafc", padding: "10px 14px", borderRadius: "10px" }}>
                  <input
                    type="checkbox"
                    id="sampleVideoCheck"
                    checked={isSampleVideo}
                    onChange={(e) => setIsSampleVideo(e.target.checked)}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="sampleVideoCheck" style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, cursor: "pointer" }}>
                    Mark as "Sample Video" (Recommended for demo clips)
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowAddVideoModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingVideo}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {savingVideo ? "Saving..." : "Save YouTube Video"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT ITEM ================= */}
      {editingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setEditingItem(null)}
        >
          <div
            style={{
              background: bgCard,
              borderRadius: "22px",
              padding: "28px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: `1.5px solid ${borderCol}`,
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: textSecondary, cursor: "pointer" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "18px", fontWeight: "900", color: textPrimary, margin: "0 0 16px" }}>
              Edit {editingItem.type === "video" ? "YouTube Video" : "Photo"}
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13.5px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    {editingItem.type === "video" ? "YouTube URL *" : "Image URL / Data *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13.5px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12.5px", fontWeight: "700", color: textPrimary, display: "block", marginBottom: "4px" }}>
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: `1.5px solid ${borderCol}`,
                      background: darkMode ? "#334155" : "#f8fafc",
                      color: textPrimary,
                      fontSize: "13px",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "10px",
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "1px solid #cbd5e1",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    style={{
                      padding: "10px 22px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: "pointer"
                    }}
                  >
                    {savingEdit ? "Updating..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION ================= */}
      {deletingItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setDeletingItem(null)}
        >
          <div
            style={{
              background: bgCard,
              borderRadius: "22px",
              padding: "26px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: `1.5px solid ${borderCol}`,
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                background: "rgba(220, 38, 38, 0.1)",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px"
              }}
            >
              <Trash2 size={24} />
            </div>

            <h3 style={{ fontSize: "17px", fontWeight: "900", color: textPrimary, margin: "0 0 8px" }}>
              Delete {deletingItem.type === "video" ? "YouTube Video" : "Photo"}?
            </h3>
            <p style={{ fontSize: "13px", color: textSecondary, margin: "0 0 20px" }}>
              Are you sure you want to permanently delete <strong>"{deletingItem.title}"</strong> from MongoDB?
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "10px",
                  background: "#f1f5f9",
                  color: "#475569",
                  border: "1px solid #cbd5e1",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingLoading}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                {deletingLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PREVIEW VIDEO ================= */}
      {previewVideo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={() => setPreviewVideo(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "800px",
              width: "100%",
              background: "#0f172a",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#1e293b", color: "#ffffff" }}>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: "800" }}>{previewVideo.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${previewVideo.youtubeVideoId}?autoplay=1&rel=0`}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
