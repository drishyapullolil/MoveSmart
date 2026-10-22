#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// =====================================================
// RC522 + ESP32 PINS (SHARED ACROSS BUS & BIN MODES)
// =====================================================

#define SS_PIN    5
#define RST_PIN   22

#define SCK_PIN   18
#define MOSI_PIN  23
#define MISO_PIN  19

MFRC522 rfid(SS_PIN, RST_PIN);

// =====================================================
// LED & BUZZER PINS
// =====================================================

#define GREEN_LED 12
#define RED_LED   14
#define BUZZER    13

// =====================================================
// SMART BIN ADDITIONAL HARDWARE PINS & ANGLES
// =====================================================

#define SERVO_PIN    25
#define CLOSED_ANGLE 180
#define OPEN_ANGLE   90

#define IR_PIN 27 // LOW = Object Detected, HIGH = No Object

Servo binServo;

// =====================================================
// WIFI & PREFERENCES SETUP
// =====================================================

Preferences preferences;
WebServer setupServer(80);

String savedSSID = "";
String savedPassword = "";

bool setupMode = false;

// =====================================================
// DEVICE MODE CONFIGURATION (BUS vs BIN)
// =====================================================

// Default mode is "BUS". Stored permanently in ESP32 Preferences ("movesmart", "mode").
String deviceMode = "BUS"; // "BUS" or "BIN"

// =====================================================
// MOVESMART BACKEND CONFIGURATION
// =====================================================

// Base backend server URLs (Current Laptop IPv4: 10.103.189.140)
const char* busApiUrl = "http://10.187.91.140:5000/api/rfid/tap";
const char* binApiUrl = "http://10.187.91.140:5000/api/bin/deposit";

// Device Identifiers
const char* deviceStopCode = "STOP_VYTTILA";
const char* binId = "BIN-001";

// Forward declarations
void connectToSavedWiFi();
void startSetupMode();
void handleSetupPage();
void handleModePage();
void handleModeEndpoint();
void handleSaveWiFi();
void handleResetWiFi();
void handleSetModeAndRestart();
void sendTapToBackend(String rfidTag);
void sendBinDepositToBackend(String rfidTag, String depositId);
void successFeedback();
void errorFeedback();
void openLid();
void closeLid();

// =====================================================
// SETUP
// =====================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Initialize LEDs and Buzzer
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  // Initialize IR sensor pin
  pinMode(IR_PIN, INPUT);

  // Initialize Servo motor
  ESP32PWM::allocateTimer(0);
  binServo.setPeriodHertz(50);
  binServo.attach(SERVO_PIN, 500, 2400);
  binServo.write(CLOSED_ANGLE);

  // -------------------------------------------------
  // RC522 SPI INITIALIZATION
  // -------------------------------------------------
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  delay(100);

  // -------------------------------------------------
  // LOAD SAVED CONFIGURATION (WIFI & MODE)
  // -------------------------------------------------
  preferences.begin("movesmart", false);
  savedSSID = preferences.getString("ssid", "");
  savedPassword = preferences.getString("password", "");
  deviceMode = preferences.getString("mode", "BUS"); // Default is "BUS"
  deviceMode.toUpperCase();
  if (deviceMode != "BIN") {
    deviceMode = "BUS";
  }

  Serial.println();
  Serial.println("=================================");
  Serial.println("   MOVESMART ESP32 COMBINED");
  Serial.println("=================================");
  Serial.print("DEVICE MODE: ");
  if (deviceMode == "BIN") {
    Serial.println("SMART BIN");
    Serial.println("RFID + SERVO + IR READY");
    Serial.print("Bin ID: ");
    Serial.println(binId);
    Serial.print("Bin Endpoint: ");
    Serial.println(binApiUrl);
  } else {
    Serial.println("BUS (TRANSIT TAP)");
    Serial.print("Stop Code: ");
    Serial.println(deviceStopCode);
    Serial.print("Bus Endpoint: ");
    Serial.println(busApiUrl);
  }
  Serial.println("=================================");

  Serial.println("RC522 initialized.");
  Serial.println("Checking RC522 firmware...");
  rfid.PCD_DumpVersionToSerial();

  // -------------------------------------------------
  // WIFI CONNECTION
  // -------------------------------------------------
  if (savedSSID.length() == 0) {
    Serial.println();
    Serial.println("No Wi-Fi configured.");
    startSetupMode();
  } else {
    Serial.println();
    Serial.println("Saved Wi-Fi found.");
    Serial.print("Wi-Fi: ");
    Serial.println(savedSSID);
    connectToSavedWiFi();
  }
}

