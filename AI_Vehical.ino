#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include "MMA7660.h"
#include <NMEAGPS.h>
#include <GPSfix.h>
#include <math.h>
#include <time.h>
#include <OneWire.h>
#include <DallasTemperature.h>



const char* SSID = "iPhone";
const char* PASSWORD = "12345678qwer";

const char* FIREBASE_HOST = "https://ai-based-smart-vehicle-h-9db25-default-rtdb.asia-southeast1.firebasedatabase.app/";
const char* FIREBASE_AUTH = "";

const char* DEVICE_ID = "Ai-based-smart-vehicle-health";

const int LIGHT_ARM_LEVEL = 1500;

const float TILT_THRESHOLD_G     = 0.90;
const float MOTION_THRESHOLD_G   = 0.58;
const float ACCIDENT_THRESHOLD_G = 1.50;
const float BIKE_UPRIGHT_Z_MIN   = 0.70;

const int MIN_GPS_SATELLITES               = 2;
const unsigned long FIREBASE_INTERVAL_MS   = 30000;
const unsigned long GPS_UPDATE_INTERVAL_MS = 1000;
const unsigned long LOG_INTERVAL_MS        = 10000;
const unsigned long WIFI_TIMEOUT_MS        = 20000;
const unsigned long GPS_STREAM_TIMEOUT_MS  = 30000;
const unsigned long GPS_FIX_TIMEOUT_MS     = 120000;
const unsigned long ALERT_COOLDOWN_MS      = 1500;
const unsigned long SOS_DEBOUNCE_MS        = 10;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
const unsigned long FIREBASE_RETRY_MS      = 15000;

// ======================================================
//                   PIN DEFINITIONS
// ======================================================
// NOTE: External pull-up resistors (4.7kΩ) used for:
//   - DS18B20_PIN (OneWire protocol requires pull-up)
//   - I2C_SDA_PIN & I2C_SCL_PIN (I2C protocol requires pull-ups)
//   - MECHANICAL_BTN_PIN (debounced button input)

const int GREEN_LED_PIN      = 25;  // GPS fix LED
const int RED_LED_PIN        = 26;  // Alarm LED

const int DS18B20_PIN        = 4;   // DS18B20 data pin (4.7kΩ ext pull-up)
const int SW420_VIB_PIN      = 33;
const int LDR_LIGHT_PIN      = 34;
const int KY038_SOUND_PIN    = 32;

const int MECHANICAL_BTN_PIN = 27;  // SOS button (4.7kΩ ext pull-up)
const int ALARM_BUZZER_PIN   = 18;

const int LED_RED_PIN        = 19;  // Event LED
const int LED_YEL_PIN        = 5;   // WiFi LED
const int LED_GRN_PIN        = 23;  // Armed LED

const int GPS_UART_TX_PIN    = 17;
const int GPS_UART_RX_PIN    = 16;

const int I2C_SDA_PIN        = 21;  // I2C data (4.7kΩ ext pull-up)
const int I2C_SCL_PIN        = 22;  // I2C clock (4.7kΩ ext pull-up)

// ======================================================
//                   OBJECTS
// ======================================================

HardwareSerial gpsSerial(2);
MMA7660 accel;

NMEAGPS gps;
gps_fix fix;

OneWire oneWire(DS18B20_PIN);
DallasTemperature tempSensors(&oneWire);

// ======================================================
//                   DATA STRUCTURES
// ======================================================

struct GPSData {
  double latitude = 0.0;
  double longitude = 0.0;
  int satellites = 0;
  double speed = 0.0;
  double altitude = 0.0;
  double heading = 0.0;
  unsigned long lastUpdate = 0;
  bool valid = false;
};

struct AccelData {
  float x = 0.0;
  float y = 0.0;
  float z = 0.0;
  float totalG = 0.0;
  bool tilted = false;
  bool moving = false;
  bool accident = false;
};

struct SensorData {
  float temperature = 0.0;
  int vibration = 0;
  int light = 0;
  int sound = 0;
  bool alarm = false;
  unsigned long timestamp = 0;

  bool accelAvailable = false;
  float accelX = 0.0;
  float accelY = 0.0;
  float accelZ = 0.0;
  float accelTotal = 0.0;
  bool tiltDetected = false;
  bool motionDetected = false;
  bool accidentDetected = false;
};

struct StartupTestResult {
  bool wifiOk = false;
  bool ntpOk = false;
  bool firebaseOk = false;

  bool ledsOk = false;
  bool buzzerOk = false;
  bool tempOk = false;
  bool vibrationOk = false;
  bool lightOk = false;
  bool soundOk = false;
  bool accelOk = false;
  bool gpsSerialOk = false;
  bool gpsFixOk = false;
  bool buttonOk = false;
};

