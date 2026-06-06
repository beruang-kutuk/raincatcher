#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Debug / calibration mode.
#define PH_DEBUG true

// TEST_MODE is a demo/log flag only. Sensor readings always use real hardware.
const bool TEST_MODE = false;

// Pin assignments.
#define ULTRASONIC_TRIG_PIN 5
#define ULTRASONIC_ECHO_PIN 18
#define TURBIDITY_PIN 33
#define ONE_WIRE_BUS 4
#define PH_PIN 34
#define LED_PIN 2

// Network / backend.
const char *WIFI_SSID = "Raincatcher";
const char *WIFI_PASSWORD = "0123456789";
const char *BACKEND_HOST = "192.168.0.200";
const uint16_t BACKEND_PORT = 8080;
const char *BACKEND_TELEMETRY_URL = "http://192.168.0.200:8080/api/iot/telemetry";
const char *DEVICE_ID = "RC-01";
const char *TANK_ID = "TANK_A";
const char *DEVICE_KEY = "raincatcher-device-key";

// Timing.
const unsigned long TELEMETRY_INTERVAL_MS = 10000UL;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000UL;
const unsigned long WIFI_RETRY_DELAY_MS = 500UL;
const unsigned long TELEMETRY_RETRY_DELAY_MS = 2000UL;
const unsigned long ULTRASONIC_TIMEOUT_US = 30000UL;
const unsigned long HTTP_TIMEOUT_MS = 10000UL;
const int TELEMETRY_MAX_ATTEMPTS = 3;

// Tank calibration.
const float TANK_EMPTY_DISTANCE_CM = 14.0;
const float TANK_FULL_DISTANCE_CM = 2.0;

// ESP32 ADC settings.
const float ADC_MAX_VALUE = 4095.0;
const float ADC_REFERENCE_VOLTAGE = 3.3;

// pH averaging and 2-point calibration.
const int PH_SAMPLE_COUNT = 20;
const int PH_SAMPLE_DELAY_MS = 10;
const float PH7_VOLTAGE = 1.496;
const float PH4_VOLTAGE = 1.945;

// Turbidity calibration.
// Clear water observed 3.300 V.
// Cloudy powder water observed 0.015 V.
// Prototype maps this range to 0-300 NTU for dashboard readability.
const float TURBIDITY_CLEAR_VOLTAGE = 3.30;
const float TURBIDITY_CLOUDY_VOLTAGE = 0.015;
const float TURBIDITY_MAX_NTU = 300.0;
const float TURBIDITY_EMA_ALPHA = 0.25;
const int TURBIDITY_SAMPLE_COUNT = 30;
const int TURBIDITY_SAMPLE_DELAY_MS = 5;

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature temperatureSensor(&oneWire);

float smoothedTurbidityNtu = 0.0;
bool hasSmoothedTurbidityNtu = false;

bool connectToWifi();
void readAndUploadTelemetry();
bool sendTelemetry(const String &json);
bool testBackendTcpConnection();
String buildTelemetryJson(float ph, float turbidity, float waterTemperature, float ultrasonicDistanceCm, float waterLevelPercent);

void blinkLed(int times, int onMs, int offMs);
void ledWifiFailed();
void ledBackendFailed();
void ledTelemetrySuccess();
void printWifiDetails();
float adcToVoltage(float rawAdc);
bool readUltrasonicDistance(float &distanceCm);
float distanceToWaterLevelPercent(float distanceCm);
float readTurbidityRawAveraged();
float estimateTurbidityNtu(float voltage);
float smoothTurbidityNtu(float instantNtu);
const char *getTurbidityStatus(float ntu);
float readPhVoltageAveraged();
float calculatePh(float voltage);

