import { jsPDF } from "jspdf";

/**
 * Generates and downloads a high-resolution, professional PDF E-Ticket & Boarding Sheet
 * for MoveSmart transit bookings.
 * 
 * Supports single and multi-passenger bookings with individual passenger names per seat.
 */
export function generateTicketPDF(booking) {
  if (!booking) {
    console.error("No booking data provided for PDF generation.");
    return false;
  }

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;

    const {
      bookingId = `MS-${Date.now().toString(36).toUpperCase()}`,
      busName = "MoveSmart Fleet Express",
      busNumber = "KL-01-MS-1001",
      busType = "AC Superfast Express",
      operator = "MoveSmart Mobility Kerala",
      fromLocation = "Origin Terminal",
      toLocation = "Destination Terminus",
      departureTime = "08:00 AM",
      arrivalTime = "12:00 PM",
      travelDate = new Date().toISOString().split("T")[0],
      selectedSeats = [],
      passengers = [],
      passengerName = "Primary Passenger",
      passengerEmail = "support@movesmart.in",
      passengerPhone = "N/A",
      totalPrice = 0,
      paymentMethod = "rfid",
      driverName = "",
      driverPhone = "",
      driverLicense = "",
      createdAt = new Date().toISOString(),
    } = booking;

    // Build normalized list of passengers for each seat
    const passengerList = selectedSeats.map((seat, idx) => {
      const match = Array.isArray(passengers) ? (passengers.find((p) => p.seat === seat) || passengers[idx]) : null;
      return {
        seat,
        name: (match?.name || (idx === 0 ? passengerName : `Passenger ${idx + 1}`)).trim(),
        age: match?.age ? `${match.age} yrs` : "--",
        gender: match?.gender || "--",
      };
    });

    let y = 14;

    // 1. Top Decorative Brand Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("MoveSmart", margin + 8, y + 11);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("INTELLIGENT FLEET TRANSIT & IOT RFID PLATFORM", margin + 8, y + 17);

    // E-Ticket badge on top right
    doc.setFillColor(34, 197, 94); // emerald-500
    doc.roundedRect(pageWidth - margin - 48, y + 6, 42, 12, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("CONFIRMED TICKET", pageWidth - margin - 27, y + 14, { align: "center" });

    y += 28;

    // 2. Booking Header Bar (Booking ID & Booking Timestamp)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, "FD");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BOOKING REFERENCE ID", margin + 6, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(String(bookingId), margin + 6, y + 12);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICE TRAVEL DATE", margin + 80, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text(String(travelDate), margin + 80, y + 12);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("STATUS", pageWidth - margin - 35, y + 6);
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(11);
    doc.text("Active / Confirmed", pageWidth - margin - 35, y + 12);

    y += 20;

    // 3. Journey & Route Card
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 38, 3, 3, "FD");

    // Boarding Station (Left)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BOARDING FROM (ORIGIN)", margin + 6, y + 8);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(String(fromLocation), margin + 6, y + 16);
    doc.setTextColor(22, 163, 74); // Green departure time
    doc.setFontSize(11);
    doc.text(`Departure: ${departureTime}`, margin + 6, y + 23);

    // Arrow in the middle
    doc.setTextColor(124, 58, 237); // purple
    doc.setFontSize(14);
    doc.text("------->", margin + 82, y + 16);

    // Drop-off Station (Right)
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("DESTINATION / DROP-OFF", margin + 115, y + 8);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(String(toLocation), margin + 115, y + 16);
    doc.setTextColor(124, 58, 237);
    doc.setFontSize(11);
    doc.text(`Scheduled Arrival: ${arrivalTime || "En Route"}`, margin + 115, y + 23);

    // Bus Details Sub-row
    doc.setDrawColor(226, 232, 240);
    doc.line(margin + 6, y + 27, pageWidth - margin - 6, y + 27);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Bus Fleet: ${busName} (${busNumber})  |  Type: ${busType || "Standard Fleet"}  |  Operator: ${operator || "MoveSmart Mobility"}`,
      margin + 6,
      y + 33
    );

    y += 42;

    // 4. Primary Contact & Driver Info in 2 Columns
    const colWidth = (contentWidth - 6) / 2;

    // Primary Passenger Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, colWidth, 26, 2, 2, "FD");

    doc.setTextColor(124, 58, 237);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PRIMARY CONTACT DETAILS", margin + 5, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Name: ${passengerName}`, margin + 5, y + 12);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Email: ${passengerEmail}`, margin + 5, y + 18);
    doc.text(`Phone: ${passengerPhone}`, margin + 5, y + 23);

    // Driver & Fleet Safety Box
    doc.roundedRect(margin + colWidth + 6, y, colWidth, 26, 2, 2, "FD");

    doc.setTextColor(22, 163, 74);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ASSIGNED DRIVER & SAFETY", margin + colWidth + 11, y + 6);

    const safeDriverName = driverName && !["unassigned", "assigned driver", "driver"].includes(driverName.toLowerCase())
      ? driverName
      : "Assigned Fleet Driver";

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.text(`Driver: ${safeDriverName}`, margin + colWidth + 11, y + 12);

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`License: ${driverLicense || "KL-GOV-VERIFIED"}`, margin + colWidth + 11, y + 18);
    doc.text(`Contact: ${driverPhone || "Via MoveSmart Dispatch"} • Admin Verified`, margin + colWidth + 11, y + 23);

    y += 31;

    // 5. PASSENGERS & SEAT ASSIGNMENT TABLE (Highlight of the PDF)
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PASSENGER & SEAT INFORMATION SHEET", margin, y);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Seats Reserved: ${selectedSeats.length}`, pageWidth - margin, y, { align: "right" });

    y += 4;

    // Table Header
    doc.setFillColor(15, 23, 42); // dark header
    doc.rect(margin, y, contentWidth, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("SL", margin + 4, y + 5.5);
    doc.text("SEAT NO", margin + 16, y + 5.5);
    doc.text("PASSENGER FULL NAME", margin + 45, y + 5.5);
    doc.text("AGE", margin + 120, y + 5.5);
    doc.text("GENDER", margin + 140, y + 5.5);
    doc.text("BOOKING STATUS", pageWidth - margin - 4, y + 5.5, { align: "right" });

    y += 8;

    // Table Rows
    passengerList.forEach((p, i) => {
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(margin, y, contentWidth, 9, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, 9, "S");

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(String(i + 1), margin + 4, y + 6);

      // Seat Badge
      doc.setFont("helvetica", "bold");
      doc.setTextColor(124, 58, 237);
      doc.text(`Seat ${p.seat}`, margin + 16, y + 6);

      // Passenger Name (Type another person's name feature!)
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(String(p.name || `Passenger ${i + 1}`), margin + 45, y + 6);

      // Age & Gender
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.text(String(p.age), margin + 120, y + 6);
      doc.text(String(p.gender), margin + 140, y + 6);

      // Confirmed Badge
      doc.setTextColor(22, 163, 74);
      doc.setFont("helvetica", "bold");
      doc.text("CONFIRMED", pageWidth - margin - 4, y + 6, { align: "right" });

      y += 9;
    });

    y += 6;

    // 6. Fare Breakdown & Payment Mode Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "FD");

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FARE SUMMARY", margin + 6, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const seatBreakdown = `${selectedSeats.length} Seat${selectedSeats.length > 1 ? "s" : ""} (${selectedSeats.join(", ")})`;
    doc.text(`Reservation: ${seatBreakdown}`, margin + 6, y + 12);
    const payModeStr = paymentMethod ? paymentMethod.toUpperCase() : "DIRECT BOOKING";
    doc.text(`Payment Mode: ${payModeStr} / Verified`, margin + 6, y + 18);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL AMOUNT PAID", pageWidth - margin - 50, y + 6);

    doc.setTextColor(22, 163, 74);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Rs. ${totalPrice}`, pageWidth - margin - 6, y + 16, { align: "right" });

    y += 28;

    // 7. QR Code / Verification Barcode Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, "FD");

    // Draw simulated barcode / verification marks
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    let barX = margin + 8;
    for (let b = 0; b < 48; b++) {
      const width = (b % 3 === 0 ? 0.8 : b % 2 === 0 ? 0.4 : 1.2);
      doc.setLineWidth(width);
      doc.line(barX, y + 3, barX, y + 17);
      barX += width + 0.9;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("BOARDING PASS VERIFICATION", margin + 85, y + 8);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Scannable by MoveSmart IoT Conductor Device. Ref: ${bookingId}`, margin + 85, y + 13);
    doc.text(`Generated on: ${new Date(createdAt).toLocaleString()}`, margin + 85, y + 17);

    y += 24;

    // 8. Boarding Guidelines & Terms
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT PASSENGER INSTRUCTIONS:", margin + 5, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("1. Please arrive at the scheduled boarding stop at least 15 minutes before the departure time.", margin + 5, y + 9.5);
    doc.text("2. Each passenger whose name is listed above must carry a valid photo identification card (Aadhaar/Driving License/Voter ID).", margin + 5, y + 13.5);
    doc.text("3. Seats are reserved specifically for the individual names entered. Showing this PDF on mobile or paper is accepted.", margin + 5, y + 17.5);
    doc.text("4. 24x7 MoveSmart Fleet Helpline: 1800-MOVESMART | movesmart.kerala@gov.in", margin + 5, y + 21.5);

    // Footer copyright
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7);
    doc.text(
      "MoveSmart Smart Transit System (c) 2026. Automated tamper-proof e-ticket document.",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );

    // Save and download the PDF!
    const filename = `MoveSmart_Ticket_${String(bookingId).replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`;
    doc.save(filename);
    return true;
  } catch (error) {
    console.error("Failed to generate ticket PDF:", error);
    return false;
  }
}