// ======================================================
//                   GLOBAL STATE
// ======================================================

bool alarmState = false;
bool gpsHasFix = false;
bool accelReady = false;
bool systemReady = false;
bool isArmed = false;
bool firebaseReady = false;

GPSData gpsData;
AccelData accelData;
SensorData sensorData;
StartupTestResult startupResult;

unsigned long lastLog = 0;
unsigned long lastFirebase = 0;
unsigned long lastGpsPrint = 0;
unsigned long lastGpsUpdate = 0;
unsigned long lastAlertTime = 0;
unsigned long lastSosPress = 0;
unsigned long lastWiFiRetry = 0;
unsigned long lastFirebaseRetry = 0;
unsigned long dataSendCount = 0;
unsigned long lastButtonChangeTime = 0;

bool lastButtonRawState = false;
bool buttonStableState = false;
bool pendingSOS = false;
String pendingSOSReason = "";

float lastAccelMagnitude = 1.0;

// Forward declarations
void buzzerOff();
bool sendSOSAlert(const String& reason);

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

void allLedsOff() {
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_YEL_PIN, LOW);
  digitalWrite(LED_GRN_PIN, LOW);
}

void allLedsOn() {
  digitalWrite(GREEN_LED_PIN, HIGH);
  digitalWrite(RED_LED_PIN, HIGH);
  digitalWrite(LED_RED_PIN, HIGH);
  digitalWrite(LED_YEL_PIN, HIGH);
  digitalWrite(LED_GRN_PIN, HIGH);
}

void updateWiFiLED() {
  digitalWrite(LED_YEL_PIN, WiFi.status() == WL_CONNECTED ? HIGH : LOW);
}

bool isSOSButtonPressedRaw() {
  return digitalRead(MECHANICAL_BTN_PIN) == HIGH;
}

bool checkSOSButtonPressedEvent() {
  bool rawState = isSOSButtonPressedRaw();

  if (rawState != lastButtonRawState) {
    lastButtonChangeTime = millis();
    lastButtonRawState = rawState;
  }

  if ((millis() - lastButtonChangeTime) >= SOS_DEBOUNCE_MS) {
    if (buttonStableState != rawState) {
      buttonStableState = rawState;
      if (buttonStableState) {
        return true;
      }
    }
  }

  return false;
}

void queueSOSAlert(const String& reason) {
  pendingSOS = true;
  pendingSOSReason = reason;
  logWarn("SOS alert queued. Will send when Firebase is ready.");
}

bool triggerSOSAlert(const String& reason, bool wifiConnected) {
  alarmState = false;
  digitalWrite(RED_LED_PIN, LOW);
  buzzerOff();

  if (wifiConnected && firebaseReady) {
    bool ok = sendSOSAlert(reason);
    if (ok) {
      pendingSOS = false;
      pendingSOSReason = "";
      lastSosPress = millis();
      logPass("SOS alert sent to Firebase");
      return true;
    }
  }

  queueSOSAlert(reason);
  lastSosPress = millis();
  return false;
}

void setupADC() {
  analogReadResolution(12);
  analogSetPinAttenuation(SW420_VIB_PIN, ADC_11db);
  analogSetPinAttenuation(LDR_LIGHT_PIN, ADC_11db);
  analogSetPinAttenuation(KY038_SOUND_PIN, ADC_11db);
}

void setupBuzzer() {
  ledcAttach(ALARM_BUZZER_PIN, 1000, 8);
}

void buzzerWrite(uint8_t duty) {
  ledcWrite(ALARM_BUZZER_PIN, duty);
}

void buzzerChangeFreq(uint32_t freq) {
  ledcChangeFrequency(ALARM_BUZZER_PIN, freq, 8);
}

void buzzerOn(uint8_t duty = 128) {
  buzzerWrite(duty);
}

void buzzerOff() {
  buzzerWrite(0);
}

void scanI2CDevices() {
  Serial.println("[INFO] Scanning I2C bus...");
  Serial.println("[INFO] I2C external pull-ups (4.7kΩ) should be present");
  byte count = 0;

  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();

    if (error == 0) {
      Serial.print("[PASS] I2C device found at 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      count++;
    }
  }

  if (count == 0) {
    logWarn("No I2C devices found. Check MMA7660 and external 4.7kΩ pull-ups.");
  } else {
    Serial.printf("[INFO] Total I2C devices found: %d\n", count);
    logPass("I2C external pull-ups verified by device detection");
  }
}

// ======================================================
//                   SENSOR FUNCTIONS
// ======================================================

float getTemperature() {
  tempSensors.requestTemperatures();
  float tempC = tempSensors.getTempCByIndex(0);

  if (tempC == DEVICE_DISCONNECTED_C || tempC == -127.0) {
    logError("DS18B20 sensor not connected or unstable");
    return -999.0;
  }

  if (isnan(tempC) || isinf(tempC)) {
    logError("DS18B20 temperature calculation failed");
    return -999.0;
  }

  return round(tempC * 100.0) / 100.0;
}

