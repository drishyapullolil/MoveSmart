#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// =====================================================
// RC522 + ESP32 PINS
// =====================================================

#define SS_PIN    5
#define RST_PIN   22

#define SCK_PIN   18
#define MOSI_PIN  23
#define MISO_PIN  19

MFRC522 rfid(SS_PIN, RST_PIN);

// =====================================================
// OPTIONAL LED / BUZZER
// =====================================================

#define GREEN_LED 12
#define RED_LED   14
#define BUZZER    13

// =====================================================
// WIFI SETUP
// =====================================================

Preferences preferences;
WebServer setupServer(80);

String savedSSID = "";
String savedPassword = "";

bool setupMode = false;

// =====================================================
// MOVESMART BACKEND
// =====================================================

const char* serverApiUrl =
  "http://10.103.189.140:5000/api/rfid/tap";

// =====================================================
// DEVICE STOP
// =====================================================

const char* deviceStopCode = "STOP_VYTTILA";

// =====================================================
// SETUP
// =====================================================

void setup() {

  Serial.begin(115200);
  delay(1000);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  Serial.println();
  Serial.println("=================================");
  Serial.println("       MOVESMART RFID DEVICE");
  Serial.println("=================================");

  // -------------------------------------------------
  // RC522
  // -------------------------------------------------

  SPI.begin(
    SCK_PIN,
    MISO_PIN,
    MOSI_PIN,
    SS_PIN
  );

  rfid.PCD_Init();

  delay(100);

  Serial.println("RC522 initialized.");
  Serial.println("Checking RC522 firmware...");

  rfid.PCD_DumpVersionToSerial();

  // -------------------------------------------------
  // LOAD SAVED WIFI
  // -------------------------------------------------

  preferences.begin("wifi", false);

  savedSSID =
    preferences.getString("ssid", "");

  savedPassword =
    preferences.getString("password", "");

  // -------------------------------------------------
  // NO WIFI SAVED
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
// LOOP
// =====================================================

void loop() {

  // -------------------------------------------------
  // SETUP MODE
  // -------------------------------------------------

  if (setupMode) {

    setupServer.handleClient();

    delay(10);

    return;
  }

  // -------------------------------------------------
  // WIFI DISCONNECTED
  // -------------------------------------------------

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println();
    Serial.println("Wi-Fi disconnected.");
    Serial.println("Trying to reconnect...");

    connectToSavedWiFi();

    delay(1000);

    return;
  }

  // -------------------------------------------------
  // CHECK RFID CARD
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
  // READ UID
  // -------------------------------------------------

  String rfidTag = "";

  for (byte i = 0; i < rfid.uid.size; i++) {

    if (rfid.uid.uidByte[i] < 0x10) {

      rfidTag += "0";
    }

    rfidTag += String(
      rfid.uid.uidByte[i],
      HEX
    );
  }

  rfidTag.toUpperCase();

  Serial.println();
  Serial.println("=================================");
  Serial.println("       RFID CARD DETECTED");
  Serial.println("=================================");

  Serial.print("RFID UID: ");
  Serial.println(rfidTag);

  Serial.print("Stop: ");
  Serial.println(deviceStopCode);

  // -------------------------------------------------
  // SEND TO BACKEND
  // -------------------------------------------------

  sendTapToBackend(rfidTag);

  // -------------------------------------------------
  // STOP RFID COMMUNICATION
  // -------------------------------------------------

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();

  // -------------------------------------------------
  // WAIT BEFORE ALLOWING ANOTHER TAP
  // -------------------------------------------------

  Serial.println();
  Serial.println("Remove card...");

  delay(1000);

  Serial.println("RFID reader is READY.");
}

// =====================================================
// CONNECT TO SAVED WIFI
// =====================================================

