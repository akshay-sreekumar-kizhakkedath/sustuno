/*
 * ============================================================
 *  SUSTUNO - Textile Dyeing Wastewater IoT Monitor
 *  ESP32 Firmware v1.0.0
 * ============================================================
 *
 *  Target Board : ESP32 Dev Module
 *  Arduino Core : ESP32 Arduino Core 3.3.11
 *  IDE          : Arduino IDE
 *
 *  Architecture:
 *    ESP32 senses → validates → transmits → Backend → AI/ML
 *    The ESP32 does NOT run AI models.
 *
 *  Hardware:
 *    pH probe      → PH-4502C module → 22k/10k divider → GPIO34
 *    TDS sensor    → TDS Meter V1.0  → GPIO35 (direct)
 *    Turbidity     → Module output   → 22k/10k divider → GPIO32
 *    Temperature   → DS18B20         → GPIO4 + 4.7kΩ pull-up
 *    Flow sensor   → ZJ-S201         → voltage divider → GPIO27
 *
 *  Required Libraries (install via Arduino Library Manager):
 *    - OneWire            (by Paul Stoffregen)
 *    - DallasTemperature  (by Miles Burton)
 *    - ArduinoJson        (by Benoit Blanchon, v7.x)
 * ============================================================
 */

/* ========================== INCLUDES ========================= */
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <time.h>

/* ====================== PIN DEFINITIONS ====================== */
/*
 *  GPIO34: pH analog input (ADC1_CH6, input-only)
 *  GPIO35: TDS analog input (ADC1_CH7, input-only)
 *  GPIO32: Turbidity analog input (ADC1_CH4, input-only)
 *  GPIO4 : DS18B20 data line (digital, with 4.7kΩ pull-up to 3.3V)
 *  GPIO27: Flow sensor pulse input (digital interrupt)
 *
 *  ⚠️  GPIO34/35/32 are INPUT-ONLY pins. They have no internal
 *      pull-up/pull-down. This is fine for analog reading.
 *
 *  ⚠️  None of these pins conflict with WiFi. ADC1 (GPIO32-39)
 *      does NOT conflict with WiFi on ESP32. ADC2 does, but we
 *      do not use ADC2 for analog reading.
 */
#define PIN_PH          34
#define PIN_TDS         35
#define PIN_TURBIDITY   32
#define PIN_TEMP        4
#define PIN_FLOW        27
#define PIN_LED         2   // Built-in LED for status indication

/* =================== CALIBRATION PARAMETERS ================= */
/*
 *  These are DEFAULT/PLACEHOLDER values. They MUST be updated
 *  after proper calibration with known reference solutions.
 *
 *  Do NOT assume these produce accurate readings without
 *  performing the calibration procedure documented below.
 *
 *  CALIBRATION STATUS:
 *    pH        → UNCALIBRATED (probe needs 3N KCl activation +
 *                buffer calibration)
 *    TDS       → DEFAULT factor (K=0.5 from common TDS Meter
 *                V1.0 application note)
 *    Turbidity → UNCALIBRATED (no reference standards available)
 *    Flow      → DEFAULT factor (450 pulses/L from common
 *                ZJ-S201 spec — VERIFY with your unit)
 *    Temp      → Factory-calibrated (DS18B20 ±0.5°C)
 */
struct CalibrationConfig {
    /* pH: Two-point calibration
     *   pH = phSlope × V_probe + phOffset
     *
     *   With PH-4502C at pH 7.0 buffer: V_probe ≈ 2.50V
     *   With PH-4502C at pH 4.0 buffer: V_probe ≈ 2.68V
     *   Slope ≈ (4.0 - 7.0) / (2.68 - 2.50) = -16.67
     *   Offset ≈ 7.0 - (-16.67 × 2.50) = 48.68
     *
     *   ⚠️  These defaults assume ~59mV/pH at 25°C with the
     *       specific PH-4502C module. Actual values WILL vary.
     */
    float phSlope;          // pH per volt at probe output
    float phOffset;         // pH intercept
    bool  phCalibrated;     // Set true after calibration

    /* TDS: TDS (ppm) = K × EC (µS/cm)
     *   K = 0.5 is the standard conversion factor for NaCl
     *   solutions at 25°C (from TDS Meter V1.0 app note).
     *   The TDS calculation uses a 3rd-order polynomial
     *   voltage-to-EC conversion with temperature compensation.
     */
    float tdsK;             // Conversion constant (default 0.5)

    /* Turbidity: No universal formula exists.
     *   We store raw voltage and optionally apply a linear
     *   calibration if standards are available.
     *   Set turbCalibrated = true only after calibration.
     */
    float turbSlope;        // NTU per volt (after divider)
    float turbOffset;       // NTU intercept
    bool  turbCalibrated;

    /* Flow: pulses per liter
     *   ZJ-S201 specification: F(Hz) = 7.5 × Q(L/min)
     *   This means 450 pulses per liter.
     *
     *   ⚠️  VERIFY THIS VALUE with your specific sensor.
     *       Calibration procedure: run exactly 1 liter through
     *       the sensor and count total pulses.
     */
    float pulsesPerLiter;   // Pulses per liter of volume
};

