// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";

// function Landing() {
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState("planner");
//   const [user, setUser] = useState(null);

//   // Authentication check
//   useEffect(() => {
//     const savedUser = localStorage.getItem("user");
//     if (savedUser) {
//       setUser(JSON.parse(savedUser));
//     }
//   }, []);

//   // Wojhati Planner States
//   const [origin, setOrigin] = useState("Al Ghubaiba Bus Station");
//   const [destination, setDestination] = useState("Dubai Mall Bus Station");
//   const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
//   const [planTime, setPlanTime] = useState("12:00");
//   const [plannerResults, setPlannerResults] = useState(null);

//   // Nol Balance Checker States
//   const [nolTagId, setNolTagId] = useState("");
//   const [balanceResult, setBalanceResult] = useState(null);
//   const [checkError, setCheckError] = useState("");

//   // Nol Top Up States
//   const [topUpTagId, setTopUpTagId] = useState("");
//   const [topUpAmount, setTopUpAmount] = useState("50");
//   const [topUpSuccess, setTopUpSuccess] = useState(false);

//   // Bus Route Schedule Search States
//   const [routeQuery, setRouteQuery] = useState("");
//   const [scheduleResult, setScheduleResult] = useState(null);

//   // Intercity Booking States
//   const [intercityFrom, setIntercityFrom] = useState("Dubai (Al Ghubaiba)");
//   const [intercityTo, setIntercityTo] = useState("Abu Dhabi (Central Bus Station)");
//   const [intercitySeats, setIntercitySeats] = useState("1");
//   const [intercitySuccess, setIntercitySuccess] = useState(false);

//   // Mahboub Chatbot States
//   const [chatOpen, setChatOpen] = useState(false);
//   const [chatMessages, setChatMessages] = useState([
//     { sender: "bot", text: "Marhaban! I am Mahboub, your RTA Virtual Assistant. How can I help you navigate Dubai today?" }
//   ]);
//   const [chatInput, setChatInput] = useState("");

//   // Wojhati Search Handler
//   const handleSearchRoutes = () => {
//     if (!origin || !destination) return;
    
//     // Mock route generation
//     const mockRoutes = [
//       {
//         id: 1,
//         mode: "Bus + Metro",
//         duration: "45 mins",
//         fare: "7.50 AED",
//         steps: [
//           { type: "Walk", desc: `Walk from ${origin} to nearest stop (2 mins)` },
//           { type: "Bus", desc: "Board Bus C01 towards Gold Souq (4 stops)" },
//           { type: "Metro", desc: "Transfer at Union Metro Station (Red Line) to Dubai Mall" },
//           { type: "Walk", desc: `Arrive at ${destination} (3 mins)` }
//         ]
//       },
//       {
//         id: 2,
//         mode: "Direct Bus",
//         duration: "65 mins",
//         fare: "5.00 AED",
//         steps: [
//           { type: "Bus", desc: `Board Bus 29 from ${origin} directly` },
//           { type: "Walk", desc: `Alight and walk to ${destination} (5 mins)` }
//         ]
//       }
//     ];
//     setPlannerResults(mockRoutes);
//   };

//   // Nol Balance Checker Handler
//   const handleCheckBalance = () => {
//     setCheckError("");
//     setBalanceResult(null);

//     if (!nolTagId) {
//       setCheckError("Please enter your 10-digit Nol Tag ID.");
//       return;
//     }

//     if (nolTagId.length !== 10 || isNaN(nolTagId)) {
//       setCheckError("Nol Tag ID must be exactly 10 digits.");
//       return;
//     }

//     // Mock DB resolution based on digit patterns
//     const cardType = nolTagId.startsWith("5") ? "Gold Nol Card" : 
//                      nolTagId.startsWith("3") ? "Personal Blue Nol Card" : 
//                      "Silver Nol Card";
    
//     // Deterministic mock balance
//     const balance = (parseInt(nolTagId.substring(4, 8)) % 250) + 12.50;

//     setBalanceResult({
//       tagId: nolTagId,
//       type: cardType,
//       balance: balance.toFixed(2),
//       expiry: "12/2031",
//       status: "Active"
//     });
//   };

//   // Nol Top Up Handler
//   const handleTopUpSubmit = (e) => {
//     e.preventDefault();
//     if (!topUpTagId || topUpTagId.length !== 10 || isNaN(topUpTagId)) {
//       alert("Please enter a valid 10-digit Nol Tag ID.");
//       return;
//     }
    
//     // Save to top up history
//     setTopUpSuccess(true);
//     setTimeout(() => {
//       setTopUpSuccess(false);
//       setTopUpTagId("");
//     }, 4000);
//   };

//   // Route Schedule Search Handler
//   const handleSearchSchedule = () => {
//     if (!routeQuery) return;
//     const q = routeQuery.toUpperCase().trim();

//     const mockRoutesDb = {
//       "C01": {
//         name: "Al Ghubaiba Bus Station ➜ Gold Souq Bus Station",
//         frequency: "Every 8 mins",
//         stops: ["Al Ghubaiba Station", "Falcon Intersection", "Plaza Hotel", "Khaleej Road", "Gold Souq Station"],
//         timetable: ["06:00", "06:08", "06:16", "06:24", "06:32", "06:40"]
//       },
//       "8": {
//         name: "Ibn Battuta Metro Station ➜ Gold Souq Bus Station",
//         frequency: "Every 15 mins",
//         stops: ["Ibn Battuta Metro", "Jumeirah Beach Residence", "Dubai Marina", "Burj Al Arab", "Jumeirah Mosque", "Gold Souq Station"],
//         timetable: ["05:30", "05:45", "06:00", "06:15", "06:30"]
//       },
//       "F11": {
//         name: "Rowdah Stop ➜ Financial Centre Metro Station",
//         frequency: "Every 12 mins",
//         stops: ["Rowdah Stop", "Satwa Bus Station", "Iranian Hospital", "Financial Centre Metro Station"],
//         timetable: ["06:10", "06:22", "06:34", "06:46", "06:58"]
//       }
//     };

