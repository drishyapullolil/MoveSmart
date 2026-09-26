import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Image as ImageIcon,
  Video,
  Play,
  ExternalLink,
  X,
  Sparkles,
  Camera,
  Film,
  ZoomIn,
  Bus,
  RefreshCw,
  Info
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function BusGalleryPage() {
  const [activeTab, setActiveTab] = useState("photos"); // "photos" | "videos"
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Lightbox for photos
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Modal player for videos
  const [playingVideo, setPlayingVideo] = useState(null);

  // Fetch gallery items strictly from database
  const fetchGallery = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/bus-gallery");
      const items = Array.isArray(res.data) ? res.data : (res.data?.gallery || res.data?.data || []);
      setGalleryItems(items);
    } catch (err) {
      console.error("Error fetching gallery items:", err);
      setGalleryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  // Filter items strictly by active tab
  const filteredItems = galleryItems.filter((item) => {
    return item.type === (activeTab === "photos" ? "photo" : "video");
  });

  const photosCount = galleryItems.filter((i) => i.type === "photo").length;
  const videosCount = galleryItems.filter((i) => i.type === "video").length;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Header />

      <main style={{ flex: 1, paddingBottom: "60px" }}>
        {/* HERO SECTION */}
        <section
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #3b0764 50%, #064e3b 100%)",
            color: "#ffffff",
            padding: "44px 20px 36px 20px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          }}
        >
          {/* Ambient Glows */}
          <div
            style={{
              position: "absolute",
              top: "-50px",
              right: "10%",
              width: "280px",
              height: "280px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(147, 51, 234, 0.3) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-50px",
              left: "5%",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", padding: "5px 12px", borderRadius: "20px", fontSize: "12.5px", fontWeight: "700", marginBottom: "14px", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Sparkles size={14} color="#34d399" />
              <span>Explore MoveSmart Transit Fleet</span>
            </div>

            <h1 style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: "900", margin: "0 0 10px 0", letterSpacing: "-0.5px" }}>
              🚌 Bus Fleet &amp; Journey Gallery
            </h1>
            <p style={{ fontSize: "14.5px", color: "rgba(255,255,255,0.85)", maxWidth: "660px", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              Browse real photos, passenger coach interiors, scenic highway views, and demo journey video clips for our smart transit buses across Kerala.
            </p>

            {/* Quick Stats Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid rgba(255,255,255,0.15)", fontSize: "13px" }}>
                <Camera size={15} color="#60a5fa" />
                <span><strong>{photosCount}</strong> Photos</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", padding: "6px 14px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "8px", border: "1px solid rgba(255,255,255,0.15)", fontSize: "13px" }}>
                <Film size={15} color="#f87171" />
                <span><strong>{videosCount}</strong> Videos</span>
              </div>
            </div>
          </div>
        </section>

        {/* CONTROLS BAR: TABS */}
        <div style={{ maxWidth: "1280px", margin: "-18px auto 26px auto", padding: "0 20px", position: "relative", zIndex: 2 }}>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "12px 18px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Photos vs Videos Tab Buttons */}
            <div style={{ display: "flex", background: "#f1f5f9", padding: "5px", borderRadius: "12px", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveTab("photos")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  borderRadius: "9px",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: activeTab === "photos" ? "#7c3aed" : "transparent",
                  color: activeTab === "photos" ? "#ffffff" : "#475569",
                  boxShadow: activeTab === "photos" ? "0 4px 12px rgba(124, 58, 237, 0.3)" : "none",
                }}
              >
                <Camera size={16} />
                <span>Photos ({photosCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 24px",
                  borderRadius: "9px",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "14px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: activeTab === "videos" ? "#dc2626" : "transparent",
                  color: activeTab === "videos" ? "#ffffff" : "#475569",
                  boxShadow: activeTab === "videos" ? "0 4px 12px rgba(220, 38, 38, 0.3)" : "none",
                }}
              >
                <Film size={16} />
                <span>Videos ({videosCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 20px" }}>
          {loading ? (
            <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
              <RefreshCw size={36} className="animate-spin" style={{ margin: "0 auto 16px auto", color: "#7c3aed" }} />
              <p style={{ fontSize: "16px", fontWeight: "700" }}>Loading bus gallery showcase...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            /* EMPTY STATE */
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                border: "1px dashed #cbd5e1",
                padding: "60px 20px",
                textAlign: "center",
                maxWidth: "600px",
                margin: "20px auto",
              }}
            >
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: activeTab === "photos" ? "rgba(124, 58, 237, 0.1)" : "rgba(220, 38, 38, 0.1)",
                  color: activeTab === "photos" ? "#7c3aed" : "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                {activeTab === "photos" ? <ImageIcon size={32} /> : <Video size={32} />}
              </div>
              <h3 style={{ fontSize: "19px", fontWeight: "800", color: "#1e293b", margin: "0 0 8px 0" }}>
                No {activeTab === "photos" ? "Photos" : "Videos"} Available
              </h3>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 auto", maxWidth: "420px" }}>
                No media items have been added to the gallery database yet.
              </p>
            </div>
          ) : activeTab === "photos" ? (
            /* PHOTOS GRID */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              {filteredItems.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedPhoto(item)}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 25px rgba(0,0,0,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.04)";
                  }}
                >
                  <div style={{ position: "relative", height: "200px", overflow: "hidden", background: "#0f172a" }}>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.4s ease",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        background: "rgba(0,0,0,0.65)",
                        backdropFilter: "blur(4px)",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "4px 10px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Bus size={12} color="#34d399" />
                      <span>{item.busNumber || "Fleet Bus"}</span>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        background: "rgba(255,255,255,0.9)",
                        color: "#1e293b",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                      }}
                    >
                      <ZoomIn size={16} />
                    </div>
                  </div>

                  <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ margin: "0 0 6px 0", fontSize: "15px", fontWeight: "800", color: "#1e293b" }}>
                        {item.title}
                      </h4>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.busName && (
                      <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: "700", color: "#7c3aed" }}>
                        {item.busName}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* YOUTUBE VIDEOS GRID */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "22px",
              }}
            >
              {filteredItems.map((item) => {
                const videoId = item.youtubeVideoId || "";
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";

                return (
                  <div
                    key={item._id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "18px",
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 15px rgba(0,0,0,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      transition: "all 0.25s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 14px 28px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(0,0,0,0.04)";
                    }}
                  >
                    {/* Video Thumbnail with Play Overlay */}
                    <div
                      style={{ position: "relative", height: "200px", background: "#0f172a", cursor: "pointer", overflow: "hidden" }}
                      onClick={() => setPlayingVideo(item)}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" }}>
                          <Film size={40} />
                        </div>
                      )}

                      {/* Dark overlay with Play button */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.35)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "56px",
                            height: "56px",
                            borderRadius: "50%",
                            background: "rgba(220, 38, 38, 0.95)",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 4px 20px rgba(220, 38, 38, 0.5)",
                          }}
                        >
                          <Play size={24} fill="#ffffff" style={{ marginLeft: "3px" }} />
                        </div>
                      </div>

                      {/* YouTube indicator & Sample Video badge */}
                      <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px" }}>
                        <span
                          style={{
                            background: "#dc2626",
                            color: "#ffffff",
                            fontSize: "10.5px",
                            fontWeight: "900",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            letterSpacing: "0.4px",
                          }}
                        >
                          YouTube
                        </span>
                        {item.isSample && (
                          <span
                            style={{
                              background: "rgba(15, 23, 42, 0.8)",
                              backdropFilter: "blur(4px)",
                              color: "#fde047",
                              fontSize: "10.5px",
                              fontWeight: "800",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              border: "1px solid rgba(253, 224, 71, 0.3)",
                            }}
                          >
                            Sample Video
                          </span>
                        )}
                      </div>

                      {/* Bus Number Pill */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          left: "10px",
                          background: "rgba(0,0,0,0.75)",
                          backdropFilter: "blur(4px)",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: "800",
                          padding: "4px 10px",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                      >
                        <Bus size={12} color="#34d399" />
                        <span>{item.busNumber || item.busName || "Fleet Bus"}</span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "800", color: "#1e293b", lineHeight: 1.3 }}>
                          {item.title}
                        </h4>
                        {item.description && (
                          <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#64748b", lineHeight: 1.45 }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #f1f5f9" }}>
                        <button
                          type="button"
                          onClick={() => setPlayingVideo(item)}
                          style={{
                            flex: 1,
                            background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                            color: "#ffffff",
                            border: "none",
                            padding: "9px 12px",
                            borderRadius: "10px",
                            fontWeight: "800",
                            fontSize: "13px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
                          }}
                        >
                          <Play size={14} fill="#ffffff" />
                          <span>Watch Video</span>
                        </button>

                        <a
                          href={item.youtubeUrl || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : "#")}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open directly on YouTube"
                          style={{
                            background: "#f8fafc",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            padding: "9px 12px",
                            borderRadius: "10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none",
                          }}
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 🖼️ HIGH-RES PHOTO LIGHTBOX MODAL */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "960px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              background: "#0f172a",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#1e293b", color: "#ffffff" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800" }}>{selectedPhoto.title}</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                  {selectedPhoto.busNumber} {selectedPhoto.busName ? `— ${selectedPhoto.busName}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#ffffff",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Photo preview */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px", maxHeight: "65vh", overflow: "hidden" }}>
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.title}
                style={{ maxWidth: "100%", maxHeight: "62vh", objectFit: "contain", borderRadius: "8px" }}
              />
            </div>

            {/* Caption */}
            {selectedPhoto.description && (
              <div style={{ padding: "14px 20px", background: "#1e293b", color: "#e2e8f0", fontSize: "13.5px" }}>
                {selectedPhoto.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎬 YOUTUBE VIDEO EMBED PLAYER MODAL (NO AUTOPLAY) */}
      {playingVideo && (
        <div
          onClick={() => setPlayingVideo(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "880px",
              width: "100%",
              background: "#0f172a",
              borderRadius: "20px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#1e293b", color: "#ffffff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ background: "#dc2626", color: "#ffffff", fontSize: "11px", fontWeight: "900", padding: "3px 8px", borderRadius: "6px" }}>
                  YouTube
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800" }}>{playingVideo.title}</h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    {playingVideo.busNumber} {playingVideo.busName ? `— ${playingVideo.busName}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#ffffff",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Embedded Iframe Player (autoplay=0) */}
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", background: "#000000" }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playingVideo.youtubeVideoId}?autoplay=0&rel=0`}
                title={playingVideo.title}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
              />
            </div>

            {/* Footer with Disclaimer */}
            <div style={{ padding: "14px 20px", background: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "12px" }}>
                <Info size={14} color="#fde047" />
                <span>Sample/public bus video for demonstration purposes. Not an official broadcast.</span>
              </div>
              <a
                href={playingVideo.youtubeUrl || `https://www.youtube.com/watch?v=${playingVideo.youtubeVideoId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "#60a5fa",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                <span>Watch on YouTube</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
