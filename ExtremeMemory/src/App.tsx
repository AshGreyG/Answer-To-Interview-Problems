import { useEffect, useRef, useState } from "react";
import "./App.css";
import PinchableDart, { type Optional } from "./components/pinchable-dart";

function App() {
  const containerRef = useRef<Optional<HTMLDivElement>>(null);
  /* pettier-ignore */
  const [dimensions, setDimensions] = useState<
    Optional<{
      width: number;
      height: number;
    }>
  >(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    window.addEventListener("resize", updateDimensions);

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
    };
  }, []);

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
        width={dimensions?.width}
        height={dimensions?.width}
      />
    </div>
  );
}

export default App;
