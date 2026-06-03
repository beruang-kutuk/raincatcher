#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 18
#define TURBIDITY_PIN 33
#define ONE_WIRE_BUS 4
#define PH_PIN 34

// Edit these values local WiFi and backend.
const char *WIFI_SSID = "jasminejuliajemima 2.4G";
const char *WIFI_PASSWORD = "0123456789";

// Do not use localhost here. On ESP32, localhost means the ESP32 itself.
// const char *BACKEND_TELEMETRY_URL = "http://192.168.100.200:8080/api/iot/telemetry";
// const char *BACKEND_HOST = "192.168.100.200";
const char *BACKEND_TELEMETRY_URL = "http://192.168.100.137:8080/api/iot/telemetry";
const char *BACKEND_HOST = "192.168.100.137";
const uint16_t BACKEND_PORT = 8080;
const char *DEVICE_ID = "RC-01";
const char *TANK_ID = "TANK_A";
const char *DEVICE_KEY = "raincatcher-device-key";

const unsigned long ULTRASONIC_TIMEOUT_US = 30000UL;
const unsigned long WIFI_RETRY_DELAY_MS = 500;
const unsigned long TELEMETRY_INTERVAL_MS = 60000UL;

// Tank calibration.
const float TANK_EMPTY_DISTANCE_CM = 35.0;
const float TANK_FULL_DISTANCE_CM = 5.0;

// ESP32 ADC settings
const float ADC_MAX_VALUE = 4095.0;
const float ADC_REFERENCE_VOLTAGE = 3.3;

// Turbidity calibration
const float TURBIDITY_CLEAR_WATER_VOLTAGE = 3.0;
const float TURBIDITY_DIRTY_WATER_VOLTAGE = 0.5;
const float TURBIDITY_MAX_NTU = 3000.0;

// TEMPORARY pH calibration values.
// These are only estimates. You need calibration solution later.
const float PH_NEUTRAL_VOLTAGE = 2.50;
const float PH_VOLTAGE_PER_PH = 0.18;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature temperatureSensor(&oneWire);

float adcToVoltage(int rawAdc)
{
  return (rawAdc * ADC_REFERENCE_VOLTAGE) / ADC_MAX_VALUE;
}

bool readUltrasonicDistance(float &distanceCm)
{
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG_PIN, LOW);

  unsigned long durationUs = pulseIn(
      ULTRASONIC_ECHO_PIN,
      HIGH,
      ULTRASONIC_TIMEOUT_US);

  if (durationUs == 0)
  {
    return false;
  }

  distanceCm = (durationUs * 0.0343) / 2.0;
  return true;
}

float estimateTurbidityNtu(float voltage)
{
  float ntu = (TURBIDITY_CLEAR_WATER_VOLTAGE - voltage) *
              (TURBIDITY_MAX_NTU /
               (TURBIDITY_CLEAR_WATER_VOLTAGE - TURBIDITY_DIRTY_WATER_VOLTAGE));

  return constrain(ntu, 0.0, TURBIDITY_MAX_NTU);
}

float estimatePh(float voltage)
{
  float ph = 7.0 + ((PH_NEUTRAL_VOLTAGE - voltage) / PH_VOLTAGE_PER_PH);
  return constrain(ph, 0.0, 14.0);
}

float distanceToWaterLevelPercent(float distanceCm)
{
  float level = ((TANK_EMPTY_DISTANCE_CM - distanceCm) /
                 (TANK_EMPTY_DISTANCE_CM - TANK_FULL_DISTANCE_CM)) *
                100.0;
  return constrain(level, 0.0, 100.0);
}

void connectToWifi()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    return;
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED)
  {
    delay(WIFI_RETRY_DELAY_MS);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("WiFi connected. ESP32 IP: ");
  Serial.println(WiFi.localIP());
}