//     if (mockRoutesDb[q]) {
//       setScheduleResult({
//         route: q,
//         ...mockRoutesDb[q]
//       });
//     } else {
//       setScheduleResult({
//         route: q,
//         error: "Route not found. Try searching C01, 8, or F11."
//       });
//     }
//   };

//   // Intercity Booking Handler
//   const handleIntercitySubmit = (e) => {
//     e.preventDefault();
//     setIntercitySuccess(true);
//     setTimeout(() => {
//       setIntercitySuccess(false);
//     }, 4000);
//   };

//   // Chatbot Handler
//   const handleChatSend = (e) => {
//     e.preventDefault();
//     if (!chatInput.trim()) return;

//     const userText = chatInput;
//     const newMessages = [...chatMessages, { sender: "user", text: userText }];
//     setChatMessages(newMessages);
//     setChatInput("");

//     // Simulate smart bot typing answers
//     setTimeout(() => {
//       let botResponse = "I'm sorry, I didn't quite catch that. You can ask me to 'Check C01 schedule', 'Check Nol types' or 'Fares'.";
//       const q = userText.toLowerCase();

//       if (q.includes("c01") || q.includes("route 8") || q.includes("f11")) {
//         botResponse = "You can search for live timetables on the Bus Schedule tab on the main page. C01 operates every 8 minutes from Al Ghubaiba.";
//       } else if (q.includes("nol") || q.includes("card")) {
//         botResponse = "Dubai offers Silver, Gold, Blue (Personalized), and Red Nol cards. You can top up or apply directly in the Nol Card tab above!";
//       } else if (q.includes("abu dhabi") || q.includes("intercity")) {
//         botResponse = "Yes, intercity buses (e.g. E101) run from Al Ghubaiba and Ibn Battuta to Abu Dhabi Central Station. Check out the Intercity tab!";
//       } else if (q.includes("fare") || q.includes("price")) {
//         botResponse = "Fares depend on transit zones. A 1-zone trip costs 3.00 AED on Silver Nol and 6.00 AED on Gold Nol.";
//       }

//       setChatMessages(prev => [...prev, { sender: "bot", text: botResponse }]);
//     }, 600);
//   };

//   const swapPlannerAddresses = () => {
//     const temp = origin;
//     setOrigin(destination);
//     setDestination(temp);
//   };

//   const handleLogout = () => {
//     localStorage.removeItem("user");
//     localStorage.removeItem("authToken");
//     setUser(null);
//     navigate("/login");
//   };

//   return (
//     <div className="rta-body-theme">
//       {/* MoveSmart Header Navigation */}
//       <nav className="rta-nav">
//         <Link to="/" className="rta-logo">
//           <div className="brand-icon" style={{ display: "inline-flex", background: "var(--primary)", color: "#fff", padding: "6px", borderRadius: "8px", marginRight: "4px" }}>
//             <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//               <rect x="2" y="6" width="20" height="12" rx="2" />
//               <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
//               <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
//               <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
//             </svg>
//           </div>
//           <span>MoveSmart Portal</span>
//         </Link>
//         <div className="rta-nav-menu">
//           <a href="#services" className="rta-nav-link">Bus Services</a>
//           <a href="#nol-hub" className="rta-nav-link">Nol Portal</a>
//           <a href="#schedules" className="rta-nav-link">Schedules</a>
//           {user ? (
//             <>
//               <Link to="/profile" className="rta-nav-link active">Profile ({user.name})</Link>
//               <button onClick={handleLogout} className="rta-btn-secondary" style={{ padding: "8px 16px" }}>Sign Out</button>
//             </>
//           ) : (
//             <>
//               <Link to="/login" className="rta-nav-link">Sign In</Link>
//               <Link to="/signup" className="rta-btn-primary">Register</Link>
//             </>
//           )}
//         </div>
//       </nav>

//       {/* MoveSmart Hero Portal section */}
//       <header className="rta-hero">
//         <h1 className="rta-hero-title">MoveSmart <span>Transit Portal</span></h1>
//         <p className="rta-hero-subtitle">
//           Plan urban routes, manage your virtual Nol wallet, view timetables, and book intercity coach lines on the smart grid.
//         </p>
//       </header>

//       {/* Wojhati & Travel Services Container */}
//       <main className="rta-section" style={{ marginTop: "0" }}>
//         <div className="rta-planner-card">
//           <div className="rta-tabs-header">
//             <button 
//               className={`rta-tab-btn ${activeTab === "planner" ? "active" : ""}`}
//               onClick={() => setActiveTab("planner")}
//             >
//               Wojhati Journey Planner
//             </button>
//             <button 
//               className={`rta-tab-btn ${activeTab === "nol" ? "active" : ""}`}
//               onClick={() => setActiveTab("nol")}
//             >
//               Nol Card Portal
//             </button>
//             <button 
//               className={`rta-tab-btn ${activeTab === "schedules" ? "active" : ""}`}
//               onClick={() => setActiveTab("schedules")}
//             >
//               Bus Timetables
//             </button>
//             <button 
//               className={`rta-tab-btn ${activeTab === "intercity" ? "active" : ""}`}
//               onClick={() => setActiveTab("intercity")}
//             >
//               Intercity Tickets
//             </button>
//           </div>

//           {/* TAB 1: WOJHATI JOURNEY PLANNER */}
//           {activeTab === "planner" && (
//             <div className="fade-in-section">
//               <div className="rta-planner-grid">
//                 <div className="rta-input-group">
//                   <label htmlFor="planner-origin">Origin / Starting Stop</label>
//                   <input 
//                     id="planner-origin"
//                     type="text" 
//                     className="rta-input-field" 
//                     value={origin}
//                     onChange={(e) => setOrigin(e.target.value)}
//                     placeholder="e.g. Al Ghubaiba Bus Station"
//                   />
//                 </div>
                