void connectToSavedWiFi() {

  setupMode = false;

  WiFi.mode(WIFI_STA);

  Serial.println();
  Serial.println("Connecting to Wi-Fi...");

  WiFi.begin(
    savedSSID.c_str(),
    savedPassword.c_str()
  );

  int attempts = 0;

  while (
    WiFi.status() != WL_CONNECTED &&
    attempts < 30
  ) {

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

    Serial.print("Backend: ");
    Serial.println(serverApiUrl);

    Serial.println();
    Serial.println("RFID reader is READY.");

    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);

    delay(500);

    digitalWrite(GREEN_LED, LOW);

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
// START ESP32 SETUP MODE
// =====================================================

void startSetupMode() {

  setupMode = true;

  WiFi.disconnect(true);

  delay(500);

  WiFi.mode(WIFI_AP);

  WiFi.softAP(
    "MoveSmart-RFID",
    "movesmart123"
  );

  IPAddress IP =
    WiFi.softAPIP();

  Serial.println();
  Serial.println("=================================");
  Serial.println("       WIFI SETUP MODE");
  Serial.println("=================================");

  Serial.println();

  Serial.println("Connect your phone/laptop to:");

  Serial.println("Wi-Fi Name: MoveSmart-RFID");
  Serial.println("Password: movesmart123");

  Serial.println();

  Serial.print("Open this address: ");
  Serial.println(IP);

  // -------------------------------------------------
  // SETUP WEB ROUTES
  // -------------------------------------------------

  setupServer.on(
    "/",
    HTTP_GET,
    handleSetupPage
  );

  setupServer.on(
    "/save",
    HTTP_POST,
    handleSaveWiFi
  );

  setupServer.on(
    "/reset",
    HTTP_GET,
    handleResetWiFi
  );

  setupServer.begin();

  Serial.println();
  Serial.println("Setup page started.");
}

// =====================================================
// SETUP WEB PAGE
// =====================================================

void handleSetupPage() {

  String html = R"rawliteral(

<!DOCTYPE html>

<html>

<head>

<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>MoveSmart RFID Setup</title>

<style>

body {
  font-family: Arial, sans-serif;
  background: #f7f5ff;
  margin: 0;
  padding: 30px;
}

.container {
  max-width: 420px;
  margin: auto;
  background: white;
  padding: 25px;
  border-radius: 18px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.1);
}

h1 {
  color: #4f46a5;
}

p {
  color: #555;
}

label {
  display: block;
  margin-top: 18px;
  margin-bottom: 6px;
  font-weight: bold;
}

input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 16px;
}

button {
  width: 100%;
  margin-top: 25px;
  padding: 13px;
  border: none;
  border-radius: 10px;
  background: #4f46a5;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

</style>

</head>

<body>

<div class="container">

<h1>MoveSmart RFID</h1>

<p>
Configure the Wi-Fi connection for this RFID device.
</p>

<form action="/save"
      method="POST">

<label>Wi-Fi Name</label>

<input
  type="text"
  name="ssid"
  placeholder="Enter Wi-Fi name"
  required
>

<label>Wi-Fi Password</label>

<input
  type="password"
  name="password"
  placeholder="Enter Wi-Fi password"
  required
>

<button type="submit">
Connect Device
</button>

</form>

</div>

</body>

</html>

)rawliteral";

  setupServer.send(
    200,
    "text/html",
    html
  );
}

// =====================================================
// SAVE WIFI DETAILS
// =====================================================

void handleSaveWiFi() {

  if (
    !setupServer.hasArg("ssid") ||
    !setupServer.hasArg("password")
  ) {

    setupServer.send(
      400,
      "text/plain",
      "Wi-Fi details missing."
    );

    return;
  }

  String newSSID =
    setupServer.arg("ssid");

  String newPassword =
    setupServer.arg("password");

  newSSID.trim();

  Serial.println();
  Serial.println("=================================");
  Serial.println("       SAVING WIFI DETAILS");
  Serial.println("=================================");

  Serial.print("SSID: ");
  Serial.println(newSSID);

  // -------------------------------------------------
  // SAVE TO ESP32 FLASH
  // -------------------------------------------------

  preferences.putString(
    "ssid",
    newSSID
  );

  preferences.putString(
    "password",
    newPassword
  );

  savedSSID = newSSID;
  savedPassword = newPassword;

  // -------------------------------------------------
  // RESPONSE
  // -------------------------------------------------

  String html = R"rawliteral(

<!DOCTYPE html>

<html>

<head>

<meta name="viewport"
      content="width=device-width, initial-scale=1">

<title>MoveSmart</title>

<style>

body {
  font-family: Arial;
  background: #f7f5ff;
  text-align: center;
  padding: 50px;
}

.box {
  max-width: 420px;
  margin: auto;
  background: white;
  padding: 30px;
  border-radius: 18px;
}

h1 {
  color: #4f46a5;
}

</style>

</head>

<body>

<div class="box">

<h1>Wi-Fi Saved</h1>

<p>
The RFID device is now trying to connect.
</p>

<p>
You can close this page.
</p>

</div>

</body>

</html>

)rawliteral";

  setupServer.send(
    200,
    "text/html",
    html
  );

  delay(2000);

  setupServer.stop();

  WiFi.softAPdisconnect(true);

  connectToSavedWiFi();
}

// =====================================================
// RESET WIFI
// =====================================================

