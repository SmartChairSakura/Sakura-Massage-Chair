/*
 * =====================================================================================
 * PROYEK     : SMART KURSI PIJAT SAKURA ZEN - IOT HUB CONTROLLER (HIGH-RELIABILITY)
 * HARDWARE   : ESP32 DevKit V1 (CP2102 Type-C) + HMI TJC4880X243_011 + Relay Optocoupler
 * CLOUD API  : Nextion/Next.js 14 on Vercel (https://sakura-massage-chair.vercel.app)
 * DATABASE   : Supabase PostgreSQL Realtime
 * GATEWAY    : Midtrans Core API (QRIS Dinamis)
 * =====================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <HTTPUpdate.h>
#include <ArduinoJson.h>

// =====================================================================================
// 1. KONFIGURASI WIFI & SERVER
// =====================================================================================
const char* WIFI_SSID             = "PARKEE-ENGINEER";
const char* WIFI_PASSWORD         = "PARKEE1234";
const char* CHAIR_ID              = "SAKURA-GI-01";
const char* FIRMWARE_VERSION      = "2.2.0-ota";
const char* BASE_API_URL          = "https://sakura-massage-chair.vercel.app";
const char* SUPABASE_REST_URL     = "https://ndhlvkqswysexrdurlrk.supabase.co/rest/v1/chair_slips";
const char* SUPABASE_CHAIRS_URL   = "https://ndhlvkqswysexrdurlrk.supabase.co/rest/v1/chairs";
const char* SUPABASE_KEY          = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5NzY0OCwiZXhwIjoyMTAwOTczNjQ4fQ.x57j7Ev9ETNmuTxxwGTMvjZX0hF4rQbxj2dpEpu4X8I";

// =====================================================================================
// 2. DEFINISI PIN & TIMING HARDWARE
// =====================================================================================
const int RELAY_PIN    = 23;  // Terhubung ke Terminal IN Modul Relay
#define RXD2 16               // Terhubung ke Pin TX Layar TJC
#define TXD2 17               // Terhubung ke Pin RX Layar TJC

const int PULSE_ON_MS  = 200; // Relay ON (Hubungkan MS1 ke GND)
const int PULSE_OFF_MS = 150; // Relay OFF (Jeda antar pulsa)

// =====================================================================================
// 3. MESIN STATUS (STATE MACHINE) & SINKRONISASI DUAL-CORE
// =====================================================================================
enum ChairState {
  STATE_STANDBY,
  STATE_QRIS_DISPLAY,
  STATE_MASSAGE_RUNNING
};

volatile ChairState currentState = STATE_STANDBY;
volatile uint32_t orderSessionSeq = 0; // Mencegah race condition jika user klik CANCEL saat loading

String currentOrderId = "";
int totalPulsesToSend = 0;
int sessionDurationSeconds = 0;

unsigned long sessionStartTime = 0;
unsigned long lastTimerUpdateTime = 0;
unsigned long qrisDisplayStartTime = 0;
unsigned long lastQrisTimerUpdateTime = 0;
const unsigned long QRIS_TIMEOUT_SECONDS = 180;

// Variabel antrean & sinyal antar Core (Core 1 UI <-> Core 0 Network)
struct OrderRequest {
  bool pending;
  uint32_t seq;
  int durasiMenit;
  int nominal;
  int pulsa;
  char packageId[16];
};

struct AckRequest {
  bool pending;
  char orderId[64];
  char eventStatus[24];
  int pulses;
};

volatile OrderRequest pendingOrder = {false, 0, 0, 0, 0, ""};
volatile AckRequest pendingAck     = {false, "", "", 0};

volatile bool qrisReadyToRender    = false;
volatile bool qrisCreationFailed   = false;
volatile bool paymentVerifiedFlag  = false;
String sharedQrString              = "";

portMUX_TYPE stateMux = portMUX_INITIALIZER_UNLOCKED;
TaskHandle_t netTaskHandle = NULL;

// =====================================================================================
// 4. HELPER: KOMUNIKASI SERIAL KE LAYAR TJC & RELAY
// =====================================================================================
void sendToTJC(const String& cmd) {
  Serial2.print(cmd);
  Serial2.write(0xFF);
  Serial2.write(0xFF);
  Serial2.write(0xFF);
}

void clearTJCBuffer() {
  while (Serial2.available()) {
    Serial2.read();
  }
}

void formatAndSendTimer(long remainingSec) {
  if (remainingSec < 0) remainingSec = 0;
  int m = remainingSec / 60;
  int s = remainingSec % 60;
  char timerBuf[32];
  snprintf(timerBuf, sizeof(timerBuf), "t_timer.txt=\"%02d:%02d\"", m, s);
  sendToTJC(String(timerBuf));
}

void formatAndSendQrisTimer(long remainingSec, bool forceColor = false) {
  if (remainingSec < 0) remainingSec = 0;
  int m = remainingSec / 60;
  int s = remainingSec % 60;
  char timerBuf[32];
  snprintf(timerBuf, sizeof(timerBuf), "t_qtimer.txt=\"%02d:%02d\"", m, s);
  sendToTJC(String(timerBuf));

  static bool lastWasWarning = false;
  bool isWarning = (remainingSec <= 30);
  if (isWarning != lastWasWarning || forceColor) {
    lastWasWarning = isWarning;
    // Jika sisa waktu <= 30 detik: warna teks merah terang (RGB565: 63488), normal putih (65535)
    sendToTJC(isWarning ? "t_qtimer.pco=63488" : "t_qtimer.pco=65535");
  }
}

void eksekusiPulsaRelay(int jumlahPulsa) {
  Serial.printf("[RELAY] Memulai injeksi %d pulsa ke Tokuyo...\n", jumlahPulsa);
  for (int i = 1; i <= jumlahPulsa; i++) {
    digitalWrite(RELAY_PIN, HIGH);
    delay(PULSE_ON_MS);
    digitalWrite(RELAY_PIN, LOW);
    delay(PULSE_OFF_MS);
    Serial.printf("[RELAY] Pulsa %d/%d terkirim.\n", i, jumlahPulsa);
  }
  Serial.println("[RELAY] Seluruh pulsa berhasil dieksekusi. Kursi aktif memijat.");
}

void antrekanAckKiosk(const char* orderId, const char* statusEvent, int pulsa) {
  portENTER_CRITICAL(&stateMux);
  strncpy((char*)pendingAck.orderId, orderId, sizeof(pendingAck.orderId) - 1);
  strncpy((char*)pendingAck.eventStatus, statusEvent, sizeof(pendingAck.eventStatus) - 1);
  pendingAck.pulses = pulsa;
  pendingAck.pending = true;
  portEXIT_CRITICAL(&stateMux);
}

// =====================================================================================
// 5. FUNGSI NETWORK (DIJALANKAN DI CORE 0 AGAR TIDAK MEMBLOKIR LAYAR/TIMER)
// =====================================================================================

// A. Buat Pesanan QRIS dengan Auto-Retry jika koneksi tersedak
void netBuatOrderQRIS(uint32_t reqSeq, int durasiMenit, int nominal, int pulsa, const char* packageId) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] WiFi tidak terhubung saat meminta QRIS!");
    qrisCreationFailed = true;
    return;
  }

  Serial.printf("\n[QRIS] Meminta QRIS ke Server: Paket %d Menit (Rp %d)...\n", durasiMenit, nominal);

  StaticJsonDocument<256> doc;
  doc["chairId"] = CHAIR_ID;
  doc["packageId"] = packageId;
  doc["amount"] = nominal;
  doc["durationMinutes"] = durasiMenit;
  doc["pulseCount"] = pulsa;
  doc["customerPhone"] = "GUEST";
  doc["created_from"] = "IOT_KIOSK";

  String reqBody;
  serializeJson(doc, reqBody);

  bool success = false;

  // Maksimal 2x percobaan untuk mengatasi cold-start Vercel / lonjakan ping hotspot
  for (int attempt = 1; attempt <= 2; attempt++) {
    // Jika user sudah menekan CANCEL di layar, batalkan proses segera
    if (reqSeq != orderSessionSeq || currentState != STATE_QRIS_DISPLAY) {
      Serial.println("[QRIS] Permintaan QRIS dibatalkan oleh user sebelum selesai.");
      return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(7);
    HTTPClient http;
    http.setTimeout(7000);

    if (http.begin(client, String(BASE_API_URL) + "/api/payments/create-qris")) {
      http.addHeader("Content-Type", "application/json");
      int httpCode = http.POST(reqBody);

      if (httpCode == 200) {
        String resp = http.getString();
        StaticJsonDocument<2048> resDoc;
        DeserializationError err = deserializeJson(resDoc, resp);

        if (!err) {
          String ordId = resDoc["transaction"]["idempotency_key"] | "";
          String qrStr = resDoc["transaction"]["qr_string"] | "";
          String qrUrl = resDoc["transaction"]["qr_url"] | "";

          if (ordId.length() > 0 && qrStr.length() > 0) {
            if (reqSeq == orderSessionSeq && currentState == STATE_QRIS_DISPLAY) {
              portENTER_CRITICAL(&stateMux);
              currentOrderId = ordId;
              sharedQrString = qrStr;
              totalPulsesToSend = pulsa;
              sessionDurationSeconds = durasiMenit * 60;
              qrisReadyToRender = true;
              portEXIT_CRITICAL(&stateMux);

              Serial.println("\n=======================================================");
              Serial.printf("[QRIS] Berhasil dibuat! Order ID: %s\n", ordId.c_str());
              Serial.printf("[QRIS] Nominal Tagihan : Rp %d\n", nominal);
              Serial.printf("[QRIS] Panjang String  : %d karakter\n", qrStr.length());
              Serial.printf("[QRIS SIMULATOR URL]   : %s\n", qrUrl.c_str());
              Serial.println("=======================================================\n");
              success = true;
            }
            http.end();
            client.stop();
            break;
          }
        } else {
          Serial.printf("[ERROR] JSON Parsing Gagal: %s\n", err.c_str());
        }
      } else {
        Serial.printf("[WARN] Percobaan %d gagal membuat QRIS. HTTP Code: %d\n", attempt, httpCode);
      }
      http.end();
    }
    client.stop();

    if (!success && attempt < 2) {
      vTaskDelay(pdMS_TO_TICKS(250)); // Jeda singkat sebelum retry
    }
  }

  if (!success && reqSeq == orderSessionSeq && currentState == STATE_QRIS_DISPLAY) {
    qrisCreationFailed = true;
  }
}

// B. Kirim ACK dengan Dual-Engine (Vercel Endpoint + Direct Supabase Cloud Fallback)
void netKirimAckSupabaseDirect(const char* orderId, const char* eventStatus) {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(4);
  HTTPClient http;
  http.setTimeout(4000);

  String queryUrl = String(SUPABASE_REST_URL) + "?chair_slip_number=eq." + orderId;
  if (http.begin(client, queryUrl)) {
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    StaticJsonDocument<128> doc;
    doc["status"] = eventStatus;
    String reqBody;
    serializeJson(doc, reqBody);

    int patchCode = http.sendRequest("PATCH", reqBody);
    http.end();
    client.stop();

    if (patchCode >= 200 && patchCode < 300) {
      Serial.printf("[ACK DIRECT SUPABASE] Berhasil update status '%s' ke Database Supabase (HTTP %d).\n", eventStatus, patchCode);
      return;
    }
  } else {
    client.stop();
  }
}

void netKirimAck(const char* orderId, const char* eventStatus, int pulsaTerkirim) {
  if (WiFi.status() != WL_CONNECTED || strlen(orderId) == 0) return;

  StaticJsonDocument<256> doc;
  doc["chair_slip_number"] = orderId;
  doc["chair_id"] = CHAIR_ID;
  doc["status_event"] = eventStatus;
  doc["pulses_sent"] = pulsaTerkirim;

  String reqBody;
  serializeJson(doc, reqBody);

  for (int attempt = 1; attempt <= 3; attempt++) {
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(4);
    HTTPClient http;
    http.setTimeout(4000);

    if (http.begin(client, String(BASE_API_URL) + "/api/admin/chairs/ack")) {
      http.addHeader("Content-Type", "application/json");
      int code = http.POST(reqBody);
      http.end();
      client.stop();

      if (code >= 200 && code < 300) {
        Serial.printf("[ACK] Status '%s' berhasil dikirim (Order: %s).\n", eventStatus, orderId);
        return;
      }

      // Jika Vercel mengembalikan 401 (terkunci middleware admin), langsung fallback ke Direct Supabase Cloud
      if (code == 401) {
        Serial.println("[ACK] Vercel 401 (Middleware Admin). Mengalihkan ACK langsung ke Direct Supabase Cloud...");
        netKirimAckSupabaseDirect(orderId, eventStatus);
        return;
      }

      Serial.printf("[ACK WARN] Percobaan %d gagal (HTTP %d), mencoba ulang...\n", attempt, code);
    } else {
      client.stop();
    }
    vTaskDelay(pdMS_TO_TICKS(500));
  }
}

// C. Heartbeat ke Server
void netSendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(4);
  HTTPClient http;
  http.setTimeout(4000);

  if (http.begin(client, String(BASE_API_URL) + "/api/heartbeat")) {
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<128> doc;
    doc["chairId"] = CHAIR_ID;
    doc["firmwareVersion"] = FIRMWARE_VERSION;
    doc["status"] = (currentState == STATE_MASSAGE_RUNNING) ? "BUSY" : "ONLINE";

    String reqBody;
    serializeJson(doc, reqBody);
    http.POST(reqBody);
    http.end();
  }
  client.stop();
}

// D. Lapor Status OTA ke Supabase Cloud
void laporOtaStatus(const char* statusStr, const char* versionStr = "") {
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(4);
  HTTPClient http;
  http.setTimeout(4000);

  String queryUrl = String(SUPABASE_CHAIRS_URL) + "?chair_code=eq." + CHAIR_ID;
  if (http.begin(client, queryUrl)) {
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    StaticJsonDocument<256> doc;
    doc["ota_status"] = statusStr;
    if (String(statusStr) == "SUCCESS" && strlen(versionStr) > 0) {
      doc["firmware_version"] = versionStr;
    }
    String reqBody;
    serializeJson(doc, reqBody);

    http.sendRequest("PATCH", reqBody);
    http.end();
  }
  client.stop();
}

// E. Eksekutor Cloud HTTPS OTA Update
void jalankanCloudOTA(const String& firmwareUrl, const String& targetVersion) {
  if (currentState == STATE_MASSAGE_RUNNING) {
    Serial.println("[OTA] Kursi sedang memijat. Menunda download OTA hingga sesi selesai.");
    return;
  }

  Serial.println("\n=======================================================");
  Serial.printf("[OTA] MEMULAI UPDATE FIRMWARE KE VERSI: %s\n", targetVersion.c_str());
  Serial.printf("[OTA URL] %s\n", firmwareUrl.c_str());
  Serial.println("=======================================================");

  laporOtaStatus("DOWNLOADING", "");
  sendToTJC("page 2");
  sendToTJC("page page2");
  sendToTJC("t_timer.txt=\"UPDATING FW\"");
  delay(100);

  WiFiClientSecure client;
  client.setInsecure();
  httpUpdate.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  httpUpdate.rebootOnUpdate(false); // Reboot manual agar status sempat terkirim ke Supabase

  t_httpUpdate_return ret = httpUpdate.update(client, firmwareUrl);

  switch (ret) {
    case HTTP_UPDATE_FAILED:
      Serial.printf("[OTA ERROR] Update Gagal (%d): %s\n", httpUpdate.getLastError(), httpUpdate.getLastErrorString().c_str());
      laporOtaStatus("FAILED", "");
      kembaliKeMenuUtama();
      break;

    case HTTP_UPDATE_NO_UPDATES:
      Serial.println("[OTA] Server menyatakan tidak ada binary baru.");
      break;

    case HTTP_UPDATE_OK:
      Serial.println("\n[OTA SUCCESS] Flashing binary selesai 100%! Melapor ke Cloud dan Rebooting...");
      laporOtaStatus("SUCCESS", targetVersion.c_str());
      sendToTJC("t_timer.txt=\"REBOOTING...\"");
      delay(1500);
      ESP.restart();
      break;
  }
}

// D. Worker Task di Core 0 (Menangani semua koneksi HTTPS + Persistent Polling Supabase)
void networkTask(void* pvParameters) {
  WiFiClientSecure pollClient;
  pollClient.setInsecure();
  pollClient.setTimeout(3);
  HTTPClient pollHttp;
  pollHttp.setTimeout(2500);
  pollHttp.setReuse(true); // KUNCI KECEPATAN: Gunakan kembali sesi SSL untuk polling!
  bool pollSessionActive = false;

  unsigned long lastPollMs = 0;
  unsigned long lastHbMs = 0;

  for (;;) {
    // 1. Cek apakah ada permintaan pembuatan QRIS baru
    if (pendingOrder.pending) {
      if (pollSessionActive) {
        pollHttp.end();
        pollClient.stop();
        pollSessionActive = false;
      }

      OrderRequest req;
      portENTER_CRITICAL(&stateMux);
      memcpy(&req, (const void*)&pendingOrder, sizeof(OrderRequest));
      pendingOrder.pending = false;
      portEXIT_CRITICAL(&stateMux);

      netBuatOrderQRIS(req.seq, req.durasiMenit, req.nominal, req.pulsa, req.packageId);
      lastPollMs = millis();
    }

    // 2. Cek apakah ada antrean pengiriman ACK (session_inprocess / done)
    if (pendingAck.pending) {
      if (pollSessionActive) {
        pollHttp.end();
        pollClient.stop();
        pollSessionActive = false;
      }

      AckRequest ack;
      portENTER_CRITICAL(&stateMux);
      memcpy(&ack, (const void*)&pendingAck, sizeof(AckRequest));
      pendingAck.pending = false;
      portEXIT_CRITICAL(&stateMux);

      netKirimAck(ack.orderId, ack.eventStatus, ack.pulses);
    }

    // 3. Polling Cepat Status Pembayaran ke Supabase (Chair-Centric: Tangkap Semua Pembayaran untuk Kursi Ini)
    // Berjalan saat QRIS aktif (setiap 1.2s) MAUPUN saat Standby / setelah Cancel (setiap 2.5s)
    bool shouldPoll = (currentState == STATE_QRIS_DISPLAY || currentState == STATE_STANDBY) && !paymentVerifiedFlag;
    unsigned long pollInterval = (currentState == STATE_QRIS_DISPLAY) ? 1200 : 2500;

    if (shouldPoll) {
      if (millis() - lastPollMs >= pollInterval) {
        lastPollMs = millis();
        if (WiFi.status() == WL_CONNECTED) {
          // Query mencari tiket yang statusnya 'paid' untuk CHAIR_ID ini
          String queryUrl = String(SUPABASE_REST_URL) + "?chair_id=eq." + CHAIR_ID + "&status=eq.paid&order=created_at.desc&limit=1&select=chair_slip_number,pulse_count,duration_in_minutes";
          if (!pollSessionActive) {
            pollClient.setInsecure();
            pollClient.setTimeout(3);
          }

          if (pollHttp.begin(pollClient, queryUrl)) {
            pollSessionActive = true;
            pollHttp.addHeader("apikey", SUPABASE_KEY);
            pollHttp.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
            int httpCode = pollHttp.GET();

            if (httpCode == 200) {
              String resp = pollHttp.getString();
              StaticJsonDocument<512> resDoc;
              DeserializationError err = deserializeJson(resDoc, resp);

              if (!err && resDoc.is<JsonArray>() && resDoc.size() > 0) {
                String paidOrder = resDoc[0]["chair_slip_number"] | "";
                int pCount = resDoc[0]["pulse_count"] | 5;
                int dMins = resDoc[0]["duration_in_minutes"] | 4;

                if (paidOrder.length() > 0 && currentState != STATE_MASSAGE_RUNNING) {
                  portENTER_CRITICAL(&stateMux);
                  currentOrderId = paidOrder;
                  totalPulsesToSend = pCount;
                  sessionDurationSeconds = dMins * 60;
                  paymentVerifiedFlag = true;
                  portEXIT_CRITICAL(&stateMux);
                  Serial.printf("\n[PAYMENT DETECTED] Pembayaran lunas terdeteksi: %s (Paket: %d Menit / %d Pulsa)\n", paidOrder.c_str(), dMins, pCount);
                }
              }
            } else if (httpCode < 0) {
              // Jika socket terputus, bersihkan agar poll berikutnya re-handshake bersih
              pollHttp.end();
              pollClient.stop();
              pollSessionActive = false;
            }
          }
        }
      }
    } else {
      // Bebaskan RAM SSL (~36KB) segera setelah keluar dari mode menunggu pembayaran
      if (pollSessionActive) {
        pollHttp.end();
        pollClient.stop();
        pollSessionActive = false;
      }
    }

    // 4. Heartbeat setiap 30 detik (Hanya saat tidak sedang memijat agar koneksi stabil)
    if (currentState != STATE_MASSAGE_RUNNING && (millis() - lastHbMs >= 30000)) {
      lastHbMs = millis();
      netSendHeartbeat();
    }

    // 5. Cek Jadwal Update Firmware Cloud OTA (Hanya saat Kursi Standby / Bebas)
    static unsigned long lastOtaCheckMs = 0;
    if (currentState == STATE_STANDBY && (millis() - lastOtaCheckMs >= 15000)) {
      lastOtaCheckMs = millis();
      if (WiFi.status() == WL_CONNECTED) {
        WiFiClientSecure otaCheckClient;
        otaCheckClient.setInsecure();
        otaCheckClient.setTimeout(4);
        HTTPClient otaHttp;
        otaHttp.setTimeout(4000);

        String otaUrl = String(SUPABASE_CHAIRS_URL) + "?chair_code=eq." + CHAIR_ID + "&select=target_firmware_version,firmware_url,ota_status";
        if (otaHttp.begin(otaCheckClient, otaUrl)) {
          otaHttp.addHeader("apikey", SUPABASE_KEY);
          otaHttp.addHeader("Authorization", String("Bearer ") + SUPABASE_KEY);
          int code = otaHttp.GET();

          if (code == 200) {
            String resp = otaHttp.getString();
            StaticJsonDocument<512> doc;
            DeserializationError err = deserializeJson(doc, resp);

            if (!err && doc.is<JsonArray>() && doc.size() > 0) {
              String targetVer = doc[0]["target_firmware_version"] | "";
              String fwUrl = doc[0]["firmware_url"] | "";
              String otaSt = doc[0]["ota_status"] | "";

              if (targetVer.length() > 0 && fwUrl.length() > 0 && targetVer != FIRMWARE_VERSION && otaSt == "PENDING") {
                Serial.printf("\n[OTA TRIGGER] Perintah Update Firmware Terdeteksi: %s -> %s\n", FIRMWARE_VERSION, targetVer.c_str());
                otaHttp.end();
                otaCheckClient.stop();
                jalankanCloudOTA(fwUrl, targetVer);
              }
            }
          }
          otaHttp.end();
        }
        otaCheckClient.stop();
      }
    }

    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// =====================================================================================
// 6. TRANSISI STATE MACHINE (DIJALANKAN DI CORE 1)
// =====================================================================================
void mulaiRequestOrderQRIS(int durasiMenit, int nominal, int pulsa, const char* packageId) {
  // Pindahkan Layar TJC seketika tanpa menunggu jaringan
  sendToTJC("page 1");
  sendToTJC("page page1");
  delay(20);
  sendToTJC("qr0.txt=\"\"");
  formatAndSendQrisTimer(QRIS_TIMEOUT_SECONDS, true);
  clearTJCBuffer();

  portENTER_CRITICAL(&stateMux);
  orderSessionSeq++;
  currentState = STATE_QRIS_DISPLAY;
  currentOrderId = "";
  qrisReadyToRender = false;
  qrisCreationFailed = false;
  paymentVerifiedFlag = false;
  qrisDisplayStartTime = millis();
  lastQrisTimerUpdateTime = millis();

  pendingOrder.seq = orderSessionSeq;
  pendingOrder.durasiMenit = durasiMenit;
  pendingOrder.nominal = nominal;
  pendingOrder.pulsa = pulsa;
  strncpy((char*)pendingOrder.packageId, packageId, sizeof(pendingOrder.packageId) - 1);
  pendingOrder.pending = true;
  portEXIT_CRITICAL(&stateMux);
}

void kembaliKeMenuUtama() {
  portENTER_CRITICAL(&stateMux);
  orderSessionSeq++;
  currentState = STATE_STANDBY;
  currentOrderId = "";
  qrisReadyToRender = false;
  qrisCreationFailed = false;
  paymentVerifiedFlag = false;
  pendingOrder.pending = false;
  portEXIT_CRITICAL(&stateMux);

  sendToTJC("qr0.txt=\"\"");
  delay(20);
  sendToTJC("page 0");
  sendToTJC("page page0");
  delay(20);
  clearTJCBuffer();
  Serial.printf("[STANDBY] Kembali ke Menu Utama. Free Heap: %d bytes\n", ESP.getFreeHeap());
}

void eksekusiPembayaranSukses() {
  Serial.println("\n[PAYMENT SUCCESS] Pembayaran Terverifikasi Lunas!");

  String ordIdCopy;
  int pulsesCopy;
  portENTER_CRITICAL(&stateMux);
  orderSessionSeq++; // Hentikan polling QRIS
  currentState = STATE_MASSAGE_RUNNING;
  paymentVerifiedFlag = false;
  ordIdCopy = currentOrderId;
  pulsesCopy = totalPulsesToSend;
  portEXIT_CRITICAL(&stateMux);

  // 1. Pindahkan Layar TJC ke Halaman Timer Pijat (page 2)
  sendToTJC("page 2");
  sendToTJC("page page2");
  sendToTJC("t_timer.txt=\"HARAP TUNGGU\"");

  // 2. Kirim ACK secara paralel di Core 0 sambil Core 1 menembakkan pulsa relay!
  antrekanAckKiosk(ordIdCopy.c_str(), "session_inprocess", pulsesCopy);

  // 3. Injeksi Pulsa Relay Fisik ke PCB Tokuyo
  eksekusiPulsaRelay(pulsesCopy);

  // 4. Mulai hitung mundur SETELAH pulsa selesai (agar waktu pijat pelanggan tidak terpotong!)
  sessionStartTime = millis();
  lastTimerUpdateTime = millis();
  formatAndSendTimer(sessionDurationSeconds); // Tampilkan angka awal seketika tanpa tunggu 1 detik
  clearTJCBuffer();
}

// =====================================================================================
// 7. SETUP & INITIALIZATION
// =====================================================================================
void setup() {
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);
  Serial.setTimeout(20);
  Serial2.setTimeout(20);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.println("\n=========================================");
  Serial.println("   SAKURA ZEN MASSAGE CHAIR - IOT HUB    ");
  Serial.println("=========================================");

  // Optimasi Kecepatan & Stabilitas WiFi ESP32
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);         // PENTING: Matikan power-save WiFi agar ping rendah & SSL stabil
  WiFi.setAutoReconnect(true);  // Otomatis reconnect di level driver ESP-IDF
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WIFI] Menghubungkan ke ");
  Serial.print(WIFI_SSID);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 25) {
    delay(400);
    Serial.print(".");
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Berhasil Terhubung!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WIFI] Belum terhubung, auto-reconnect aktif di background.");
  }

  // Set Layar TJC ke Halaman Utama (page0)
  sendToTJC("page 0");
  sendToTJC("page page0");
  delay(30);
  sendToTJC("qr0.txt=\"\"");
  clearTJCBuffer();

  // Jalankan Worker Jaringan di Core 0
  xTaskCreatePinnedToCore(
    networkTask,
    "NetTask",
    12288,
    NULL,
    1,
    &netTaskHandle,
    0
  );
}

// =====================================================================================
// 8. MAIN LOOP (NON-BLOCKING UI & TIMER DI CORE 1)
// =====================================================================================
void loop() {
  // A. BACA DATA SERIAL MASUK DARI LAYAR TJC (Responsif)
  String incoming = "";
  if (Serial2.available()) {
    delay(10); // Tunggu frame UART TJC lengkap (pada 9600 bps, 10ms = ~10 karakter)
    while (Serial2.available()) {
      char c = Serial2.read();
      if (c >= 32 && c <= 126) {
        incoming += c;
      }
    }
    incoming.trim();
    if (incoming.length() > 0) {
      Serial.printf("[TJC INPUT] %s\n", incoming.c_str());
    }
  }

  // BACA DATA SERIAL MASUK DARI KEYBOARD PC (SERIAL MONITOR)
  if (Serial.available()) {
    delay(10);
    String pcInput = "";
    while (Serial.available()) {
      char c = Serial.read();
      if (c >= 32 && c <= 126) {
        pcInput += c;
      }
    }
    pcInput.trim();
    if (pcInput.length() > 0) {
      Serial.printf("[PC DEBUG INPUT] %s\n", pcInput.c_str());
      if (incoming.length() == 0) {
        incoming = pcInput;
      }
    }
  }

  // B. EKSEKUSI PERINTAH USER (INSTAN TANPA TERTAHAN HTTP)
  if (incoming.length() > 0) {
    // 1. Tombol Batalkan Transaksi di Halaman QRIS
    if (incoming.indexOf("CANCEL") >= 0) {
      Serial.println("[USER] Transaksi dibatalkan oleh pelanggan.");
      kembaliKeMenuUtama();
    }
    // 2. Command Debug Manual PC: BAYAR / PAID
    else if (incoming.equalsIgnoreCase("BAYAR") || incoming.equalsIgnoreCase("PAID")) {
      if (currentState == STATE_QRIS_DISPLAY && currentOrderId != "") {
        Serial.println("\n[DEBUG] Simulasi Pembayaran Sukses Diterima via Command Serial!");
        eksekusiPembayaranSukses();
      } else {
        Serial.println("[DEBUG] Tidak ada pesanan QRIS aktif yang sedang menunggu pembayaran.");
      }
    }
    // 3. Pilihan Paket P1 s/d P8 (Hanya dieksekusi jika tidak sedang memijat)
    else if (currentState != STATE_MASSAGE_RUNNING) {
      if (incoming.indexOf("P1") >= 0)      mulaiRequestOrderQRIS(4,  5,  5,  "pkg_4m");
      else if (incoming.indexOf("P2") >= 0) mulaiRequestOrderQRIS(8,  10, 10, "pkg_8m");
      else if (incoming.indexOf("P3") >= 0) mulaiRequestOrderQRIS(12, 15, 15, "pkg_12m");
      else if (incoming.indexOf("P4") >= 0) mulaiRequestOrderQRIS(16, 20, 20, "pkg_16m");
      else if (incoming.indexOf("P5") >= 0) mulaiRequestOrderQRIS(20, 25, 25, "pkg_20m");
      else if (incoming.indexOf("P6") >= 0) mulaiRequestOrderQRIS(24, 30, 30, "pkg_24m");
      else if (incoming.indexOf("P7") >= 0) mulaiRequestOrderQRIS(28, 35, 35, "pkg_28m");
      else if (incoming.indexOf("P8") >= 0) mulaiRequestOrderQRIS(32, 40, 40, "pkg_32m");
    }
  }

  // C. HANDLER STATUS PEMBAYARAN LUNAS (Aktif baik saat di halaman QRIS maupun saat Standby / setelah Cancel)
  if (currentState != STATE_MASSAGE_RUNNING && paymentVerifiedFlag) {
    eksekusiPembayaranSukses();
  }

  // D. HANDLER KHUSUS HALAMAN QRIS (RENDER, RETRY & TIMEOUT)
  if (currentState == STATE_QRIS_DISPLAY) {
    // 1. Jika string QRIS baru saja selesai diambil oleh Core 0, render ke TJC
    if (qrisReadyToRender) {
      String qrToDraw;
      portENTER_CRITICAL(&stateMux);
      qrToDraw = sharedQrString;
      qrisReadyToRender = false;
      portEXIT_CRITICAL(&stateMux);

      sendToTJC("qr0.txt=\"" + qrToDraw + "\"");
      Serial.println("[TJC] Sinyal render QRIS dikirim ke komponen qr0.");
      qrisDisplayStartTime = millis(); // Reset waktu timeout 3 menit sejak QR tampil di layar
      lastQrisTimerUpdateTime = millis();
      formatAndSendQrisTimer(QRIS_TIMEOUT_SECONDS, true);
    }

    // 2. Jika pembuatan QRIS gagal setelah retry, kembalikan ke halaman utama
    if (qrisCreationFailed) {
      Serial.println("[ERROR] Gagal membuat pesanan QRIS setelah retry. Kembali ke Menu.");
      kembaliKeMenuUtama();
    }

    // 3. Hitung mundur timer QRIS setiap 1 detik
    if (millis() - lastQrisTimerUpdateTime >= 1000) {
      lastQrisTimerUpdateTime += 1000;
      long elapsed = (millis() - qrisDisplayStartTime) / 1000;
      long remaining = (long)QRIS_TIMEOUT_SECONDS - elapsed;
      if (remaining >= 0) {
        formatAndSendQrisTimer(remaining);
      }
    }

    // 4. Cek batas waktu tampilan QRIS (180 detik)
    if (currentState == STATE_QRIS_DISPLAY && (millis() - qrisDisplayStartTime >= (QRIS_TIMEOUT_SECONDS * 1000UL))) {
      Serial.println("\n[QRIS TIMEOUT] Waktu pembayaran habis (3 menit tanpa scan).");
      kembaliKeMenuUtama();
    }
  }

  // D. TIMER HITUNG MUNDUR SESI PIJAT (Presisi 1 Detik Tanpa Gangguan Network)
  if (currentState == STATE_MASSAGE_RUNNING) {
    if (millis() - lastTimerUpdateTime >= 1000) {
      lastTimerUpdateTime += 1000; // Akurat tanpa drift waktu
      unsigned long elapsedSec = (millis() - sessionStartTime) / 1000;
      long remainingSec = (long)sessionDurationSeconds - (long)elapsedSec;

      if (remainingSec <= 0) {
        Serial.println("[TIMER] Waktu pijat habis! Sesi selesai.");
        antrekanAckKiosk(currentOrderId.c_str(), "done", totalPulsesToSend);
        kembaliKeMenuUtama();
      } else {
        formatAndSendTimer(remainingSec);
      }
    }
  }

  // E. WATCHDOG KONEKSI WIFI (Aktif di SEMUA State, bukan hanya saat Standby)
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWiFiCheck = 0;
    if (millis() - lastWiFiCheck >= 5000) {
      lastWiFiCheck = millis();
      Serial.println("[WIFI] Koneksi terputus! Mencoba menghubungkan kembali...");
      WiFi.reconnect();
    }
  }
}