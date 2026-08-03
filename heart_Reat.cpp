#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#include <time.h>

// ======================================================
//                   CONFIGURATION
// ======================================================

const char* SSID = "Geekwhocodes_MR";
const char* PASSWORD = "[0x8!^Geekwhocodes140!^140]";

const char* FIREBASE_HOST = "ai-based-smart-vehicle-h-b714b-default-rtdb.asia-southeast1.firebasedatabase.app/";
const char* FIREBASE_AUTH = "";

// Human-readable device name requested by user
const char* DEVICE_NAME = "mahesh Raskar";
// Firebase-safe ID used in path
const char* DEVICE_ID = "mahesh_Raskar";

const int I2C_SDA_PIN = 21;
const int I2C_SCL_PIN = 22;
const int WIFI_LED_PIN = 5;

const unsigned long WIFI_TIMEOUT_MS = 20000;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long FIREBASE_INTERVAL_MS = 10000;
const unsigned long FIREBASE_RETRY_MS = 15000;

const int SAMPLE_SIZE = 100;
const int NEW_SAMPLES = 25;
const uint32_t FINGER_THRESHOLD_IR = 10000;

// ======================================================
//                   OBJECTS / BUFFERS
// ======================================================

MAX30105 sensor;

uint32_t irBuffer[SAMPLE_SIZE];
uint32_t redBuffer[SAMPLE_SIZE];

int32_t spo2 = 0;
int8_t validSpO2 = 0;
int32_t heartRate = 0;
int8_t validHeartRate = 0;

// ======================================================
//                   DATA STRUCTURES
// ======================================================

struct VitalData {
  int32_t heartRate = 0;
  int32_t spo2 = 0;
  int8_t validHeartRate = 0;
  int8_t validSpO2 = 0;
  uint32_t avgIR = 0;
  bool fingerDetected = false;
  unsigned long timestamp = 0;
};

// ======================================================
//                   GLOBAL STATE
// ======================================================

bool sensorReady = false;
bool firebaseReady = false;
unsigned long lastFirebase = 0;
unsigned long lastWiFiRetry = 0;
unsigned long lastFirebaseRetry = 0;
unsigned long dataSendCount = 0;

// ======================================================
//                   LOG HELPERS
// ======================================================

void logInfo(const String& msg) {
  Serial.println("[INFO] " + msg);
}

void logPass(const String& msg) {
  Serial.println("[PASS] " + msg);
}

void logWarn(const String& msg) {
  Serial.println("[WARN] " + msg);
}

void logError(const String& msg) {
  Serial.println("[ERROR] " + msg);
}

// ======================================================
//                   BASIC HELPERS
// ======================================================

void updateWiFiLED() {
  digitalWrite(WIFI_LED_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

uint32_t getAvgIR() {
  uint64_t sum = 0;
  for (int i = 0; i < SAMPLE_SIZE; i++) {
    sum += irBuffer[i];
  }
  return (uint32_t)(sum / SAMPLE_SIZE);
}

// ======================================================
//                   WIFI / TIME
// ======================================================

bool connectWiFi(const char* ssid, const char* password, unsigned long timeoutMs = WIFI_TIMEOUT_MS) {
  Serial.printf("[INFO] WiFi connecting to %s", ssid);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.disconnect(true, true);
  delay(1000);
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (millis() - start < timeoutMs) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf(" ✓ (%s)\n", WiFi.localIP().toString().c_str());
      logPass("WiFi connected successfully");
      updateWiFiLED();
      return true;
    }
    Serial.print(".");
    delay(500);
  }

  Serial.println(" ✗");
  logError("WiFi connection failed");
  updateWiFiLED();
  return false;
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool ensureWiFi(const char* ssid, const char* password) {
  if (isWiFiConnected()) {
    updateWiFiLED();
    return true;
  }

  if (millis() - lastWiFiRetry < WIFI_RETRY_INTERVAL_MS) {
    updateWiFiLED();
    return false;
  }

  lastWiFiRetry = millis();
  logWarn("WiFi disconnected. Reconnecting...");
  return connectWiFi(ssid, password);
}

bool syncClockWithNTP() {
  Serial.print("[NTP] Syncing time...");
  configTime(0, 0, "pool.ntp.org", "time.nist.gov", "time.google.com");

  time_t now = time(nullptr);
  int attempts = 0;

  while (now < 24 * 3600 && attempts < 30) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
    attempts++;
  }
  Serial.println();

  if (now > 24 * 3600) {
    Serial.printf("[NTP] Time synced: %s", ctime(&now));
    return true;
  }

  Serial.println("[NTP] Time sync failed. TLS may fail on some networks.");
  return false;
}