void handleResetWiFi() {

  preferences.clear();

  String html = R"rawliteral(

<!DOCTYPE html>

<html>

<body>

<h2>Wi-Fi settings cleared.</h2>

<p>
Restart the ESP32 to configure Wi-Fi again.
</p>

</body>

</html>

)rawliteral";

  setupServer.send(
    200,
    "text/html",
    html
  );
}

// =====================================================
// SEND RFID TAP TO MOVESMART BACKEND
// =====================================================

void sendTapToBackend(
  String rfidTag
) {

  if (
    WiFi.status() != WL_CONNECTED
  ) {

    Serial.println(
      "ERROR: Wi-Fi not connected."
    );

    errorFeedback();

    return;
  }

  HTTPClient http;

  Serial.println();
  Serial.println(
    "Sending tap to MoveSmart backend..."
  );

  Serial.print("Backend URL: ");
  Serial.println(serverApiUrl);

  http.begin(serverApiUrl);

  http.addHeader(
    "Content-Type",
    "application/json"
  );

  // -------------------------------------------------
  // CREATE JSON
  // -------------------------------------------------

  String jsonData = "{";

  jsonData += "\"rfidTag\":\"";
  jsonData += rfidTag;
  jsonData += "\",";

  jsonData += "\"stopCode\":\"";
  jsonData += deviceStopCode;
  jsonData += "\"";

  jsonData += "}";

  Serial.print("Request: ");
  Serial.println(jsonData);

  // -------------------------------------------------
  // POST
  // -------------------------------------------------

  int httpCode =
    http.POST(jsonData);

  Serial.print(
    "HTTP Status: "
  );

  Serial.println(httpCode);

  if (httpCode > 0) {

    String response =
      http.getString();

    Serial.println();
    Serial.println(
      "Backend response:"
    );

    Serial.println(response);

    // -------------------------------------------------
    // PARSE RESPONSE
    // -------------------------------------------------

    DynamicJsonDocument doc(2048);

    DeserializationError error =
      deserializeJson(
        doc,
        response
      );

    if (error) {

      Serial.print(
        "JSON parsing failed: "
      );

      Serial.println(
        error.c_str()
      );

      errorFeedback();

      http.end();

      return;
    }

    bool allowed =
      doc["allowed"] | false;

    String action =
      doc["action"] | "";

    String message =
      doc["message"] | "";

    Serial.println();
    Serial.println(
      "--------- RESULT ---------"
    );

    Serial.print(
      "Allowed: "
    );

    Serial.println(
      allowed ? "YES" : "NO"
    );

    Serial.print(
      "Action: "
    );

    Serial.println(action);

    Serial.print(
      "Message: "
    );

    Serial.println(message);

    // -------------------------------------------------
    // ACCEPTED
    // -------------------------------------------------

    if (allowed) {

      Serial.println();
      Serial.println(
        "RFID TAP ACCEPTED"
      );

      if (
        action == "TAP_IN"
      ) {

        Serial.println(
          "Passenger TAP-IN successful."
        );

      } else if (
        action == "TAP_OUT"
      ) {

        Serial.println(
          "Passenger TAP-OUT successful."
        );
      }

      successFeedback();
    }

    // -------------------------------------------------
    // DUPLICATE
    // -------------------------------------------------

    else if (
      action == "IGNORE"
    ) {

      Serial.println();
      Serial.println(
        "Duplicate tap ignored."
      );
    }

    // -------------------------------------------------
    // REJECTED
    // -------------------------------------------------

    else {

      Serial.println();
      Serial.println(
        "RFID TAP REJECTED."
      );

      errorFeedback();
    }

  } else {

    Serial.println();
    Serial.println(
      "ERROR: Backend unavailable."
    );

    Serial.print(
      "HTTP error: "
    );

    Serial.println(
      http.errorToString(
        httpCode
      )
    );

    errorFeedback();
  }

  http.end();
}

// =====================================================
// SUCCESS FEEDBACK
// =====================================================

void successFeedback() {

  digitalWrite(
    RED_LED,
    LOW
  );

  digitalWrite(
    GREEN_LED,
    HIGH
  );

  tone(
    BUZZER,
    2000,
    150
  );

  delay(300);

  digitalWrite(
    GREEN_LED,
    LOW
  );
}

// =====================================================
// ERROR FEEDBACK
// =====================================================

void errorFeedback() {

  digitalWrite(
    GREEN_LED,
    LOW
  );

  digitalWrite(
    RED_LED,
    HIGH
  );

  tone(
    BUZZER,
    500,
    400
  );

  delay(500);

  digitalWrite(
    RED_LED,
    LOW
  );
}