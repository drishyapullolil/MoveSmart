/**
 * MoveSmart IoT RFID Transit Tap Reader
 * 
 * Hardware:
 * - ESP32 Development Board
 * - MFRC522 RFID Reader module
 * - Buzzer & LEDs for audio/visual feedback (Green for Success, Red for Rejection)
 * 
 * Pin Connections:
 * - MFRC522 SDA (SS)  -> ESP32 GPIO 5 (or 21)
 * - MFRC522 SCK       -> ESP32 GPIO 18
 * - MFRC522 MOSI      -> ESP32 GPIO 23
 * - MFRC522 MISO      -> ESP32 GPIO 19
 * - MFRC522 RST       -> ESP32 GPIO 22
 * - MFRC522 3.3V      -> ESP32 3.3V (Do NOT connect to 5V)
 * - MFRC522 GND       -> ESP32 GND
 * - Green LED         -> ESP32 GPIO 12 (with 220-ohm resistor)
 * - Red LED           -> ESP32 GPIO 14 (with 220-ohm resistor)
 * - Buzzer            -> ESP32 GPIO 13 (active buzzer or piezo)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h> // Library: ArduinoJson by Benoit Blanchon (v6 or v7)

// Network credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server API Endpoint
// If testing locally, use your computer's IP address. e.g. "http://192.168.1.50:5000/api/rfid/tap"
const char* serverApiUrl = "http://YOUR_SERVER_IP:5000/api/rfid/tap";

// The unique Stop Code configured on this specific bus reader device
const char* deviceStopCode = "STOP_GHUB"; 

// Pin definitions
#define SS_PIN    5
#define RST_PIN   22
#define GREEN_LED 12
#define RED_LED   14
#define BUZZER    13

MFRC522 mfrc522(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin();
  mfrc522.PCD_Init();
  
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  
  // Power-on Indicator
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, HIGH);
  delay(500);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);

  // Connect to Wi-Fi
  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(RED_LED, HIGH);
    delay(250);
    digitalWrite(RED_LED, LOW);
    delay(250);
    Serial.print(".");
  }
  
  Serial.println("\nWi-Fi Connected! ✅");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Success beep sequence
  successBeep();
  Serial.println("System Ready. Place RFID Card near reader...");
}

void loop() {
  // Check if a new card is present
  if ( ! mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Select one of the cards
  if ( ! mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read card UID / Hex Tag ID
  String rfidTag = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    rfidTag += String(mfrc522.uid.uidByte[i] < 0x10 ? "0" : "");
    rfidTag += String(mfrc522.uid.uidByte[i], HEX);
  }
  rfidTag.toUpperCase();
  
  Serial.print("\nCard Detected! Tag ID: ");
  Serial.println(rfidTag);
  
  // Send tap to Server API
  sendTapEvent(rfidTag);
  
  // Halt PICC
  mfrc522.PICC_HaltA();
  // Stop encryption on PCD
  mfrc522.PCD_StopCrypto1();
  
  delay(1500); // 1.5s delay before reading another card
}

void sendTapEvent(String rfidTag) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverApiUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON Payload
    StaticJsonDocument<200> doc;
    doc["rfidTag"] = rfidTag;
    doc["stopCode"] = deviceStopCode;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    Serial.println("Sending tap data to API...");
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String responseBody = http.getString();
      Serial.print("HTTP Code: ");
      Serial.println(httpResponseCode);
      Serial.println("Response: " + responseBody);
      
      // Parse Response
      StaticJsonDocument<500> respDoc;
      DeserializationError error = deserializeJson(respDoc, responseBody);
      
      if (!error) {
        bool allowed = respDoc["allowed"] | false;
        String action = respDoc["action"] | "";
        String message = respDoc["message"] | "";
        
        if (allowed) {
          if (action == "TAP_IN") {
            Serial.println(">>> TAP IN ALLOWED <<<");
            double balance = respDoc["card"]["balance"] | 0.0;
            Serial.print("Welcome aboard! Balance: ");
            Serial.println(balance);
            
            // Single short beep & green LED flash
            digitalWrite(GREEN_LED, HIGH);
            digitalWrite(BUZZER, HIGH);
            delay(150);
            digitalWrite(BUZZER, LOW);
            delay(150);
            digitalWrite(GREEN_LED, LOW);
          } 
          else if (action == "TAP_OUT") {
            Serial.println(">>> TAP OUT ALLOWED <<<");
            double fare = respDoc["journey"]["fare"] | 0.0;
            double balance = respDoc["card"]["balance"] | 0.0;
            Serial.print("Charged: ");
            Serial.print(fare);
            Serial.print(" AED. Rem. Balance: ");
            Serial.println(balance);
            
            // Double beep & green LED flash
            digitalWrite(GREEN_LED, HIGH);
            digitalWrite(BUZZER, HIGH); delay(100);
            digitalWrite(BUZZER, LOW);  delay(100);
            digitalWrite(BUZZER, HIGH); delay(100);
            digitalWrite(BUZZER, LOW);
            digitalWrite(GREEN_LED, LOW);
          }
          else if (action == "IGNORE") {
            Serial.println("Double tap ignored.");
            // Short warning beep
            digitalWrite(GREEN_LED, HIGH);
            digitalWrite(RED_LED, HIGH);
            digitalWrite(BUZZER, HIGH);
            delay(50);
            digitalWrite(BUZZER, LOW);
            digitalWrite(GREEN_LED, LOW);
            digitalWrite(RED_LED, LOW);
          }
        } 
        else {
          Serial.print(">>> TAP REJECTED: ");
          Serial.println(message);
          triggerRejectionFeedback();
        }
      } else {
        Serial.println("Failed to parse response JSON");
        triggerRejectionFeedback();
      }
    } else {
      Serial.print("Error sending POST request: ");
      Serial.println(httpResponseCode);
      triggerRejectionFeedback();
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected!");
    triggerRejectionFeedback();
  }
}

void successBeep() {
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(BUZZER, HIGH);
  delay(100);
  digitalWrite(BUZZER, LOW);
  delay(100);
  digitalWrite(BUZZER, HIGH);
  delay(100);
  digitalWrite(BUZZER, LOW);
  digitalWrite(GREEN_LED, LOW);
}

void triggerRejectionFeedback() {
  // Long buzzer beep and blinking Red LED
  digitalWrite(RED_LED, HIGH);
  digitalWrite(BUZZER, HIGH);
  delay(600);
  digitalWrite(BUZZER, LOW);
  digitalWrite(RED_LED, LOW);
}