//                 <button className="rta-swap-btn" onClick={swapPlannerAddresses} aria-label="Swap locations">
//                   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5">
//                     <path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4" />
//                   </svg>
//                 </button>

//                 <div className="rta-input-group">
//                   <label htmlFor="planner-destination">Destination Stop</label>
//                   <input 
//                     id="planner-destination"
//                     type="text" 
//                     className="rta-input-field" 
//                     value={destination}
//                     onChange={(e) => setDestination(e.target.value)}
//                     placeholder="e.g. Dubai Mall Bus Station"
//                   />
//                 </div>

//                 <div className="rta-input-group">
//                   <label htmlFor="planner-date">Date</label>
//                   <input 
//                     id="planner-date"
//                     type="date" 
//                     className="rta-input-field" 
//                     value={planDate}
//                     onChange={(e) => setPlanDate(e.target.value)}
//                   />
//                 </div>

//                 <div className="rta-input-group">
//                   <label htmlFor="planner-time">Departure Time</label>
//                   <input 
//                     id="planner-time"
//                     type="time" 
//                     className="rta-input-field" 
//                     value={planTime}
//                     onChange={(e) => setPlanTime(e.target.value)}
//                   />
//                 </div>
//               </div>

//               <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
//                 <button className="rta-btn-primary" onClick={handleSearchRoutes}>
//                   Find Route Options
//                 </button>
//               </div>

//               {/* Wojhati Results */}
//               {plannerResults && (
//                 <div style={{ marginTop: "30px", borderTop: "1px solid var(--rta-gray-border)", paddingTop: "25px" }}>
//                   <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "15px" }}>Recommended Routes</h3>
//                   <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
//                     {plannerResults.map((res) => (
//                       <div key={res.id} className="rta-card" style={{ padding: "20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "15px" }}>
//                         <div style={{ flex: "1" }}>
//                           <span style={{ backgroundColor: "rgba(214, 28, 28, 0.1)", color: "var(--rta-red)", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "700" }}>
//                             {res.mode}
//                           </span>
//                           <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
//                             {res.steps.map((s, idx) => (
//                               <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
//                                 <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "var(--rta-red)", marginTop: "6px" }}></span>
//                                 <span style={{ fontSize: "14px", color: "#4A515A" }}>{s.desc}</span>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                         <div style={{ textAlign: "right", minWidth: "100px" }}>
//                           <div style={{ fontSize: "18px", fontWeight: "800", color: "#1F2226" }}>{res.duration}</div>
//                           <div style={{ fontSize: "14px", color: "var(--rta-gold)", fontWeight: "700" }}>{res.fare} est.</div>
//                           <button className="rta-btn-primary" style={{ padding: "6px 14px", fontSize: "12.5px", marginTop: "12px" }}>Select</button>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* TAB 2: NOL SERVICES (BALANCE CHECKER & TOP UP) */}
//           {activeTab === "nol" && (
//             <div className="fade-in-section">
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                
//                 {/* Balance Checker */}
//                 <div style={{ borderRight: "1px solid var(--rta-gray-border)", paddingRight: "30px" }}>
//                   <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "15px" }}>Check Nol Card Balance</h3>
//                   <p style={{ color: "#717B87", fontSize: "13.5px", marginBottom: "20px" }}>
//                     Enter the 10-digit Nol Tag ID printed on the back of your physical Nol Card.
//                   </p>
                  
//                   <div className="rta-input-group" style={{ marginBottom: "16px" }}>
//                     <label htmlFor="nol-tag-input">Nol Card Tag ID</label>
//                     <input 
//                       id="nol-tag-input"
//                       type="text" 
//                       maxLength="10"
//                       className="rta-input-field" 
//                       value={nolTagId}
//                       onChange={(e) => setNolTagId(e.target.value.replace(/\D/g, ''))}
//                       placeholder="e.g. 3028374829"
//                     />
//                   </div>

//                   <button className="rta-btn-primary" onClick={handleCheckBalance}>
//                     Check Balance
//                   </button>

//                   {checkError && (
//                     <div style={{ color: "var(--rta-red)", fontSize: "13.5px", marginTop: "12px", fontWeight: "600" }}>
//                       {checkError}
//                     </div>
//                   )}

//                   {balanceResult && (
//                     <div className="fade-in-section" style={{ marginTop: "24px" }}>
//                       <div className={`rta-nol-card-preview ${balanceResult.type.toLowerCase().includes("gold") ? "gold" : balanceResult.type.toLowerCase().includes("blue") ? "blue" : "silver"}`}>
//                         <div className="rta-nol-card-header">
//                           <span className="rta-nol-brand">nol</span>
//                           <div className="rta-nol-chip"></div>
//                         </div>
//                         <div className="rta-nol-card-body">
//                           <div className="rta-nol-balance-title">Balance</div>
//                           <div className="rta-nol-balance-val">{balanceResult.balance} AED</div>
//                         </div>
//                         <div className="rta-nol-card-footer">
//                           <div className="rta-nol-number">{balanceResult.tagId}</div>
//                           <div className="rta-nol-status">{balanceResult.status}</div>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>

//                 {/* Instant Top Up */}
//                 <div>
//                   <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "15px" }}>Instant Nol Top-Up</h3>
//                   <p style={{ color: "#717B87", fontSize: "13.5px", marginBottom: "20px" }}>
//                     Top up your card instantly. Payments are processed securely. Minimum top-up is 10 AED.
//                   </p>