int getVibration() {
  int minVal = 4095;
  int maxVal = 0;

  for (int i = 0; i < 10; i++) {
    int val = analogRead(SW420_VIB_PIN);
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
    delay(2);
  }

  if (minVal < 0 || maxVal > 4095) {
    logError("Vibration sensor raw value invalid");
    return -1;
  }

  return maxVal - minVal;
}

int getSound() {
  int minVal = 4095;
  int maxVal = 0;

  for (int i = 0; i < 8; i++) {
    int val = analogRead(KY038_SOUND_PIN);
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
    delay(2);
  }

  if (minVal < 0 || maxVal > 4095) {
    logError("Sound sensor raw value invalid");
    return -1;
  }

  return maxVal - minVal;
}

bool setupAccelerometer() {
  logInfo("Initializing MMA7660 on I2C (with external 4.7kΩ pull-ups)...");
  Serial.printf("[INFO] I2C SDA = GPIO %d, SCL = GPIO %d\n", I2C_SDA_PIN, I2C_SCL_PIN);
  Serial.println("[INFO] External 4.7kΩ resistors configured for pull-up");

  Wire.beginTransmission(MMA7660_ADDR);
  if (Wire.endTransmission() != 0) {
    logWarn("MMA7660 not detected at I2C address 0x4C. Continuing without accelerometer.");
    return false;
  }

  accel.init();
  accel.setSampleRate(AUTO_SLEEP_120);
  logPass("MMA7660 accelerometer initialized");
  return true;
}

AccelData updateAccelerometer() {
  AccelData data;

  if (!accelReady) {
    return data;
  }

  float ax = 0.0f, ay = 0.0f, az = 0.0f;
  if (!accel.getAcceleration(&ax, &ay, &az)) {
    logWarn("MMA7660 returned invalid values");
    return AccelData();
  }

  data.x = ax;
  data.y = ay;
  data.z = az;
  data.totalG = sqrt((data.x * data.x) + (data.y * data.y) + (data.z * data.z));

  if (isnan(data.totalG) || isinf(data.totalG)) {
    logWarn("Accelerometer returned invalid values");
    return AccelData();
  }

  data.tilted =
    (fabs(data.x) > TILT_THRESHOLD_G) ||
    (fabs(data.y) > TILT_THRESHOLD_G) ||
    (data.z < BIKE_UPRIGHT_Z_MIN);

  data.moving = fabs(data.totalG - lastAccelMagnitude) > MOTION_THRESHOLD_G;
  data.accident = (data.totalG > ACCIDENT_THRESHOLD_G);

  lastAccelMagnitude = data.totalG;
  accelData = data;
  return data;
}

SensorData updateSensorData() {
  SensorData data;
  AccelData ad;

  data.temperature = getTemperature();
  data.vibration = getVibration();
  data.light = analogRead(LDR_LIGHT_PIN);
  data.sound = getSound();
  data.alarm = alarmState;
  data.timestamp = millis() / 1000;

  if (accelReady) {
    ad = updateAccelerometer();
    data.accelAvailable = true;
    data.accelX = ad.x;
    data.accelY = ad.y;
    data.accelZ = ad.z;
    data.accelTotal = ad.totalG;
    data.tiltDetected = ad.tilted;
    data.motionDetected = ad.moving;
    data.accidentDetected = ad.accident;
  }

  sensorData = data;
  return data;
}

// ======================================================
//                   GPS FUNCTIONS
// ======================================================

bool hasValidGPSFix() {
  return gpsData.valid &&
         gpsData.satellites >= MIN_GPS_SATELLITES &&
         gpsData.latitude != 0.0 &&
         gpsData.longitude != 0.0;
}

void updateGPSData() {
  bool updated = false;

  while (gps.available(gpsSerial)) {
    fix = gps.read();

    if (fix.valid.location) {
      gpsData.latitude = fix.latitude();
      gpsData.longitude = fix.longitude();
      gpsData.valid = true;
      updated = true;
    }

    if (fix.valid.satellites) {
      gpsData.satellites = fix.satellites;
      updated = true;
    }

    if (fix.valid.speed) {
      gpsData.speed = fix.speed_kph();
      updated = true;
    }

    if (fix.valid.altitude) {
      gpsData.altitude = fix.altitude();
      updated = true;
    }

    if (fix.valid.heading) {
      gpsData.heading = fix.heading();
      updated = true;
    }

    if (updated) {
      gpsData.lastUpdate = millis();
    }
  }

  gpsHasFix = hasValidGPSFix();
}

