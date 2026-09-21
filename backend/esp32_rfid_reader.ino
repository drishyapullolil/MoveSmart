/**
 * ============================================================================
 * MoveSmart IoT RFID Transit Tap Reader Firmware v2.5
 * ============================================================================
 * 
 * Hardware:
 * - ESP32 Development Board (ESP32 DevKit V1 / ESP32-WROOM-32)
 * - MFRC522 / RC522 RFID Reader module
 * - (Optional) Status LEDs & Buzzer
 * 
 * Wiring Configuration (STRICT HARDWARE PINS):
 * - RC522 SDA (SS)  -> ESP32 GPIO 5
 * - RC522 SCK       -> ESP32 GPIO 18
 * - RC522 MOSI      -> ESP32 GPIO 23
 * - RC522 MISO      -> ESP32 GPIO 19
 * - RC522 RST       -> ESP32 GPIO 22
 * - RC522 3.3V      -> ESP32 3V3 (Do NOT connect to 5V)
 * - RC522 GND       -> ESP32 GND
 * - RC522 IRQ       -> Not Connected
 * 
 * Optional Status Pins:
 * - Green LED       -> ESP32 GPIO 12 (Success indicator)
 * - Red LED         -> ESP32 GPIO 14 (Rejection / Error indicator)
 * - Buzzer          -> ESP32 GPIO 13 (Audio feedback)
 * 
 * Provisioning & Security:
 * - Zero hardcoded Wi-Fi passwords in Git/source code.
 * - Credentials stored in ESP32 Non-Volatile Storage (NVS Flash) via Preferences.h.
 * - On-demand SoftAP Mode ("MoveSmart-RFID-XXXX") with captive web server on 192.168.4.1.
 * - Auto-reconnect & real-time heartbeat to MoveSmart Node.js backend.
 * 
 * Arduino IDE Settings:
 * - Board: ESP32 Dev Module
 * - Baud Rate: 115200
 * - Libraries: MFRC522 (by GithubCommunity 1.4.12+), ArduinoJson (v6 or v7)
 * ============================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// Hardware Pin Definitions
#define SS_PIN    5
#define RST_PIN   22
#define GREEN_LED 12
#define RED_LED   14
#define BUZZER    13

// NVS Persistent Storage
Preferences preferences;

// Local Web Server for Driver SoftAP Provisioning (Port 80)
WebServer server(80);

// Hardware Objects
MFRC522 mfrc522(SS_PIN, RST_PIN);

// Runtime State Variables
String deviceId = "MS-RFID-5326";
String wifiSsid = "";
String wifiPassword = "";
String serverApiUrl = "http://192.168.1.5:5000/api/rfid/tap";
String backendBaseUrl = "http://192.168.1.5:5000";
String deviceStopCode = "STOP_KANJIRAPPALLY";
String assignedBusNumber = "KL-06-345"; // Assigned bus number (configurable dynamically via portal or NVS)
String assignedDriverId = "";

bool isProvisioningMode = false;
bool isConnectedToWifi = false;
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

// Forward Declarations
void loadSavedPreferences();
void saveConfiguration(String ssid, String pass, String serverUrl, String stopCode, String busNum, String drvId);
void startSoftAPProvisioning();
bool connectToWiFi(int timeoutSeconds = 15);
void registerDeviceWithBackend();
void sendPeriodicHeartbeat();
void sendTapEvent(String rfidTagHex);
void setupWebServerRoutes();
void handleRoot();
void handleConfigure();
void handleStatus();
void handleResetNVS();
void successBeep();
void triggerRejectionFeedback();
void doubleBeep();

void setup() {
  Serial.begin(115200);
  delay(600);

  Serial.println("\n========================================================");
  Serial.println("   MoveSmart IoT RFID Reader Terminal v2.5");
  Serial.println("========================================================");

  // Initialize Indicators
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, HIGH);
  delay(300);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);

  // Generate Unique Device ID based on MAC
  String mac = WiFi.macAddress();
  mac.replace(":", "");
  deviceId = "MS-RFID-" + mac.substring(mac.length() - 4);
  deviceId.toUpperCase();

  // Initialize SPI & RC522 Reader
  SPI.begin();
  mfrc522.PCD_Init();
  Serial.print("[RC522] Hardware RFID Reader Initialized. Device ID: ");
  Serial.println(deviceId);
  mfrc522.PCD_DumpVersionToSerial();

  // Load Saved Configuration from NVS
  loadSavedPreferences();

  // Attempt Wi-Fi Connection if SSID is saved
  if (wifiSsid.length() > 0) {
    Serial.print("[Wi-Fi] Saved network found: ");
    Serial.println(wifiSsid);
    isConnectedToWifi = connectToWiFi(12);
  }

  if (!isConnectedToWifi) {
    Serial.println("[Provisioning] No working Wi-Fi connection. Launching SoftAP Setup Mode...");
    startSoftAPProvisioning();
  } else {
    Serial.println("[Wi-Fi] Connected to Driver's Network! ✅");
    registerDeviceWithBackend();
    setupWebServerRoutes();
    server.begin();
    successBeep();
    Serial.println("System Ready. RFID reader is active for transit taps...\n");
  }
}

void loop() {
  // Always handle HTTP server requests (both in SoftAP and Station mode)
  server.handleClient();

  // In Normal Connected Mode: Monitor RFID Card Taps & Send Heartbeats
  if (isConnectedToWifi && !isProvisioningMode) {
    // Send periodic liveness heartbeat to MoveSmart backend
    if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL_MS) {
      lastHeartbeatTime = millis();
      sendPeriodicHeartbeat();
    }

    // Check for RFID Card Presence
    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
      String rfidTagHex = "";
      String formattedUid = "";
      for (byte i = 0; i < mfrc522.uid.size; i++) {
        if (mfrc522.uid.uidByte[i] < 0x10) {
          rfidTagHex += "0";
          formattedUid += "0";
        }
        rfidTagHex += String(mfrc522.uid.uidByte[i], HEX);
        formattedUid += String(mfrc522.uid.uidByte[i], HEX);
        if (i < mfrc522.uid.size - 1) formattedUid += " ";
      }
      rfidTagHex.toUpperCase();
      formattedUid.toUpperCase();

      Serial.println("\n========================================");
      Serial.println("RFID CARD DETECTED");
      Serial.print("UID: ");
      Serial.println(formattedUid);
      Serial.print("Tag ID: ");
      Serial.println(rfidTagHex);
      Serial.print("Station Stop: ");
      Serial.println(deviceStopCode);

      // Transmit tap event to MoveSmart backend
      sendTapEvent(rfidTagHex);

      // Halt PICC & Stop PCD Encryption
      mfrc522.PICC_HaltA();
      mfrc522.PCD_StopCrypto1();

      Serial.println("========================================\n");
      delay(1500); // Debounce delay
    }
  }

  // If Wi-Fi dropped in normal mode, attempt quick reconnect
  if (!isProvisioningMode && WiFi.status() != WL_CONNECTED && wifiSsid.length() > 0) {
    static unsigned long lastReconnectAttempt = 0;
    if (millis() - lastReconnectAttempt > 10000) {
      lastReconnectAttempt = millis();
      Serial.println("[Wi-Fi] Connection lost. Reconnecting...");
      if (WiFi.reconnect()) {
        isConnectedToWifi = true;
        Serial.println("[Wi-Fi] Reconnected successfully ✅");
        registerDeviceWithBackend();
      }
    }
  }
}

// ============================================================================
// NVS PREFERENCES & CONFIGURATION
// ============================================================================
void loadSavedPreferences() {
  preferences.begin("movesmart", true);
  wifiSsid = preferences.getString("ssid", "");
  wifiPassword = preferences.getString("pass", "");
  serverApiUrl = preferences.getString("server", "http://192.168.1.5:5000/api/rfid/tap");
  deviceStopCode = preferences.getString("stop", "STOP_VYTTILA");
  assignedBusNumber = preferences.getString("bus", "KL-06-345");
  assignedDriverId = preferences.getString("driver", "");
  preferences.end();

  // Extract base URL
  int idx = serverApiUrl.indexOf("/api/");
  if (idx > 0) {
    backendBaseUrl = serverApiUrl.substring(0, idx);
  } else {
    backendBaseUrl = "http://192.168.1.5:5000";
  }
}

void saveConfiguration(String ssid, String pass, String serverUrl, String stopCode, String busNum, String drvId) {
  preferences.begin("movesmart", false);
  if (ssid.length() > 0) preferences.putString("ssid", ssid);
  if (pass.length() > 0) preferences.putString("pass", pass);
  if (serverUrl.length() > 0) preferences.putString("server", serverUrl);
  if (stopCode.length() > 0) preferences.putString("stop", stopCode);
  if (busNum.length() > 0) preferences.putString("bus", busNum);
  if (drvId.length() > 0) preferences.putString("driver", drvId);
  preferences.end();

  loadSavedPreferences();
}

// ============================================================================
// WI-FI & SOFTAP PROVISIONING
// ============================================================================
bool connectToWiFi(int timeoutSeconds) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPassword.c_str());
  
  Serial.print("Connecting to Wi-Fi");
  int count = 0;
  while (WiFi.status() != WL_CONNECTED && count < (timeoutSeconds * 2)) {
    digitalWrite(GREEN_LED, HIGH);
    delay(250);
    digitalWrite(GREEN_LED, LOW);
    delay(250);
    Serial.print(".");
    count++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected! Local IP: " + WiFi.localIP().toString());
    return true;
  }

  Serial.println("\n[Wi-Fi] Connection timed out.");
  return false;
}

void startSoftAPProvisioning() {
  isProvisioningMode = true;
  WiFi.mode(WIFI_AP);

  String apName = "MoveSmart-RFID-" + deviceId.substring(deviceId.length() - 4);
  WiFi.softAP(apName.c_str());

  IPAddress apIP = WiFi.softAPIP();
  Serial.println("\n--------------------------------------------------------");
  Serial.println("  ESP32 PROVISIONING AP ACTIVE");
  Serial.println("  SSID: " + apName);
  Serial.println("  Portal URL: http://" + apIP.toString());
  Serial.println("--------------------------------------------------------");

  setupWebServerRoutes();
  server.begin();

  // Rapid red blink to indicate setup mode
  digitalWrite(RED_LED, HIGH);
  delay(200);
  digitalWrite(RED_LED, LOW);
}

// ============================================================================
// BACKEND REGISTRATION & HEARTBEAT
// ============================================================================
void registerDeviceWithBackend() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String registerUrl = backendBaseUrl + "/api/rfid/device/register";
  http.begin(registerUrl);
  http.addHeader("Content-Type", "application/json");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<300> doc;
  #endif

  doc["deviceId"] = deviceId;
  doc["driverId"] = assignedDriverId;
  doc["busNumber"] = assignedBusNumber;
  doc["stopCode"] = deviceStopCode;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = "v2.5-RC522-NVS";

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  if (code > 0) {
    Serial.print("[Backend Register] HTTP ");
    Serial.print(code);
    Serial.println(" - Device registered with MoveSmart server ✅");
  } else {
    Serial.print("[Backend Register] Error: ");
    Serial.println(code);
  }
  http.end();
}

void sendPeriodicHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String hbUrl = backendBaseUrl + "/api/rfid/device/heartbeat";
  http.begin(hbUrl);
  http.addHeader("Content-Type", "application/json");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<200> doc;
  #endif

  doc["deviceId"] = deviceId;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["stopCode"] = deviceStopCode;
  doc["readerActive"] = true;

  String payload;
  serializeJson(doc, payload);
  http.POST(payload);
  http.end();
}

// ============================================================================
// RFID TAP TRANSACTION
// ============================================================================
void sendTapEvent(String rfidTagHex) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Backend response: NETWORK ERROR (Wi-Fi Disconnected) ❌");
    triggerRejectionFeedback();
    return;
  }

  HTTPClient http;
  http.begin(serverApiUrl);
  http.addHeader("Content-Type", "application/json");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<256> doc;
  #endif

  doc["rfidTag"] = rfidTagHex;
  doc["stopCode"] = deviceStopCode;
  doc["deviceId"] = deviceId;
  doc["busNumber"] = assignedBusNumber;

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument respDoc;
    #else
      StaticJsonDocument<512> respDoc;
    #endif

    DeserializationError err = deserializeJson(respDoc, response);
    if (!err) {
      bool allowed = respDoc["allowed"] | false;
      String action = respDoc["action"] | "";
      String message = respDoc["message"] | "";

      if (allowed) {
        if (action == "TAP_IN") {
          Serial.println("\nBackend response: TAP-IN SUCCESSFUL ✅");
          const char* stopName = respDoc["stop"]["name"] | deviceStopCode.c_str();
          const char* cardType = respDoc["card"]["cardType"] | "Regular";
          const char* balance = respDoc["card"]["balance"] | "0.00";

          Serial.print("Boarded At: ");
          Serial.println(stopName);
          Serial.print("Pass Category: ");
          Serial.println(cardType);
          Serial.print("Card Balance: ₹");
          Serial.println(balance);
          
          digitalWrite(GREEN_LED, HIGH);
          digitalWrite(BUZZER, HIGH); delay(150);
          digitalWrite(BUZZER, LOW);  delay(100);
          digitalWrite(GREEN_LED, LOW);
        }
        else if (action == "TAP_OUT") {
          Serial.println("\nBackend response: TAP-OUT SUCCESSFUL ✅");
          const char* fromStop = respDoc["journey"]["from"] | "Origin";
          const char* toStop = respDoc["journey"]["to"] | deviceStopCode.c_str();
          double distanceKm = respDoc["journey"]["distanceKm"] | 0.0;
          double fare = respDoc["journey"]["fare"] | 0.0;
          const char* balance = respDoc["card"]["balance"] | "0.00";

          Serial.print("Journey: ");
          Serial.print(fromStop);
          Serial.print(" ➔ ");
          Serial.println(toStop);
          Serial.print("Distance: ");
          Serial.print(distanceKm, 1);
          Serial.println(" km");
          Serial.print("Fare: ₹");
          Serial.println(fare, 2);
          Serial.print("Remaining Balance: ₹");
          Serial.println(balance);

          doubleBeep();
        }
        else if (action == "IGNORE") {
          Serial.println("\nBackend response: DUPLICATE TAP IGNORED ⚠️");
          Serial.println(message);
          digitalWrite(GREEN_LED, HIGH);
          digitalWrite(RED_LED, HIGH);
          digitalWrite(BUZZER, HIGH); delay(60);
          digitalWrite(BUZZER, LOW);
          digitalWrite(GREEN_LED, LOW);
          digitalWrite(RED_LED, LOW);
        }
      } else {
        Serial.print("\nBackend response: TAP REJECTED ❌ (");
        Serial.print(respDoc["reason"] | "Rejected");
        Serial.println(")");
        Serial.println(message);
        triggerRejectionFeedback();
      }
    } else {
      Serial.println("\nBackend response: JSON Parse Error ❌");
      triggerRejectionFeedback();
    }
  } else {
    Serial.print("\nBackend response: SERVER ERROR (HTTP ");
    Serial.print(httpCode);
    Serial.println(") ❌");
    triggerRejectionFeedback();
  }

  http.end();
}

// ============================================================================
// EMBEDDED PROVISIONING WEB SERVER & REST ENDPOINTS
// ============================================================================
void setupWebServerRoutes() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/configure", HTTP_POST, handleConfigure);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/reset", HTTP_POST, handleResetNVS);

  // Enable CORS Options for all routes
  server.on("/configure", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'>";
  html += "<title>MoveSmart RFID Setup</title>";
  html += "<style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;padding:20px;display:flex;justify-content:center;margin:0}";
  html += ".card{background:#1e293b;border:1.5px solid #334155;border-radius:18px;max-width:440px;width:100%;padding:24px;box-shadow:0 12px 32px rgba(0,0,0,0.4)}";
  html += "h2{margin:0 0 6px 0;color:#38bdf8;font-size:22px}p{color:#94a3b8;font-size:13px;margin:0 0 20px 0}";
  html += "label{display:block;font-size:12px;font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px}";
  html += "input,select{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:10px;border:1.5px solid #475569;background:#0f172a;color:#ffffff;font-size:14px;margin-bottom:16px;outline:none}";
  html += "input:focus{border-color:#38bdf8}";
  html += "button{width:100%;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#0284c7,#0369a1);color:#ffffff;font-weight:800;font-size:15px;cursor:pointer;margin-top:6px}";
  html += ".tag{display:inline-block;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:800;background:#0369a1;color:#ffffff;margin-bottom:12px}";
  html += "</style></head><body>";
  html += "<div class='card'>";
  html += "<span class='tag'>DEVICE: " + deviceId + "</span>";
  html += "<h2>MoveSmart RFID Setup</h2>";
  html += "<p>Configure Wi-Fi and terminal settings for this RFID reader.</p>";
  html += "<form method='POST' action='/configure'>";
  html += "<label>Wi-Fi Network Name (SSID)</label><input type='text' name='ssid' value='" + wifiSsid + "' placeholder='e.g. Bus_Hotspot' required>";
  html += "<label>Wi-Fi Password</label><input type='password' name='password' placeholder='Enter Wi-Fi password' required>";
  html += "<label>MoveSmart Backend Tap URL</label><input type='text' name='serverApiUrl' value='" + serverApiUrl + "' required>";
  html += "<label>Terminal Stop Code</label>";
  html += "<select name='stopCode'>";
  html += "<option value='STOP_VYTTILA'" + String(deviceStopCode == "STOP_VYTTILA" ? " selected" : "") + ">Vyttila Mobility Hub (STOP_VYTTILA)</option>";
  html += "<option value='STOP_KALOOR'" + String(deviceStopCode == "STOP_KALOOR" ? " selected" : "") + ">Kaloor Bus Terminal (STOP_KALOOR)</option>";
  html += "<option value='STOP_EDAPPALLY'" + String(deviceStopCode == "STOP_EDAPPALLY" ? " selected" : "") + ">Edappally Junction (STOP_EDAPPALLY)</option>";
  html += "<option value='STOP_ALUVA'" + String(deviceStopCode == "STOP_ALUVA" ? " selected" : "") + ">Aluva Bus & Metro Hub (STOP_ALUVA)</option>";
  html += "<option value='STOP_ANGAMALY'" + String(deviceStopCode == "STOP_ANGAMALY" ? " selected" : "") + ">Angamaly Terminal (STOP_ANGAMALY)</option>";
  html += "<option value='STOP_KAKKANAD'" + String(deviceStopCode == "STOP_KAKKANAD" ? " selected" : "") + ">Kakkanad InfoPark (STOP_KAKKANAD)</option>";
  html += "</select>";
  html += "<label>Bus Number</label><input type='text' name='busNumber' value='" + assignedBusNumber + "'>";
  html += "<button type='submit'>Save & Connect Device</button>";
  html += "</form></div></body></html>";

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/html", html);
}

void handleConfigure() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");

  String newSsid = "";
  String newPass = "";
  String newServer = serverApiUrl;
  String newStop = deviceStopCode;
  String newBus = assignedBusNumber;
  String newDrv = assignedDriverId;

  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    #if ARDUINOJSON_VERSION_MAJOR >= 7
      JsonDocument doc;
    #else
      StaticJsonDocument<400> doc;
    #endif
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      newSsid = doc["ssid"] | "";
      newPass = doc["password"] | "";
      newServer = doc["serverApiUrl"] | serverApiUrl;
      newStop = doc["stopCode"] | deviceStopCode;
      newBus = doc["busNumber"] | assignedBusNumber;
      newDrv = doc["driverId"] | assignedDriverId;
    }
  } else {
    newSsid = server.arg("ssid");
    newPass = server.arg("password");
    if (server.hasArg("serverApiUrl")) newServer = server.arg("serverApiUrl");
    if (server.hasArg("stopCode")) newStop = server.arg("stopCode");
    if (server.hasArg("busNumber")) newBus = server.arg("busNumber");
    if (server.hasArg("driverId")) newDrv = server.arg("driverId");
  }

  if (newSsid.length() == 0) {
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID is required\"}");
    return;
  }

  saveConfiguration(newSsid, newPass, newServer, newStop, newBus, newDrv);
  server.send(200, "application/json", "{\"success\":true,\"message\":\"Configuration saved to ESP32. Connecting to Wi-Fi...\"}");

  delay(1000);
  ESP.restart();
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Content-Type", "application/json");

  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<300> doc;
  #endif

  doc["deviceId"] = deviceId;
  doc["status"] = isConnectedToWifi ? "Connected" : (isProvisioningMode ? "Provisioning" : "Connecting");
  doc["ipAddress"] = isConnectedToWifi ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  doc["stopCode"] = deviceStopCode;
  doc["busNumber"] = assignedBusNumber;
  doc["ssid"] = wifiSsid;
  doc["readerActive"] = true;

  String res;
  serializeJson(doc, res);
  server.send(200, "application/json", res);
}

void handleResetNVS() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  preferences.begin("movesmart", false);
  preferences.clear();
  preferences.end();
  server.send(200, "application/json", "{\"success\":true,\"message\":\"NVS reset complete. Restarting in Provisioning Mode...\"}");
  delay(1000);
  ESP.restart();
}

// ============================================================================
// AUDIO-VISUAL FEEDBACK HELPERS
// ============================================================================
void successBeep() {
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(BUZZER, HIGH); delay(100);
  digitalWrite(BUZZER, LOW);  delay(80);
  digitalWrite(BUZZER, HIGH); delay(100);
  digitalWrite(BUZZER, LOW);
  digitalWrite(GREEN_LED, LOW);
}

void doubleBeep() {
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(BUZZER, HIGH); delay(80);
  digitalWrite(BUZZER, LOW);  delay(80);
  digitalWrite(BUZZER, HIGH); delay(80);
  digitalWrite(BUZZER, LOW);
  digitalWrite(GREEN_LED, LOW);
}

void triggerRejectionFeedback() {
  digitalWrite(RED_LED, HIGH);
  digitalWrite(BUZZER, HIGH); delay(400);
  digitalWrite(BUZZER, LOW);
  digitalWrite(RED_LED, LOW);
}
