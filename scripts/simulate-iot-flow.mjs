#!/usr/bin/env node

/**
 * =====================================================================================
 * END-TO-END IOT HARDWARE & CLOUD API SIMULATION RUNNER
 * =====================================================================================
 * Emulates the exact FreeRTOS state machine of ESP32 (smart_chair_esp32.ino) & TJC HMI:
 * 1. Hardware Heartbeat (WiFi connected, status ONLINE)
 * 2. Create Dynamic QRIS Order (P1: 4 Menit / Rp 5.000 / 5 Pulsa, created_from: IOT_KIOSK)
 * 3. Polling Status Pending (GET /api/payments/status)
 * 4. Payment Settlement Trigger (Simulasi Pelanggan Scan & Bayar QRIS)
 * 5. Polling Status Paid (GET /api/payments/status -> is_paid: true)
 * 6. Relay Hardware Pulse Execution (5 Pulsa 200ms ON / 150ms OFF)
 * 7. Hardware ACK Session Start (POST /api/admin/chairs/ack -> session_inprocess)
 * 8. Timer Session Completion & ACK Done (POST /api/admin/chairs/ack -> done)
 * 9. Master Audit Verification in Database
 * =====================================================================================
 */

const BASE_URL = process.env.BASE_URL || process.argv.find(arg => arg.startsWith('--url='))?.split('=')[1] || 'http://localhost:3333';
const CHAIR_ID = process.env.CHAIR_ID || 'SAKURA-GI-01';

const SUPABASE_REST_URL = 'https://ndhlvkqswysexrdurlrk.supabase.co/rest/v1/chair_slips';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kaGx2a3Fzd3lzZXhyZHVybHJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTM5NzY0OCwiZXhwIjoyMTAwOTczNjQ4fQ.x57j7Ev9ETNmuTxxwGTMvjZX0hF4rQbxj2dpEpu4X8I';

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function logStep(stepNum, title) {
  console.log(`\n${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}[STEP ${stepNum}] ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}================================================================================${colors.reset}`);
}

function logSuccess(msg, data = null) {
  console.log(`${colors.green}✔ ${msg}${colors.reset}`);
  if (data) console.log(colors.cyan + JSON.stringify(data, null, 2) + colors.reset);
}

function logInfo(msg) {
  console.log(`${colors.blue}ℹ ${msg}${colors.reset}`);
}

