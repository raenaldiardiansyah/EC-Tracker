import mqtt from "mqtt";

const BROKER_URL = "wss://broker.emqx.io:8084/mqtt";

const MQTT_OPTIONS: mqtt.IClientOptions = {
  clientId:        `agv_${Math.random().toString(16).slice(2, 8)}`,
  clean:           true,
  connectTimeout:  20000,  // 20s untuk koneksi dari Indonesia
  reconnectPeriod: 5000,   // retry tiap 5s otomatis
  keepalive:       60,
  protocolVersion: 4,
};

export const TOPICS = {
  GPS:     "EC/ElectricCar/vpin/V1",
  BATTERY: "EC/ElectricCar/vpin/V2",
  VOTOL:   "EC/ElectricCar/vpin/V3",  // Votol: rpm, voltage, current
} as const;

export const mqttClient = mqtt.connect(BROKER_URL, MQTT_OPTIONS);

mqttClient.on("connect", () => {
  console.log("✅ MQTT Connected");
  console.log(`📡 Client ID: ${MQTT_OPTIONS.clientId}`);

  Object.entries(TOPICS).forEach(([name, topic]) => {
    mqttClient.subscribe(topic, { qos: 0 }, (err) => {
      if (err) console.error(`❌ Gagal subscribe ${name}:`, err);
      else     console.log(`✅ Subscribed: ${topic}`);
    });
  });
});

mqttClient.on("reconnect",  ()    => console.log("🔄 MQTT Reconnecting..."));
mqttClient.on("offline",    ()    => console.warn("⚠️ MQTT Offline"));
mqttClient.on("close",      ()    => console.log("🔌 MQTT Connection closed"));
mqttClient.on("error",      (err) => console.error("❌ MQTT Error:", err.message));

export const disconnectMQTT = () => {
  if (mqttClient.connected) {
    mqttClient.end(false, {}, () => console.log("👋 MQTT Disconnected"));
  }
};