String buildTelemetryJson(
    float ph,
    float turbidity,
    float waterTemperature,
    float ultrasonicDistanceCm,
    float waterLevelPercent)
{
  String json = "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"tankId\":\"" + String(TANK_ID) + "\",";
  json += "\"ph\":" + String(ph, 2) + ",";
  json += "\"turbidity\":" + String(turbidity, 1) + ",";
  json += "\"waterTemperature\":" + String(waterTemperature, 2) + ",";
  json += "\"ultrasonicDistanceCm\":" + String(ultrasonicDistanceCm, 1) + ",";
  json += "\"waterLevelPercent\":" + String(waterLevelPercent, 1);
  json += "}";
  return json;
}

bool testBackendTcpConnection()
{
  WiFiClient testClient;
  Serial.print("Testing TCP connection to backend...");

  if (testClient.connect(BACKEND_HOST, BACKEND_PORT))
  {
    Serial.println("TCP OK");
    testClient.stop();
    return true;
  }

  Serial.println("TCP FAILED");
  return false;
}

void sendTelemetry(String json)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi not connected. Skipping telemetry upload.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.print("Backend URL: ");
  Serial.println(BACKEND_TELEMETRY_URL);

  if (!testBackendTcpConnection())
  {
    Serial.println("Backend TCP connection failed. Check laptop firewall, IP address, router, and backend server.");
    return;
  }

  Serial.println("Posting telemetry to backend...");
  Serial.println(json);

  http.begin(client, BACKEND_TELEMETRY_URL);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  http.addHeader("Connection", "close");
  http.addHeader("X-DEVICE-KEY", DEVICE_KEY);

  int httpResponseCode = http.POST(json);
  String responseBody = http.getString();

  Serial.print("HTTP response code: ");
  Serial.println(httpResponseCode);

  Serial.print("HTTP response body: ");
  Serial.println(responseBody);

  http.end();
}

void readAndUploadTelemetry()
{
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  float turbidityVoltage = adcToVoltage(turbidityRaw);
  float turbidityNtu = estimateTurbidityNtu(turbidityVoltage);

  int phRaw = analogRead(PH_PIN);
  float phVoltage = adcToVoltage(phRaw);
  float ph = estimatePh(phVoltage);

  temperatureSensor.requestTemperatures();
  float waterTemperature = temperatureSensor.getTempCByIndex(0);
  if (waterTemperature == DEVICE_DISCONNECTED_C)
  {
    Serial.println("DS18B20 not detected. Sending -127 as temperature.");
  }

  float distanceCm = 0.0;
  bool hasDistance = readUltrasonicDistance(distanceCm);
  float waterLevelPercent = hasDistance ? distanceToWaterLevelPercent(distanceCm) : 0.0;

  Serial.println();
  Serial.println("===== Water Monitoring Readings =====");

  Serial.print("pH Raw: ");
  Serial.println(phRaw);

  Serial.print("pH Voltage: ");
  Serial.println(phVoltage, 3);

  Serial.print("pH Estimated: ");
  Serial.println(ph, 2);

  Serial.print("Turbidity Raw: ");
  Serial.println(turbidityRaw);

  Serial.print("Turbidity Voltage: ");
  Serial.println(turbidityVoltage, 3);

  Serial.print("Turbidity NTU: ");
  Serial.println(turbidityNtu, 1);

  Serial.print("Water Temperature C: ");
  Serial.println(waterTemperature, 2);

  Serial.print("Ultrasonic Distance cm: ");
  Serial.println(hasDistance ? String(distanceCm, 1) : "No reading");

  Serial.print("Water Level %: ");
  Serial.println(waterLevelPercent, 1);

  String json = buildTelemetryJson(
      ph,
      turbidityNtu,
      waterTemperature,
      hasDistance ? distanceCm : -1.0,
      waterLevelPercent);

  sendTelemetry(json);
}

void setup()
{
  Serial.begin(115200);
  delay(1000);

  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);

  analogReadResolution(12);
  analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);
  analogSetPinAttenuation(PH_PIN, ADC_11db);

  temperatureSensor.begin();

  Serial.println("ESP32 RainCatcher telemetry started");
  Serial.println("Keep all analog sensor outputs at or below 3.3V.");

  connectToWifi();
}

void loop()
{
  connectToWifi();
  readAndUploadTelemetry();
  delay(TELEMETRY_INTERVAL_MS);
}
