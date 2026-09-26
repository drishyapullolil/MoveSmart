const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Format Date to Local Indian Time (DD-MM-YYYY hh:mm:ss A)
 */
function formatDateTime(dateInput) {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Format Time Only (hh:mm A)
 */
function formatTimeOnly(dateInput) {
  if (!dateInput) return "N/A";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "N/A";
    
    return d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Calculate Human Readable Duration between two dates
 */
function formatDuration(startDate, endDate) {
  if (!startDate) return "0m";
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const diffMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Generate PDF buffer and/or save to disk for a completed bus trip session
 * @param {Object} tripSession - TripSession mongoose doc / object
 * @param {Array} transactions - Array of chronological tap items (tap-ins and tap-outs)
 * @param {String} outputPath - Optional file path to save PDF
 * @returns {Promise<Buffer>}
 */
function generateTripPdf(tripSession, transactions = [], outputPath = null) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
      });

      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        if (outputPath) {
          try {
            const dir = path.dirname(outputPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(outputPath, pdfData);
          } catch (writeErr) {
            console.error("Error writing PDF to disk:", writeErr);
          }
        }
        resolve(pdfData);
      });
      doc.on("error", (err) => reject(err));

      const primaryColor = "#1e3a8a"; // Deep navy blue
      const secondaryColor = "#2563eb"; // MoveSmart blue
      const accentGreen = "#15803d"; // Success green
      const darkText = "#0f172a";
      const mutedText = "#475569";
      const lightBg = "#f8fafc";
      const borderGray = "#cbd5e1";

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftMargin = doc.page.margins.left;

      // -------------------------------------------------------------
      // 1. HEADER BRANDING BANNER
      // -------------------------------------------------------------
      doc.rect(leftMargin, 36, pageWidth, 68).fill(primaryColor);

      doc.fillColor("#ffffff")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("MOVESMART TRANSIT", leftMargin + 16, 48);

      doc.fontSize(12)
        .font("Helvetica")
        .fillColor("#93c5fd")
        .text("BUS TRIP RFID SESSION REPORT", leftMargin + 16, 72);

      doc.fontSize(9)
        .font("Helvetica")
        .fillColor("#e2e8f0")
        .text(`Generated: ${formatDateTime(new Date())}`, leftMargin + pageWidth - 200, 52, { width: 184, align: "right" });

      doc.fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#facc15")
        .text(`TRIP STATUS: ${tripSession.status || "COMPLETED"}`, leftMargin + pageWidth - 200, 72, { width: 184, align: "right" });

      let currentY = 118;

      // -------------------------------------------------------------
      // 2. TRIP INFORMATION SECTION
      // -------------------------------------------------------------
      doc.fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("TRIP INFORMATION", leftMargin, currentY);

      doc.strokeColor(secondaryColor)
        .lineWidth(1.5)
        .moveTo(leftMargin, currentY + 16)
        .lineTo(leftMargin + pageWidth, currentY + 16)
        .stroke();

      currentY += 24;

      const tripInfoHeight = 84;
      doc.rect(leftMargin, currentY, pageWidth, tripInfoHeight)
        .fillAndStroke(lightBg, borderGray);

      const col1X = leftMargin + 12;
      const col2X = leftMargin + (pageWidth / 3) + 4;
      const col3X = leftMargin + ((2 * pageWidth) / 3) + 4;

      // Row 1
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Trip Session ID:", col1X, currentY + 10);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(darkText).text(tripSession.tripSessionId || "N/A", col1X + 75, currentY + 10);

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Bus Number:", col2X, currentY + 10);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(secondaryColor).text(tripSession.busNumber || "N/A", col2X + 65, currentY + 10);

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Driver Name:", col3X, currentY + 10);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(darkText).text(tripSession.driverName || "Driver", col3X + 65, currentY + 10);

      // Row 2
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Route:", col1X, currentY + 28);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(darkText).text(tripSession.routeName || `${tripSession.startStop || "Origin"} ➔ ${tripSession.endStop || "Destination"}`, col1X + 40, currentY + 28, { width: 140 });

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Trip Start:", col2X, currentY + 28);
      doc.font("Helvetica").fontSize(9).fillColor(darkText).text(formatTimeOnly(tripSession.startTime), col2X + 65, currentY + 28);

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Trip End:", col3X, currentY + 28);
      doc.font("Helvetica").fontSize(9).fillColor(darkText).text(formatTimeOnly(tripSession.endTime || new Date()), col3X + 65, currentY + 28);

      // Row 3
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Starting Stop:", col1X, currentY + 46);
      doc.font("Helvetica").fontSize(9).fillColor(darkText).text(tripSession.startStop || "Origin Terminal", col1X + 70, currentY + 46);

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Ending Stop:", col2X, currentY + 46);
      doc.font("Helvetica").fontSize(9).fillColor(darkText).text(tripSession.endStop || "Destination Terminal", col2X + 65, currentY + 46);

      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Trip Duration:", col3X, currentY + 46);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(accentGreen).text(formatDuration(tripSession.startTime, tripSession.endTime), col3X + 65, currentY + 46);

      // Row 4
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(mutedText).text("Distance Covered:", col1X, currentY + 64);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor(primaryColor).text(`${Number(tripSession.totalDistanceKm || tripSession.distanceCovered || 0).toFixed(1)} km`, col1X + 85, currentY + 64);

      currentY += tripInfoHeight + 18;

      // -------------------------------------------------------------
      // 3. RFID SUMMARY METRICS TILES
      // -------------------------------------------------------------
      doc.fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("RFID SUMMARY", leftMargin, currentY);

      doc.strokeColor(secondaryColor)
        .lineWidth(1.5)
        .moveTo(leftMargin, currentY + 16)
        .lineTo(leftMargin + pageWidth, currentY + 16)
        .stroke();

      currentY += 22;

      const tileWidth = (pageWidth - 24) / 4;
      const tileHeight = 44;

      const metrics = [
        { label: "Total RFID Taps", val: String(tripSession.totalRfidTaps || transactions.length), color: secondaryColor },
        { label: "Total TAP-IN", val: String(tripSession.totalTapIns || transactions.filter(t => t.action === "TAP_IN").length), color: accentGreen },
        { label: "Total TAP-OUT", val: String(tripSession.totalTapOuts || transactions.filter(t => t.action === "TAP_OUT").length), color: "#0284c7" },
        { label: "Total Fare Collected", val: `Rs. ${Number(tripSession.totalFare || 0).toFixed(2)}`, color: "#b91c1c" },
      ];

      metrics.forEach((m, idx) => {
        const tx = leftMargin + idx * (tileWidth + 8);
        doc.rect(tx, currentY, tileWidth, tileHeight)
          .fillAndStroke(lightBg, borderGray);

        doc.font("Helvetica").fontSize(7.5).fillColor(mutedText).text(m.label, tx + 6, currentY + 8, { width: tileWidth - 12, align: "center" });
        doc.font("Helvetica-Bold").fontSize(12).fillColor(m.color).text(m.val, tx + 6, currentY + 22, { width: tileWidth - 12, align: "center" });
      });

      currentY += tileHeight + 20;

      // -------------------------------------------------------------
      // 4. RFID TRANSACTION DETAILS TABLE
      // -------------------------------------------------------------
      doc.fillColor(primaryColor)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("RFID TRANSACTION DETAILS", leftMargin, currentY);

      doc.strokeColor(secondaryColor)
        .lineWidth(1.5)
        .moveTo(leftMargin, currentY + 16)
        .lineTo(leftMargin + pageWidth, currentY + 16)
        .stroke();

      currentY += 22;

      // Table Header definitions
      const columns = [
        { key: "no", header: "No.", width: 24, align: "center" },
        { key: "time", header: "Time", width: 105, align: "left" },
        { key: "passenger", header: "Passenger", width: 85, align: "left" },
        { key: "card", header: "Card/UID", width: 62, align: "left" },
        { key: "type", header: "Type", width: 44, align: "center" },
        { key: "action", header: "Action", width: 48, align: "center" },
        { key: "stop", header: "Stop", width: 75, align: "left" },
        { key: "fare", header: "Fare", width: 40, align: "right" },
        { key: "newBal", header: "Balance", width: 40, align: "right" },
      ];

      // Draw table header row
      const drawTableHeader = (yPos) => {
        doc.rect(leftMargin, yPos, pageWidth, 20).fill(secondaryColor);
        let currX = leftMargin + 4;
        columns.forEach((col) => {
          doc.font("Helvetica-Bold")
            .fontSize(7.5)
            .fillColor("#ffffff")
            .text(col.header, currX, yPos + 6, { width: col.width, align: col.align });
          currX += col.width;
        });
      };

      drawTableHeader(currentY);
      currentY += 20;

      if (transactions.length === 0) {
        doc.rect(leftMargin, currentY, pageWidth, 32).fillAndStroke(lightBg, borderGray);
        doc.font("Helvetica-Oblique")
          .fontSize(9)
          .fillColor(mutedText)
          .text("No RFID transactions recorded for this bus trip session.", leftMargin, currentY + 11, { width: pageWidth, align: "center" });
        currentY += 40;
      } else {
        transactions.forEach((item, index) => {
          // Check for page overflow
          if (currentY + 22 > doc.page.height - doc.page.margins.bottom - 80) {
            doc.addPage();
            currentY = doc.page.margins.top;
            drawTableHeader(currentY);
            currentY += 20;
          }

          const isEven = index % 2 === 0;
          const rowBg = isEven ? "#ffffff" : "#f8fafc";
          doc.rect(leftMargin, currentY, pageWidth, 18).fillAndStroke(rowBg, "#e2e8f0");

          let currX = leftMargin + 4;

          // No
          doc.font("Helvetica").fontSize(7).fillColor(darkText).text(String(index + 1), currX, currentY + 5, { width: columns[0].width, align: "center" });
          currX += columns[0].width;

          // Time
          const timeStr = formatDateTime(item.timestamp || item.createdAt);
          doc.font("Helvetica").fontSize(6.8).fillColor(darkText).text(timeStr, currX, currentY + 5, { width: columns[1].width, align: "left" });
          currX += columns[1].width;

          // Passenger
          const passName = String(item.passengerName || item.passenger?.name || "Passenger").slice(0, 16);
          doc.font("Helvetica-Bold").fontSize(7).fillColor(darkText).text(passName, currX, currentY + 5, { width: columns[2].width, align: "left" });
          currX += columns[2].width;

          // Card/UID
          const cardId = item.cardUid || item.card?.cardNumber || item.card?.rfidTag || "RFID";
          doc.font("Helvetica").fontSize(6.8).fillColor(mutedText).text(String(cardId).slice(0, 10), currX, currentY + 5, { width: columns[3].width, align: "left" });
          currX += columns[3].width;

          // Card Type
          const cType = item.cardType || item.card?.cardType || "Silver";
          doc.font("Helvetica").fontSize(7).fillColor(cType === "Gold" ? "#b45309" : cType === "Blue" ? "#1d4ed8" : "#475569").text(cType, currX, currentY + 5, { width: columns[4].width, align: "center" });
          currX += columns[4].width;

          // Action
          const actionText = item.action === "TAP_IN" ? "TAP-IN" : "TAP-OUT";
          const actionColor = item.action === "TAP_IN" ? accentGreen : secondaryColor;
          doc.font("Helvetica-Bold").fontSize(7).fillColor(actionColor).text(actionText, currX, currentY + 5, { width: columns[5].width, align: "center" });
          currX += columns[5].width;

          // Stop
          const stopName = String(item.stop?.name || item.stopName || "Stop").slice(0, 15);
          doc.font("Helvetica").fontSize(6.8).fillColor(darkText).text(stopName, currX, currentY + 5, { width: columns[6].width, align: "left" });
          currX += columns[6].width;

          // Fare
          const fareVal = Number(item.fare || 0);
          const fareStr = fareVal > 0 ? `Rs.${fareVal.toFixed(1)}` : "Rs.0";
          doc.font("Helvetica-Bold").fontSize(7).fillColor(fareVal > 0 ? "#dc2626" : darkText).text(fareStr, currX, currentY + 5, { width: columns[7].width, align: "right" });
          currX += columns[7].width;

          // Balance
          const balVal = item.newBalance !== undefined ? Number(item.newBalance) : Number(item.balance || item.card?.balance || 0);
          doc.font("Helvetica").fontSize(7).fillColor(darkText).text(`Rs.${balVal.toFixed(0)}`, currX, currentY + 5, { width: columns[8].width, align: "right" });

          currentY += 18;
        });

        currentY += 14;
      }

      // -------------------------------------------------------------
      // 5. TRIP TOTALS & AUDIT SUMMARY
      // -------------------------------------------------------------
      if (currentY + 80 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      doc.fillColor(primaryColor)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("TRIP TOTALS & AUDIT VERIFICATION", leftMargin, currentY);

      doc.strokeColor(secondaryColor)
        .lineWidth(1)
        .moveTo(leftMargin, currentY + 14)
        .lineTo(leftMargin + pageWidth, currentY + 14)
        .stroke();

      currentY += 20;

      const summaryBoxHeight = 44;
      doc.rect(leftMargin, currentY, pageWidth, summaryBoxHeight).fillAndStroke(lightBg, borderGray);

      const totalTaps = transactions.length;
      const tapIns = transactions.filter(t => t.action === "TAP_IN").length;
      const tapOuts = transactions.filter(t => t.action === "TAP_OUT").length;
      const totalFare = transactions.reduce((acc, t) => acc + (Number(t.fare) || 0), 0);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Total Transactions:", col1X, currentY + 8);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(darkText).text(String(totalTaps), col1X + 90, currentY + 8);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Successful:", col1X, currentY + 24);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(accentGreen).text(String(totalTaps), col1X + 60, currentY + 24);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Total TAP-IN:", col2X, currentY + 8);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(accentGreen).text(String(tapIns), col2X + 65, currentY + 8);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Total TAP-OUT:", col2X, currentY + 24);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(secondaryColor).text(String(tapOuts), col2X + 75, currentY + 24);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Total Fare Collected:", col3X, currentY + 8);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#dc2626").text(`Rs. ${totalFare.toFixed(2)}`, col3X + 95, currentY + 8);

      doc.font("Helvetica-Bold").fontSize(8).fillColor(mutedText).text("Audit Status:", col3X, currentY + 24);
      doc.font("Helvetica-Bold").fontSize(8.5).fillColor(accentGreen).text("VERIFIED & RECONCILED", col3X + 65, currentY + 24);

      // Footer disclaimer on all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.font("Helvetica")
          .fontSize(7.5)
          .fillColor("#94a3b8")
          .text(
            `MoveSmart Transit Systems • Trip Report ${tripSession.tripSessionId || ""} • Page ${i + 1} of ${range.count}`,
            leftMargin,
            doc.page.height - 28,
            { width: pageWidth, align: "center" }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateTripPdf,
  formatDateTime,
  formatTimeOnly,
  formatDuration,
};