// =====================================================
// MAIN LOOP
// =====================================================

void loop() {
  // -------------------------------------------------
  // WEB SERVER CLIENT HANDLING (NON-BLOCKING)
  // -------------------------------------------------
  setupServer.handleClient();

  // -------------------------------------------------
  // SETUP AP MODE ACTIVE
  // -------------------------------------------------
  if (setupMode) {
    delay(10);
    return;
  }

  // -------------------------------------------------
  // WIFI RECONNECT IF DISCONNECTED
  // -------------------------------------------------
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println();
    Serial.println("Wi-Fi disconnected. Trying to reconnect...");
    connectToSavedWiFi();
    delay(1000);
    return;
  }

  // -------------------------------------------------
  // CHECK FOR RFID CARD
  // -------------------------------------------------
  if (!rfid.PICC_IsNewCardPresent()) {
    delay(100);
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }

  // -------------------------------------------------
  // READ AND NORMALIZE UID
  // -------------------------------------------------
  String rfidTag = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      rfidTag += "0";
    }
    rfidTag += String(rfid.uid.uidByte[i], HEX);
  }
  rfidTag.toUpperCase();

  Serial.println();
  Serial.println("=================================");
  Serial.println("       RFID CARD DETECTED");
  Serial.println("=================================");
  Serial.print("RFID UID: ");
  Serial.println(rfidTag);

  // -------------------------------------------------
  // BRANCH BY ACTIVE DEVICE MODE
  // -------------------------------------------------
  if (deviceMode == "BIN") {
    // ===============================================
    // SMART BIN MODE WORKFLOW
    // ===============================================
    Serial.println("MODE: SMART BIN");
    Serial.print("Bin: ");
    Serial.println(binId);

    // 1. Open Servo Lid (90 degrees)
    openLid();

    // 2. Wait indefinitely for IR sensor confirmation (OUT == LOW)
    Serial.println("[Smart Bin] Lid opened. Waiting for waste deposit (IR sensor)...");
    while (true) {
      setupServer.handleClient(); // keep web server responsive
      if (digitalRead(IR_PIN) == LOW) {
        Serial.println("[IR Sensor] >> Waste / Object detected! <<");
        break;
      }
      delay(100);
    }

    // Debounce/settle time for dropped object
    delay(500);

    // 3. Generate unique depositId (ONLY AFTER object confirmed)
    String depositId = String("DEP-") + binId + "-" + String(millis());

    // 4. Send reward request to POST /api/bin/deposit
    sendBinDepositToBackend(rfidTag, depositId);

    // 5. Close Servo Lid (180 degrees)
    closeLid();

  } else {
    // ===============================================
    // BUS RFID MODE WORKFLOW (ORIGINAL PRESERVED)
    // ===============================================
    Serial.println("MODE: BUS");
    Serial.print("Stop: ");
    Serial.println(deviceStopCode);

    // Send tap to POST /api/rfid/tap
    sendTapToBackend(rfidTag);
  }

  // -------------------------------------------------
  // STOP RFID COMMUNICATION & RESET
  // -------------------------------------------------
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  Serial.println();
  Serial.println("Remove card...");
  delay(1500);
  Serial.println("RFID reader is READY.");
}

// =====================================================
// SERVO CONTROL HELPERS
// =====================================================

void openLid() {
  Serial.println("[Servo] Opening bin lid (90°)...");
  binServo.write(OPEN_ANGLE);
  delay(500);
}

void closeLid() {
  Serial.println("[Servo] Closing bin lid (180°)...");
  binServo.write(CLOSED_ANGLE);
  delay(500);
}

// =====================================================
// CONNECT TO SAVED WIFI
// =====================================================