bool gpsStreamDetected(unsigned long timeoutMs) {
  unsigned long start = millis();
  int charsSeen = 0;

  logInfo("Checking GPS serial stream...");

  while (millis() - start < timeoutMs) {
    while (gpsSerial.available()) {
      char c = gpsSerial.read();
      charsSeen++;

      if (c == '$' && charsSeen > 10) {
        logPass("GPS stream detected");
        return true;
      }

      if (charsSeen > 50) {
        logPass("GPS data received");
        return true;
      }
    }
    delay(10);
  }

  logError("GPS serial stream not detected");
  return false;
}

bool waitForGPSFix(unsigned long timeoutMs) {
  Serial.println("[INFO] Waiting for GPS fix...");
  Serial.println("[INFO] This may take 30-120 seconds in good conditions...");

  unsigned long lastPrint = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < timeoutMs) {
    updateGPSData();

    if (hasValidGPSFix()) {
      gpsHasFix = true;
      digitalWrite(GREEN_LED_PIN, HIGH);
      Serial.println();
      logPass("GPS fix acquired");
      Serial.printf("[PASS] Satellites: %d\n", gpsData.satellites);
      Serial.printf("[PASS] Location: %.6f, %.6f\n", gpsData.latitude, gpsData.longitude);
      return true;
    }

    gpsHasFix = false;
    digitalWrite(GREEN_LED_PIN, LOW);

    if (millis() - lastPrint >= 1000) {
      lastPrint = millis();
      int elapsed = (millis() - startTime) / 1000;
      Serial.printf("[INFO] %ds elapsed - Satellites: %d, Valid: %s\n",
                    elapsed,
                    gpsData.satellites,
                    gpsData.valid ? "Yes" : "No");
    }

    delay(100);
  }

  logWarn("GPS fix timeout. Continuing and will retry in loop.");
  return false;
}

void printGPSInfo() {
  if (hasValidGPSFix()) {
    Serial.printf("[GPS] %d sats | %.6f, %.6f | %.2f km/h | Alt %.2f m | Head %.1f\n",
                  gpsData.satellites,
                  gpsData.latitude,
                  gpsData.longitude,
                  gpsData.speed,
                  gpsData.altitude,
                  gpsData.heading);
  } else {
    logWarn("GPS has no valid fix yet");
  }
}

// ======================================================
//                   WIFI FUNCTIONS
// ======================================================

bool connectWiFi(const char* ssid, const char* password, unsigned long timeoutMs = WIFI_TIMEOUT_MS) {
  Serial.printf("[INFO] WiFi connecting to %s", ssid);
  digitalWrite(LED_YEL_PIN, LOW);

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
      digitalWrite(LED_YEL_PIN, HIGH);
      return true;
    }
    Serial.print(".");
    delay(500);
  }

  Serial.println(" ✗");
  logError("WiFi connection failed");
  digitalWrite(LED_YEL_PIN, LOW);
  return false;
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool ensureWiFi(const char* ssid, const char* password) {
  if (isWiFiConnected()) {
    digitalWrite(LED_YEL_PIN, HIGH);
    return true;
  }

  if (millis() - lastWiFiRetry < WIFI_RETRY_INTERVAL_MS) {
    digitalWrite(LED_YEL_PIN, LOW);
    return false;
  }

  lastWiFiRetry = millis();
  logWarn("WiFi disconnected. Reconnecting...");
  return connectWiFi(ssid, password);
}

// ======================================================
//                   NTP / TIME
// ======================================================

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
//                   FIREBASE FUNCTIONS
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
  request += "User-Agent: ESP32-VehicleMonitor/1.0\r\n";
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
    "\"device_id\":\"" + String(DEVICE_ID) + "\""
    "}";

  String response;
  return httpsRequest("PUT", path, json, response);
}