CalibrationConfig cal = {
    .phSlope       = -16.67,
    .phOffset      = 48.68,
    .phCalibrated  = false,
    .tdsK          = 0.5,
    .turbSlope     = 1.0,
    .turbOffset    = 0.0,
    .turbCalibrated = false,
    .pulsesPerLiter = 450.0,
};

/* ==================== WIFI CONFIGURATION ===================== */
/*
 *  Enter your WiFi credentials below.
 *  The ESP32 will continue reading sensors even if WiFi fails.
 */
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
#define WIFI_TIMEOUT_MS   15000   // Give up after 15 seconds
#define WIFI_RETRY_MS     30000   // Retry WiFi every 30 seconds

/* ================== BACKEND CONFIGURATION ==================== */
/*
 *  The ESP32 sends JSON data via HTTP POST to your SUSTUNO
 *  backend. Configure the endpoint URL and API key below.
 *
 *  Expected backend endpoint:  POST /api/iot/readings
 *  The backend should store readings in Supabase tables:
 *    - sensor_telemetry (time-series data)
 *    - iot_sensors      (sensor registry)
 *    - gateway_status   (device health)
 *    - iot_alerts       (threshold alerts)
 */
const char* BACKEND_URL  = "http://YOUR_BACKEND_IP:5000/api/iot/readings";
const char* API_KEY       = "YOUR_API_KEY";
const char* DEVICE_ID     = "SUSTUNO-ESP32-001";
const char* PLANT_ID      = "PLANT-001";
const char* BATCH_ID      = "BATCH-001";

/* ==================== TASK TIMING (ms) ====================== */
/*
 *  Non-blocking scheduler intervals.
 *  All timing uses millis() — no delay() in the main loop.
 */
#define TASK_FAST_SENSOR_MS     200     // ADC sampling: 5 Hz
#define TASK_TEMPERATURE_MS     2000    // DS18B20: needs ~750ms for 12-bit
#define TASK_FLOW_MS            1000    // Flow calculation: 1 Hz
#define TASK_HEALTH_MS          5000    // Sensor health check
#define TASK_TRANSMIT_MS        5000    // Backend POST: every 5 seconds
#define TASK_DASHBOARD_MS       1000    // Serial monitor refresh
#define TASK_NTP_MS             3600000 // NTP resync: every hour

/* ==================== ADC CONFIGURATION ===================== */
/*
 *  ESP32 ADC: 12-bit (0-4095), 11dB attenuation → 0-3.3V range.
 *
 *  ⚠️  ESP32 ADC is non-linear, especially at extremes.
 *      Best accuracy is in the 0.1V–3.0V range.
 *      Below ~0.1V and above ~3.1V, readings become unreliable.
 *
 *  ⚠️  The ADC has noise. We use median filtering with
 *      multiple samples to reduce measurement error.
 */
#define ADC_SAMPLES         10      // Samples per reading
#define ADC_VREF            3.3     // ADC reference voltage
#define ADC_MAX_COUNT       4095    // 12-bit maximum
#define ADC_TO_VOLTAGE(c)   ((float)(c) * ADC_VREF / (float)ADC_MAX_COUNT)

/*
 *  Voltage divider ratio for pH and Turbidity sensors.
 *
 *  Wiring:  Sensor Po → 22kΩ → junction → 10kΩ → GND
 *           GPIO reads junction voltage.
 *
 *  Divider formula:
 *    V_gpio = V_sensor × R_bottom / (R_top + R_bottom)
 *    V_gpio = V_sensor × 10000 / (22000 + 10000)
 *    V_gpio = V_sensor × 0.3125
 *
 *  To recover the original sensor voltage:
 *    V_sensor = V_gpio × (R_top + R_bottom) / R_bottom
 *    V_sensor = V_gpio × 32000 / 10000
 *    V_sensor = V_gpio × 3.2
 *
 *  Example: pH probe outputs 2.5V at pH 7.0
 *    V_gpio = 2.5 × 0.3125 = 0.781V → ADC count ≈ 968
 *    This is within the safe range for ESP32 GPIO.
 */
#define DIVIDER_RATIO       3.2     // (22k + 10k) / 10k

/* ============== SENSOR HEALTH THRESHOLDS ==================== */
/*
 *  Used to detect disconnected, saturated, or out-of-range
 *  sensors. These are based on typical operating ranges.
 */
#define PH_VMIN             0.1f    // Below this = likely disconnected
#define PH_VMAX             3.2f    // Above this = saturated / fault
#define TDS_VMIN            0.0f    // Minimum ADC voltage
#define TDS_VMAX            2.3f    // Max module output voltage
#define TEMP_MIN            -10.0f  // Unrealistic low
#define TEMP_MAX            80.0f   // Unrealistic high
#define NO_FLOW_TIMEOUT_MS  10000   // No pulses for 10s = no flow

/* ====================== DATA TYPES ========================== */