void connectToSavedWiFi() {
  setupMode = false;
  WiFi.mode(WIFI_STA);

  Serial.println();
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(savedSSID.c_str(), savedPassword.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("=================================");
    Serial.println("       WIFI CONNECTED");
    Serial.println("=================================");
    Serial.print("Wi-Fi: ");
    Serial.println(savedSSID);
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Active Mode: ");
    Serial.println(deviceMode == "BIN" ? "SMART BIN" : "BUS");
    Serial.print("Active Endpoint: ");
    Serial.println(deviceMode == "BIN" ? binApiUrl : busApiUrl);
    Serial.print("Mode Switch Page: http://");
    Serial.print(WiFi.localIP());
    Serial.println("/mode");
    Serial.println();
    Serial.println("RFID reader is READY.");

    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
    delay(500);
    digitalWrite(GREEN_LED, LOW);

    // Register Web Server routes for Wi-Fi Connected Mode
    setupServer.on("/", HTTP_GET, handleModePage);
    setupServer.on("/mode", HTTP_GET, handleModeEndpoint);
    setupServer.on("/setmode", HTTP_GET, handleModeEndpoint);
    setupServer.begin();
    Serial.println("Local Device Mode Web Server started at /mode.");
  } else {
    Serial.println();
    Serial.println("Wi-Fi connection failed.");
    digitalWrite(RED_LED, HIGH);
    delay(1000);
    digitalWrite(RED_LED, LOW);
    startSetupMode();
  }
}

// =====================================================
// START ESP32 SETUP MODE (AP PROVISIONING)
// =====================================================

void startSetupMode() {
  setupMode = true;
  WiFi.disconnect(true);
  delay(500);

  WiFi.mode(WIFI_AP);
  WiFi.softAP("MoveSmart-RFID", "movesmart123");

  IPAddress IP = WiFi.softAPIP();

  Serial.println();
  Serial.println("=================================");
  Serial.println("       WIFI & MODE SETUP");
  Serial.println("=================================");
  Serial.println("Connect your phone/laptop to:");
  Serial.println("Wi-Fi Name: MoveSmart-RFID");
  Serial.println("Password: movesmart123");
  Serial.println();
  Serial.print("Open this address: ");
  Serial.println(IP);

  setupServer.on("/", HTTP_GET, handleSetupPage);
  setupServer.on("/mode", HTTP_GET, handleModeEndpoint);
  setupServer.on("/save", HTTP_POST, handleSaveWiFi);
  setupServer.on("/reset", HTTP_GET, handleResetWiFi);
  setupServer.on("/setmode", HTTP_GET, handleModeEndpoint);

  setupServer.begin();
  Serial.println("Setup portal started.");
}

// =====================================================
// DYNAMIC DEVICE MODE HTTP ENDPOINT (GET /mode?mode=BUS or BIN)
// =====================================================

void handleModeEndpoint() {
  if (setupServer.hasArg("mode")) {
    String targetMode = setupServer.arg("mode");
    targetMode.toUpperCase();

    if (targetMode == "BUS" || targetMode == "BIN") {
      deviceMode = targetMode;
      preferences.putString("mode", deviceMode);

      Serial.println();
      Serial.println("=================================");
      Serial.println("     DYNAMIC MODE SWITCH");
      Serial.println("=================================");
      Serial.print("Device mode updated to: ");
      Serial.println(deviceMode);
      Serial.println("=================================");

      if (deviceMode == "BIN") {
        binServo.write(CLOSED_ANGLE);
      }

      setupServer.send(200, "application/json", "{\"success\":true,\"mode\":\"" + deviceMode + "\",\"message\":\"Switched to " + deviceMode + " mode\"}");
      return;
    } else {
      setupServer.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid mode. Must be BUS or BIN\"}");
      return;
    }
  }

  // If no param, return current mode JSON
  setupServer.send(200, "application/json", "{\"success\":true,\"mode\":\"" + deviceMode + "\"}");
}

// =====================================================
// DEVICE MODE WEB PAGE (GET /mode-ui or GET /)
// =====================================================