// ======================================================
//                   FIREBASE HELPERS
// ======================================================

String cleanFirebaseHost(const char* host) {
  String cleaned = String(host);
  cleaned.trim();

  if (cleaned.startsWith("https://")) cleaned = cleaned.substring(8);
  if (cleaned.startsWith("http://"))  cleaned = cleaned.substring(7);
  if (cleaned.endsWith("/"))          cleaned.remove(cleaned.length() - 1);

  return cleaned;
}

String buildPath(const String& basePath) {
  if (strlen(FIREBASE_AUTH) > 0) {
    return basePath + ".json?auth=" + String(FIREBASE_AUTH);
  }
  return basePath + ".json";
}

bool httpsRequest(const String& method, const String& path, const String& jsonData, String& responseOut) {
  if (!isWiFiConnected()) {
    logError("WiFi not connected. Cannot reach Firebase.");
    return false;
  }

  String cleanHost = cleanFirebaseHost(FIREBASE_HOST);
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(1500);

  Serial.printf("[FB] Connecting to %s:443", cleanHost.c_str());

  bool connected = false;
  for (int attempt = 0; attempt < 3; attempt++) {
    if (client.connect(cleanHost.c_str(), 443)) {
      connected = true;
      Serial.println(" ✓");
      break;
    }
    Serial.print(".");
    delay(300);
  }

  if (!connected) {
    Serial.println(" ✗");
    logError("Firebase TLS connection failed after 3 attempts");
    return false;
  }

  String request = method + " " + path + " HTTP/1.1\r\n";
  request += "Host: " + cleanHost + "\r\n";
  request += "Content-Type: application/json\r\n";
  request += "Content-Length: " + String(jsonData.length()) + "\r\n";
  request += "Connection: close\r\n";
  request += "User-Agent: ESP32-MAX30102/1.0\r\n";
  request += "\r\n";
  request += jsonData;

  Serial.printf("[FB] Sending %d bytes...", request.length());
  size_t bytesSent = client.print(request);
  if (bytesSent != request.length()) {
    Serial.println(" ✗");
    logError("Failed to send full data to Firebase");
    client.stop();
    return false;
  }
  Serial.println(" ✓");

  responseOut = "REQUEST_SENT_NO_WAIT";

  unsigned long quickCheckStart = millis();
  while ((millis() - quickCheckStart) < 120 && client.connected()) {
    if (client.available()) {
      String statusLine = client.readStringUntil('\n');
      statusLine.trim();
      if (statusLine.length() > 0) {
        Serial.printf("[FB] Quick status: %s\n", statusLine.c_str());
      }
      break;
    }
    delay(5);
  }

  client.stop();
  return true;
}

bool sendStatus(const String& statusText) {
  if (!isWiFiConnected()) return false;

  String path = buildPath("/" + String(DEVICE_ID) + "/status");
  String json =
    "{"
    "\"status\":\"" + statusText + "\"," 
    "\"timestamp\":" + String(millis() / 1000) + ","
    "\"device_id\":\"" + String(DEVICE_ID) + "\"," 
    "\"device_name\":\"" + String(DEVICE_NAME) + "\""
    "}";

  String response;
  return httpsRequest("PUT", path, json, response);
}