bool testConnection() {
  if (!isWiFiConnected()) {
    logError("Firebase test failed because WiFi is not connected");
    return false;
  }

  Serial.println("[FB DEBUG] --- Firebase Connection Test ---");
  Serial.printf("[FB DEBUG] Target Host: %s\n", FIREBASE_HOST);
  Serial.printf("[FB DEBUG] Device IP: %s\n", WiFi.localIP().toString().c_str());
  Serial.printf("[FB DEBUG] WiFi RSSI: %d dBm\n", WiFi.RSSI());

  String path = buildPath("/" + String(DEVICE_ID) + "/test");
  String json =
    "{"
    "\"test\":true,"
    "\"device\":\"" + String(DEVICE_ID) + "\","
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

bool sendAlert(const String& alertType, const String& message) {
  if (!isWiFiConnected() || !firebaseReady) {
    return false;
  }

  unsigned long timestamp = millis();
  String path = buildPath("/alerts/" + String(timestamp));

  String json =
    "{"
    "\"type\":\"" + alertType + "\","
    "\"message\":\"" + message + "\","
    "\"timestamp\":" + String(millis() / 1000) + ","
    "\"device_id\":\"" + String(DEVICE_ID) + "\"";

  if (hasValidGPSFix()) {
    json += ",\"latitude\":" + String(gpsData.latitude, 6);
    json += ",\"longitude\":" + String(gpsData.longitude, 6);
    json += ",\"satellites\":" + String(gpsData.satellites);
    json += ",\"speed_kmh\":" + String(gpsData.speed, 2);
  }

  json += "}";

  String response;
  Serial.printf("[INFO] Sending alert: %s ...", alertType.c_str());
  bool ok = httpsRequest("PUT", path, json, response);
  Serial.println(ok ? " ✓" : " ✗");
  return ok;
}

bool sendSOSAlert(const String& reason) {
  return sendAlert("sos", reason);
}

bool sendSensorData(const SensorData& data) {
  if (!isWiFiConnected() || !firebaseReady) {
    logWarn("Sensor data not sent because Firebase is not ready");
    return false;
  }

  unsigned long ts = millis();
  String path = buildPath("/" + String(DEVICE_ID) + "/readings/" + String(ts));

  String json =
    "{"
    "\"temperature\":" + String(data.temperature, 2) + ","
    "\"vibration\":" + String(data.vibration) + ","
    "\"light\":" + String(data.light) + ","
    "\"sound\":" + String(data.sound) + ","
    "\"alarm\":" + String(data.alarm ? "true" : "false") + ","
    "\"timestamp\":" + String(data.timestamp) + ","
    "\"accelerometer_available\":" + String(data.accelAvailable ? "true" : "false");

  if (data.accelAvailable) {
    json += ",\"accel_x\":" + String(data.accelX, 3);
    json += ",\"accel_y\":" + String(data.accelY, 3);
    json += ",\"accel_z\":" + String(data.accelZ, 3);
    json += ",\"accel_total_g\":" + String(data.accelTotal, 3);
    json += ",\"tilt_detected\":" + String(data.tiltDetected ? "true" : "false");
    json += ",\"motion_detected\":" + String(data.motionDetected ? "true" : "false");
    json += ",\"accident_detected\":" + String(data.accidentDetected ? "true" : "false");
  }

  if (hasValidGPSFix()) {
    json += ",\"gps_lat\":" + String(gpsData.latitude, 6);
    json += ",\"gps_lon\":" + String(gpsData.longitude, 6);
    json += ",\"gps_sats\":" + String(gpsData.satellites);
    json += ",\"gps_speed_kmh\":" + String(gpsData.speed, 2);
    json += ",\"gps_altitude\":" + String(gpsData.altitude, 2);
    json += ",\"gps_heading\":" + String(gpsData.heading, 1);
  }

  json += "}";

  String response;
  Serial.print("[INFO] Sending sensor data...");
  bool ok = httpsRequest("PUT", path, json, response);
  Serial.println(ok ? " ✓" : " ✗");

  if (!ok) {
    logError("Sensor data send failed");
  }

  return ok;
}

// ======================================================
//                   STARTUP TESTS
// ======================================================

bool testLEDs() {
  logInfo("Testing LEDs");

  allLedsOff();
  digitalWrite(GREEN_LED_PIN, HIGH); delay(250); digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, HIGH);   delay(250); digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);   delay(250); digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_YEL_PIN, HIGH);   delay(250); digitalWrite(LED_YEL_PIN, LOW);
  digitalWrite(LED_GRN_PIN, HIGH);   delay(250); digitalWrite(LED_GRN_PIN, LOW);

  allLedsOn();
  delay(300);
  allLedsOff();

  updateWiFiLED();
  logPass("LED test complete");
  return true;
}

bool testBuzzer() {
  logInfo("Testing buzzer");

  buzzerChangeFreq(1500);
  buzzerOn(180);
  delay(250);
  buzzerOff();
  delay(100);

  buzzerChangeFreq(2000);
  buzzerOn(180);
  delay(250);
  buzzerOff();

  logPass("Buzzer test complete");
  return true;
}

bool testTempSensor() {
  Serial.println("[INFO] Testing DS18B20 temperature sensor");
  Serial.println("[INFO] DS18B20 OneWire protocol uses external 4.7kΩ pull-up");
  float t = getTemperature();
  Serial.printf("[TEMP] DS18B20 temp=%.2f C\n", t);

  if (t == -999.0) {
    logError("DS18B20 temperature sensor failed - check 4.7kΩ pull-up on GPIO 4");
    return false;
  }

  logPass("DS18B20 temperature sensor OK (external pull-up working)");
  return true;
}