void handleModePage() {
  // Read current saved mode strictly from Preferences
  String currentMode = preferences.getString("mode", "BUS");
  currentMode.toUpperCase();
  if (currentMode != "BIN") currentMode = "BUS";

  bool isBin = (currentMode == "BIN");
  String modeTitle = isBin ? "🗑️ SMART WASTE BIN" : "🚌 BUS RFID";
  String busActive = !isBin ? "active" : "";
  String binActive = isBin ? "active" : "";
  String ipStr = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  String wifiStatus = (WiFi.status() == WL_CONNECTED) ? ("Connected (" + savedSSID + ")") : "SoftAP Mode";

  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>MoveSmart Device Mode</title><style>";
  html += "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f5fa; margin: 0; padding: 25px; display: flex; justify-content: center; }";
  html += ".card { background: white; max-width: 400px; width: 100%; border-radius: 20px; padding: 28px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); text-align: center; }";
  html += "h1 { color: #3b3086; margin: 0 0 6px 0; font-size: 22px; }";
  html += ".subtitle { color: #71717a; font-size: 14px; margin-bottom: 22px; font-weight: 500; }";
  html += ".current-badge { background: #f0edff; border: 1px solid #d4ccff; border-radius: 14px; padding: 16px; margin-bottom: 22px; }";
  html += ".current-label { font-size: 12px; font-weight: bold; color: #6355d8; text-transform: uppercase; letter-spacing: 0.5px; }";
  html += ".current-val { font-size: 19px; font-weight: bold; color: #18181b; margin-top: 4px; }";
  html += ".btn-group { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }";
  html += ".btn { display: block; padding: 15px 18px; border-radius: 12px; font-size: 16px; font-weight: bold; text-decoration: none; transition: all 0.2s ease; cursor: pointer; }";
  html += ".btn-bus { background: #e0e7ff; color: #3730a3; border: 2px solid transparent; }";
  html += ".btn-bus.active { background: #4338ca; color: white; box-shadow: 0 4px 14px rgba(67, 56, 202, 0.35); border-color: #312e81; }";
  html += ".btn-bin { background: #dcfce7; color: #166534; border: 2px solid transparent; }";
  html += ".btn-bin.active { background: #15803d; color: white; box-shadow: 0 4px 14px rgba(21, 128, 61, 0.35); border-color: #14532d; }";
  html += ".info-box { background: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px; font-size: 13px; color: #52525b; text-align: left; }";
  html += ".info-row { display: flex; justify-content: space-between; margin: 5px 0; }";
  html += ".info-label { color: #71717a; }";
  html += ".info-val { font-weight: 600; color: #18181b; }";
  html += "</style></head><body><div class=\"card\">";
  html += "<h1>MoveSmart Device</h1><div class=\"subtitle\">Device Operating Mode</div>";
  html += "<div class=\"current-badge\"><div class=\"current-label\">Current Mode</div><div class=\"current-val\">" + modeTitle + "</div></div>";
  html += "<div class=\"btn-group\">";
  html += "<a href=\"/setmode?mode=BUS\" class=\"btn btn-bus " + busActive + "\">🚌 BUS RFID</a>";
  html += "<a href=\"/setmode?mode=BIN\" class=\"btn btn-bin " + binActive + "\">🗑️ SMART WASTE BIN</a>";
  html += "</div><div class=\"info-box\">";
  html += "<div class=\"info-row\"><span class=\"info-label\">Wi-Fi:</span><span class=\"info-val\">" + wifiStatus + "</span></div>";
  html += "<div class=\"info-row\"><span class=\"info-label\">Device IP:</span><span class=\"info-val\">" + ipStr + "</span></div>";
  html += "</div></div></body></html>";

  setupServer.send(200, "text/html", html);
}

// =====================================================
// MODE SWITCH & RESTART HANDLER (GET /setmode?mode=BUS or BIN)
// =====================================================