void setup()
{
  Serial.begin(115200);
  delay(1000);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(ULTRASONIC_TRIG_PIN, OUTPUT);
  pinMode(ULTRASONIC_ECHO_PIN, INPUT);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);

  analogReadResolution(12);
  analogSetPinAttenuation(TURBIDITY_PIN, ADC_11db);
  analogSetPinAttenuation(PH_PIN, ADC_11db);

  temperatureSensor.begin();

  Serial.println();
  Serial.println("====================================================");
  Serial.println("Raincatcher ESP32 booted");
  Serial.print("TEST_MODE:              ");
  Serial.println(TEST_MODE ? "ON" : "OFF");
  Serial.print("Telemetry interval:     ");
  Serial.print(TELEMETRY_INTERVAL_MS / 1000UL);
  Serial.println(" s");
  Serial.println("WiFi mode:              WIFI_STA");
  Serial.println("WiFi sleep:             disabled");
  Serial.print("WiFi SSID:              ");
  Serial.println(WIFI_SSID);
  Serial.print("Backend URL:            ");
  Serial.println(BACKEND_TELEMETRY_URL);
  Serial.print("Backend host/port:      ");
  Serial.print(BACKEND_HOST);
  Serial.print(":");
  Serial.println(BACKEND_PORT);
  Serial.print("Device ID:              ");
  Serial.println(DEVICE_ID);
  Serial.print("Tank ID:                ");
  Serial.println(TANK_ID);
  Serial.print("Turbidity pin:          GPIO");
  Serial.println(TURBIDITY_PIN);
  Serial.println("Turbidity source:       real analogRead(TURBIDITY_PIN)");
  Serial.println("====================================================");

  connectToWifi();
}

void loop()
{
  readAndUploadTelemetry();
  delay(TELEMETRY_INTERVAL_MS);
}

bool connectToWifi()
{
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("WiFi already connected.");
    printWifiDetails();
    return true;
  }

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.disconnect(false);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - startedAt >= WIFI_CONNECT_TIMEOUT_MS)
    {
      Serial.println();
      Serial.print("WiFi connect timed out after ");
      Serial.print(WIFI_CONNECT_TIMEOUT_MS / 1000UL);
      Serial.println(" s.");
      ledWifiFailed();
      return false;
    }

    Serial.print(".");
    delay(WIFI_RETRY_DELAY_MS);
  }

  Serial.println();
  Serial.println("WiFi connected.");
  printWifiDetails();
  return true;
}

void readAndUploadTelemetry()
{
  float turbidityRawAvg = readTurbidityRawAveraged();
  float turbidityVoltage = adcToVoltage(turbidityRawAvg);
  float turbidityInstantNtu = estimateTurbidityNtu(turbidityVoltage);
  float turbidityNtu = smoothTurbidityNtu(turbidityInstantNtu);
  const char *turbidityStatus = getTurbidityStatus(turbidityNtu);

  float phVoltage = readPhVoltageAveraged();
  float ph = calculatePh(phVoltage);

  temperatureSensor.requestTemperatures();
  float waterTemperature = temperatureSensor.getTempCByIndex(0);
  if (waterTemperature == DEVICE_DISCONNECTED_C)
    Serial.println("DS18B20 not detected. Sending -127 as temperature.");

  float distanceCm = 0.0;
  bool hasDistance = readUltrasonicDistance(distanceCm);
  float waterLevelPercent = hasDistance ? distanceToWaterLevelPercent(distanceCm) : 0.0;

  Serial.println();
  Serial.println("===== Water Monitoring Readings =====");
  Serial.print("pH Voltage:             ");
  Serial.print(phVoltage, 3);
  Serial.println(" V");
  Serial.print("pH Final:               ");
  Serial.println(ph, 2);

  Serial.print("Turbidity Raw ADC avg:  ");
  Serial.println(turbidityRawAvg, 1);
  Serial.print("Turbidity Voltage:      ");
  Serial.print(turbidityVoltage, 3);
  Serial.println(" V");
  Serial.print("Turbidity Instant NTU:  ");
  Serial.println(turbidityInstantNtu, 1);
  Serial.print("Turbidity Smoothed NTU: ");
  Serial.println(turbidityNtu, 1);
  Serial.print("Turbidity Status:       ");
  Serial.println(turbidityStatus);
  Serial.println("Turbidity Read Source:  real analogRead(TURBIDITY_PIN)");

  Serial.print("Water Temp C:           ");
  Serial.println(waterTemperature, 2);
  Serial.print("Ultrasonic cm:          ");
  Serial.println(hasDistance ? String(distanceCm, 1) : "No reading");
  Serial.print("Empty dist cfg:         ");
  Serial.print(TANK_EMPTY_DISTANCE_CM, 1);
  Serial.println(" cm");
  Serial.print("Full dist cfg:          ");
  Serial.print(TANK_FULL_DISTANCE_CM, 1);
  Serial.println(" cm");
  Serial.print("Water Level %:          ");
  Serial.println(waterLevelPercent, 1);

  String json = buildTelemetryJson(
      ph,
      turbidityNtu,
      waterTemperature,
      hasDistance ? distanceCm : -1.0,
      waterLevelPercent);

  sendTelemetry(json);
}