/* Individual sensor reading with metadata */
struct SensorReading {
    float     rawADC;         // Raw ADC count (0-4095)
    float     voltageGPIO;    // Voltage at GPIO pin (0-3.3V)
    float     voltageProbe;   // Reconstructed sensor voltage
    float     value;          // Calibrated engineering value
    bool      valid;          // Is reading within expected range
    const char* status;       // "OK", "WARNING", "ERROR", "UNCALIBRATED"
};

/* Complete sensor data package */
struct SensorData {
    SensorReading ph;
    SensorReading tds;
    SensorReading turbidity;
    float         temperatureC;
    bool          tempValid;
    const char*   tempStatus;
    float         flowLPM;
    float         totalLiters;
    bool          flowValid;
    const char*   flowStatus;
};

/* ==================== GLOBAL VARIABLES ====================== */

/* Sensor objects */
OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

/* Filtered ADC values (updated at TASK_FAST_SENSOR_MS rate) */
float filteredPH_GPIO   = 0.0f;
float filteredTDS_GPIO  = 0.0f;
float filteredTurb_GPIO = 0.0f;

/* Temperature (updated less frequently due to conversion time) */
float lastTemperature    = -999.0f;
bool  tempConnected      = false;

/* Flow measurement */
volatile unsigned long flowPulseCount = 0;
portMUX_TYPE flowMux = portMUX_INITIALIZER_UNLOCKED;
unsigned long totalFlowPulses    = 0;
unsigned long lastFlowCalcTime   = 0;
float         currentFlowLPM     = 0.0f;
float         currentTotalLiters = 0.0f;
unsigned long lastPulseCount     = 0;

/* WiFi and connectivity */
bool wifiConnected       = false;
bool backendConnected    = false;
unsigned long lastWifiAttempt = 0;
unsigned long lastBackendAttempt = 0;
int  backendFailCount    = 0;

/* Task scheduler */
unsigned long lastFastSensor  = 0;
unsigned long lastTemperature = 0;
unsigned long lastFlow        = 0;
unsigned long lastHealth      = 0;
unsigned long lastTransmit    = 0;
unsigned long lastDashboard   = 0;
unsigned long lastNTP         = 0;

/* System */
unsigned long bootTime     = 0;
SensorData   currentData;

/* ADC sample buffer (reused across readings) */
uint16_t adcSampleBuf[ADC_SAMPLES];

/* ====================== ISR ================================= */
/*
 *  Flow sensor interrupt service routine.
 *  Runs in IRAM for fast response. Uses critical section
 *  to safely increment the pulse counter.
 *
 *  ⚠️  GPIO27 requires a voltage divider for the ZJ-S201:
 *      Yellow wire → 10kΩ → GPIO27 → 15kΩ → GND
 *      This gives: Vgpio = 5V × 15/(10+15) = 3.0V (safe)
 *
 *  If you use only a 10kΩ series resistor, the ESP32's
 *  internal ESD diodes will clamp the 5V to ~3.3V. This
 *  works but is not recommended for long-term reliability.
 */
void IRAM_ATTR flowISR() {
    portENTER_CRITICAL_ISR(&flowMux);
    flowPulseCount++;
    portEXIT_CRITICAL_ISR(&flowMux);
}

/* ============== ADC FILTERING =============================== */
/*
 *  Reads ADC_SAMPLES values and returns the median.
 *  Median filter rejects outlier spikes better than a simple
 *  average, while still smoothing noise.
 *
 *  200µs settling time between samples allows the ADC
 *  sample-and-hold circuit to stabilize.
 */
float readADCFiltered(uint8_t pin) {
    for (int i = 0; i < ADC_SAMPLES; i++) {
        adcSampleBuf[i] = analogRead(pin);
        delayMicroseconds(200);
    }

    /* Insertion sort (efficient for small arrays) */
    for (int i = 1; i < ADC_SAMPLES; i++) {
        uint16_t key = adcSampleBuf[i];
        int j = i - 1;
        while (j >= 0 && adcSampleBuf[j] > key) {
            adcSampleBuf[j + 1] = adcSampleBuf[j];
            j--;
        }
        adcSampleBuf[j + 1] = key;
    }

    /* Median: average of two middle values for even count */
    int mid = ADC_SAMPLES / 2;
    return (adcSampleBuf[mid - 1] + adcSampleBuf[mid]) / 2.0f;
}

/* ==================== SENSOR: pH ============================ */
/*
 *  Reads pH through the voltage divider on GPIO34.
 *
 *  Hardware:
 *    PH-4502C Po → 22kΩ → GPIO34 → 10kΩ → GND
 *
 *  The probe voltage is reconstructed from the GPIO voltage:
 *    V_probe = V_gpio × DIVIDER_RATIO (3.2)
 *
 *  pH is calculated using two-point calibration:
 *    pH = phSlope × V_probe + phOffset
 *
 *  Default calibration (assumes ~59mV/pH at 25°C):
 *    At pH 7.0 buffer: V_probe ≈ 2.50V
 *    At pH 4.0 buffer: V_probe ≈ 2.68V
 *    slope  = (4.0 - 7.0) / (2.68 - 2.50) = -16.67
 *    offset = 7.0 - (-16.67 × 2.50) = 48.68
 *
 *  ⚠️  These defaults are PLACEHOLDERS. Actual module output
 *      varies between units. Calibrate with buffer solutions.
 *
 *  ⚠️  The pH probe has NOT been activated yet (awaiting 3N KCl).
 *      All pH readings are marked UNCALIBRATED until the probe
 *      is properly activated AND calibrated.
 */
