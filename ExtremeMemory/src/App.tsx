import { useRef } from "react";
import "./App.css";
import PinchableDart, { type Optional } from "./components/pinchable-dart";

function App() {
  const containerRef = useRef<Optional<HTMLDivElement>>(null);
  return (
    <div
      style={{
        width: "70%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      ref={containerRef}
    >
      <PinchableDart
        width={containerRef.current?.clientWidth}
        height={containerRef.current?.clientHeight}
      />
    </div>
  );
}

export default App;