bool testConnection() {
  if (!isWiFiConnected()) {
    logError("Firebase test failed because WiFi is not connected");
    return false;
  }

  String path = buildPath("/" + String(DEVICE_ID) + "/test");
  String json =
    "{"
    "\"test\":true,"
    "\"device_id\":\"" + String(DEVICE_ID) + "\"," 
    "\"device_name\":\"" + String(DEVICE_NAME) + "\"," 
    "\"timestamp\":" + String(millis() / 1000) +
    "}";

  String response;
  Serial.print("[INFO] Testing Firebase connection...");
  bool ok = httpsRequest("PUT", path, json, response);
  Serial.println(ok ? " ✓" : " ✗");

  if (ok) {
    logPass("Firebase connection OK");
  } else {
    logWarn("Firebase connection failed now. System will retry later.");
  }

  return ok;
}

bool testFirebaseStartup() {
  logInfo("Testing Firebase");

  if (!isWiFiConnected()) {
    logError("Firebase test skipped because WiFi is not connected");
    return false;
  }

  delay(1500);
  bool statusOk = sendStatus("booting");
  delay(500);
  bool connOk = testConnection();

  return statusOk && connOk;
}

bool sendVitalData(const VitalData& data) {
  if (!isWiFiConnected() || !firebaseReady) {
    logWarn("Vital data not sent because Firebase is not ready");
    return false;
  }

  unsigned long ts = millis();
  String path = buildPath("/" + String(DEVICE_ID) + "/readings/" + String(ts));

  String json =
    "{"
    "\"device_id\":\"" + String(DEVICE_ID) + "\"," 
    "\"device_name\":\"" + String(DEVICE_NAME) + "\"," 
    "\"timestamp\":" + String(data.timestamp) + ","
    "\"heart_rate_bpm\":" + String(data.heartRate) + ","
    "\"oxygen_saturation_spo2\":" + String(data.spo2) + ","
    "\"heart_rate_valid\":" + String(data.validHeartRate ? "true" : "false") + ","
    "\"spo2_valid\":" + String(data.validSpO2 ? "true" : "false") + ","
    "\"infrared_signal\":" + String(data.avgIR) + ","
    "\"finger_detected\":" + String(data.fingerDetected ? "true" : "false") +
    "}";

  String response;
  Serial.print("[INFO] Sending MAX30102 data...");
  bool ok = httpsRequest("PUT", path, json, response);
  Serial.println(ok ? " ✓" : " ✗");

  if (!ok) {
    logError("MAX30102 data send failed");
  }

  return ok;
}

// ======================================================
//                   MAX30102 SENSOR
// ======================================================

bool initializeMAX30102() {
  logInfo("Initializing MAX30102...");

  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(400000);
  delay(200);

  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    logError("MAX30102 sensor not found");
    return false;
  }

  sensor.setup(70, 4, 2, 100, 411, 4096);
  sensor.setPulseAmplitudeRed(0x2F);
  sensor.setPulseAmplitudeIR(0x2F);
  sensor.setPulseAmplitudeGreen(0);

  logPass("MAX30102 initialized successfully");
  Serial.println("👉 Place your finger on the sensor...");
  delay(2000);

  for (int i = 0; i < SAMPLE_SIZE; i++) {
    while (!sensor.available()) {
      sensor.check();
      delay(1);
    }

    redBuffer[i] = sensor.getRed();
    irBuffer[i] = sensor.getIR();
    sensor.nextSample();
  }

  return true;
}