bool testVibrationSensor() {
  int raw = analogRead(SW420_VIB_PIN);
  int delta = getVibration();
  Serial.printf("[VIB] raw=%d delta=%d\n", raw, delta);

  if (raw < 0 || raw > 4095 || delta < 0) {
    logError("Vibration sensor failed");
    return false;
  }

  logPass("Vibration sensor OK");
  return true;
}

bool testLightSensor() {
  int raw = analogRead(LDR_LIGHT_PIN);
  Serial.printf("[LDR] raw=%d\n", raw);

  if (raw < 0 || raw > 4095) {
    logError("Light sensor failed");
    return false;
  }

  logPass("Light sensor OK");
  return true;
}

bool testSoundSensor() {
  int raw = analogRead(KY038_SOUND_PIN);
  int delta = getSound();
  Serial.printf("[SOUND] raw=%d delta=%d\n", raw, delta);

  if (raw < 0 || raw > 4095 || delta < 0) {
    logError("Sound sensor failed");
    return false;
  }

  logPass("Sound sensor OK");
  return true;
}

bool testAccelerometer() {
  logInfo("Testing accelerometer");

  if (!accelReady) {
    logWarn("Accelerometer not found. Skipping because it is OPTIONAL.");
    logWarn("System will function without accelerometer.");
    return true;
  }

  AccelData ad = updateAccelerometer();
  Serial.printf("[ACCEL] X=%.2f Y=%.2f Z=%.2f G=%.2f\n", ad.x, ad.y, ad.z, ad.totalG);

  if (ad.totalG <= 0.3 || ad.totalG >= 3.5) {
    logWarn("Accelerometer values look abnormal, but continuing.");
    return true;
  }

  logPass("Accelerometer OK");
  return true;
}

bool testButton() {
  logInfo("Testing SOS button (with external 4.7kΩ pull-up)");
  Serial.println("[INFO] Button GPIO 27 uses external pull-up for stable debouncing");
  Serial.println("[INFO] Press SOS button within 5 seconds...");

  unsigned long start = millis();
  while (millis() - start < 5000) {
    if (isSOSButtonPressedRaw()) {
      logPass("SOS button OK (external pull-up verified)");
      return true;
    }
    delay(20);
  }

  logWarn("SOS button not pressed during test. Verify 4.7kΩ pull-up on GPIO 27.");
  return true;
}

bool testGPSSerial() {
  logInfo("Testing GPS serial");
  return gpsStreamDetected(GPS_STREAM_TIMEOUT_MS);
}

bool testGPSFixMandatory() {
  logInfo("Testing GPS fix");
  bool ok = waitForGPSFix(GPS_FIX_TIMEOUT_MS);

  if (ok) {
    gpsHasFix = true;
    digitalWrite(GREEN_LED_PIN, HIGH);
    printGPSInfo();
  } else {
    gpsHasFix = false;
    digitalWrite(GREEN_LED_PIN, LOW);
  }

  return true;
}

void printStartupSummary(const StartupTestResult& r) {
  Serial.println();
  Serial.println("============== STARTUP TEST SUMMARY ==============");
  Serial.printf("WiFi         : %s (REQUIRED)\n", r.wifiOk ? "PASS" : "FAIL");
  Serial.printf("NTP Time     : %s (RECOMMENDED)\n", r.ntpOk ? "PASS" : "FAIL");
  Serial.printf("Firebase     : %s (WILL RETRY)\n", r.firebaseOk ? "PASS" : "FAIL");
  Serial.printf("LEDs         : %s (REQUIRED)\n", r.ledsOk ? "PASS" : "FAIL");
  Serial.printf("Buzzer       : %s (REQUIRED)\n", r.buzzerOk ? "PASS" : "FAIL");
  Serial.printf("Temp Sensor  : %s (REQUIRED)\n", r.tempOk ? "PASS" : "FAIL");
  Serial.printf("Vibration    : %s (REQUIRED)\n", r.vibrationOk ? "PASS" : "FAIL");
  Serial.printf("Light Sensor : %s (REQUIRED)\n", r.lightOk ? "PASS" : "FAIL"); 
  Serial.printf("Sound Sensor : %s (REQUIRED)\n", r.soundOk ? "PASS" : "FAIL");
  Serial.printf("MMA7660      : %s\n", accelReady ? "PASS" : "OPTIONAL");
  Serial.printf("GPS Serial   : %s (REQUIRED)\n", r.gpsSerialOk ? "PASS" : "FAIL");
  Serial.printf("GPS Fix      : %s (WILL RETRY)\n", r.gpsFixOk ? "PASS" : "WAIT");
  Serial.printf("Button       : %s (REQUIRED)\n", r.buttonOk ? "PASS" : "FAIL");
  Serial.println("==================================================");
  Serial.println();
}