//                   {topUpSuccess ? (
//                     <div className="rta-card" style={{ borderColor: "#059669", backgroundColor: "rgba(5, 150, 105, 0.05)", textAlign: "center", padding: "30px 20px" }}>
//                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ marginBottom: "12px" }}>
//                         <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
//                         <polyline points="22 4 12 14.01 9 11.01" />
//                       </svg>
//                       <h4 style={{ color: "#059669", fontWeight: "800", fontSize: "16px", marginBottom: "6px" }}>Top-Up Successful!</h4>
//                       <p style={{ fontSize: "13px", color: "#4A515A" }}>We have loaded the funds to your Nol Card. Tapping it at any gate will reflect your new balance.</p>
//                     </div>
//                   ) : (
//                     <form onSubmit={handleTopUpSubmit}>
//                       <div className="rta-input-group" style={{ marginBottom: "16px" }}>
//                         <label htmlFor="topup-tag-input">Nol Card Tag ID</label>
//                         <input 
//                           id="topup-tag-input"
//                           type="text" 
//                           maxLength="10"
//                           className="rta-input-field" 
//                           value={topUpTagId}
//                           onChange={(e) => setTopUpTagId(e.target.value.replace(/\D/g, ''))}
//                           placeholder="e.g. 3028374829"
//                           required
//                         />
//                       </div>
                      
//                       <div className="rta-input-group" style={{ marginBottom: "20px" }}>
//                         <label htmlFor="topup-amount-select">Select Top-Up Amount</label>
//                         <select 
//                           id="topup-amount-select"
//                           className="rta-input-field"
//                           value={topUpAmount}
//                           onChange={(e) => setTopUpAmount(e.target.value)}
//                         >
//                           <option value="20">20 AED</option>
//                           <option value="50">50 AED</option>
//                           <option value="100">100 AED</option>
//                           <option value="200">200 AED</option>
//                         </select>
//                       </div>

//                       <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
//                         Proceed to Payment
//                       </button>
//                     </form>
//                   )}
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* TAB 3: BUS TIMETABLES */}
//           {activeTab === "schedules" && (
//             <div className="fade-in-section">
//               <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Bus Timetables & Schedules</h3>
//               <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "20px" }}>
//                 Search for schedules by route name. Try searching **C01**, **8**, or **F11** for demo schedules.
//               </p>

//               <div className="rta-planner-grid" style={{ gridTemplateColumns: "3fr 1fr", maxWidth: "600px", margin: "0 auto 30px" }}>
//                 <div className="rta-input-group">
//                   <label htmlFor="route-search-input">Enter Route Number</label>
//                   <input 
//                     id="route-search-input"
//                     type="text" 
//                     className="rta-input-field" 
//                     placeholder="e.g. C01" 
//                     value={routeQuery} 
//                     onChange={(e) => setRouteQuery(e.target.value)}
//                   />
//                 </div>
//                 <button className="rta-btn-primary" onClick={handleSearchSchedule} style={{ alignSelf: "flex-end", height: "46px" }}>
//                   Search
//                 </button>
//               </div>

//               {scheduleResult && (
//                 <div className="fade-in-section" style={{ borderTop: "1px solid var(--rta-gray-border)", paddingTop: "25px" }}>
//                   {scheduleResult.error ? (
//                     <div style={{ textAlign: "center", color: "var(--rta-red)", fontWeight: "600", fontSize: "14px" }}>
//                       {scheduleResult.error}
//                     </div>
//                   ) : (
//                     <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "30px" }}>
//                       <div>
//                         <h4 style={{ fontSize: "16px", fontWeight: "800", color: "#1F2226", marginBottom: "4px" }}>
//                           Route {scheduleResult.route} Timetable
//                         </h4>
//                         <p style={{ fontSize: "13px", color: "var(--rta-gold)", fontWeight: "700", marginBottom: "15px" }}>
//                           {scheduleResult.name} ({scheduleResult.frequency})
//                         </p>
                        
//                         <div style={{ position: "relative", paddingLeft: "24px" }}>
//                           <div style={{ position: "absolute", left: "6px", top: "8px", bottom: "8px", width: "2px", backgroundColor: "var(--rta-red)" }}></div>
//                           {scheduleResult.stops.map((stop, idx) => (
//                             <div key={idx} style={{ position: "relative", paddingBottom: "20px" }}>
//                               <span style={{ position: "absolute", left: "-23px", top: "5px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "var(--rta-red)", border: "2px solid #FFFFFF" }}></span>
//                               <div style={{ fontWeight: "700", fontSize: "14px", color: "#1F2226" }}>{stop}</div>
//                               <div style={{ fontSize: "11px", color: "#717B87" }}>Stop #{1000 + idx}</div>
//                             </div>
//                           ))}
//                         </div>
//                       </div>
                      
//                       <div>
//                         <h4 style={{ fontSize: "15px", fontWeight: "800", color: "#1F2226", marginBottom: "12px" }}>Departure Times</h4>
//                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
//                           {scheduleResult.timetable.map((time, idx) => (
//                             <div key={idx} style={{ padding: "8px", backgroundColor: "var(--rta-gray-light)", borderRadius: "4px", textAlign: "center", fontSize: "13.5px", fontWeight: "600" }}>
//                               {time}
//                             </div>
//                           ))}
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* TAB 4: INTERCITY TICKETS */}
//           {activeTab === "intercity" && (
//             <div className="fade-in-section">
//               <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "8px" }}>Intercity Bus Ticket Booking</h3>
//               <p style={{ color: "#717B87", fontSize: "14px", marginBottom: "20px" }}>
//                 Reserve your tickets for intercity bus lines connecting Dubai to other Emirates.
//               </p>