VitalData readVitalData() {
  VitalData data;

  for (int i = NEW_SAMPLES; i < SAMPLE_SIZE; i++) {
    redBuffer[i - NEW_SAMPLES] = redBuffer[i];
    irBuffer[i - NEW_SAMPLES] = irBuffer[i];
  }

  for (int i = SAMPLE_SIZE - NEW_SAMPLES; i < SAMPLE_SIZE; i++) {
    while (!sensor.available()) {
      sensor.check();
      delay(1);
    }

    redBuffer[i] = sensor.getRed();
    irBuffer[i] = sensor.getIR();
    sensor.nextSample();
  }

  maxim_heart_rate_and_oxygen_saturation(
    irBuffer,
    SAMPLE_SIZE,
    redBuffer,
    &spo2,
    &validSpO2,
    &heartRate,
    &validHeartRate
  );

  data.avgIR = getAvgIR();
  data.fingerDetected = (data.avgIR >= FINGER_THRESHOLD_IR);
  data.timestamp = millis() / 1000;

  if (data.fingerDetected) {
    data.heartRate = heartRate;
    data.spo2 = spo2;
    data.validHeartRate = validHeartRate;
    data.validSpO2 = validSpO2;
  } else {
    data.heartRate = 0;
    data.spo2 = 0;
    data.validHeartRate = 0;
    data.validSpO2 = 0;
  }

  return data;
}

void printVitalData(const VitalData& data) {
  Serial.println("\n========================================");

  if (!data.fingerDetected) {
    Serial.println("⚠️ No Finger Detected or Weak Signal");
    Serial.print("📉 Infrared Level: ");
    Serial.println(data.avgIR);
  } else {
    Serial.print("❤️ Heart Rate: ");
    Serial.print(data.heartRate);
    Serial.println(" BPM");

    Serial.print("🫁 Oxygen Saturation: ");
    Serial.print(data.spo2);
    Serial.println(" %");

    Serial.print("✅ Heart Rate Valid: ");
    Serial.println(data.validHeartRate ? "YES" : "NO");

    Serial.print("✅ SpO2 Valid: ");
    Serial.println(data.validSpO2 ? "YES" : "NO");

    Serial.print("📊 Infrared Signal Strength: ");
    Serial.println(data.avgIR);
  }

  Serial.println("========================================");
}

// ======================================================
//                   SETUP / LOOP
// ======================================================

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(WIFI_LED_PIN, OUTPUT);
  digitalWrite(WIFI_LED_PIN, LOW);

  Serial.println("==================================================");
  Serial.println("   MAX30102 FIREBASE HEALTH MONITOR SYSTEM");
  Serial.println("==================================================");
  Serial.printf("Device Name: %s\n", DEVICE_NAME);
  Serial.printf("Device ID  : %s\n", DEVICE_ID);

  connectWiFi(SSID, PASSWORD);
  updateWiFiLED();

  if (isWiFiConnected()) {
    syncClockWithNTP();
    firebaseReady = testFirebaseStartup();
    if (firebaseReady) {
      sendStatus("online");
    }
  }

  sensorReady = initializeMAX30102();
  if (!sensorReady) {
    logError("System stopped because MAX30102 is required");
    while (true) {
      updateWiFiLED();
      delay(500);
    }
  }

  logPass("System ready. Reading heart rate and SpO2.");
}

void loop() {
  unsigned long now = millis();

  bool wifiConnected = isWiFiConnected();
  if (!wifiConnected) {
    wifiConnected = ensureWiFi(SSID, PASSWORD);
    if (wifiConnected) {
      syncClockWithNTP();
    }
  }
  updateWiFiLED();

  if (wifiConnected && !firebaseReady && (now - lastFirebaseRetry >= FIREBASE_RETRY_MS)) {
    logInfo("Retrying Firebase startup connection...");
    firebaseReady = testFirebaseStartup();
    lastFirebaseRetry = now;

    if (firebaseReady) {
      sendStatus("online");
    }
  }

  VitalData data = readVitalData();
  printVitalData(data);

  if (wifiConnected && firebaseReady && (now - lastFirebase >= FIREBASE_INTERVAL_MS)) {
    if (sendVitalData(data)) {
      dataSendCount++;
      lastFirebase = now;
    } else {
      firebaseReady = false;
      lastFirebaseRetry = now;
    }
  }

  Serial.printf("[SYSTEM] WiFi: %s | Firebase: %s | Sends: %lu\n",
                wifiConnected ? "YES" : "NO",
                firebaseReady ? "YES" : "NO",
                dataSendCount);

  delay(1000);
}