SensorReading readPH() {
    SensorReading r;
    r.rawADC    = readADCFiltered(PIN_PH);
    r.voltageGPIO = ADC_TO_VOLTAGE(r.rawADC);
    r.voltageProbe = r.voltageGPIO * DIVIDER_RATIO;

    /* Detect fault conditions */
    if (r.rawADC <= 1.0f) {
        /* GPIO voltage near zero: sensor disconnected or Po not connected */
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "DISCONNECTED";
        return r;
    }
    if (r.rawADC >= 4090.0f) {
        /* ADC saturated: wiring fault or excessive voltage */
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "SATURATED";
        return r;
    }
    if (r.voltageProbe < PH_VMIN || r.voltageProbe > PH_VMAX) {
        /* Probe voltage outside expected range */
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "OUT_OF_RANGE";
        return r;
    }

    /* Apply calibration */
    if (cal.phCalibrated) {
        r.value  = cal.phSlope * r.voltageProbe + cal.phOffset;
        r.valid  = (r.value >= 0.0f && r.value <= 14.0f);
        r.status = r.valid ? "OK" : "OUT_OF_RANGE";
    } else {
        /* Show approximate value but mark as uncalibrated */
        r.value  = cal.phSlope * r.voltageProbe + cal.phOffset;
        r.valid  = true;
        r.status = "UNCALIBRATED";
    }
    return r;
}

/* ==================== SENSOR: TDS =========================== */
/*
 *  Reads TDS through the analog output on GPIO35.
 *
 *  Hardware:
 *    TDS Meter V1.0: A → GPIO35 (direct connection)
 *    The module outputs 0–2.3V, safe for ESP32 ADC.
 *    No voltage divider needed.
 *
 *  TDS Calculation (from DFRobot/Gravity TDS application note):
 *
 *    Step 1: ADC voltage
 *      V = ADC_count × 3.3 / 4095
 *
 *    Step 2: Temperature compensation
 *      compensationFactor = 1.0 + 0.02 × (temperature - 25.0)
 *      compensatedV = V / compensationFactor
 *
 *    Step 3: TDS polynomial
 *      TDS (ppm) = 133.42 × V³ - 255.86 × V² + 857.39 × V
 *
 *    This polynomial maps voltage to conductivity (EC) in µS/cm,
 *    then converts to TDS using K = 0.5 (NaCl equivalent).
 *
 *  ⚠️  This formula is from the TDS Meter V1.0 application
 *      note. It is NOT laboratory-grade. For reference only.
 *
 *  ⚠️  If temperature is unavailable, compensation defaults
 *      to 25°C (factor = 1.0).
 */
SensorReading readTDS() {
    SensorReading r;
    r.rawADC      = readADCFiltered(PIN_TDS);
    r.voltageGPIO = ADC_TO_VOLTAGE(r.rawADC);
    r.voltageProbe = r.voltageGPIO;  /* Direct connection, no divider */

    /* Validate reading range */
    if (r.voltageGPIO < TDS_VMIN || r.voltageGPIO > TDS_VMAX) {
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "OUT_OF_RANGE";
        return r;
    }

    /* Temperature compensation */
    float tempC = tempConnected ? lastTemperature : 25.0f;
    float compFactor = 1.0f + 0.02f * (tempC - 25.0f);
    float compV = r.voltageGPIO / compFactor;

    /* TDS polynomial (from application note) */
    float tds = 133.42f * compV * compV * compV
              - 255.86f * compV * compV
              + 857.39f * compV;

    /* Clamp negative results (can happen at very low voltages) */
    if (tds < 0.0f) tds = 0.0f;

    r.value  = tds;
    r.valid  = true;
    r.status = "OK";
    return r;
}

/* ================== SENSOR: TURBIDITY ====================== */
/*
 *  Reads turbidity through the voltage divider on GPIO32.
 *
 *  Hardware:
 *    Module Signal → 22kΩ → GPIO32 → 10kΩ → GND
 *
 *  The signal voltage is reconstructed:
 *    V_signal = V_gpio × DIVIDER_RATIO (3.2)
 *
 *  ⚠️  There is NO universal formula converting voltage to NTU.
 *      Different turbidity sensor modules have different
 *      voltage-to-NTU curves. Applying a wrong formula will
 *      produce MEANINGLESS data.
 *
 *  APPROACH:
 *    - Always report raw_voltage and probe_voltage
 *    - If turbCalibrated == true: apply linear calibration
 *      (value = slope × V_signal + offset)
 *    - If turbCalibrated == false: report UNCALIBRATED
 *      with raw voltage only
 *
 *  To calibrate:
 *    1. Measure voltage in clean water (0 NTU reference)
 *    2. Measure voltage in turbidity standard (e.g., 100 NTU)
 *    3. Calculate slope and offset from the two points
 *    4. Set cal.turbSlope, cal.turbOffset, cal.turbCalibrated
 */
