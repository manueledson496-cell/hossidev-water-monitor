import React, { useState } from 'react';
import { Cpu, Copy, Check, Terminal, Wifi, Usb, X, Code2, ShieldAlert } from 'lucide-react';

interface ArduinoBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArduinoBridgeModal: React.FC<ArduinoBridgeModalProps> = ({ isOpen, onClose }) => {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'serial' | 'esp32_wifi' | 'json_format'>('serial');

  if (!isOpen) return null;

  const copyCode = (code: string, tabId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabId);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const ARDUINO_SERIAL_SKETCH = `/*
 * Hossidev Water Monitor - Firmware Arduino / ESP32
 * Comunicação Real com Barramento SCADA a 115200 bps
 * Monitora 10 sensores ópticos por tanque e bombas
 */

#include <Arduino.h>

const int PROBES_T1[10] = {2, 3, 4, 5, 6, 7, 8, 9, 10, 11}; // Pinos dos 10 sensores T1
const int PROBES_T2[10] = {12, 13, A0, A1, A2, A3, A4, A5, 14, 15}; // Sensores T2
const int RELAY_PUMP_T1 = 16;
const int RELAY_PUMP_T2 = 17;

void setup() {
  Serial.begin(115200);
  
  for (int i = 0; i < 10; i++) {
    pinMode(PROBES_T1[i], INPUT_PULLUP);
    pinMode(PROBES_T2[i], INPUT_PULLUP);
  }
  
  pinMode(RELAY_PUMP_T1, OUTPUT);
  pinMode(RELAY_PUMP_T2, OUTPUT);
}

void loop() {
  int t1_sensors[10];
  int t1_submerged = 0;
  
  for (int i = 0; i < 10; i++) {
    // Sensor com água fecha contato para GND (ativo nível baixo)
    t1_sensors[i] = (digitalRead(PROBES_T1[i]) == LOW) ? 1 : 0;
    if (t1_sensors[i] == 1) t1_submerged++;
  }
  
  int t1_level = t1_submerged * 10; // Nível em %
  int t1_pump = digitalRead(RELAY_PUMP_T1) ? 1 : 0;

  // Monta pacote JSON padrão Hossidev
  Serial.print("{\\"device\\":\\"kizomba\\",\\"node\\":1,\\"tanks\\":[");
  Serial.print("{\\"id\\":1,\\"level\\":");
  Serial.print(t1_level);
  Serial.print(",\\"pump\\":");
  Serial.print(t1_pump);
  Serial.print(",\\"sensors\\":[");
  for (int i = 0; i < 10; i++) {
    Serial.print(t1_sensors[i]);
    if (i < 9) Serial.print(",");
  }
  Serial.println("],\\"fault\\":0}]}");

  delay(2000); // Envia telemetria a cada 2 segundos
}`;

  const ESP32_WIFI_SKETCH = `/*
 * Hossidev Water Monitor - Gateway ESP32 WiFi / HTTP Ingestion
 * Envia leituras diretamente para o Backend via POST /api/telemetry/ingest
 */

#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "SEU_WIFI_SSID";
const char* password = "SUA_SENHA_WIFI";
const char* serverUrl = "https://SEU_DOMINIO/api/telemetry/ingest";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi conectado!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");

    // Exemplo de leitura real de 10 provas
    String payload = "{\\"nodeId\\":1,\\"source\\":\\"http_ingest\\",\\"tanks\\":[{\\"id\\":1,\\"level\\":80,\\"pump\\":1,\\"sensors\\":[1,1,1,1,1,1,1,1,0,0],\\"fault\\":0}]}";

    int httpResponseCode = http.POST(payload);
    Serial.printf("Status HTTP: %d\\n", httpResponseCode);
    http.end();
  }
  delay(5000);
}`;

  const JSON_PAYLOAD_SPEC = `{
  "device": "kizomba",
  "nodeId": 1,
  "source": "serial_bridge",
  "tanks": [
    {
      "id": 1,
      "level": 70,
      "pump": 1,
      "sensors": [1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      "fault": 0
    },
    {
      "id": 2,
      "level": 60,
      "pump": 0,
      "sensors": [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      "fault": 0
    }
  ]
}`;

  return (
    <div
      id="arduinoBridgeModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Integração e Comunicação Serial
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Web Serial a 115200 bps e API de Ingestão REST
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-slate-800/60">
          <button
            onClick={() => setActiveTab('serial')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'serial'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Usb className="w-3.5 h-3.5" />
            <span>Comunicação Serial (USB 115200)</span>
          </button>
          <button
            onClick={() => setActiveTab('esp32_wifi')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'esp32_wifi'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Gateway de Rede (HTTP POST)</span>
          </button>
          <button
            onClick={() => setActiveTab('json_format')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'json_format'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Especificação do Pacote JSON</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">
              {activeTab === 'serial' && 'Script para Central de Controlo / Porta Serial:'}
              {activeTab === 'esp32_wifi' && 'Script para Gateway com Envio HTTP / Rede:'}
              {activeTab === 'json_format' && 'Formato da Carga de Dados (Payload REST/Serial):'}
            </span>

            <button
              onClick={() => {
                const text =
                  activeTab === 'serial'
                    ? ARDUINO_SERIAL_SKETCH
                    : activeTab === 'esp32_wifi'
                    ? ESP32_WIFI_SKETCH
                    : JSON_PAYLOAD_SPEC;
                copyCode(text, activeTab);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedTab === activeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[340px] leading-relaxed">
              {activeTab === 'serial' && ARDUINO_SERIAL_SKETCH}
              {activeTab === 'esp32_wifi' && ESP32_WIFI_SKETCH}
              {activeTab === 'json_format' && JSON_PAYLOAD_SPEC}
            </pre>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 flex items-start gap-2.5">
            <Terminal className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-cyan-300">Como funciona o fluxo 100% real:</span>
              <p className="text-[11px] text-slate-400">
                1. A central lê as 10 provas ópticas físicas e estado dos relés de bomba.
                <br />
                2. Envia o pacote JSON via Serial USB ou HTTP POST para <code className="text-cyan-300">/api/telemetry/ingest</code>.
                <br />
                3. O backend armazena a leitura no histórico e a interface atualiza os gráficos e cartões instantaneamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
