import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";

const BROKER_URL = process.env.REACT_APP_MQTT_BROKER_URL || "ws://localhost:9001";
const TOPIC = process.env.REACT_APP_MQTT_TOPIC || "zerotouch/cam01/face";

export default function App() {
  const [status, setStatus] = useState("connecting");
  const [lastMessage, setLastMessage] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL);
    clientRef.current = client;

    client.on("connect", () => {
      setStatus("connected");
      client.subscribe(TOPIC);
    });
    client.on("reconnect", () => setStatus("reconnecting"));
    client.on("close", () => setStatus("disconnected"));
    client.on("error", () => setStatus("error"));
    client.on("message", (topic, payload) => {
      setLastMessage({ topic, payload: payload.toString(), receivedAt: new Date().toISOString() });
    });

    return () => {
      client.end(true);
    };
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Zero-Touch Media Control</h1>
      <p>
        Broker: <code>{BROKER_URL}</code> &middot; Topic: <code>{TOPIC}</code>
      </p>
      <p>Status: <strong>{status}</strong></p>
      {lastMessage ? (
        <pre style={{ background: "#f0f0f0", padding: "1rem", overflowX: "auto" }}>
          {JSON.stringify(lastMessage, null, 2)}
        </pre>
      ) : (
        <p>메시지를 기다리는 중...</p>
      )}
    </div>
  );
}