SensorReading readTurbidity() {
    SensorReading r;
    r.rawADC      = readADCFiltered(PIN_TURBIDITY);
    r.voltageGPIO = ADC_TO_VOLTAGE(r.rawADC);
    r.voltageProbe = r.voltageGPIO * DIVIDER_RATIO;

    /* Fault detection */
    if (r.rawADC <= 1.0f) {
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "DISCONNECTED";
        return r;
    }
    if (r.rawADC >= 4090.0f) {
        r.value  = 0.0f;
        r.valid  = false;
        r.status = "SATURATED";
        return r;
    }

    /* Apply calibration if available */
    if (cal.turbCalibrated) {
        r.value  = cal.turbSlope * r.voltageProbe + cal.turbOffset;
        r.valid  = (r.value >= 0.0f);
        r.status = r.valid ? "OK" : "OUT_OF_RANGE";
    } else {
        r.value  = 0.0f;
        r.valid  = true;
        r.status = "UNCALIBRATED";
    }
    return r;
}

/* ================== SENSOR: TEMPERATURE ==================== */
/*
 *  Reads DS18B20 waterproof digital temperature sensor.
 *
 *  Hardware:
 *    VCC → 3.3V, GND → GND, DATA → GPIO4
 *    4.7kΩ pull-up resistor between DATA and 3.3V
 *
 *  Library: DallasTemperature
 *  Resolution: 12-bit (0.0625°C, ~750ms conversion time)
 *
 *  Validation:
 *    - DEVICE_DISCONNECTED_C (-127): sensor not on bus
 *    - Out of range: < -10°C or > 80°C
 *    - CRC error: returned by library as DEVICE_DISCONNECTED_C
 *
 *  ⚠️  This sensor has been tested and produces 26.75–26.81°C
 *      in ambient conditions. It is considered calibrated.
 */
void readTemperature() {
    tempSensor.requestTemperatures();
    /*
     *  Wait for conversion to complete.
     *  At 12-bit resolution, DS18B20 needs up to 750ms.
     *  We use a 2-second task interval, so the conversion is
     *  always complete by the next read.
     */
    delay(10);

    float t = tempSensor.getTempCByIndex(0);

    if (t == DEVICE_DISCONNECTED_C) {
        lastTemperature = -999.0f;
        tempConnected   = false;
        return;
    }

    /* Sanity check */
    if (t < TEMP_MIN || t > TEMP_MAX) {
        lastTemperature = -999.0f;
        tempConnected   = false;
        return;
    }

    lastTemperature = t;
    tempConnected   = true;
}

/* ==================== FLOW CALCULATION ====================== */
/*
 *  Reads the ZJ-S201 hall-effect flow sensor via pulse counting.
 *
 *  Hardware:
 *    VCC → 5V, GND → GND, Signal → voltage divider → GPIO27
 *
 *  ⚠️  CRITICAL SAFETY NOTE:
 *      The ZJ-S201 outputs 5V logic pulses when powered from 5V.
 *      ESP32 GPIO27 is NOT5T-tolerant. You MUST use a voltage
 *      divider:
 *        Signal → 10kΩ → GPIO27 → 15kΩ → GND
 *        Vgpio = 5V × 15k/(10k+15k) = 3.0V (safe)
 *
 *      Alternative: Signal → 10kΩ → GPIO27 only.
 *      The ESP32's internal ESD diodes clamp to ~3.3V.
 *      Current = (5V-3.3V)/10kΩ = 0.17mA (safe but not ideal).
 *
 *  Calibration:
 *    The ZJ-S201 specification states:
 *      F(Hz) = 7.5 × Q(L/min)
 *    This implies 450 pulses per liter.
 *    ⚠️  VERIFY THIS with your specific unit by measuring
 *        exactly 1 liter of water and counting pulses.
 *
 *  Calculation:
 *    frequency = pulse_count / elapsed_seconds
 *    flow_lpm  = frequency × 60 / pulses_per_liter
 *    total_L   = total_pulse_count / pulses_per_liter
 *
 *  No-flow detection:
 *    If no pulses detected for NO_FLOW_TIMEOUT_MS,
 *    flow is reported as 0.0 L/min.
 */
void initFlowSensor() {
    pinMode(PIN_FLOW, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_FLOW), flowISR, RISING);
    lastFlowCalcTime = millis();
}

unsigned long readAndResetPulses() {
    portENTER_CRITICAL(&flowMux);
    unsigned long count = flowPulseCount;
    flowPulseCount = 0;
    portEXIT_CRITICAL(&flowMux);
    return count;
}

