import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // 흰색 테두리 제거용 글로벌 CSS
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