bool sendTelemetry(const String &json)
{
  bool reachedBackendLayer = false;

  for (int attempt = 1; attempt <= TELEMETRY_MAX_ATTEMPTS; attempt++)
  {
    Serial.println();
    Serial.print("Telemetry attempt ");
    Serial.print(attempt);
    Serial.print(" of ");
    Serial.println(TELEMETRY_MAX_ATTEMPTS);

    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("WiFi disconnected. Reconnecting before telemetry POST.");
      if (!connectToWifi())
      {
        if (attempt < TELEMETRY_MAX_ATTEMPTS)
          delay(TELEMETRY_RETRY_DELAY_MS);
        continue;
      }
    }
    else
    {
      printWifiDetails();
    }

    reachedBackendLayer = true;

    if (!testBackendTcpConnection())
    {
      if (attempt < TELEMETRY_MAX_ATTEMPTS)
        delay(TELEMETRY_RETRY_DELAY_MS);
      continue;
    }

    WiFiClient client;
    HTTPClient http;

    Serial.print("Backend URL: ");
    Serial.println(BACKEND_TELEMETRY_URL);
    Serial.println("Posting telemetry JSON:");
    Serial.println(json);

    if (!http.begin(client, BACKEND_TELEMETRY_URL))
    {
      Serial.println("HTTP begin failed.");
      http.end();
      if (attempt < TELEMETRY_MAX_ATTEMPTS)
        delay(TELEMETRY_RETRY_DELAY_MS);
      continue;
    }

    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Accept", "application/json");
    http.addHeader("Connection", "close");
    http.addHeader("X-DEVICE-KEY", DEVICE_KEY);

    int httpResponseCode = http.POST(json);
    String responseBody = http.getString();
    http.end();

    Serial.print("HTTP response code: ");
    Serial.println(httpResponseCode);
    Serial.print("HTTP response body: ");
    Serial.println(responseBody);

    if (httpResponseCode == 200 || httpResponseCode == 201)
    {
      Serial.println("Telemetry delivered successfully.");
      ledTelemetrySuccess();
      return true;
    }

    if (attempt < TELEMETRY_MAX_ATTEMPTS)
      delay(TELEMETRY_RETRY_DELAY_MS);
  }

  Serial.println("Telemetry failed after all attempts.");
  if (reachedBackendLayer)
    ledBackendFailed();
  else
    ledWifiFailed();
  return false;
}

bool testBackendTcpConnection()
{
  Serial.print("Backend host/port: ");
  Serial.print(BACKEND_HOST);
  Serial.print(":");
  Serial.println(BACKEND_PORT);

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("TCP skipped: WiFi is not connected.");
    return false;
  }

  WiFiClient tcpClient;
  Serial.print("TCP attempt result: ");

  bool connected = tcpClient.connect(BACKEND_HOST, BACKEND_PORT);
  if (connected)
  {
    Serial.println("TCP OK");
    tcpClient.stop();
    return true;
  }

  Serial.println("TCP FAILED");
  tcpClient.stop();
  return false;
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

void blinkLed(int times, int onMs, int offMs)
{
  for (int i = 0; i < times; i++)
  {
    digitalWrite(LED_PIN, HIGH);
    delay(onMs);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1)
      delay(offMs);
  }
}

void ledWifiFailed()
{
  blinkLed(5, 100, 100);
}

void ledBackendFailed()
{
  blinkLed(3, 350, 350);
}

void ledTelemetrySuccess()
{
  blinkLed(1, 1000, 0);
}