void handleSetModeAndRestart() {
  if (!setupServer.hasArg("mode")) {
    setupServer.send(400, "text/plain", "Missing mode parameter. Use /setmode?mode=BUS or /setmode?mode=BIN");
    return;
  }

  String targetMode = setupServer.arg("mode");
  targetMode.toUpperCase();

  if (targetMode != "BUS" && targetMode != "BIN") {
    setupServer.send(400, "text/plain", "Invalid mode. Valid options are BUS or BIN.");
    return;
  }

  // 1. Save to Preferences permanently
  preferences.putString("mode", targetMode);
  deviceMode = targetMode;

  String modeName = (targetMode == "BIN") ? "Smart Waste Bin mode selected." : "Bus RFID mode selected.";
  String badge = (targetMode == "BIN") ? "🗑️ SMART WASTE BIN" : "🚌 BUS RFID";

  Serial.println();
  Serial.println("=================================");
  Serial.println("      MODE SWITCH REQUEST");
  Serial.println("=================================");
  Serial.println("New Mode: " + targetMode);
  Serial.println("Saved to Preferences. Restarting ESP32...");

  // 2. Send confirmation HTML response before reboot
  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<meta http-equiv=\"refresh\" content=\"6;url=/mode\">";
  html += "<title>Mode Switching</title><style>";
  html += "body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f5fa; display: flex; justify-content: center; padding: 40px 20px; }";
  html += ".card { background: white; max-width: 380px; width: 100%; border-radius: 20px; padding: 30px; text-align: center; box-shadow: 0 8px 30px rgba(0,0,0,0.08); }";
  html += "h2 { color: #3b3086; margin-top: 0; font-size: 20px; }";
  html += ".mode-badge { font-size: 18px; font-weight: bold; color: #18181b; margin: 12px 0; }";
  html += "p { color: #52525b; font-size: 15px; }";
  html += ".spinner { width: 36px; height: 36px; border: 4px solid #e0e7ff; border-top: 4px solid #4338ca; border-radius: 50%; margin: 22px auto; animation: spin 1s linear infinite; }";
  html += "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
  html += "</style></head><body><div class=\"card\">";
  html += "<h2>Mode Updated</h2><div class=\"mode-badge\">" + badge + "</div>";
  html += "<p><b>" + modeName + "</b></p>";
  html += "<div class=\"spinner\"></div>";
  html += "<p style=\"font-size:13px; color:#71717a;\">Restarting device cleanly into new mode...</p>";
  html += "</div></body></html>";

  setupServer.send(200, "text/html", html);

  // 3. Wait briefly so the browser receives the response completely
  delay(800);

  // 4. Clean restart into selected mode
  ESP.restart();
}

// =====================================================
// SETUP AP WEB PAGE (INCLUDES WIFI & MODE CONFIG)
// =====================================================

void handleSetupPage() {
  String currentMode = preferences.getString("mode", "BUS");
  currentMode.toUpperCase();
  String isBusChecked = (currentMode != "BIN") ? "checked" : "";
  String isBinChecked = (currentMode == "BIN") ? "checked" : "";

  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>MoveSmart Device Setup</title><style>";
  html += "body { font-family: Arial, sans-serif; background: #f7f5ff; margin: 0; padding: 25px; }";
  html += ".container { max-width: 440px; margin: auto; background: white; padding: 25px; border-radius: 18px; box-shadow: 0 5px 25px rgba(0,0,0,0.1); }";
  html += "h1 { color: #4f46a5; margin-top: 0; } p { color: #555; font-size: 14px; }";
  html += "label { display: block; margin-top: 16px; margin-bottom: 6px; font-weight: bold; }";
  html += "input[type=text], input[type=password] { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ccc; border-radius: 10px; font-size: 15px; }";
  html += ".mode-box { background: #f0edff; padding: 15px; border-radius: 12px; margin-top: 18px; }";
  html += ".mode-option { display: flex; align-items: center; margin: 10px 0; font-size: 15px; cursor: pointer; }";
  html += ".mode-option input { margin-right: 10px; width: 18px; height: 18px; }";
  html += "button { width: 100%; margin-top: 22px; padding: 14px; border: none; border-radius: 10px; background: #4f46a5; color: white; font-size: 16px; font-weight: bold; cursor: pointer; }";
  html += "</style></head><body><div class=\"container\">";
  html += "<h1>MoveSmart Device</h1><p>Configure Wi-Fi and choose operating mode for this ESP32.</p>";
  html += "<form action=\"/save\" method=\"POST\">";
  html += "<label>Wi-Fi Name (SSID)</label><input type=\"text\" name=\"ssid\" value=\"" + savedSSID + "\" placeholder=\"Enter Wi-Fi name\" required>";
  html += "<label>Wi-Fi Password</label><input type=\"password\" name=\"password\" placeholder=\"Enter Wi-Fi password\">";
  html += "<div class=\"mode-box\"><label style=\"margin-top:0;\">Operating Mode</label>";
  html += "<label class=\"mode-option\"><input type=\"radio\" name=\"mode\" value=\"BUS\" " + isBusChecked + "> 🚌 Bus RFID Reader Mode</label>";
  html += "<label class=\"mode-option\"><input type=\"radio\" name=\"mode\" value=\"BIN\" " + isBinChecked + "> ♻️ Smart Bin Waste Mode</label>";
  html += "</div><button type=\"submit\">Save & Connect Device</button></form></div></body></html>";

  setupServer.send(200, "text/html", html);
}

