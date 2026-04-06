import { useState, useEffect, useRef } from "react";

export default function DrawCanvas({ isDrawer, send }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(3);
  const lastPos = useRef(null);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const startDraw = (e) => {
    if (!isDrawer) return;
    e.preventDefault();
    setDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    if (!drawing || !isDrawer) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x * canvasRef.current.width, lastPos.current.y * canvasRef.current.height);
    ctx.lineTo(pos.x * canvasRef.current.width, pos.y * canvasRef.current.height);
    ctx.stroke();
    send({ action: "draw", data: { from: lastPos.current, to: pos, color, size: brushSize } });
    lastPos.current = pos;
  };

  const stopDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    send({ action: "clear_canvas" });
  };

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []);

  // Expose canvas globally for incoming draw data
  useEffect(() => {
    window.__drawCanvas = canvasRef.current;
    return () => { window.__drawCanvas = null; };
  }, []);

  const colors = ["#ffffff", "#ff4444", "#44ff44", "#4444ff", "#ffff44", "#ff44ff", "#44ffff", "#ff8800", "#000000"];

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={500} height={400}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{
          border: "2px solid #333", borderRadius: 12,
          cursor: isDrawer ? "crosshair" : "default",
          width: "100%", maxWidth: 500, touchAction: "none",
        }}
      />
      {isDrawer && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {colors.map((c) => (
            <button
              key={c} onClick={() => setColor(c)}
              style={{
                width: 26, height: 26, borderRadius: "50%",
                background: c, border: color === c ? "3px solid #64ffda" : "2px solid #555",
                cursor: "pointer",
              }}
            />
          ))}
          <input
            type="range" min="1" max="12" value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ marginLeft: 8, width: 80 }}
          />
          <button onClick={clearCanvas} style={{
            padding: "6px 14px", borderRadius: 6,
            background: "#ff4444", color: "#fff", border: "none",
            fontWeight: 600, cursor: "pointer", fontSize: 12,
          }}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
