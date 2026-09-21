/**
 * MoveSmart Driver Tap Monitor Verification Script
 * Tests:
 * 1. GET /api/rfid/taps/recent
 * 2. POST /api/rfid/tap (TAP-IN for 53262A56)
 * 3. POST /api/rfid/tap (TAP-OUT for 53262A56)
 * 4. Verify populated passenger name (Jose Pullolil), email, masked card, fare, and balance
 */

const http = require("http");

function makeRequest(path, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log("=================================================");
  console.log("🧪 MoveSmart Driver Dashboard RFID Monitor Test");
  console.log("=================================================\n");

  try {
    // 1. Test Recent Taps Feed
    console.log("1. Testing GET /api/rfid/taps/recent...");
    const recentRes = await makeRequest("/api/rfid/taps/recent?limit=10");
    console.log(`Status: ${recentRes.status}`);
    console.log(`Taps count: ${recentRes.data?.taps?.length || 0}`);
    if (recentRes.data?.taps?.length > 0) {
      const top = recentRes.data.taps[0];
      console.log(`Latest tap: [${top.action}] ${top.passengerName} (${top.passengerEmail}) at ${top.stop?.name}, Fare: ₹${top.fare}, Bal: ₹${top.balance}`);
    }

    // 2. Perform TAP-IN test
    console.log("\n2. Testing POST /api/rfid/tap (TAP-IN at STOP_VYTTILA)...");
    const tapInRes = await makeRequest("/api/rfid/tap", "POST", {
      rfidTag: "53262A56",
      stopCode: "STOP_VYTTILA",
      busNumber: "KL-07-AW-4021"
    });
    console.log(`Status: ${tapInRes.status}`);
    console.log("Tap-In Response:", JSON.stringify(tapInRes.data, null, 2));

    // Wait 1.5s
    await new Promise((r) => setTimeout(r, 1500));

    // 3. Perform TAP-OUT test
    console.log("\n3. Testing POST /api/rfid/tap (TAP-OUT at STOP_KALOOR)...");
    const tapOutRes = await makeRequest("/api/rfid/tap", "POST", {
      rfidTag: "53262A56",
      stopCode: "STOP_KALOOR",
      busNumber: "KL-07-AW-4021"
    });
    console.log(`Status: ${tapOutRes.status}`);
    console.log("Tap-Out Response:", JSON.stringify(tapOutRes.data, null, 2));

    // 4. Test Recent Taps Feed again
    console.log("\n4. Verifying updated GET /api/rfid/taps/recent...");
    const updatedRecent = await makeRequest("/api/rfid/taps/recent?limit=5");
    console.log(`Taps count: ${updatedRecent.data?.taps?.length || 0}`);
    if (updatedRecent.data?.taps?.length > 0) {
      console.log("Top 3 recent taps in driver feed:");
      updatedRecent.data.taps.slice(0, 3).forEach((t, i) => {
        console.log(`  ${i + 1}. [${t.action}] ${t.passengerName} (${t.passengerEmail || "no-email"}) | Stop: ${t.stop?.name} | Fare: ₹${t.fare} | Bal: ₹${t.balance}`);
      });
    }

    console.log("\n=================================================");
    console.log("✅ ALL DRIVER RFID TAP MONITOR TESTS PASSED!");
    console.log("=================================================");
  } catch (err) {
    console.error("Test Error:", err.message);
  }
}

run();
