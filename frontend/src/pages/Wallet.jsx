import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { processRazorpayPayment } from "../utils/razorpay";

const API_BASE = "http://localhost:5000/api";

const getStoredUser = () => {
  try {
    const s = localStorage.getItem("user") || sessionStorage.getItem("user");
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
};

const getStoredToken = () => {
  const token =
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (
    !token ||
    token === "null" ||
    token === "undefined" ||
    typeof token !== "string" ||
    token.trim() === ""
  ) {
    return null;
  }
  return token.trim();
};

export default function Wallet() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Initial State — Zero/Empty defaults to avoid masking backend failures
  const [hasCard, setHasCard] = useState(false);
  const [balance, setBalance] = useState(0);
  const [lastFour, setLastFour] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [isLowBalance, setIsLowBalance] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Recharge State
  const [selectedQuickAmount, setSelectedQuickAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Razorpay");
  const [recharging, setRecharging] = useState(false);

  // History State
  const [transactions, setTransactions] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("All"); // All / Recharge / Travel
  const [loadingTxns, setLoadingTxns] = useState(true);

  // Modal & Toast States
  const [selectedTxn, setSelectedTxn] = useState(null); // Receipt modal
  const [successModalData, setSuccessModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    const u = getStoredUser();
    if (u) {
      setUser(u);
    }
  }, []);

  // 1. Fetch Wallet Balance & Card Info from Backend
  const fetchWalletBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      const u = getStoredUser();
      const token = getStoredToken();

      const params = {};
      if (u?.id || u?._id) params.userId = u.id || u._id;
      if (u?.email) params.email = u.email;

      const headers = {};
      // Guard against null/undefined token strings
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await axios.get(`${API_BASE}/wallet/balance`, {
        params,
        headers,
        withCredentials: true,
      });

      console.log("Wallet Balance API 200 Response:", res.data);

      if (res.data) {
        const hasActiveCard = Boolean(res.data.hasCard && res.data.cardNumber);
        setHasCard(hasActiveCard);
        // Strictly 0 if user has no approved RFID card
        const fetchedBalance = hasActiveCard ? Number(res.data.balance ?? 0) : 0;
        setBalance(fetchedBalance);
        setLastFour(hasActiveCard ? (res.data.lastFour || "") : "");
        setCardNumber(hasActiveCard ? (res.data.cardNumber || "") : "");
        setIsLowBalance(hasActiveCard && fetchedBalance < 30);
      } else {
        setHasCard(false);
        setBalance(0);
        setLastFour("");
        setCardNumber("");
        setIsLowBalance(false);
      }
    } catch (err) {
      // Log err.message, err.code, and err.response separately to distinguish CORS/Network failure vs HTTP status error
      console.error("Fetch Wallet Balance Error Details:", {
        errorMessage: err.message,
        errorCode: err.code,
        hasResponseObject: Boolean(err.response),
        status: err.response?.status,
        responseData: err.response?.data,
      });

      const serverErrMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Network or CORS connection error";
      showToast(`❌ Wallet Balance Error (${err.response?.status || err.code || "Network"}): ${serverErrMsg}`);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  // 2. Fetch Transaction History from Backend
  const fetchTransactions = useCallback(async (filterType) => {
    try {
      setLoadingTxns(true);
      const u = getStoredUser();
      const token = getStoredToken();

      const params = { type: filterType || "All" };
      if (u?.id || u?._id) params.userId = u.id || u._id;

      const headers = {};
      // Guard against null/undefined token strings
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await axios.get(`${API_BASE}/wallet/transactions`, {
        params,
        headers,
        withCredentials: true,
      });

      console.log("Transactions API 200 Response:", res.data);

      const txnList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.transactions)
        ? res.data.transactions
        : [];

      if (txnList.length === 0) {
        console.warn(
          "Transactions list is empty after 200 OK response. Raw response body:",
          res.data
        );
      }

      setTransactions(txnList);
    } catch (err) {
      // Log err.message, err.code, and err.response separately to distinguish CORS/Network failure vs HTTP status error
      console.error("Fetch Transactions Error Details:", {
        errorMessage: err.message,
        errorCode: err.code,
        hasResponseObject: Boolean(err.response),
        status: err.response?.status,
        responseData: err.response?.data,
      });

      const serverErrMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Network or CORS connection error";
      showToast(`❌ Transactions Error (${err.response?.status || err.code || "Network"}): ${serverErrMsg}`);
    } finally {
      setLoadingTxns(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance();
    fetchTransactions("All");
  }, [fetchWalletBalance, fetchTransactions]);

  // Handle Filter Change
  const handleFilterChange = (filter) => {
    setHistoryFilter(filter);
    fetchTransactions(filter);
  };

  // Handle Quick Amount Click
  const handleSelectQuickAmount = (amt) => {
    setSelectedQuickAmount(amt);
    setCustomAmount("");
  };

  // Handle Add Money Submit via Razorpay Checkout
  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (!hasCard) {
      showToast("⚠️ You must have an approved RFID Card to recharge your wallet.");
      return;
    }
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedQuickAmount;

    if (!finalAmount || finalAmount <= 0) {
      showToast("⚠️ Please enter a valid recharge amount.");
      return;
    }

    try {
      setRecharging(true);
      const u = getStoredUser();

      // Launch Razorpay Checkout Modal
      await processRazorpayPayment({
        amount: finalAmount,
        description: `MoveSmart Nol Wallet Top-Up (₹${finalAmount})`,
        userEmail: u?.email || "",
        userName: u?.fullName || u?.username || u?.name || "Kerala Passenger",
        userPhone: u?.phone || "",
        userId: u?.id || u?._id || "",
        paymentType: "wallet",
        tagId: cardNumber || "",
        onSuccess: async (data) => {
          setRecharging(false);

          // Re-fetch live balance & history directly from backend MongoDB
          await fetchWalletBalance();
          await fetchTransactions(historyFilter);

          const updatedBalance = data.newBalance !== undefined ? data.newBalance : (balance + finalAmount);
          setBalance(updatedBalance);
          setIsLowBalance(updatedBalance < 30);

          // Show Success Popup & Toast
          setSuccessModalData({
            amount: finalAmount,
            newBalance: updatedBalance,
            txnId: data.paymentId || data.transaction?.transactionId || `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
            paymentMethod: "Razorpay",
          });

          showToast(`🔔 ₹${finalAmount} added successfully via Razorpay!`);
          setCustomAmount("");
        },
        onError: (err) => {
          setRecharging(false);
          if (!err.message?.includes("cancelled")) {
            showToast(`❌ Payment Failed: ${err.message}`);
          } else {
            showToast("ℹ️ Payment cancelled by user.");
          }
        },
      });
    } catch (err) {
      console.error("Recharge Error:", err);
      setRecharging(false);
      showToast("❌ Failed to initiate Razorpay recharge.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#1e293b", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "84px",
          right: "24px",
          zIndex: 999,
          background: "#0f172a",
          color: "#ffffff",
          padding: "14px 20px",
          borderRadius: "14px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
          borderLeft: "4px solid #4ade80",
          fontWeight: "700",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "slideIn 0.3s ease",
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: "1000px", width: "100%", margin: "0 auto", padding: "30px 20px 60px 20px", flex: 1 }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#64748b" }}>
            <Link to="/dashboard" style={{ color: "#6d28d9", textDecoration: "none", fontWeight: "700" }}>Dashboard</Link>
            <span>/</span>
            <span style={{ color: "#1e293b", fontWeight: "700" }}>MoveSmart Wallet</span>
          </div>
          <button onClick={() => navigate("/dashboard")} className="rta-btn-secondary" style={{ padding: "6px 14px", fontSize: "12.5px" }}>
            ← Back to Dashboard
          </button>
        </div>

        {/* Hero Banner Header */}
        <div style={{
          background: "linear-gradient(135deg, #2e1065 0%, #1e1b4b 100%)",
          borderRadius: "24px",
          padding: "28px",
          color: "#ffffff",
          boxShadow: "0 15px 35px rgba(46, 16, 101, 0.25)",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: "-40px", top: "-40px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.15) 0%, rgba(167,139,250,0) 70%)", pointerEvents: "none" }} />
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", borderRadius: "999px", background: "rgba(255, 255, 255, 0.12)", backdropFilter: "blur(8px)", fontSize: "11.5px", fontWeight: "800", color: "#4ade80", marginBottom: "10px", border: "1px solid rgba(74, 222, 128, 0.3)" }}>
                ⚡ RAZORPAY PAYMENT GATEWAY SECURED
              </div>
              <h1 style={{ fontSize: "26px", fontWeight: "900", margin: 0, letterSpacing: "-0.5px" }}>
                MoveSmart Nol Transit Wallet
              </h1>
              <p style={{ fontSize: "13.5px", color: "#cbd5e1", margin: "6px 0 0 0" }}>
                Seamless zero-friction recharges via Razorpay &amp; real-time bus fare tracking connected to MongoDB database.
              </p>
            </div>

            {/* User Badge */}
            {user && (
              <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "12px 18px", textAlign: "right" }}>
                <div style={{ fontSize: "11px", color: "#a78bfa", fontWeight: "700", textTransform: "uppercase" }}>Account Owner</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#ffffff" }}>{user.fullName || user.username || user.name || "Kerala Passenger"}</div>
                <div style={{ fontSize: "11.5px", color: "#94a3b8" }}>{user.email || user.phone || "Active User"}</div>
              </div>
            )}
          </div>
        </div>

        {/* LOW BALANCE ALERT WARNING BANNER */}
        {isLowBalance && hasCard && (
          <div style={{
            background: "rgba(225, 29, 72, 0.08)",
            border: "1.5px solid rgba(225, 29, 72, 0.3)",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>⚠️</span>
              <div>
                <strong style={{ fontSize: "14px", color: "#e11d48", display: "block" }}>Low balance – please recharge before travelling!</strong>
                <span style={{ fontSize: "12.5px", color: "#475569" }}>Your current balance is below ₹30. Recharge now to avoid bus tap-in delays.</span>
              </div>
            </div>
            <button onClick={() => document.getElementById("recharge-section")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "8px 16px", borderRadius: "10px", background: "#e11d48", color: "#ffffff", border: "none", fontWeight: "800", fontSize: "12.5px", cursor: "pointer" }}>
              Recharge Now →
            </button>
          </div>
        )}

        {/* Top Grid: Balance Card & Quick Recharge / Book Card */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px", marginBottom: "32px" }}>
          
          {/* 1. WALLET DASHBOARD BALANCE CARD */}
          <div style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%)",
            borderRadius: "24px",
            padding: "28px",
            color: "#ffffff",
            boxShadow: "0 14px 30px rgba(30, 27, 75, 0.2)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(167, 139, 250, 0.3)",
          }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                <span style={{ fontSize: "12.5px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", color: "#a78bfa" }}>
                  💰 Current Balance
                </span>
                <span style={{
                  background: hasCard ? "rgba(74, 222, 128, 0.15)" : "rgba(244, 63, 94, 0.2)",
                  color: hasCard ? "#4ade80" : "#fda4af",
                  border: `1px solid ${hasCard ? "rgba(74, 222, 128, 0.3)" : "rgba(244, 63, 94, 0.4)"}`,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "800"
                }}>
                  {hasCard ? "🟢 RFID CARD ACTIVE" : "❌ NO RFID CARD LINKED"}
                </span>
              </div>

              <div style={{ fontSize: "40px", fontWeight: "900", color: "#ffffff", letterSpacing: "-1px", marginBottom: "14px" }}>
                {loadingBalance ? "₹ ..." : (hasCard ? `₹ ${Number(balance || 0).toFixed(2)}` : "₹ 0.00")}
              </div>

              <div style={{ background: "rgba(255, 255, 255, 0.06)", borderRadius: "14px", padding: "14px 16px", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>Linked Smart Card</div>
                  <div style={{ fontSize: "14px", fontFamily: "monospace", fontWeight: "800", color: hasCard ? "#e2e8f0" : "#fda4af", marginTop: "2px" }}>
                    {hasCard ? (lastFour ? `•••• •••• ${lastFour}` : cardNumber) : "No Active Card"}
                  </div>
                </div>
                <span style={{ fontSize: "20px" }}>🪪</span>
              </div>
            </div>

            <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed rgba(255, 255, 255, 0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#cbd5e1" }}>
              <span>{hasCard ? "Auto Tap-In Ready" : "Transit Access"}</span>
              <span style={{ color: hasCard ? "#4ade80" : "#fda4af", fontWeight: "800" }}>
                {hasCard ? "✓ Instant Bus Fare Deduction" : "⚠️ Card Required to Travel"}
              </span>
            </div>
          </div>

          {/* 2. ADD MONEY (OR BOOK RFID CARD IF USER HAS NO CARD) */}
          {!hasCard && !loadingBalance ? (
            <div style={{
              background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
              borderRadius: "24px",
              padding: "28px",
              border: "2px dashed #c084fc",
              boxShadow: "0 10px 25px rgba(109, 40, 217, 0.06)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              textAlign: "center",
            }}>
              <div>
                <div style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "18px",
                  background: "rgba(109, 40, 217, 0.1)",
                  color: "#6d28d9",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  marginBottom: "14px"
                }}>
                  🪪
                </div>
                <h3 style={{ fontSize: "19px", fontWeight: "900", color: "#1e293b", margin: "0 0 6px 0" }}>
                  Book an RFID Card
                </h3>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.5", margin: "0 auto 16px auto", maxWidth: "340px" }}>
                  You don't have an active RFID Card linked to your account. Apply for an RFID Smart Card to unlock instant wallet recharges and contactless bus tap-in.
                </p>
                
                <div style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "12px", padding: "10px 14px", fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "20px", textAlign: "left" }}>
                  🔒 Adding funds to wallet is enabled immediately once your RFID card is issued &amp; active.
                </div>
              </div>

              <button
                onClick={() => navigate("/dashboard/card-application")}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(109, 40, 217, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                Book / Apply RFID Card →
              </button>
            </div>
          ) : (
            <div id="recharge-section" style={{ background: "#ffffff", borderRadius: "24px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#1e293b", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                💳 Add Money via Razorpay
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 0 18px 0" }}>
                Select an amount to pay securely via UPI, Credit/Debit Card, Netbanking, or Wallet using Razorpay.
              </p>

              <form onSubmit={handleAddMoney}>
                
                {/* Quick Amount Buttons */}
                <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                  Quick Recharge Amount
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
                  {[50, 100, 200, 500].map((amt) => {
                    const isSelected = selectedQuickAmount === amt && !customAmount;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleSelectQuickAmount(amt)}
                        style={{
                          padding: "12px 6px",
                          borderRadius: "12px",
                          border: `2px solid ${isSelected ? "#6d28d9" : "#e2e8f0"}`,
                          background: isSelected ? "rgba(109, 40, 217, 0.08)" : "#f8fafc",
                          color: isSelected ? "#6d28d9" : "#334155",
                          fontWeight: "800",
                          fontSize: "14px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div style={{ marginBottom: "18px" }}>
                  <label htmlFor="customAmount" style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                    Or Enter Custom Amount (₹)
                  </label>
                  <input
                    id="customAmount"
                    type="number"
                    min="1"
                    max="10000"
                    className="rta-input-field"
                    placeholder="e.g. 150"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedQuickAmount(null);
                    }}
                  />
                </div>

                {/* Payment Method Badge */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
                    🔒 Payment Gateway
                  </label>
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: "14px",
                    border: "1.5px solid #2e1065",
                    background: "rgba(46, 16, 101, 0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "20px" }}>🔷</span>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#2e1065", display: "block" }}>Razorpay Checkout</strong>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>UPI, GPay, PhonePe, Cards, NetBanking</span>
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: "800", background: "#2e1065", color: "#ffffff", padding: "3px 8px", borderRadius: "6px" }}>
                      SECURED
                    </span>
                  </div>
                </div>

                {/* Submit Add Money Button */}
                <button
                  type="submit"
                  disabled={recharging}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "800",
                    fontSize: "15px",
                    cursor: recharging ? "not-allowed" : "pointer",
                    boxShadow: "0 8px 20px rgba(46, 16, 101, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {recharging ? "Opening Razorpay..." : `Pay via Razorpay (₹${customAmount || selectedQuickAmount || 0}) →`}
                </button>

              </form>
            </div>
          )}

        </div>

        {/* 📜 PAYMENT HISTORY SECTION (GOOGLE PAY STYLE PERSISTED IN MONGODB) */}
        <div style={{ background: "#ffffff", borderRadius: "24px", padding: "28px", border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.04)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "900", color: "#1e293b", margin: 0 }}>
                📜 Payment &amp; Transaction History
              </h3>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "4px 0 0 0" }}>
                Connected to MongoDB database — live Razorpay recharges &amp; transit deductions.
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["All", "Recharge", "Travel"].map((flt) => {
                const isSelected = historyFilter === flt;
                return (
                  <button
                    key={flt}
                    type="button"
                    onClick={() => handleFilterChange(flt)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: `1.5px solid ${isSelected ? "#6d28d9" : "#e2e8f0"}`,
                      background: isSelected ? "#6d28d9" : "#f8fafc",
                      color: isSelected ? "#ffffff" : "#475569",
                      fontWeight: "800",
                      fontSize: "12.5px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {flt === "All" ? "All Logs" : flt === "Recharge" ? "➕ Recharges" : "➖ Travel Deductions"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transactions List */}
          {loadingTxns ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Fetching live transaction history from database...
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              No transaction history found in database under the "{historyFilter}" filter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {transactions.map((t) => {
                const isDebit = t.isDebit || t.type === "Travel" || t.type === "Card Application" || t.type === "Bus Booking";
                const isSuccess = t.status === "Success" || !t.status;
                const statusColor = isSuccess ? "#16a34a" : t.status === "Pending" ? "#d97706" : "#dc2626";
                const iconBg = isDebit ? "rgba(225, 29, 72, 0.08)" : "rgba(34, 197, 94, 0.08)";
                const iconColor = isDebit ? "#dc2626" : "#16a34a";

                return (
                  <div
                    key={t._id || t.transactionId}
                    onClick={() => setSelectedTxn(t)}
                    style={{
                      padding: "16px 20px",
                      borderRadius: "16px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#c084fc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    {/* Left Icon & Info */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ width: "46px", height: "46px", borderRadius: "14px", background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "900" }}>
                        {isDebit ? "🚌" : "💳"}
                      </div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "14.5px", color: "#1e293b" }}>
                          {t.description || (isDebit ? "Bus Fare / Service Charge" : "Wallet Top-Up")}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span>{t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Recent"}</span>
                          <span>•</span>
                          <span style={{ color: statusColor, fontWeight: "800" }}>
                            🟢 {t.status || "Success"}
                          </span>
                          <span style={{ background: "rgba(46, 16, 101, 0.08)", color: "#2e1065", padding: "1px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: "700" }}>
                            {t.paymentMethod || "Razorpay"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Amount */}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: "900", color: isDebit ? "#dc2626" : "#16a34a" }}>
                        {isDebit ? `- ₹${t.amount}` : `+ ₹${t.amount}`}
                      </div>
                      <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#94a3b8", marginTop: "2px" }}>
                        {t.razorpayPaymentId || t.transactionId}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {/* 📊 1. TRANSACTION DETAILS RECEIPT MODAL */}
      {selectedTxn && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: "480px", width: "90%", padding: "28px", borderRadius: "24px" }}>
            
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: selectedTxn.isDebit ? "rgba(225, 29, 72, 0.1)" : "rgba(34, 197, 94, 0.1)", color: selectedTxn.isDebit ? "#dc2626" : "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "10px" }}>
                {selectedTxn.isDebit ? "🚌" : "✓"}
              </div>
              <h3 style={{ fontSize: "24px", fontWeight: "900", color: "#1e293b", margin: 0 }}>
                {selectedTxn.isDebit ? `- ₹${selectedTxn.amount}` : `+ ₹${selectedTxn.amount}`}
              </h3>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#16a34a", marginTop: "4px" }}>
                🟢 Payment {selectedTxn.status || "Success"}
              </div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: "16px", padding: "16px", border: "1px solid #e2e8f0", fontSize: "13px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Description:</span>
                <strong style={{ color: "#1e293b", textAlign: "right" }}>{selectedTxn.description}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Transaction ID:</span>
                <strong style={{ fontFamily: "monospace", color: "#6d28d9" }}>{selectedTxn.transactionId}</strong>
              </div>
              {selectedTxn.razorpayPaymentId && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Razorpay Payment ID:</span>
                  <strong style={{ fontFamily: "monospace", color: "#2563eb" }}>{selectedTxn.razorpayPaymentId}</strong>
                </div>
              )}
              {selectedTxn.razorpayOrderId && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Razorpay Order ID:</span>
                  <strong style={{ fontFamily: "monospace", color: "#475569" }}>{selectedTxn.razorpayOrderId}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Payment Gateway:</span>
                <strong>{selectedTxn.paymentMethod || "Razorpay"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Date &amp; Time:</span>
                <strong>{selectedTxn.createdAt ? new Date(selectedTxn.createdAt).toLocaleString() : "Recent"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Smart Card Last 4:</span>
                <strong style={{ fontFamily: "monospace" }}>{selectedTxn.cardNumber || lastFour ? `•••• ${selectedTxn.cardNumber || lastFour}` : "N/A"}</strong>
              </div>
            </div>

            <button onClick={() => setSelectedTxn(null)} className="rta-btn-primary" style={{ width: "100%", padding: "12px", justifyContent: "center" }}>
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* ✅ 2. RECHARGE SUCCESS POPUP MODAL */}
      {successModalData && (
        <div className="modal-overlay" style={{ zIndex: 300 }}>
          <div className="modal-content" style={{ maxWidth: "440px", width: "90%", padding: "28px", textAlign: "center", borderRadius: "24px" }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", background: "rgba(34, 197, 94, 0.12)", color: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "36px", marginBottom: "14px" }}>
              ✓
            </div>
            <h3 style={{ fontSize: "22px", fontWeight: "900", color: "#15803d", margin: 0 }}>
              Recharge Successful!
            </h3>
            <p style={{ fontSize: "13.5px", color: "#64748b", margin: "6px 0 20px 0" }}>
              ₹{successModalData.amount} has been added to your MoveSmart Nol Wallet via {successModalData.paymentMethod}.
            </p>

            <div style={{ background: "rgba(56, 161, 105, 0.08)", border: "1px solid rgba(56, 161, 105, 0.2)", borderRadius: "16px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#15803d", fontWeight: "700", textTransform: "uppercase" }}>New Updated Balance</div>
              <div style={{ fontSize: "28px", fontWeight: "900", color: "#14532d" }}>
                ₹ {Number(successModalData.newBalance).toFixed(2)}
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", fontFamily: "monospace" }}>
                Razorpay Ref ID: {successModalData.txnId}
              </div>
            </div>

            <button onClick={() => setSuccessModalData(null)} className="rta-btn-primary" style={{ width: "100%", padding: "12px", justifyContent: "center", background: "#16a34a" }}>
              Done &amp; Return to Wallet
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