void calculateFlow() {
    unsigned long now = millis();
    unsigned long elapsed = now - lastFlowCalcTime;

    /* Only recalculate every ~1 second */
    if (elapsed < 900) return;

    unsigned long pulses = readAndResetPulses();
    totalFlowPulses += pulses;

    float seconds = elapsed / 1000.0f;
    float frequency = pulses / seconds;

    /* flow_lpm = (freq_Hz × 60) / pulses_per_liter */
    currentFlowLPM = (frequency * 60.0f) / cal.pulsesPerLiter;
    currentTotalLiters = (float)totalFlowPulses / cal.pulsesPerLiter;

    /* No-flow detection */
    if (pulses == 0 && elapsed > NO_FLOW_TIMEOUT_MS) {
        currentFlowLPM = 0.0f;
    }

    lastFlowCalcTime = now;
}

/* ================ SENSOR HEALTH CHECK ====================== */
/*
 *  Evaluates the health of each sensor and returns an
 *  overall system health status.
 *
 *  Possible per-sensor states:
 *    "OK"            - Reading is valid and within range
 *    "UNCALIBRATED"  - Sensor works but not calibrated
 *    "WARNING"       - Reading is marginal
 *    "ERROR"         - Sensor disconnected or saturated
 *    "DISCONNECTED"  - No response from sensor
 */
const char* evaluateSensorHealth(SensorReading r, const char* okMsg) {
    if (!r.valid) return r.status;
    return okMsg;
}

const char* getSystemHealth() {
    int okCount = 0;
    int totalCount = 5;

    if (currentData.ph.valid)       okCount++;
    if (currentData.tds.valid)      okCount++;
    if (currentData.turbidity.valid) okCount++;
    if (currentData.tempValid)      okCount++;
    if (currentData.flowValid)      okCount++;

    if (okCount == totalCount) return "ALL_OK";
    if (okCount >= 3) return "MOSTLY_OK";
    if (okCount >= 1) return "DEGRADED";
    return "CRITICAL";
}

void updateSensorHealth() {
    currentData.ph            = readPH();
    currentData.tds           = readTDS();
    currentData.turbidity     = readTurbidity();
    currentData.temperatureC  = lastTemperature;
    currentData.tempValid     = tempConnected;
    currentData.tempStatus    = tempConnected ? "OK" : "DISCONNECTED";
    currentData.flowLPM       = currentFlowLPM;
    currentData.totalLiters   = currentTotalLiters;
    currentData.flowValid     = true;
    currentData.flowStatus    = "OK";
}

/* =================== WIFI MANAGEMENT ======================= */
/*
 *  Connects to WiFi with timeout and auto-reconnection.
 *  The ESP32 continues reading sensors even without WiFi.
 */
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        return;
    }

    Serial.printf("[WIFI] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
        delay(250);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.printf("\n[WIFI] Connected! IP: %s  RSSI: %d dBm\n",
                      WiFi.localIP().toString().c_str(), WiFi.RSSI());
        syncNTPTime();
    } else {
        wifiConnected = false;
        Serial.println("\n[WIFI] Connection failed. Sensors continue reading.");
    }
}

void checkWiFiReconnect() {
    unsigned long now = millis();
    if (!wifiConnected && (now - lastWifiAttempt >= WIFI_RETRY_MS)) {
        lastWifiAttempt = now;
        connectWiFi();
    }
    if (wifiConnected && WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        Serial.println("[WIFI] Lost connection.");
    }
}

/* =================== NTP TIME SYNC ========================= */
/*
 *  Syncs time via NTP for timestamping sensor data.
 *  Uses UTC (no timezone offset).
 *  If NTP fails, timestamps will show the epoch start.
 */
void syncNTPTime() {
    if (!wifiConnected) return;

    Serial.print("[NTP]  Syncing time... ");
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");

    struct tm timeinfo;
    int retries = 0;
    while (!getLocalTime(&timeinfo) && retries < 20) {
        delay(250);
        retries++;
    }

    if (retries < 20) {
        Serial.println("OK");
    } else {
        Serial.println("FAILED (will retry)");
    }
}

String getTimestamp() {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
        return "1970-01-01T00:00:00Z";
    }
    char buf[32];
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
    return String(buf);
}

/* ============= BACKEND COMMUNICATION ======================= */
/*
 *  Sends sensor data to the SUSTUNO backend via HTTP POST.
 *
 *  Expected endpoint: POST /api/iot/readings
 *  Headers:
 *    Content-Type: application/json
 *    X-API-Key: <API_KEY>
 *
 *  The backend stores this in Supabase tables:
 *    sensor_telemetry, iot_sensors, gateway_status, iot_alerts
 *
 *  Error handling:
 *    - If HTTP fails: log error, increment fail counter
 *    - If WiFi is down: skip transmission entirely
 *    - Sensor acquisition NEVER stops due to comm failures
 *    - Failed readings are queued for retry
 */
