import React from "react";
import { Shield, Server, Lock, Cpu } from "lucide-react";

export default function AdminFooter() {
  return (
    <footer
      style={{
        background: "#0f172a",
        color: "#94a3b8",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        padding: "32px 24px 24px 24px",
        marginTop: "auto",
        fontSize: "13px",
      }}
    >
      <div style={{ maxWidth: "1380px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "20px" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#34d399",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontSize: "12px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Server size={14} />
              <span>System Status: Operations API Online</span>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                fontSize: "12px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Cpu size={14} />
              <span>MongoDB Atlas Connected</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px" }}>
            <Lock size={14} />
            <span>Authenticated Administrator Workspace · SSL Encrypted</span>
          </div>

        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            paddingTop: "16px",
            display: "flex",
            justify: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "12px",
            color: "#64748b",
          }}
        >
          <div>
            © {new Date().getFullYear()} MoveSmart Transit Operations Inc. All rights reserved.
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            <span style={{ color: "#94a3b8" }}>MoveSmart Admin Console v2.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