bool runStartupSelfTest() {
  StartupTestResult r;

  Serial.println();
  Serial.println("==================================================");
  Serial.println("         STARTUP COMPONENT SELF TEST");
  Serial.println("==================================================");

  logInfo("STEP 1: WiFi check (REQUIRED)");
  r.wifiOk = connectWiFi(SSID, PASSWORD);
  updateWiFiLED();

  if (!r.wifiOk) {
    logError("WiFi connection FAILED - System startup aborted");
    startupResult = r;
    printStartupSummary(r);
    return false;
  }

  logInfo("STEP 2: NTP time sync before Firebase");
  r.ntpOk = syncClockWithNTP();
  delay(1000);

  logInfo("STEP 3: Firebase connection check");
  r.firebaseOk = testFirebaseStartup();
  firebaseReady = r.firebaseOk;

  if (!r.firebaseOk) {
    logWarn("Firebase not ready at startup. System will retry later.");
  }

  logInfo("STEP 4: LEDs and buzzer");
  r.ledsOk = testLEDs();
  r.buzzerOk = testBuzzer();

  logInfo("STEP 5: Main sensors");
  r.tempOk = testTempSensor();
  r.vibrationOk = testVibrationSensor();
  r.lightOk = testLightSensor();
  r.soundOk = testSoundSensor();

  logInfo("STEP 6: Accelerometer check (OPTIONAL)");
  r.accelOk = testAccelerometer();

  logInfo("STEP 7: GPS serial check");
  r.gpsSerialOk = testGPSSerial();

  logInfo("STEP 8: GPS fix check");
  r.gpsFixOk = testGPSFixMandatory();

  logInfo("STEP 9: Button check");
  r.buttonOk = testButton();

  startupResult = r;
  printStartupSummary(r);

  bool minimumReady =
    r.wifiOk &&
    r.ledsOk &&
    r.buzzerOk &&
    r.tempOk &&
    r.vibrationOk &&
    r.lightOk &&
    r.soundOk &&
    r.gpsSerialOk &&
    r.buttonOk;

  if (!minimumReady) {
    logError("Required startup checks failed.");
    return false;
  }

  logPass("Startup self-test completed.");
  return true;
}

// ======================================================
//                   SETUP
// ======================================================

void setup() {
  Serial.begin(115200);
  delay(1200);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_YEL_PIN, OUTPUT);
  pinMode(LED_GRN_PIN, OUTPUT);

  // External pull-ups (4.7kΩ) configured on hardware
  // Do NOT use INPUT_PULLUP - external resistors handle pull-up
  pinMode(MECHANICAL_BTN_PIN, INPUT);  // External 4.7kΩ pull-up on GPIO 27
  pinMode(SW420_VIB_PIN, INPUT);
  pinMode(LDR_LIGHT_PIN, INPUT);
  pinMode(KY038_SOUND_PIN, INPUT);

  // DS18B20 OneWire requires external 4.7kΩ pull-up
  // Connected between DS18B20_PIN (GPIO 4) and VCC (3.3V)
  pinMode(DS18B20_PIN, INPUT);  // Internal pull-up disabled

  allLedsOff();
  setupADC();
  setupBuzzer();

  // I2C bus with external 4.7kΩ pull-ups on SDA and SCL
  // Ensure pull-ups are not internally enabled by disabling pullups in Wire
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  // Wire.setPullupMode(0);  // Disable internal pull-ups (use external 4.7kΩ)
  delay(100);
  scanI2CDevices();

  accelReady = setupAccelerometer();

  tempSensors.begin();
  delay(100);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_UART_RX_PIN, GPS_UART_TX_PIN);

  Serial.println("==================================================");
  Serial.println("     VEHICLE HEALTH MONITORING SYSTEM");
  Serial.println("==================================================");
  Serial.println("[INFO] EXTERNAL PULL-UP CONFIGURATION ACTIVE");
  Serial.println("[INFO] Using 4.7kΩ resistors for OneWire & I2C");
  Serial.printf("Free Heap: %u bytes\n", ESP.getFreeHeap());

  systemReady = runStartupSelfTest();

  if (!systemReady) {
    logError("System not ready. Startup failed.");

    while (true) {
      updateWiFiLED();
      digitalWrite(RED_LED_PIN, HIGH);
      delay(300);
      digitalWrite(RED_LED_PIN, LOW);
      delay(300);
    }
  }

  updateWiFiLED();

  if (isWiFiConnected() && firebaseReady) {
    sendStatus("online");
  }

  if (!accelReady) {
    logWarn("System started without accelerometer. Other sensors will still send to Firebase.");
  }

  logPass("Main monitoring started.");
  Serial.println("[SYSTEM] Monitoring ACTIVE");
}

// ======================================================
//                   LOOP
// ======================================================

