import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Image,
  Video,
  Play,
  ExternalLink,
  X,
  Sparkles,
  Camera,
  Film,
  ZoomIn,
  AlertCircle,
  Eye,
  Info
} from "lucide-react";

export default function BusGallery({
  busId,
  busNumber,
  busName,
  isOpen,
  onClose
}) {
  const [activeTab, setActiveTab] = useState("photos"); // "photos" | "videos"
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lightbox / Video Player Modal States
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  useEffect(() => {
    if (!isOpen || !busId) return;

    let isMounted = true;
    const fetchGallery = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`/api/bus-gallery/${busId}`);
        if (isMounted && res.data && res.data.success) {
          setPhotos(res.data.photos || []);
          setVideos(res.data.videos || []);
        }
      } catch (err) {
        console.warn("Error fetching bus gallery:", err.message);
        if (isMounted) {
          setError("Unable to load gallery content right now.");
          setPhotos([]);
          setVideos([]);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGallery();

    return () => {
      isMounted = false;
    };
  }, [busId, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.25)",
          border: "1.5px solid #ede9fe",
          position: "relative",
          animation: "fadeIn 0.2s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #064e3b 100%)",
            color: "#ffffff",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, #a7f3d0 0%, #d8b4fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}
            >
              🚌
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "900", margin: 0, color: "#ffffff" }}>
                  {busName || "MoveSmart Fleet Bus"}
                </h3>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.18)",
                    color: "#a7f3d0",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    fontWeight: "800",
                    padding: "2px 8px",
                    borderRadius: "6px"
                  }}
                >
                  {busNumber}
                </span>
              </div>
              <p style={{ fontSize: "12px", color: "#cbd5e1", margin: "3px 0 0 0" }}>
                Official Bus Fleet Gallery • Verified Photos &amp; Video Streams
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
            title="Close Gallery"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div
          style={{
            display: "flex",
            background: "#f8fafc",
            borderBottom: "1.5px solid #e2e8f0",
            padding: "8px 16px",
            gap: "10px",
            flexShrink: 0
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("photos")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "photos" ? "linear-gradient(135deg, #059669, #10b981)" : "transparent",
              color: activeTab === "photos" ? "#ffffff" : "#475569",
              fontWeight: "800",
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === "photos" ? "0 4px 12px rgba(5, 150, 105, 0.3)" : "none"
            }}
          >
            <Camera size={16} />
            <span>Photos ({photos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              borderRadius: "12px",
              border: "none",
              background: activeTab === "videos" ? "linear-gradient(135deg, #dc2626, #ef4444)" : "transparent",
              color: activeTab === "videos" ? "#ffffff" : "#475569",
              fontWeight: "800",
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: activeTab === "videos" ? "0 4px 12px rgba(220, 38, 38, 0.3)" : "none"
            }}
          >
            <Film size={16} />
            <span>YouTube Videos ({videos.length})</span>
          </button>
        </div>

        {/* Gallery Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            background: "#ffffff"
          }}
        >
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #059669",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  margin: "0 auto 16px",
                  animation: "spin 1s linear infinite"
                }}
              />
              <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                Loading Bus Gallery...
              </h4>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                Fetching verified photos and video streams from MoveSmart database
              </p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <AlertCircle size={40} style={{ color: "#ef4444", margin: "0 auto 12px" }} />
              <p style={{ color: "#ef4444", fontWeight: "700", fontSize: "14px" }}>{error}</p>
            </div>
          ) : activeTab === "photos" ? (
            /* ================= PHOTOS VIEW ================= */
            photos.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  background: "#f8fafc",
                  borderRadius: "18px",
                  border: "1.5px dashed #cbd5e1"
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#ede9fe",
                    color: "#7c3aed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px"
                  }}
                >
                  <Camera size={28} />
                </div>
                <h4 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                  No Photos in Gallery Yet
                </h4>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "6px auto 0", maxWidth: "380px" }}>
                  Verified photos for Bus <strong>{busNumber}</strong> have not been uploaded by the fleet administrator yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "16px"
                }}
              >
                {photos.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => setSelectedPhoto(item)}
                    style={{
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)";
                    }}
                  >
                    <div style={{ position: "relative", width: "100%", height: "160px", background: "#f1f5f9", overflow: "hidden" }}>
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.3s"
                        }}
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80";
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: 0,
                          transition: "opacity 0.2s"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                      >
                        <span
                          style={{
                            background: "rgba(255,255,255,0.9)",
                            color: "#0f172a",
                            padding: "6px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "800",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <ZoomIn size={14} /> Enlarge
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <h5 style={{ fontSize: "13.5px", fontWeight: "800", color: "#0f172a", margin: 0, lineHeight: "1.3" }}>
                        {item.title}
                      </h5>
                      {item.description && (
                        <p style={{ fontSize: "11.5px", color: "#64748b", margin: "4px 0 0", lineHeight: "1.4" }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ================= VIDEOS VIEW ================= */
            videos.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  background: "#f8fafc",
                  borderRadius: "18px",
                  border: "1.5px dashed #cbd5e1"
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#fee2e2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px"
                  }}
                >
                  <Film size={28} />
                </div>
                <h4 style={{ fontSize: "17px", fontWeight: "900", color: "#0f172a", margin: 0 }}>
                  No Videos in Gallery Yet
                </h4>
                <p style={{ fontSize: "13px", color: "#64748b", margin: "6px auto 0", maxWidth: "380px" }}>
                  No YouTube journey clips or walk-through videos have been registered for Bus <strong>{busNumber}</strong> yet.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "18px"
                }}
              >
                {videos.map((item) => {
                  const thumbUrl = item.youtubeVideoId
                    ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                    : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80";

                  return (
                    <div
                      key={item._id}
                      style={{
                        borderRadius: "18px",
                        overflow: "hidden",
                        border: "1.5px solid #e2e8f0",
                        background: "#ffffff",
                        boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.25s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(0,0,0,0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.05)";
                      }}
                    >
                      {/* Video Thumbnail Container */}
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          paddingTop: "56.25%", // 16:9 Aspect Ratio
                          background: "#0f172a",
                          cursor: "pointer"
                        }}
                        onClick={() => setActiveVideoModal(item)}
                      >
                        <img
                          src={thumbUrl}
                          alt={item.title}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />

                        {/* YouTube Top Badge */}
                        <div
                          style={{
                            position: "absolute",
                            top: 10,
                            left: 10,
                            background: "rgba(220, 38, 38, 0.9)",
                            color: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "800",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backdropFilter: "blur(4px)"
                          }}
                        >
                          <Play size={10} style={{ fill: "#ffffff" }} /> YouTube
                        </div>

                        {/* Sample Video Badge if marked */}
                        {item.isSample && (
                          <div
                            style={{
                              position: "absolute",
                              top: 10,
                              right: 10,
                              background: "rgba(15, 23, 42, 0.8)",
                              color: "#fde047",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "10px",
                              fontWeight: "800",
                              backdropFilter: "blur(4px)"
                            }}
                          >
                            Sample Video
                          </div>
                        )}

                        {/* Big Center Play Icon */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "rgba(0,0,0,0.25)"
                          }}
                        >
                          <div
                            style={{
                              width: "48px",
                              height: "48px",
                              borderRadius: "50%",
                              background: "rgba(220, 38, 38, 0.95)",
                              color: "#ffffff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                              transition: "transform 0.2s"
                            }}
                          >
                            <Play size={22} style={{ fill: "#ffffff", marginLeft: "3px" }} />
                          </div>
                        </div>
                      </div>

                      {/* Video Info & Controls */}
                      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                        <div>
                          <h4 style={{ fontSize: "14px", fontWeight: "800", color: "#0f172a", margin: "0 0 4px", lineHeight: "1.35" }}>
                            {item.title}
                          </h4>
                          {item.description && (
                            <p style={{ fontSize: "12px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "12px",
                            paddingTop: "10px",
                            borderTop: "1px solid #f1f5f9"
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveVideoModal(item)}
                            style={{
                              flex: 1,
                              padding: "8px 12px",
                              borderRadius: "10px",
                              background: "linear-gradient(135deg, #059669, #10b981)",
                              color: "#ffffff",
                              border: "none",
                              fontWeight: "800",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px"
                            }}
                          >
                            <Play size={13} style={{ fill: "#ffffff" }} /> Watch Video
                          </button>

                          <a
                            href={item.youtubeUrl || `https://www.youtube.com/watch?v=${item.youtubeVideoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: "8px 12px",
                              borderRadius: "10px",
                              background: "#f1f5f9",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              fontWeight: "700",
                              fontSize: "12px",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Open on YouTube"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Modal Footer Note */}
        <div
          style={{
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            padding: "10px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11.5px",
            color: "#64748b",
            flexShrink: 0
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Sparkles size={13} style={{ color: "#7c3aed" }} />
            MoveSmart Verified Media Content
          </span>
          <span>Bus ID: <strong style={{ fontFamily: "monospace", color: "#334155" }}>{busNumber}</strong></span>
        </div>
      </div>

      {/* ================= LIGHTBOX PREVIEW MODAL FOR PHOTO ================= */}
      {selectedPhoto && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px"
          }}
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "850px",
              width: "100%",
              background: "#0f172a",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "rgba(0,0,0,0.6)",
                color: "#ffffff",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 2
              }}
            >
              <X size={18} />
            </button>

            <img
              src={selectedPhoto.imageUrl}
              alt={selectedPhoto.title}
              style={{
                width: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                background: "#020617"
              }}
            />

            <div style={{ padding: "16px 20px", background: "#0f172a", color: "#ffffff" }}>
              <h4 style={{ fontSize: "16px", fontWeight: "900", margin: 0 }}>
                {selectedPhoto.title}
              </h4>
              {selectedPhoto.description && (
                <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0" }}>
                  {selectedPhoto.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= EMBEDDED YOUTUBE VIDEO PLAYER MODAL ================= */}
      {activeVideoModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px"
          }}
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "800px",
              width: "100%",
              background: "#0f172a",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.15)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                color: "#ffffff"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#ef4444", display: "flex" }}>
                  <Play size={16} style={{ fill: "#ef4444" }} />
                </span>
                <strong style={{ fontSize: "14px" }}>{activeVideoModal.title}</strong>
              </div>

              <button
                onClick={() => setActiveVideoModal(null)}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Responsive 16:9 YouTube iFrame */}
            <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#000000" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${activeVideoModal.youtubeVideoId}?rel=0&modestbranding=1`}
                title={activeVideoModal.title}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none"
                }}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* Description & Link Bar */}
            <div style={{ padding: "14px 20px", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                {activeVideoModal.description && (
                  <p style={{ fontSize: "12.5px", color: "#94a3b8", margin: 0 }}>
                    {activeVideoModal.description}
                  </p>
                )}
                {activeVideoModal.isSample && (
                  <span style={{ fontSize: "11px", color: "#fde047", display: "inline-block", marginTop: "2px" }}>
                    ⚠️ Sample Educational &amp; Scenic Demo Video
                  </span>
                )}
              </div>

              <a
                href={activeVideoModal.youtubeUrl || `https://www.youtube.com/watch?v=${activeVideoModal.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "rgba(220, 38, 38, 0.2)",
                  color: "#f87171",
                  border: "1px solid rgba(220, 38, 38, 0.4)",
                  fontSize: "12px",
                  fontWeight: "700",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                <ExternalLink size={13} /> Open on YouTube
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