// =====================================================
// SAVE WIFI & MODE DETAILS FROM AP PORTAL
// =====================================================

void handleSaveWiFi() {
  if (!setupServer.hasArg("ssid")) {
    setupServer.send(400, "text/plain", "Wi-Fi SSID is required.");
    return;
  }

  String newSSID = setupServer.arg("ssid");
  String newPassword = setupServer.hasArg("password") ? setupServer.arg("password") : "";
  String newMode = setupServer.hasArg("mode") ? setupServer.arg("mode") : "BUS";

  newSSID.trim();
  newMode.toUpperCase();
  if (newMode != "BIN") newMode = "BUS";

  Serial.println();
  Serial.println("=================================");
  Serial.println("       SAVING CONFIGURATION");
  Serial.println("=================================");
  Serial.print("SSID: ");
  Serial.println(newSSID);
  Serial.print("MODE: ");
  Serial.println(newMode);

  preferences.putString("ssid", newSSID);
  preferences.putString("password", newPassword);
  preferences.putString("mode", newMode);

  savedSSID = newSSID;
  savedPassword = newPassword;
  deviceMode = newMode;

  String html = "<!DOCTYPE html><html><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">";
  html += "<title>MoveSmart</title><style>body { font-family: Arial; background: #f7f5ff; text-align: center; padding: 50px; }";
  html += ".box { max-width: 420px; margin: auto; background: white; padding: 30px; border-radius: 18px; }</style></head>";
  html += "<body><div class=\"box\"><h1 style=\"color:#4f46a5;\">Settings Saved</h1>";
  html += "<p>Mode set to: <b>" + (deviceMode == "BIN" ? String("Smart Bin Mode") : String("Bus Mode")) + "</b></p>";
  html += "<p>Connecting to <b>" + savedSSID + "</b>...</p><p>You can close this page.</p></div></body></html>";

  setupServer.send(200, "text/html", html);
  delay(2000);

  setupServer.stop();
  WiFi.softAPdisconnect(true);
  connectToSavedWiFi();
}

// =====================================================
// RESET SETTINGS
// =====================================================

void handleResetWiFi() {
  preferences.clear();
  String html = "<!DOCTYPE html><html><body><h2>Settings Cleared</h2><p>Restart ESP32 to reconfigure.</p></body></html>";
  setupServer.send(200, "text/html", html);
}

// =====================================================
// SEND BUS RFID TAP TO BACKEND (/api/rfid/tap)
// =====================================================

