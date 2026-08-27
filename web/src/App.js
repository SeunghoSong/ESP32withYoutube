import React, { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import YouTube from "react-youtube";

const BROKER_URL = process.env.REACT_APP_MQTT_BROKER_URL || "ws://localhost:9001";
const TOPIC = process.env.REACT_APP_MQTT_TOPIC || "zerotouch/cam01/face";

export default function App() {
  const [status, setStatus] = useState("connecting");
  const [faceCount, setFaceCount] = useState(0);
  const playerRef = useRef(null);

  // --- 부가기능 상태(State) ---
  const [focusTime, setFocusTime] = useState(0); // 집중 시간(초)
  const [distractionCount, setDistractionCount] = useState(0); // 딴짓 횟수
  const [blockCount, setBlockCount] = useState(0); // 차단 횟수
  const [videoId, setVideoId] = useState("M0N-Hxgqi7I"); // 기본 영상
  const prevFaceCount = useRef(0);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL);

    client.on("connect", () => {
      setStatus("connected");
      client.subscribe(TOPIC);
    });
    client.on("reconnect", () => setStatus("reconnecting"));
    client.on("close", () => setStatus("disconnected"));
    client.on("error", () => setStatus("error"));
    
    client.on("message", (topic, payload) => {
      const count = parseInt(payload.toString(), 10);
      if (!isNaN(count)) {
        setFaceCount(count);
      }
    });

    return () => client.end(true);
  }, []);

  // 유튜브 제어 및 통계 카운트 로직
  useEffect(() => {
    const player = playerRef.current;
    
    if (faceCount === 1) {
      if (player) player.playVideo();
    } else {
      if (player) player.pauseVideo();
    }

    // 통계 기록 로직
    if (prevFaceCount.current === 1 && faceCount === 0) {
      setDistractionCount(prev => prev + 1);
    }
    if (prevFaceCount.current <= 1 && faceCount > 1) {
      setBlockCount(prev => prev + 1);
    }
    prevFaceCount.current = faceCount;
  }, [faceCount]);

  // 타이머 로직 (1초마다 갱신)
  useEffect(() => {
    let interval = null;
    if (faceCount === 1) {
      interval = setInterval(() => {
        setFocusTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [faceCount]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
  };

  const isBlackout = faceCount > 1;

  // 시간 포맷 변환 함수 (초 -> MM:SS)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      display: "flex",
      width: "100vw",
      height: "100vh",
      backgroundColor: "#121212",
      color: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      overflow: "hidden"
    }}>
      
      {/* 왼쪽 메인 화면 (비디오 영역) */}
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column" }}>
        
        {/* Blackout Overlay */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(10px)",
          zIndex: 10,
          display: isBlackout ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          transition: "opacity 0.3s ease"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "400", letterSpacing: "1px", marginBottom: "8px" }}>Playback Paused</h2>
          <p style={{ color: "#888", fontSize: "14px", fontWeight: "300" }}>Multiple viewers detected. Privacy mode enabled.</p>
        </div>

        {/* 비디오 컨테이너 */}
        <div style={{
          flex: 1,
          pointerEvents: "none",
          display: "flex"
        }}>
          <YouTube 
            videoId={videoId}
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, rel: 0, mute: 0 },
            }}
            onReady={onPlayerReady}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {/* 오른쪽 대시보드 사이드바 */}
      <div style={{
        width: "360px",
        backgroundColor: "#1a1a1a",
        borderLeft: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        padding: "24px",
        zIndex: 1
      }}>
        {/* 헤더 & 상태 */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "#fff" }}>Zero-Touch AI</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#888" }}>
            <div style={{
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: status === "connected" ? "#4caf50" : "#f44336"
            }} />
            {status.toUpperCase()}
          </div>
        </div>

        {/* 실시간 집중력 타이머 (Pomodoro) */}
        <div style={{
          backgroundColor: "#222",
          padding: "24px",
          borderRadius: "16px",
          marginBottom: "24px",
          textAlign: "center",
          border: faceCount === 1 ? "1px solid #4caf50" : "1px solid #333",
          transition: "border 0.3s ease"
        }}>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "8px", fontWeight: "500" }}>REAL-FOCUS TIME</div>
          <div style={{ fontSize: "48px", fontWeight: "200", color: faceCount === 1 ? "#4caf50" : "#fff", letterSpacing: "2px" }}>
            {formatTime(focusTime)}
          </div>
          <div style={{ fontSize: "12px", color: faceCount === 1 ? "#4caf50" : "#666", marginTop: "8px" }}>
            {faceCount === 1 ? "● Recording..." : "Paused (No Face Detected)"}
          </div>
        </div>

        {/* 분석 대시보드 */}
        <div style={{ marginBottom: "40px" }}>
          <h3 style={{ fontSize: "14px", color: "#888", marginBottom: "16px", fontWeight: "500", letterSpacing: "1px" }}>ANALYTICS</h3>
          
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #2a2a2a" }}>
            <span style={{ color: "#aaa", fontSize: "14px" }}>Distractions (Look aways)</span>
            <span style={{ color: "#fff", fontWeight: "600" }}>{distractionCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #2a2a2a" }}>
            <span style={{ color: "#aaa", fontSize: "14px" }}>Privacy Blocks (>1 person)</span>
            <span style={{ color: "#fff", fontWeight: "600" }}>{blockCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0" }}>
            <span style={{ color: "#aaa", fontSize: "14px" }}>Current Face Count</span>
            <span style={{ color: "#fff", fontWeight: "600" }}>{faceCount}</span>
          </div>
        </div>

        {/* 스마트 플레이리스트 */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: "14px", color: "#888", marginBottom: "16px", fontWeight: "500", letterSpacing: "1px" }}>QUICK CHANNELS</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* 1번 채널: 일론 머스크 */}
            <button 
              onClick={() => setVideoId("M0N-Hxgqi7I")}
              style={{ padding: "16px", backgroundColor: videoId === "M0N-Hxgqi7I" ? "#333" : "#222", border: "none", borderRadius: "12px", color: "#fff", cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}>
              🚀 Elon Musk
            </button>
            
            {/* 2번 채널: BGM - 여기서 "5qap5aO4i9A" 를 원하는 영상 ID로 바꾸세요! */}
            <button 
              onClick={() => setVideoId("qFspQeFDXKQ")}
              style={{ padding: "16px", backgroundColor: videoId === "qFspQeFDXKQ" ? "#333" : "#222", border: "none", borderRadius: "12px", color: "#fff", cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}>
              🎵 BGM
            </button>
            
            {/* 3번 채널: News - 여기서 "jfKfPfyJRdk" 를 원하는 영상 ID로 바꾸세요! */}
            <button 
              onClick={() => setVideoId("3aK4M7ou_yc")}
              style={{ padding: "16px", backgroundColor: videoId === "3aK4M7ou_yc" ? "#333" : "#222", border: "none", borderRadius: "12px", color: "#fff", cursor: "pointer", textAlign: "left", transition: "background 0.2s" }}>
              📰 News
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