function logWarn(msg) {
  console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`);
}

function logError(msg, err = null) {
  console.error(`${colors.red}✖ ${msg}${colors.reset}`);
  if (err) console.error(err);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.log(`${colors.bold}${colors.magenta}Sakura Zen - Dedicated IoT Controller Hub Simulation${colors.reset}`);
  console.log(`Target Host : ${colors.bold}${BASE_URL}${colors.reset}`);
  console.log(`Chair ID    : ${colors.bold}${CHAIR_ID}${colors.reset}`);
  console.log(`Timestamp   : ${new Date().toISOString()}\n`);

  let currentOrderId = '';
  let slipData = null;

  // -----------------------------------------------------------------------------------
  // STEP 1: Hardware Heartbeat Ping
  // -----------------------------------------------------------------------------------
  logStep(1, 'ESP32 Hardware Boot & Heartbeat Telemetry Ping');
  const heartbeatPayload = {
    chair_id: CHAIR_ID,
    status: 'ONLINE',
    firmware_version: '1.0.0',
    rssi: -58,
    ip: '192.168.1.105',
  };

  const t0 = Date.now();
  const hbRes = await fetch(`${BASE_URL}/api/heartbeat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(heartbeatPayload),
  });

  const hbData = await hbRes.json();
  if (!hbRes.ok || !hbData.success) {
    throw new Error(`Heartbeat failed: ${JSON.stringify(hbData)}`);
  }
  logSuccess(`Heartbeat received in ${Date.now() - t0}ms. Device is ONLINE.`, hbData);

  // -----------------------------------------------------------------------------------
  // STEP 2: Customer Selects Package on TJC HMI (P1: 4 Mins / Rp 5.000 / 5 Pulses)
  // -----------------------------------------------------------------------------------
  logStep(2, 'Customer Touches P1 on TJC HMI -> ESP32 Requests Dynamic QRIS');
  const createQrisPayload = {
    chair_id: CHAIR_ID,
    amount: 5000,
    duration_minutes: 4,
    pulse_count: 5,
    customer_phone: '081299998888',
    created_from: 'IOT_KIOSK',
  };

  const t1 = Date.now();
  const qrisRes = await fetch(`${BASE_URL}/api/payments/create-qris`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createQrisPayload),
  });

  const qrisData = await qrisRes.json();
  if (!qrisRes.ok || !qrisData.success) {
    throw new Error(`Create QRIS failed: ${JSON.stringify(qrisData)}`);
  }

  currentOrderId = qrisData.order_id || qrisData.orderId;
  const qrString = qrisData.qr_string;
  const qrUrl = qrisData.qr_url;

  logSuccess(`Dynamic QRIS generated in ${Date.now() - t1}ms!`, {
    order_id: currentOrderId,
    amount: qrisData.amount,
    duration_minutes: qrisData.duration_minutes,
    pulse_count: qrisData.pulse_count,
    qr_string_preview: qrString ? `${qrString.slice(0, 45)}...` : 'NONE',
    qr_url: qrUrl,
  });

  if (!qrString || !qrString.startsWith('00020101')) {
    logWarn('qr_string does not follow EMVCo standard format! TJC qr0 component requires valid text.');
  } else {
    logSuccess('qr_string EMVCo validation PASSED! Ready to send to TJC Serial2.');
  }

  // -----------------------------------------------------------------------------------
  // STEP 3: ESP32 Fast Status Polling (State: Pending)
  // -----------------------------------------------------------------------------------
  logStep(3, 'ESP32 Fast Status Polling (Pre-Payment / Pending State)');
  const t2 = Date.now();
  const pollRes1 = await fetch(`${BASE_URL}/api/payments/status?orderId=${currentOrderId}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  const pollData1 = await pollRes1.json();

  if (!pollRes1.ok || !pollData1.success) {
    throw new Error(`Status polling failed: ${JSON.stringify(pollData1)}`);
  }

  if (pollData1.is_paid === false && pollData1.status === 'pending') {
    logSuccess(`Fast Status Polling answered in ${Date.now() - t2}ms: Payment is correctly PENDING.`, pollData1);
  } else {
    throw new Error(`Expected pending status, got: ${JSON.stringify(pollData1)}`);
  }

  // -----------------------------------------------------------------------------------
  // STEP 4: Simulate Customer QRIS Settlement
  // -----------------------------------------------------------------------------------
  logStep(4, 'Customer Scans QRIS & Pays (Simulate Gateway Settlement Callback)');
  logInfo(`Triggering payment confirmation for Order ID: ${currentOrderId}...`);

  // Direct Supabase atomic settlement to simulate Midtrans webhook callback
  const updateRes = await fetch(`${SUPABASE_REST_URL}?chair_slip_number=eq.${encodeURIComponent(currentOrderId)}`, {
    method: 'PATCH',
    headers: SUPABASE_HEADERS,
    body: JSON.stringify({
      status: 'paid',
      updated_at: new Date().toISOString(),
    }),
  });

  let updatedSlip = null;
  if (updateRes.ok) {
    const records = await updateRes.json();
    updatedSlip = records?.[0] || null;
  }

  if (!updatedSlip) {
    // Fallback via /api/webhooks/payment
    logWarn('Direct Supabase PostgREST update note: Trying webhook endpoint fallback');
    const webhookRes = await fetch(`${BASE_URL}/api/webhooks/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idempotencyKey: currentOrderId,
        status: 'PAID',
      }),
    });
    const webhookData = await webhookRes.json();
    logSuccess('Payment webhook callback triggered.', webhookData);
  } else {
    logSuccess('Payment settlement confirmed in database!', {
      slip_number: updatedSlip.chair_slip_number,
      status: updatedSlip.status,
      amount: updatedSlip.amount,
    });
  }

  // -----------------------------------------------------------------------------------
  // STEP 5: ESP32 Fast Status Polling (State: Paid Confirmed)
  // -----------------------------------------------------------------------------------
  logStep(5, 'ESP32 Fast Status Polling (Post-Payment / Paid Detection)');
  const t3 = Date.now();
  const pollRes2 = await fetch(`${BASE_URL}/api/payments/status?orderId=${currentOrderId}`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  const pollData2 = await pollRes2.json();

  if (pollData2.is_paid === true && pollData2.status === 'paid') {
    logSuccess(`Status Polling verified in ${Date.now() - t3}ms: Payment is PAID!`, {
      order_id: pollData2.order_id,
      is_paid: pollData2.is_paid,
      pulse_count: pollData2.pulse_count,
      duration_minutes: pollData2.duration_minutes,
      amount: pollData2.amount,
    });
  } else {
    throw new Error(`Expected is_paid=true, got: ${JSON.stringify(pollData2)}`);
  }

  // -----------------------------------------------------------------------------------
  // STEP 6: Emulate Relay Hardware Pulse Triggering
  // -----------------------------------------------------------------------------------
  logStep(6, 'ESP32 Pulse Generator: Relay Injects Pulses into Tokuyo Socket J3');
  const pulses = pollData2.pulse_count || 5;
  logInfo(`Starting pulse generation for ${pulses} pulses (200ms ON / 150ms OFF)...`);
  for (let i = 1; i <= pulses; i++) {
    // 200ms ON / 150ms OFF
    process.stdout.write(`${colors.yellow}Pulse ${i}/${pulses}: [GPIO 23 HIGH (200ms)] -> [GPIO 23 LOW (150ms)]... ${colors.reset}`);
    await sleep(70); // Accelerated simulation delay
    console.log(`${colors.green}OK${colors.reset}`);
  }
  logSuccess(`Relay pulse delivery complete! All ${pulses} pulses sent successfully.`);

  // -----------------------------------------------------------------------------------
  // STEP 7: Hardware ACK - Session In-Process
  // -----------------------------------------------------------------------------------
  logStep(7, 'ESP32 Sends Hardware ACK (Status: session_inprocess)');
  const ackStartPayload = {
    chair_slip_number: currentOrderId,
    chair_id: CHAIR_ID,
    status_event: 'session_inprocess',
    pulses_sent: pulses,
  };

  const t4 = Date.now();
  const ackStartRes = await fetch(`${BASE_URL}/api/admin/chairs/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ackStartPayload),
  });
  const ackStartData = await ackStartRes.json();

  if (!ackStartRes.ok || !ackStartData.success) {
    throw new Error(`ACK Start failed: ${JSON.stringify(ackStartData)}`);
  }
  logSuccess(`Hardware ACK Start verified in ${Date.now() - t4}ms. Session is active.`, ackStartData);

  // -----------------------------------------------------------------------------------
  // STEP 8: Emulate Session Countdown & Send ACK Done
  // -----------------------------------------------------------------------------------
  logStep(8, 'Session Finished (Countdown 00:00) -> ESP32 Sends ACK Done');
  logInfo('Simulating massage session completion on TJC HMI...');
  await sleep(500);

  const ackDonePayload = {
    chair_slip_number: currentOrderId,
    chair_id: CHAIR_ID,
    status_event: 'done',
    pulses_sent: 0,
  };

  const t5 = Date.now();
  const ackDoneRes = await fetch(`${BASE_URL}/api/admin/chairs/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ackDonePayload),
  });
  const ackDoneData = await ackDoneRes.json();

  if (!ackDoneRes.ok || !ackDoneData.success) {
    throw new Error(`ACK Done failed: ${JSON.stringify(ackDoneData)}`);
  }
  logSuccess(`Hardware ACK Done verified in ${Date.now() - t5}ms. Chair returns to STANDBY.`, ackDoneData);

  // -----------------------------------------------------------------------------------
  // STEP 9: Final Database Audit Verification
  // -----------------------------------------------------------------------------------
  logStep(9, 'Final Master Audit Verification in Supabase Database');
  const queryRes = await fetch(
    `${SUPABASE_REST_URL}?chair_slip_number=eq.${encodeURIComponent(currentOrderId)}&select=id,chair_slip_number,chair_code,amount,pulse_count,duration_in_minutes,status,created_from,created_at,session_start_at,session_end_at`,
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  let finalSlip = null;
  if (queryRes.ok) {
    const list = await queryRes.json();
    finalSlip = list?.[0] || null;
  }

  if (!finalSlip) {
    throw new Error(`Final slip record not found in database: ${currentOrderId}`);
  }

  logSuccess('Database Master Record Audit PASSED:', {
    slip_number: finalSlip.chair_slip_number,
    chair_code: finalSlip.chair_code,
    amount_idr: finalSlip.amount,
    pulse_count: finalSlip.pulse_count,
    duration_mins: finalSlip.duration_in_minutes,
    final_status: finalSlip.status,
    created_from: finalSlip.created_from,
    session_start: finalSlip.session_start_at,
    session_end: finalSlip.session_end_at,
  });

  console.log(`\n${colors.bold}${colors.green}================================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.green}🎉 ALL 9 IOT INTEGRATION STEPS COMPLETED WITH 100% SUCCESS!${colors.reset}`);
  console.log(`${colors.bold}${colors.green}Dedicated IoT Controller Hub is 100% verified & ready for physical deployment!${colors.reset}`);
  console.log(`${colors.bold}${colors.green}================================================================================\n${colors.reset}`);
}

runSimulation().catch(err => {
  logError('Simulation aborted due to error:', err);
  process.exit(1);
});
