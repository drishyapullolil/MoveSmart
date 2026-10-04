/**
 * ==============================================================================
 * MoveSmart IoT Smart Bin Firmware v1.0
 * ==============================================================================
 * 
 * Hardware Setup:
 * - ESP32 Development Board (ESP32 DevKit V1 / ESP32-WROOM-32)
 * 
 * RC522 RFID Reader:
 * - SDA (SS) -> GPIO 5
 * - SCK      -> GPIO 18
 * - MOSI     -> GPIO 23
 * - MISO     -> GPIO 19
 * - RST      -> GPIO 22
 * - 3.3V     -> 3.3V
 * - GND      -> GND
 * 
 * SG90 Servo Motor:
 * - Signal   -> GPIO 25
 * - VCC      -> VIN / 5V
 * - GND      -> GND
 * - CLOSED_ANGLE = 180 deg
 * - OPEN_ANGLE   = 90 deg
 * 
 * IR Sensor (Waste Deposit Detector):
 * - VCC      -> 3.3V
 * - GND      -> GND
 * - OUT      -> GPIO 27
 *   * LOW  = OBJECT / WASTE DETECTED
 *   * HIGH = NO OBJECT
 * 
 * Workflow:
 * 1. Card tapped on RC522 reader.
 * 2. Servo opens lid (90 degrees).
 * 3. ESP32 waits indefinitely for IR sensor to detect waste (OUT == LOW).
 * 4. After deposit confirmed, generates unique depositId.
 * 5. Sends POST /api/bin/deposit to MoveSmart backend.
 * 6. Validates response and prints status to Serial.
 * 7. Servo closes lid (180 degrees).
 * 8. Resets RFID reader for next user.
 * ==============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>

// ==============================================================================
// 1. NETWORK & BACKEND CONFIGURATION
// ==============================================================================

// Replace with your Wi-Fi or Mobile Hotspot credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ==============================================================================
// BACKEND URL CONFIGURATION
// IMPORTANT: Replace <CURRENT-LAPTOP-IP> with your laptop's local IPv4 address
// (e.g., "http://192.168.1.5:5000/api/bin/deposit" or "http://10.103.189.140:5000/api/bin/deposit")
// Ensure your laptop running the MoveSmart backend and ESP32 are on the SAME network.
// ==============================================================================
const char* BACKEND_URL = "http://<CURRENT-LAPTOP-IP>:5000/api/bin/deposit";

// Unique Smart Bin Identifier
const char* BIN_ID = "BIN-001";

// ==============================================================================
// 2. PIN DEFINITIONS & CONSTANTS
// ==============================================================================

// RC522 RFID Reader Pins
#define SS_PIN    5
#define RST_PIN   22

// SG90 Servo Pin & Angles
#define SERVO_PIN    25
#define CLOSED_ANGLE 180
#define OPEN_ANGLE   90

// IR Sensor Pin
#define IR_PIN 27

// ==============================================================================
// 3. HARDWARE OBJECTS
// ==============================================================================

MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo lidServo;

// ==============================================================================
// 4. HELPER FUNCTIONS
// ==============================================================================

/**
 * Connect to Wi-Fi network with status indicator
 */
void connectToWiFi() {
  Serial.println("\n[WiFi] Connecting to Wi-Fi network: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully! ✅");
    Serial.print("[WiFi] ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection failed ❌. Please verify SSID, Password, and network.");
  }
}

/**
 * Open bin lid to 90 degrees
 */
void openLid() {
  Serial.println("[Servo] Opening bin lid (90°)...");
  lidServo.write(OPEN_ANGLE);
  delay(500);
}

/**
 * Close bin lid to 180 degrees
 */
void closeLid() {
  Serial.println("[Servo] Closing bin lid (180°)...");
  lidServo.write(CLOSED_ANGLE);
  delay(500);
}

/**
 * Convert raw RFID UID byte array to clean uppercase hex string without spaces
 * Example: {0x53, 0x26, 0x2A, 0x56} -> "53262A56"
 */
String getNormalizedRfidUid(MFRC522::Uid *uid) {
  String uidStr = "";
  for (byte i = 0; i < uid->size; i++) {
    if (uid->uidByte[i] < 0x10) {
      uidStr += "0";
    }
    uidStr += String(uid->uidByte[i], HEX);
  }
  uidStr.toUpperCase();
  return uidStr;
}

/**
 * Send waste deposit reward confirmation to MoveSmart backend
 */