void printWifiDetails()
{
  Serial.print("WiFi IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("WiFi RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}

float adcToVoltage(float rawAdc)
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

  unsigned long durationUs = pulseIn(ULTRASONIC_ECHO_PIN, HIGH, ULTRASONIC_TIMEOUT_US);
  if (durationUs == 0)
    return false;

  distanceCm = (durationUs * 0.0343) / 2.0;
  return true;
}

float distanceToWaterLevelPercent(float distanceCm)
{
  float level = ((TANK_EMPTY_DISTANCE_CM - distanceCm) /
                 (TANK_EMPTY_DISTANCE_CM - TANK_FULL_DISTANCE_CM)) *
                100.0;
  return constrain(level, 0.0, 100.0);
}

float readTurbidityRawAveraged()
{
  long sum = 0;
  for (int i = 0; i < TURBIDITY_SAMPLE_COUNT; i++)
  {
    sum += analogRead(TURBIDITY_PIN);
    delay(TURBIDITY_SAMPLE_DELAY_MS);
  }
  return sum / (float)TURBIDITY_SAMPLE_COUNT;
}

float estimateTurbidityNtu(float voltage)
{
  if (voltage >= TURBIDITY_CLEAR_VOLTAGE)
    return 0.0;

  if (voltage <= TURBIDITY_CLOUDY_VOLTAGE)
    return TURBIDITY_MAX_NTU;

  float ntu = ((TURBIDITY_CLEAR_VOLTAGE - voltage) /
               (TURBIDITY_CLEAR_VOLTAGE - TURBIDITY_CLOUDY_VOLTAGE)) *
              TURBIDITY_MAX_NTU;
  return constrain(ntu, 0.0, TURBIDITY_MAX_NTU);
}

float smoothTurbidityNtu(float instantNtu)
{
  if (!hasSmoothedTurbidityNtu)
  {
    smoothedTurbidityNtu = instantNtu;
    hasSmoothedTurbidityNtu = true;
    return smoothedTurbidityNtu;
  }

  smoothedTurbidityNtu = (TURBIDITY_EMA_ALPHA * instantNtu) +
                         ((1.0 - TURBIDITY_EMA_ALPHA) * smoothedTurbidityNtu);
  return smoothedTurbidityNtu;
}

const char *getTurbidityStatus(float ntu)
{
  if (ntu <= 20.0)
    return "clear";
  if (ntu <= 100.0)
    return "slightly_cloudy";
  if (ntu <= 200.0)
    return "cloudy";
  return "very_cloudy";
}

float readPhVoltageAveraged()
{
  long sum = 0;
  for (int i = 0; i < PH_SAMPLE_COUNT; i++)
  {
    sum += analogRead(PH_PIN);
    delay(PH_SAMPLE_DELAY_MS);
  }

  int averagedRaw = (int)(sum / PH_SAMPLE_COUNT);
  float voltage = adcToVoltage(averagedRaw);

#if PH_DEBUG
  Serial.println();
  Serial.println("----- pH Debug -----");
  Serial.print("  pH Raw ADC avg:    ");
  Serial.println(averagedRaw);
  Serial.print("  pH Voltage avg:    ");
  Serial.print(voltage, 3);
  Serial.println(" V");
#endif

  return voltage;
}

float calculatePh(float voltage)
{
  float slope = (4.0 - 7.0) / (PH4_VOLTAGE - PH7_VOLTAGE);
  float intercept = 7.0 - (slope * PH7_VOLTAGE);
  float phUnclamped = (slope * voltage) + intercept;
  float phFinal = constrain(phUnclamped, 0.0, 14.0);

#if PH_DEBUG
  Serial.println("  pH Mode:           2-point calibrated");
  Serial.print("  pH7_V:             ");
  Serial.println(PH7_VOLTAGE, 3);
  Serial.print("  pH4_V:             ");
  Serial.println(PH4_VOLTAGE, 3);
  Serial.print("  pH slope:          ");
  Serial.println(slope, 4);
  Serial.print("  pH unclamped:      ");
  Serial.println(phUnclamped, 3);
  Serial.print("  pH Final sent:     ");
  Serial.println(phFinal, 2);
  Serial.println("--------------------");
#endif

  return phFinal;
}