//               {intercitySuccess ? (
//                 <div className="rta-card" style={{ borderColor: "#059669", backgroundColor: "rgba(5, 150, 105, 0.05)", textAlign: "center", padding: "40px 20px", maxWidth: "600px", margin: "0 auto" }}>
//                   <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" style={{ marginBottom: "15px" }}>
//                     <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
//                     <polyline points="22 4 12 14.01 9 11.01" />
//                   </svg>
//                   <h4 style={{ color: "#059669", fontWeight: "800", fontSize: "18px", marginBottom: "8px" }}>Reservation Confirmed!</h4>
//                   <p style={{ fontSize: "14px", color: "#4A515A", marginBottom: "15px" }}>
//                     Your ticket(s) from **{intercityFrom}** to **{intercityTo}** have been reserved.
//                   </p>
//                   <p style={{ fontSize: "12px", color: "#717B87" }}>
//                     A confirmation code has been registered to your profile account. Tap to view tickets in your Profile wallet.
//                   </p>
//                 </div>
//               ) : (
//                 <form onSubmit={handleIntercitySubmit} style={{ maxWidth: "600px", margin: "0 auto" }}>
//                   <div className="rta-input-group" style={{ marginBottom: "16px" }}>
//                     <label htmlFor="intercity-from-select">From (Origin City)</label>
//                     <select 
//                       id="intercity-from-select"
//                       className="rta-input-field" 
//                       value={intercityFrom} 
//                       onChange={(e) => setIntercityFrom(e.target.value)}
//                     >
//                       <option value="Dubai (Al Ghubaiba)">Dubai (Al Ghubaiba Station)</option>
//                       <option value="Dubai (Ibn Battuta)">Dubai (Ibn Battuta Station)</option>
//                       <option value="Sharjah">Sharjah (Al Jubail Station)</option>
//                       <option value="Abu Dhabi">Abu Dhabi (Central Station)</option>
//                     </select>
//                   </div>

//                   <div className="rta-input-group" style={{ marginBottom: "16px" }}>
//                     <label htmlFor="intercity-to-select">To (Destination City)</label>
//                     <select 
//                       id="intercity-to-select"
//                       className="rta-input-field" 
//                       value={intercityTo} 
//                       onChange={(e) => setIntercityTo(e.target.value)}
//                     >
//                       <option value="Abu Dhabi (Central Bus Station)">Abu Dhabi (Central Bus Station)</option>
//                       <option value="Sharjah (Al Jubail Bus Station)">Sharjah (Al Jubail Bus Station)</option>
//                       <option value="Ajman (Central Bus Station)">Ajman (Central Bus Station)</option>
//                       <option value="Al Ain (Central Station)">Al Ain (Central Station)</option>
//                     </select>
//                   </div>

//                   <div className="rta-planner-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
//                     <div className="rta-input-group">
//                       <label htmlFor="intercity-date">Departure Date</label>
//                       <input id="intercity-date" type="date" className="rta-input-field" defaultValue={planDate} />
//                     </div>
//                     <div className="rta-input-group">
//                       <label htmlFor="intercity-seats-select">Number of Seats</label>
//                       <select 
//                         id="intercity-seats-select"
//                         className="rta-input-field" 
//                         value={intercitySeats} 
//                         onChange={(e) => setIntercitySeats(e.target.value)}
//                       >
//                         <option value="1">1 Passenger</option>
//                         <option value="2">2 Passengers</option>
//                         <option value="3">3 Passengers</option>
//                         <option value="4">4 Passengers</option>
//                       </select>
//                     </div>
//                   </div>

//                   <button type="submit" className="rta-btn-primary" style={{ width: "100%", justifyContent: "center", height: "46px" }}>
//                     Confirm Reservation
//                   </button>
//                 </form>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Dubai Bus Hub Services */}
//         <section id="services" style={{ marginTop: "60px" }}>
//           <h2 className="rta-section-title">Dubai Bus Services</h2>
//           <p className="rta-section-subtitle">A comprehensive urban and intercity transport network catering to millions of daily riders.</p>
          
//           <div className="rta-services-grid">
//             <div className="rta-card">
//               <div className="rta-card-icon red">
//                 <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                   <rect x="2" y="6" width="20" height="12" rx="2" />
//                   <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
//                   <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
//                   <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
//                 </svg>
//               </div>
//               <h3>Urban Bus Routes</h3>
//               <p>Over 120 internal feeder and trunk bus lines crossing Dubai, linking neighborhoods, residential zones, and Metro stations seamlessly.</p>
//             </div>

//             <div className="rta-card">
//               <div className="rta-card-icon gold">
//                 <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                   <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
//                 </svg>
//               </div>
//               <h3>Nol Ticket Passes</h3>
//               <p>One card controls all transit inside Dubai. Easily top up Silver, Gold, or Student cards online, checking balance within seconds.</p>
//             </div>

//             <div className="rta-card">
//               <div className="rta-card-icon blue">
//                 <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
//                   <circle cx="12" cy="12" r="10" />
//                   <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
//                 </svg>
//               </div>
//               <h3>Intercity Connections</h3>
//               <p>Comfortable, air-conditioned tour coaches leaving central Dubai stations for Sharjah, Abu Dhabi, Ajman, Fujairah, and Al Ain daily.</p>
//             </div>
//           </div>
//         </section>

//         {/* Nol Hub Branding Info */}
//         <section id="nol-hub" style={{ marginTop: "60px", backgroundColor: "#FFFFFF", borderRadius: "16px", padding: "40px", border: "1px solid var(--rta-gray-border)" }}>
//           <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "40px", alignItems: "center" }}>
//             <div>
//               <h2 style={{ fontFamily: "var(--rta-font-title)", fontWeight: "800", fontSize: "28px", color: "#1F2226", marginBottom: "15px" }}>The Smart Way to Pay</h2>
//               <p style={{ fontSize: "15px", color: "#4A515A", lineHeight: "1.6", marginBottom: "20px" }}>
//                 The **nol card** is a smart card that enables you to pay for the use of various RTA transport modes in Dubai with a single tap. 
//                 Use it to ride the Metro, Buses, Tram, and Water Buses, or even to pay for RTA Parking and purchase items at select convenience stores.
//               </p>
//               <div style={{ display: "flex", gap: "15px" }}>
//                 <Link to="/signup" className="rta-btn-primary">Apply for Nol Card</Link>
//                 <a href="#nol-hub" onClick={() => setActiveTab("nol")} className="rta-btn-secondary">Check Card Balance</a>
//               </div>
//             </div>