void sendTapToBackend(String rfidTag) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("ERROR: Wi-Fi not connected.");
    errorFeedback();
    return;
  }

  HTTPClient http;
  Serial.println();
  Serial.println("Sending tap to MoveSmart bus backend...");
  Serial.print("Backend URL: ");
  Serial.println(busApiUrl);

  http.begin(busApiUrl);
  http.addHeader("Content-Type", "application/json");

  String jsonData = "{";
  jsonData += "\"rfidTag\":\"" + rfidTag + "\",";
  jsonData += "\"stopCode\":\"" + String(deviceStopCode) + "\"";
  jsonData += "}";

  Serial.print("Request: ");
  Serial.println(jsonData);

  int httpCode = http.POST(jsonData);
  Serial.print("HTTP Status: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Backend response:");
    Serial.println(response);

    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, response);

    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      errorFeedback();
      http.end();
      return;
    }

    bool allowed = doc["allowed"] | false;
    String action = doc["action"] | "";
    String message = doc["message"] | "";

    Serial.println("--------- RESULT ---------");
    Serial.print("Allowed: ");
    Serial.println(allowed ? "YES" : "NO");
    Serial.print("Action: ");
    Serial.println(action);
    Serial.print("Message: ");
    Serial.println(message);

    if (allowed) {
      Serial.println("RFID TAP ACCEPTED");
      if (action == "TAP_IN") {
        Serial.println("Passenger TAP-IN successful.");
      } else if (action == "TAP_OUT") {
        Serial.println("Passenger TAP-OUT successful.");
      }
      successFeedback();
    } else if (action == "IGNORE") {
      Serial.println("Duplicate tap ignored.");
    } else {
      Serial.println("RFID TAP REJECTED.");
      errorFeedback();
    }
  } else {
    Serial.println("ERROR: Backend unavailable.");
    Serial.print("HTTP error: ");
    Serial.println(http.errorToString(httpCode));
    errorFeedback();
  }

  http.end();
}

// =====================================================
// SEND SMART BIN DEPOSIT TO BACKEND (/api/bin/deposit)
// =====================================================

void sendBinDepositToBackend(String rfidTag, String depositId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n--------------------------------");
    Serial.println("BACKEND CONNECTION FAILED");
    Serial.println("Waste detected, but reward could not be confirmed (No Wi-Fi).");
    Serial.println("--------------------------------");
    errorFeedback();
    return;
  }

  HTTPClient http;
  http.begin(binApiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);

  String jsonData = "{";
  jsonData += "\"rfidTag\":\"" + rfidTag + "\",";
  jsonData += "\"binId\":\"" + String(binId) + "\",";
  jsonData += "\"objectDetected\":true,";
  jsonData += "\"depositId\":\"" + depositId + "\"";
  jsonData += "}";

  Serial.println("\n--------------------------------");
  Serial.println("SMART BIN DEPOSIT");
  Serial.println("--------------------------------");
  Serial.println("RFID: " + rfidTag);
  Serial.println("Bin: " + String(binId));
  Serial.println("Object detected: YES");
  Serial.println("Deposit ID: " + depositId);
  Serial.println("Sending reward request...");

  int httpCode = http.POST(jsonData);
  String response = http.getString();

  Serial.print("HTTP Status: ");
  Serial.println(httpCode);
  Serial.println("Backend response:");
  Serial.println(response);
  Serial.println("--------------------------------");

  if (httpCode == 200) {
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["success"] == true) {
      if (doc["duplicate"] == true) {
        Serial.println("\nDEPOSIT ALREADY PROCESSED");
        Serial.println("No additional reward credited.");
      } else {
        Serial.println("\n₹10 REWARD CREDITED");
        Serial.println("Smart Bin deposit completed.");
        if (doc.containsKey("balance")) {
          float newBal = doc["balance"].as<float>();
          Serial.printf("Updated Card Balance: ₹%.2f\n", newBal);
        }
      }
      successFeedback();
    } else {
      Serial.println("\nREWARD NOT CREDITED");
      Serial.println("Backend error: " + response);
      errorFeedback();
    }
  } else if (httpCode > 0) {
    Serial.println("\nREWARD NOT CREDITED");
    Serial.println("Backend error: " + response);
    errorFeedback();
  } else {
    Serial.println("\nBACKEND CONNECTION FAILED");
    Serial.println("Waste detected, but reward could not be confirmed.");
    Serial.println("Error: " + http.errorToString(httpCode));
    errorFeedback();
  }

  http.end();
}

// =====================================================
// SUCCESS FEEDBACK (LEDS + BUZZER)
// =====================================================

void successFeedback() {
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, HIGH);
  tone(BUZZER, 2000, 150);
  delay(300);
  digitalWrite(GREEN_LED, LOW);
}

// =====================================================
// ERROR FEEDBACK (LEDS + BUZZER)
// =====================================================

void errorFeedback() {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, HIGH);
  tone(BUZZER, 500, 400);
  delay(500);
  digitalWrite(RED_LED, LOW);
}