void sendDataToBackend() {
    if (!wifiConnected) {
        Serial.println("[TX]   Skipping — WiFi not connected");
        return;
    }

    /* Build JSON payload */
    StaticJsonDocument<1024> doc;

    doc["device_id"]  = DEVICE_ID;
    doc["plant_id"]   = PLANT_ID;
    doc["batch_id"]   = BATCH_ID;
    doc["timestamp"]  = getTimestamp();

    /* pH sensor */
    JsonObject phObj = doc["sensors"]["ph"].to<JsonObject>();
    if (currentData.ph.valid) {
        phObj["value"] = serialized(String(currentData.ph.value, 2));
    } else {
        phObj["value"] = nullptr;
    }
    phObj["raw_voltage"] = serialized(String(currentData.ph.voltageGPIO, 3));
    phObj["probe_voltage"] = serialized(String(currentData.ph.voltageProbe, 3));
    phObj["status"] = currentData.ph.status;

    /* TDS sensor */
    JsonObject tdsObj = doc["sensors"]["tds_ppm"].to<JsonObject>();
    tdsObj["value"] = serialized(String(currentData.tds.value, 1));
    tdsObj["raw_voltage"] = serialized(String(currentData.tds.voltageGPIO, 3));
    tdsObj["status"] = currentData.tds.status;

    /* Turbidity sensor */
    JsonObject turbObj = doc["sensors"]["turbidity_ntu"].to<JsonObject>();
    if (currentData.turbidity.valid && cal.turbCalibrated) {
        turbObj["value"] = serialized(String(currentData.turbidity.value, 1));
    } else {
        turbObj["value"] = nullptr;
    }
    turbObj["raw_voltage"] = serialized(String(currentData.turbidity.voltageGPIO, 3));
    turbObj["probe_voltage"] = serialized(String(currentData.turbidity.voltageProbe, 3));
    turbObj["status"] = currentData.turbidity.status;

    /* Temperature sensor */
    JsonObject tempObj = doc["sensors"]["temperature_c"].to<JsonObject>();
    if (currentData.tempValid) {
        tempObj["value"] = serialized(String(currentData.temperatureC, 2));
    } else {
        tempObj["value"] = nullptr;
    }
    tempObj["status"] = currentData.tempStatus;

    /* Flow sensor */
    JsonObject flowObj = doc["sensors"]["flow_lpm"].to<JsonObject>();
    flowObj["value"] = serialized(String(currentData.flowLPM, 2));
    flowObj["total_liters"] = serialized(String(currentData.totalLiters, 2));
    flowObj["status"] = currentData.flowStatus;

    /* Device info */
    JsonObject info = doc["device_info"].to<JsonObject>();
    info["firmware"] = "1.0.0";
    info["uptime_s"] = (millis() - bootTime) / 1000;
    info["wifi_rssi_dbm"] = WiFi.RSSI();
    info["free_heap_bytes"] = ESP.getFreeHeap();
    info["health"] = getSystemHealth();

    /* Serialize */
    char payload[1024];
    serializeJson(doc, payload, sizeof(payload));

    /* Send HTTP POST */
    HTTPClient http;
    http.begin(BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", API_KEY);
    http.setTimeout(5000);  // 5 second timeout

    int httpCode = http.POST(payload);

    if (httpCode > 0) {
        if (httpCode >= 200 && httpCode < 300) {
            Serial.printf("[TX]   OK (%d)\n", httpCode);
            backendConnected = true;
            backendFailCount = 0;
        } else {
            Serial.printf("[TX]   Backend returned %d\n", httpCode);
            backendConnected = false;
            backendFailCount++;
        }
    } else {
        Serial.printf("[TX]   FAILED: %s\n", http.errorToString(httpCode).c_str());
        backendConnected = false;
        backendFailCount++;
    }

    http.end();
}

/* ============== SERIAL MONITOR DASHBOARD =================== */
/*
 *  Prints a formatted diagnostic dashboard every ~1 second.
 *  Designed to be readable without excessive scrolling.
 */
void printDashboard() {
    unsigned long uptime = (millis() - bootTime) / 1000;
    unsigned long h = uptime / 3600;
    unsigned long m = (uptime % 3600) / 60;
    unsigned long s = uptime % 60;

    Serial.println("========================================");
    Serial.println("  SUSTUNO IoT Monitor v1.0.0");
    Serial.println("========================================");

    /* Temperature */
    if (tempConnected) {
        Serial.printf("  Temp    : %.2f C              [OK]\n", lastTemperature);
    } else {
        Serial.println("  Temp    : ---            [DISCONNECTED]");
    }

    /* pH */
    Serial.printf("  pH      : %.3fV (probe: %.3fV)\n",
                  currentData.ph.voltageGPIO, currentData.ph.voltageProbe);
    Serial.printf("          : %.2f            [%s]\n",
                  currentData.ph.value, currentData.ph.status);

    /* TDS */
    Serial.printf("  TDS     : %.1f ppm             [%s]\n",
                  currentData.tds.value, currentData.tds.status);

    /* Turbidity */
    Serial.printf("  Turb    : %.3fV\n", currentData.turbidity.voltageGPIO);
    if (cal.turbCalibrated) {
        Serial.printf("          : %.1f NTU         [%s]\n",
                      currentData.turbidity.value, currentData.turbidity.status);
    } else {
        Serial.printf("          : (no NTU)        [%s]\n", currentData.turbidity.status);
    }

    /* Flow */
    Serial.printf("  Flow    : %.2f L/min  (Total: %.1f L) [%s]\n",
                  currentData.flowLPM, currentData.totalLiters, currentData.flowStatus);

    Serial.println("----------------------------------------");

    /* Connectivity */
    Serial.printf("  WiFi    : %s", wifiConnected ? "CONNECTED" : "DISCONNECTED");
    if (wifiConnected) {
        Serial.printf(" (%d dBm)", WiFi.RSSI());
    }
    Serial.println();

    Serial.printf("  Backend : %s", backendConnected ? "CONNECTED" : "OFFLINE");
    if (backendFailCount > 0) {
        Serial.printf(" (failures: %d)", backendFailCount);
    }
    Serial.println();

    Serial.printf("  Uptime  : %02lu:%02lu:%02lu\n", h, m, s);
    Serial.printf("  Free RAM: %lu bytes\n", ESP.getFreeHeap());
    Serial.printf("  Health  : %s\n", getSystemHealth());
    Serial.println("========================================");
}

/* ======================= SETUP ============================== */
void setup() {
    Serial.begin(115200);
    delay(500);

    bootTime = millis();

    Serial.println();
    Serial.println("  ╔══════════════════════════════════════╗");
    Serial.println("  ║  SUSTUNO ESP32 IoT Gateway v1.0.0   ║");
    Serial.println("  ║  Textile Dyeing Wastewater Monitor  ║");
    Serial.println("  ╚══════════════════════════════════════╝");
    Serial.println();

    /* Configure ADC */
    analogSetAttenuation(ADC_11db);   // 0-3.3V range
    analogReadResolution(12);          // 12-bit (0-4095)
    analogSetCyclesPerSample(8);       // Default ADC cycles

    /* Initialize status LED */
    pinMode(PIN_LED, OUTPUT);
    digitalWrite(PIN_LED, HIGH);
    delay(200);
    digitalWrite(PIN_LED, LOW);

    /* Initialize temperature sensor */
    Serial.print("[TEMP]  Initializing DS18B20... ");
    tempSensor.begin();
    tempSensor.setResolution(12);
    tempSensor.setWaitForConversion(false);
    int deviceCount = tempSensor.getDeviceCount();
    Serial.printf("found %d device(s)\n", deviceCount);

    if (deviceCount == 0) {
        Serial.println("[TEMP]  WARNING: No DS18B20 detected on GPIO4!");
        Serial.println("[TEMP]  Check wiring: VCC→3.3V, GND→GND, DATA→GPIO4");
        Serial.println("[TEMP]  Ensure 4.7kΩ pull-up between DATA and 3.3V");
    }

    /* Initialize flow sensor */
    Serial.print("[FLOW] Initializing pulse counter on GPIO");
    Serial.print(PIN_FLOW);
    Serial.println("...");
    initFlowSensor();

    /* Connect WiFi */
    Serial.println();
    connectWiFi();

    /* Read initial temperature */
    readTemperature();

    Serial.println();
    Serial.println("[SYS]   Setup complete. Starting main loop.");
    Serial.println();
}

/* ======================== LOOP ============================== */
/*
 *  Main loop — non-blocking task scheduler.
 *
 *  All tasks use millis() timing. No delay() calls.
 *  Sensor reading NEVER depends on WiFi or backend.
 *  If communication fails, sensors keep reading.
 */
void loop() {
    unsigned long now = millis();

    /* WiFi reconnection check (every 30 seconds when disconnected) */
    checkWiFiReconnect();

    /* Task 1: Fast sensor sampling (every 200ms → 5 Hz) */
    if (now - lastFastSensor >= TASK_FAST_SENSOR_MS) {
        lastFastSensor = now;
        filteredPH_GPIO   = readADCFiltered(PIN_PH);
        filteredTDS_GPIO  = readADCFiltered(PIN_TDS);
        filteredTurb_GPIO = readADCFiltered(PIN_TURBIDITY);
    }

    /* Task 2: Temperature update (every 2 seconds) */
    if (now - lastTemperature >= TASK_TEMPERATURE_MS) {
        lastTemperature = now;
        readTemperature();
    }

    /* Task 3: Flow calculation (every 1 second) */
    if (now - lastFlow >= TASK_FLOW_MS) {
        lastFlow = now;
        calculateFlow();
    }

    /* Task 4: Sensor health check (every 5 seconds) */
    if (now - lastHealth >= TASK_HEALTH_MS) {
        lastHealth = now;
        updateSensorHealth();
    }

    /* Task 5: Data transmission (every 5 seconds) */
    if (now - lastTransmit >= TASK_TRANSMIT_MS) {
        lastTransmit = now;
        updateSensorHealth();   /* Ensure fresh data before sending */
        sendDataToBackend();
    }

    /* Task 6: Serial dashboard (every 1 second) */
    if (now - lastDashboard >= TASK_DASHBOARD_MS) {
        lastDashboard = now;
        printDashboard();
    }

    /* Task 7: NTP resync (every hour) */
    if (now - lastNTP >= TASK_NTP_MS) {
        lastNTP = now;
        if (wifiConnected) {
            syncNTPTime();
        }
    }

    /* Status LED blink (1 Hz heartbeat) */
    digitalWrite(PIN_LED, (now / 1000) % 2 == 0 ? HIGH : LOW);
}