//             <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
//               <div className="rta-nol-card-preview silver">
//                 <div className="rta-nol-card-header">
//                   <span className="rta-nol-brand">nol</span>
//                   <div className="rta-nol-chip"></div>
//                 </div>
//                 <div className="rta-nol-card-body">
//                   <span style={{ fontSize: "14px", fontWeight: "700" }}>Silver Card</span>
//                 </div>
//                 <div className="rta-nol-card-footer">
//                   <div className="rta-nol-number">9028394857</div>
//                   <div className="rta-nol-status">Regular Fare</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </section>
//       </main>

//       {/* Floating Chatbot Widget (Mahboub Assistant) */}
//       <div>
//         <button className="rta-chat-toggle" onClick={() => setChatOpen(!chatOpen)} aria-label="Chat with Mahboub">
//           <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.5">
//             <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
//           </svg>
//         </button>

//         {chatOpen && (
//           <div className="rta-chat-window">
//             <div className="rta-chat-header">
//               <div className="rta-chat-title">
//                 <span style={{ backgroundColor: "#FFFFFF", color: "var(--rta-red)", width: "24px", height: "24px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px" }}>M</span>
//                 <span>Mahboub Assistant</span>
//               </div>
//               <button className="rta-chat-close" onClick={() => setChatOpen(false)}>×</button>
//             </div>
            
//             <div className="rta-chat-messages">
//               {chatMessages.map((msg, idx) => (
//                 <div key={idx} className={`rta-chat-bubble ${msg.sender}`}>
//                   {msg.text}
//                 </div>
//               ))}
//             </div>

//             <form className="rta-chat-input-area" onSubmit={handleChatSend}>
//               <input 
//                 type="text" 
//                 className="rta-chat-input" 
//                 value={chatInput} 
//                 onChange={(e) => setChatInput(e.target.value)} 
//                 placeholder="Ask me about routes, Nol card..."
//               />
//               <button type="submit" className="rta-chat-send" aria-label="Send message">
//                 ➜
//               </button>
//             </form>
//           </div>
//         )}
//       </div>

//       {/* Footer Branding */}
//       <footer style={{ backgroundColor: "#13112b", color: "#b7aed6", padding: "40px 5%", borderTop: "3px solid var(--primary)" }}>
//         <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifySelf: "space-between", flexWrap: "wrap", gap: "30px" }}>
//           <div>
//             <div className="rta-logo" style={{ color: "#FFFFFF", marginBottom: "15px" }}>
//               <div className="brand-icon" style={{ display: "inline-flex", background: "var(--primary)", color: "#fff", padding: "6px", borderRadius: "8px", marginRight: "4px" }}>
//                 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                   <rect x="2" y="6" width="20" height="12" rx="2" />
//                   <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
//                   <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
//                   <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
//                 </svg>
//               </div>
//               <span style={{ color: "#fff" }}>MoveSmart</span>
//             </div>
//             <p style={{ fontSize: "13px", maxWidth: "320px", lineHeight: "1.6", color: "#b7aed6" }}>
//               Smart Urban Transit &amp; Logistics portal companion. Optimized route scheduling, Nol wallet tracking, and carbon-footprint reduction diagnostics.
//             </p>
//           </div>
//           <div style={{ display: "flex", gap: "40px" }}>
//             <div>
//               <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Transit Services</h4>
//               <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
//                 <li><a href="#services" style={{ color: "#b7aed6", textDecoration: "none" }}>Dubai Bus Routes</a></li>
//                 <li><a href="#nol-hub" style={{ color: "#b7aed6", textDecoration: "none" }}>Nol Card System</a></li>
//                 <li><a href="#services" style={{ color: "#b7aed6", textDecoration: "none" }}>Intercity Coaches</a></li>
//               </ul>
//             </div>
//             <div>
//               <h4 style={{ color: "#FFFFFF", marginBottom: "12px", fontSize: "14px" }}>Support</h4>
//               <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
//                 <li><span style={{ cursor: "pointer", color: "#b7aed6" }} onClick={() => setChatOpen(true)}>Chat with Mahboub</span></li>
//                 <li><span style={{ color: "#b7aed6" }}>Call Center 800 9090</span></li>
//               </ul>
//             </div>
//           </div>
//         </div>
//         <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "30px", paddingTop: "20px", textAlign: "center", fontSize: "12px", color: "#717B87" }}>
//           © {new Date().getFullYear()} MoveSmart. Every trip counted. All rights reserved.
//         </div>
//       </footer>
//     </div>
//   );
// }

// export default Landing;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Sample live-feed data for the hero departure board.
// Swap this for a real /api/routes/live poll once the backend endpoint exists.
const ROUTES = [
  { line: "Route 12", dest: "Downtown Loop", eta: 3 },
  { line: "Route 47", dest: "Riverside Ave", eta: 7 },
  { line: "Route 8", dest: "Tech Park", eta: 1 },
  { line: "Route 21", dest: "North Terminal", eta: 12 },
  { line: "Route 3", dest: "Old Town", eta: 5 },
];

