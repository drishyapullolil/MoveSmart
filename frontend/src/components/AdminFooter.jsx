import React from "react";
import { Shield, Server, Lock, Cpu } from "lucide-react";

export default function AdminFooter() {
  return (
    <footer
      style={{
        background: "rgba(46, 16, 101, 0.95)",
        backdropFilter: "blur(10px)",
        color: "#c4b5fd",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        padding: "32px 24px 24px 24px",
        marginTop: "auto",
        fontSize: "13px",
      }}
    >
      <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "20px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: "rgba(74, 222, 128, 0.15)",
                color: "#4ade80",
                border: "1px solid rgba(74, 222, 128, 0.3)",
                fontSize: "12.5px",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 10px rgba(74, 222, 128, 0.2)",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }}></div>
              <span>🟢 System Running</span>
            </div>

            <div
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                fontSize: "12.5px",
                fontWeight: "800",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 2px 10px rgba(56, 189, 248, 0.2)",
              }}
            >
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }}></div>
              <span>🔵 Database Connected</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#c4b5fd", fontSize: "12px" }}>
            <Lock size={14} style={{ color: "#4ade80" }} />
            <span>Authenticated Administrator Workspace · <span style={{ color: "#a855f7" }}>SSL Encrypted</span></span>
          </div>

        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "13px",
            color: "#c4b5fd",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img src="/logo.png" alt="Logo" style={{ width: "20px", height: "20px", opacity: 0.5 }} />
            <span>© {new Date().getFullYear()} MoveSmart Transit Operations Inc. All rights reserved.</span>
          </div>

          <div style={{ display: "flex", gap: "16px", fontWeight: "600" }}>
            <span style={{ color: "#c4b5fd" }}>MoveSmart Admin Console v2.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