void sendDepositReward(String rfidUid, String depositId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\n--------------------------------");
    Serial.println("BACKEND CONNECTION FAILED");
    Serial.println("Waste detected, but reward could not be confirmed (No Wi-Fi).");
    Serial.println("--------------------------------");
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10s timeout

  // Construct JSON payload
  JsonDocument doc;
  doc["rfidTag"] = rfidUid;
  doc["binId"] = BIN_ID;
  doc["objectDetected"] = true;
  doc["depositId"] = depositId;

  String requestJson;
  serializeJson(doc, requestJson);

  Serial.println("\n--------------------------------");
  Serial.println("SMART BIN DEPOSIT");
  Serial.println("--------------------------------");
  Serial.println("RFID: " + rfidUid);
  Serial.println("Bin: " + String(BIN_ID));
  Serial.println("Object detected: YES");
  Serial.println("Deposit ID: " + depositId);
  Serial.println("Sending reward request...");

  int httpCode = http.POST(requestJson);
  String responseBody = http.getString();

  Serial.print("HTTP Status: ");
  Serial.println(httpCode);
  Serial.println("Backend response:");
  Serial.println(responseBody);
  Serial.println("--------------------------------");

  if (httpCode == 200) {
    JsonDocument resDoc;
    DeserializationError err = deserializeJson(resDoc, responseBody);

    if (!err && resDoc["success"] == true) {
      if (resDoc["duplicate"] == true) {
        Serial.println("\nDEPOSIT ALREADY PROCESSED");
        Serial.println("No additional reward credited.");
      } else {
        Serial.println("\n₹10 REWARD CREDITED");
        Serial.println("Smart Bin deposit completed.");
        if (resDoc.containsKey("balance")) {
          float newBal = resDoc["balance"].as<float>();
          Serial.printf("Updated Card Balance: ₹%.2f\n", newBal);
        }
      }
    } else {
      Serial.println("\nREWARD NOT CREDITED");
      Serial.println("Backend error: " + responseBody);
    }
  } else if (httpCode > 0) {
    Serial.println("\nREWARD NOT CREDITED");
    Serial.println("Backend error: " + responseBody);
  } else {
    Serial.println("\nBACKEND CONNECTION FAILED");
    Serial.println("Waste detected, but reward could not be confirmed.");
    Serial.println("Error: " + http.errorToString(httpCode));
  }

  http.end();
}

// ==============================================================================
// 5. ARDUINO SETUP
// ==============================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==================================================");
  Serial.println("   MoveSmart IoT Smart Bin Terminal v1.0");
  Serial.println("==================================================");

  // Initialize IR Sensor Pin (Active LOW when object present)
  pinMode(IR_PIN, INPUT);

  // Initialize Servo Motor
  ESP32PWM::allocateTimer(0);
  lidServo.setPeriodHertz(50); // Standard 50Hz servo
  lidServo.attach(SERVO_PIN, 500, 2400);

  // Set initial position: Closed (180 deg)
  closeLid();

  // Initialize SPI & RC522 RFID Reader
  SPI.begin();
  mfrc522.PCD_Init();
  delay(50);
  mfrc522.PCD_DumpVersionToSerial();

  Serial.println("[RC522] RFID Reader Initialized.");
  Serial.printf("[Servo] Initialized on GPIO %d (Closed: %d°, Open: %d°).\n", SERVO_PIN, CLOSED_ANGLE, OPEN_ANGLE);
  Serial.printf("[IR Sensor] Initialized on GPIO %d (LOW = Object Detected).\n", IR_PIN);
  Serial.println("[Smart Bin] Bin ID: " + String(BIN_ID));
  Serial.println("[Smart Bin] Backend URL: " + String(BACKEND_URL));

  // Connect to Wi-Fi
  connectToWiFi();

  Serial.println("\n>>> Smart Bin Ready! Tap RFID card to open lid... <<<\n");
}

// ==============================================================================
// 6. MAIN LOOP
// ==============================================================================

void loop() {
  // Check Wi-Fi connection and attempt reconnect if dropped
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }

  // 1. Look for new RFID card tap
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // 2. Extract and format RFID UID
  String detectedUid = getNormalizedRfidUid(&(mfrc522.uid));
  Serial.println("\n==================================================");
  Serial.println(">> Card Detected: " + detectedUid);
  Serial.println("==================================================");

  // 3. Open bin lid (90 degrees)
  openLid();

  // 4. Wait indefinitely for IR sensor to confirm waste deposit (OUT == LOW)
  Serial.println("[Smart Bin] Lid is OPEN. Waiting for waste deposit (IR sensor)...");
  while (true) {
    if (digitalRead(IR_PIN) == LOW) {
      Serial.println("[IR Sensor] >> Waste / Object detected! <<");
      break;
    }
    delay(100);
  }

  // Debounce/wait for object to settle completely
  delay(500);

  // 5. Generate unique depositId (ONLY AFTER IR confirms object)
  String depositId = String("DEP-") + BIN_ID + "-" + String(millis());

  // 6. Send reward request to MoveSmart backend
  sendDepositReward(detectedUid, depositId);

  // 7. Close bin lid (180 degrees)
  closeLid();

  // 8. Reset RFID reader & halt card to prevent immediate duplicate reading
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();

  Serial.println("\n>>> Deposit cycle complete. Ready for next card. <<<\n");
  delay(2000); // 2-second cooldown
}