function DepartureBoard() {
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="board" role="img" aria-label="Live transit departure board">
      <div className="board-head">
        <span>LINE</span>
        <span>DESTINATION</span>
        <span>ETA</span>
      </div>
      {ROUTES.map((r, i) => {
        // Fake gentle countdown/refresh so the board feels alive.
        const eta = Math.max(1, r.eta - (ticks % r.eta === 0 ? 1 : 0) + ((ticks + i) % 4 === 0 ? 1 : 0));
        return (
          <div className="board-row" key={r.line} style={{ animationDelay: `${i * 90}ms` }}>
            <span className="board-line">{r.line}</span>
            <span className="board-dest">{r.dest}</span>
            <span className="board-eta">
              <span key={ticks + i} className="flip">{eta}</span>
              <span className="board-eta-unit">min</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-wrapper">
      <style>{`
        :root {
          --ms-bg: #0f0b1e;
          --ms-bg-soft: #171227;
          --ms-violet: #6c4fd6;
          --ms-violet-bright: #8a6ef0;
          --ms-lavender: #b8a6ff;
          --ms-text: #f3f0ff;
          --ms-muted: #b4a9d6;
          --ms-glass: rgba(255,255,255,0.06);
          --ms-glass-border: rgba(184,166,255,0.22);
          --ms-mono: 'JetBrains Mono', 'Courier New', monospace;
        }

        .landing-page-wrapper {
          min-height: 100vh;
          background:
            radial-gradient(60% 50% at 15% 0%, rgba(108,79,214,0.35) 0%, transparent 60%),
            radial-gradient(50% 40% at 100% 20%, rgba(184,166,255,0.18) 0%, transparent 55%),
            var(--ms-bg);
          color: var(--ms-text);
          font-family: 'Inter', system-ui, sans-serif;
          overflow-x: hidden;
        }

        .landing-page-wrapper a,
        .landing-page-wrapper button {
          font-family: inherit;
        }

        /* ---------- Nav ---------- */
        .lp-nav {
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 24px 0;
        }
        .lp-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: -0.01em;
        }
        .lp-brand-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--ms-violet), var(--ms-lavender));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .lp-nav-links {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .lp-nav-signin {
          background: none;
          border: none;
          color: var(--ms-muted);
          font-size: 0.95rem;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .lp-nav-signin:hover { color: var(--ms-text); }
        .lp-nav-cta {
          background: var(--ms-glass);
          border: 1px solid var(--ms-glass-border);
          color: var(--ms-text);
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .lp-nav-cta:hover { background: rgba(184,166,255,0.16); transform: translateY(-1px); }

        /* ---------- Hero ---------- */
        .lp-hero {
          max-width: 1180px;
          margin: 0 auto;
          padding: 72px 24px 40px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 56px;
          align-items: center;
        }
        .lp-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: var(--ms-mono);
          font-size: 0.75rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ms-lavender);
          background: rgba(184,166,255,0.1);
          border: 1px solid var(--ms-glass-border);
          padding: 6px 12px;
          border-radius: 999px;
          margin-bottom: 22px;
        }
        .lp-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #6ee7a0;
          box-shadow: 0 0 0 3px rgba(110,231,160,0.2);
        }
        .lp-hero h1 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: clamp(2.4rem, 4.6vw, 3.6rem);
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin: 0 0 20px;
        }
        .lp-hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, var(--ms-lavender), var(--ms-violet-bright));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .lp-hero p {
          font-size: 1.08rem;
          line-height: 1.6;
          color: var(--ms-muted);
          max-width: 480px;
          margin: 0 0 32px;
        }
        .lp-hero-actions {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .lp-btn-primary {
          background: linear-gradient(135deg, var(--ms-violet), var(--ms-violet-bright));
          border: none;
          color: #fff;
          padding: 14px 26px;
          border-radius: 12px;
          font-size: 0.98rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 10px 30px -10px rgba(108,79,214,0.7);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 14px 34px -8px rgba(108,79,214,0.85); }
        .lp-btn-ghost {
          background: var(--ms-glass);
          border: 1px solid var(--ms-glass-border);
          color: var(--ms-text);
          padding: 14px 26px;
          border-radius: 12px;
          font-size: 0.98rem;
          font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(12px);
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .lp-btn-ghost:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }

        /* ---------- Departure board (signature element) ---------- */
        .board {
          background: var(--ms-glass);
          border: 1px solid var(--ms-glass-border);
          border-radius: 18px;
          padding: 18px 20px 8px;
          backdrop-filter: blur(18px);
          box-shadow: 0 30px 60px -30px rgba(0,0,0,0.6);
        }
        .board-head {
          display: grid;
          grid-template-columns: 1fr 1.4fr 0.8fr;
          font-family: var(--ms-mono);
          font-size: 0.68rem;
          letter-spacing: 0.12em;
          color: var(--ms-lavender);
          opacity: 0.75;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--ms-glass-border);
          margin-bottom: 4px;
        }
        .board-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr 0.8fr;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px dashed rgba(184,166,255,0.14);
          font-family: var(--ms-mono);
          animation: rowIn 0.5s ease both;
        }
        .board-row:last-child { border-bottom: none; }
        .board-line { font-weight: 700; color: var(--ms-text); font-size: 0.88rem; }
        .board-dest { color: var(--ms-muted); font-size: 0.82rem; }
        .board-eta {
          justify-self: end;
          display: flex;
          align-items: baseline;
          gap: 5px;
          color: #6ee7a0;
          font-weight: 700;
        }
        .flip {
          display: inline-block;
          animation: flipIn 0.4s ease;
          font-size: 1rem;
        }
        .board-eta-unit { font-size: 0.68rem; color: var(--ms-muted); font-weight: 500; }

        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes flipIn {
          from { opacity: 0; transform: translateY(-6px); filter: blur(2px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        /* ---------- Features ---------- */
        .lp-section {
          max-width: 1180px;
          margin: 0 auto;
          padding: 64px 24px;
        }
        .lp-section-head {
          max-width: 560px;
          margin: 0 0 40px;
        }
        .lp-section-head span {
          font-family: var(--ms-mono);
          font-size: 0.72rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ms-lavender);
        }
        .lp-section-head h2 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: clamp(1.6rem, 3vw, 2.1rem);
          margin: 10px 0 0;
          letter-spacing: -0.01em;
        }
        .lp-features {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp-feature-card {
          background: var(--ms-glass);
          border: 1px solid var(--ms-glass-border);
          border-radius: 16px;
          padding: 26px;
          backdrop-filter: blur(12px);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .lp-feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(184,166,255,0.45);
        }
        .lp-feature-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(184,166,255,0.12);
          color: var(--ms-lavender);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .lp-feature-card h3 {
          font-size: 1.05rem;
          margin: 0 0 8px;
          font-weight: 600;
        }
        .lp-feature-card p {
          font-size: 0.9rem;
          color: var(--ms-muted);
          line-height: 1.55;
          margin: 0;
        }

        /* ---------- How it works ---------- */
        .lp-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          counter-reset: step;
        }
        .lp-step {
          position: relative;
          padding: 26px 22px 22px;
          border-left: 1px solid var(--ms-glass-border);
        }
        .lp-step-num {
          font-family: var(--ms-mono);
          font-size: 0.78rem;
          color: var(--ms-lavender);
          margin-bottom: 10px;
          display: block;
        }
        .lp-step h3 {
          font-size: 1rem;
          margin: 0 0 8px;
          font-weight: 600;
        }
        .lp-step p {
          font-size: 0.88rem;
          color: var(--ms-muted);
          line-height: 1.55;
          margin: 0;
        }

        /* ---------- CTA banner ---------- */
        .lp-cta-banner {
          max-width: 1180px;
          margin: 0 auto 80px;
          padding: 48px 40px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(108,79,214,0.5), rgba(184,166,255,0.18));
          border: 1px solid var(--ms-glass-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .lp-cta-banner h2 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
          font-size: 1.6rem;
          margin: 0 0 6px;
          letter-spacing: -0.01em;
        }
        .lp-cta-banner p {
          margin: 0;
          color: var(--ms-muted);
          font-size: 0.95rem;
        }

        /* ---------- Footer ---------- */
        .lp-footer {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 24px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--ms-glass-border);
          color: var(--ms-muted);
          font-size: 0.85rem;
          flex-wrap: wrap;
          gap: 12px;
        }

        @media (max-width: 860px) {
          .lp-hero { grid-template-columns: 1fr; padding-top: 48px; }
          .lp-features { grid-template-columns: 1fr; }
          .lp-steps { grid-template-columns: 1fr; }
          .lp-nav-links span.lp-nav-signin { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .board-row, .flip { animation: none; }
        }

        .landing-page-wrapper button:focus-visible,
        .landing-page-wrapper a:focus-visible {
          outline: 2px solid var(--ms-lavender);
          outline-offset: 2px;
        }
      `}</style>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <path d="M12 18v2M6 18h12M6 6c0-2 2-3 6-3s6 1 6 3" />
              <circle cx="6.5" cy="14.5" r="1.5" fill="currentColor" />
              <circle cx="17.5" cy="14.5" r="1.5" fill="currentColor" />
            </svg>
          </span>
          MoveSmart
        </div>
        <div className="lp-nav-links">
          <button className="lp-nav-signin" onClick={() => navigate("/login")}>
            Sign in
          </button>
          <button className="lp-nav-cta" onClick={() => navigate("/signup")}>
            Get started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div>
          <span className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            Live across 12 city routes
          </span>
          <h1>
            Know exactly when<br />your ride <em>arrives</em>.
          </h1>
          <p>
            MoveSmart tracks buses, shuttles, and delivery fleets in real time,
            so commuters stop guessing and dispatchers stop firefighting.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={() => navigate("/signup")}>
              Create free account
            </button>
            <button className="lp-btn-ghost" onClick={() => navigate("/login")}>
              I already have one
            </button>
          </div>
        </div>
        <DepartureBoard />
      </section>

      {/* Features */}
      <section className="lp-section">
        <div className="lp-section-head">
          <span>Platform</span>
          <h2>Built for riders and dispatchers alike</h2>
        </div>
        <div className="lp-features">
          <div className="lp-feature-card">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3>Real-time tracking</h3>
            <p>Live GPS positions for every vehicle on the network, updated every few seconds, not every few minutes.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h4l3-9 4 18 3-9h4" />
              </svg>
            </div>
            <h3>Smart routing</h3>
            <p>Routes adjust automatically around traffic and delays, so ETAs stay honest instead of optimistic.</p>
          </div>
          <div className="lp-feature-card">
            <div className="lp-feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </div>
            <h3>Logistics dashboard</h3>
            <p>One view of every fleet, delivery, and delay, built for dispatchers who need answers fast.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="lp-section">
        <div className="lp-section-head">
          <span>Getting started</span>
          <h2>Up and running in three steps</h2>
        </div>
        <div className="lp-steps">
          <div className="lp-step">
            <span className="lp-step-num">01</span>
            <h3>Create your account</h3>
            <p>Sign up as a rider or an operator. It takes under a minute.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step-num">02</span>
            <h3>Add your routes</h3>
            <p>Follow the lines you ride, or connect the fleets you manage.</p>
          </div>
          <div className="lp-step">
            <span className="lp-step-num">03</span>
            <h3>Track in real time</h3>
            <p>Get live ETAs and alerts the moment something changes on the road.</p>
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <div className="lp-cta-banner">
        <div>
          <h2>Ready to stop guessing your ETA?</h2>
          <p>Join MoveSmart free, no credit card required.</p>
        </div>
        <button className="lp-btn-primary" onClick={() => navigate("/signup")}>
          Create free account
        </button>
      </div>

      {/* Footer */}
      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} MoveSmart</span>
        <span>Smart Urban Transit &amp; Logistics</span>
      </footer>
    </div>
  );
}

export default Landing;