void loop() {
  if (!systemReady) return;

  unsigned long now = millis();

  bool wifiConnected = isWiFiConnected();
  if (!wifiConnected) {
    wifiConnected = ensureWiFi(SSID, PASSWORD);

    if (wifiConnected) {
      syncClockWithNTP();
      delay(1000);
    }
  }

  updateWiFiLED();

  if (pendingSOS && wifiConnected && firebaseReady) {
    logInfo("Retrying pending SOS alert.");
    if (sendSOSAlert(pendingSOSReason)) {
      logPass("Pending SOS alert sent to Firebase");
      pendingSOS = false;
      pendingSOSReason = "";
    }
  }

  if (wifiConnected && !firebaseReady && (now - lastFirebaseRetry >= FIREBASE_RETRY_MS)) {
    logInfo("Retrying Firebase startup connection.");
    lastFirebaseRetry = now;
    firebaseReady = testFirebaseStartup();

    if (firebaseReady) {
      logPass("Firebase reconnected successfully");
      sendStatus("online");
    }
  }

  if (now - lastGpsUpdate >= GPS_UPDATE_INTERVAL_MS) {
    lastGpsUpdate = now;
    updateGPSData();
    digitalWrite(GREEN_LED_PIN, hasValidGPSFix() ? HIGH : LOW);
  }

  if (now - lastGpsPrint >= LOG_INTERVAL_MS) {
    lastGpsPrint = now;
    printGPSInfo();
  }

  SensorData currentData = updateSensorData();

  isArmed = (currentData.light < LIGHT_ARM_LEVEL);
  digitalWrite(LED_GRN_PIN, isArmed ? HIGH : LOW);

  bool sosPressed = checkSOSButtonPressedEvent();
  if (sosPressed && (now - lastSosPress >= ALERT_COOLDOWN_MS)) {
    logWarn("Manual SOS button pressed.");
    triggerSOSAlert("Manual SOS button pressed", wifiConnected);
  }

  bool autoAccident = false;
  String autoReason = "";

  if (isArmed && accelReady) {
    if (currentData.accidentDetected) {
      autoAccident = true;
      autoReason = "Accident-level impact detected";
    } else if (currentData.tiltDetected && currentData.motionDetected) {
      autoAccident = true;
      autoReason = "Tilt and motion pattern suggests fall/crash";
    }
  }

  if (autoAccident && (now - lastAlertTime >= ALERT_COOLDOWN_MS)) {
    lastAlertTime = now;
    logWarn(autoReason);

    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(LED_RED_PIN, HIGH);
    buzzerChangeFreq(2200);
    buzzerOn(220);
    delay(250);
    buzzerOff();

    triggerSOSAlert(autoReason, wifiConnected);
  } else {
    digitalWrite(LED_RED_PIN, LOW);
    if (!alarmState) {
      digitalWrite(RED_LED_PIN, LOW);
    }
  }

  if (now - lastFirebase >= FIREBASE_INTERVAL_MS) {
    lastFirebase = now;

    if (wifiConnected && firebaseReady) {
      if (sendSensorData(currentData)) {
        dataSendCount++;
        Serial.printf("[PASS] Firebase data send count: %lu\n", dataSendCount);
      }
    } else {
      logWarn("Skipped Firebase send because WiFi/Firebase is unavailable");
    }
  }

  if (now - lastLog >= LOG_INTERVAL_MS) {
    lastLog = now;

    Serial.println("--------------- SENSOR STATUS ---------------");
    Serial.printf("Temperature : %.2f C\n", currentData.temperature);
    Serial.printf("Vibration   : %d\n", currentData.vibration);
    Serial.printf("Light       : %d\n", currentData.light);
    Serial.printf("Sound       : %d\n", currentData.sound);
    Serial.printf("Armed       : %s\n", isArmed ? "YES" : "NO");
    Serial.printf("WiFi        : %s\n", wifiConnected ? "CONNECTED" : "DISCONNECTED");
    Serial.printf("Firebase    : %s\n", firebaseReady ? "READY" : "NOT READY");

    if (currentData.accelAvailable) {
      Serial.printf("Accel X/Y/Z : %.2f / %.2f / %.2f\n", currentData.accelX, currentData.accelY, currentData.accelZ);
      Serial.printf("Total G     : %.2f\n", currentData.accelTotal);
      Serial.printf("Tilt        : %s\n", currentData.tiltDetected ? "YES" : "NO");
      Serial.printf("Motion      : %s\n", currentData.motionDetected ? "YES" : "NO");
      Serial.printf("Accident    : %s\n", currentData.accidentDetected ? "YES" : "NO");
    } else {
      Serial.println("Accelerometer: NOT AVAILABLE");
    }

    Serial.println("--------------------------------------------");
  }

  delay(20);
}