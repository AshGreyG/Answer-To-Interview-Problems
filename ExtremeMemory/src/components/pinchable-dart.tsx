import React, { useEffect, useRef, useState } from "react";

// prettier-multiline-arrays-next-line-pattern: 11
const RING_RADIUS = Object.freeze([
  1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20,
]);

// prettier-multiline-arrays-next-line-pattern: 10
const HEX_COLOR = Object.freeze([
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "a", "A", "b", "B", "c", "C", "d", "D", "e", "E",
  "f", "F",
]);

type Optional<T> = T | null;

interface Point {
  x: number;
  y: number;
}

interface PinchableDartProps {
  /** The width of PinchableDart, default to 800 */
  width?: number;
  /** The height of PinchableDart, default to 800 */
  height?: number;
  /** The color of ring 1~3, default to #ffff00 */
  color1?: `#${string}`;
  /** The color of ring 4~5, default to #ff0000 */
  color2?: `#${string}`;
  /** The color of ring 6~7, default to #0000ff */
  color3?: `#${string}`;
  /** The color of ring 8~9, default to #000000 */
  color4?: `#${string}`;
  /** The color of ring 10~11, default to #ffffff */
  color5?: `#${string}`;
  /** The color of dark stroke, default to #000000 */
  colorStrokeDark?: `#${string}`;
  /** The color of light stroke, default to #ffffff */
  colorStrokeLight?: `#${string}`;
  /** The color of points */
  colorPoint?: `#${string}`;
  /** The width of dark stroke, default to 1.5 */
  dartStrokeWidth?: number;
  /** The base radius of points. */
  pointRadius?: number;
}

function throttle(callbackFn: Function, delay: number) {
  let lastTime = 0;

  return function (...args: unknown[]) {
    // @ts-expect-error
    const context = this;
    const now = Date.now();

    if (now - lastTime >= delay) {
      lastTime = now;
      callbackFn.apply(context, args);
    }
  };
}

export default function PinchableDart({
  width = 800,
  height = 800,
  color1 = "#ffff00",
  color2 = "#ff0000",
  color3 = "#0000ff",
  color4 = "#000000",
  color5 = "#ffffff",
  colorStrokeDark = "#000000",
  colorStrokeLight = "#ffffff",
  colorPoint = "#dddddd",
  dartStrokeWidth = 1.5,
  pointRadius = 5,
}: PinchableDartProps) {
  const canvasRef = useRef<Optional<HTMLCanvasElement>>(null);
  const contextRef = useRef<Optional<CanvasRenderingContext2D>>(null);

  /* prettier-ignore */
  const [center, ] = useState<Point>({ x: width / 2, y: height / 2 });
  /* prettier-ignore */
  const [points, setPoints] = useState<Point[]>([]);
  /* prettier-ignore */
  const [initialPinchPair, setInitialPinchPair] = useState<Optional<[Point, Point]>>(null);
  /* prettier-ignore */
  const [ , setCurrentPinchPair] = useState<Optional<[Point, Point]>>(null);
  /* prettier-ignore */
  const [ , ] = useState<Optional<Point>>(null);
  /* prettier-ignore */
  const [scale, setScale] = useState<number>(1);

  const INITIAL_CANVAS_BASE = Math.min(width, height) / 40;

  /**
   * @remark Define a definite type of hex color is impossible, 22 ^ 4 > 100000.
   * TypeScript only supports 100000 elements union type.
   */
  const isLight = (color: `#${string}`): boolean => {
    const isHexColor: boolean =
      color
        .replace("#", "")
        .split("")
        .every((digit) => HEX_COLOR.includes(digit)) &&
      (color.length === 7 || color.length === 4);

    const gammaCorrect = (value: number): number => {
      return value <= 0.03928
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    };

    try {
      if (!isHexColor)
        throw new Error("[Utils]: Input color is not a hex presentation");

      if (color.length === 7) {
        const r = parseInt(color.slice(1, 3), 16) / 255;
        const g = parseInt(color.slice(3, 5), 16) / 255;
        const b = parseInt(color.slice(5, 7), 16) / 255;

        const rCorrect = gammaCorrect(r);
        const gCorrect = gammaCorrect(g);
        const bCorrect = gammaCorrect(b);

        return 0.2126 * rCorrect + 0.7152 * gCorrect + 0.0722 * bCorrect >= 0.5;
      } else {
        const r = parseInt(color.charAt(1), 16) / 255;
        const g = parseInt(color.charAt(2), 16) / 255;
        const b = parseInt(color.charAt(3), 16) / 255;

        const rCorrect = gammaCorrect(r);
        const gCorrect = gammaCorrect(g);
        const bCorrect = gammaCorrect(b);

        return 0.2126 * rCorrect + 0.7152 * gCorrect + 0.0722 * bCorrect >= 0.5;
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      return false;
    }
  };

  /**
   * This function draws the dart and the points.
   */
  const drawDart = () => {
    const drawContext = contextRef.current;
    if (drawContext === null) return;

    drawContext.clearRect(0, 0, width, height);

    RING_RADIUS.map((r, index) => {
      let currentColor = "#null" as `#${string}`;
      switch (index) {
        case 0:
        case 1:
        case 2:
          currentColor = color1;
          break;
        case 3:
        case 4:
          currentColor = color2;
          break;
        case 5:
        case 6:
          currentColor = color3;
          break;
        case 7:
        case 8:
          currentColor = color4;
          break;
        case 9:
        case 10:
          currentColor = color5;
          break;
      }

      drawContext.lineWidth = dartStrokeWidth;
      drawContext.strokeStyle = isLight(currentColor)
        ? colorStrokeDark
        : colorStrokeLight;

      drawContext.fillStyle = currentColor;

      drawContext.beginPath();
      drawContext.arc(
        center.x,
        center.y,
        r * INITIAL_CANVAS_BASE * scale,
        0,
        Math.PI * 2,
      );
      drawContext.stroke();

      drawContext.beginPath();
      if (index === 0) {
        drawContext.arc(
          center.x,
          center.y,
          r * INITIAL_CANVAS_BASE * scale - dartStrokeWidth / 2,
          0,
          Math.PI * 2,
        );
        drawContext.fill();
      } else {
        drawContext.arc(
          center.x,
          center.y,
          r * INITIAL_CANVAS_BASE * scale - dartStrokeWidth / 2,
          0,
          Math.PI * 2,
        );
        drawContext.arc(
          center.x,
          center.y,
          RING_RADIUS[index - 1] * INITIAL_CANVAS_BASE * scale +
            dartStrokeWidth / 2,
          0,
          Math.PI * 2,
          true,
        );
        drawContext.fill();
      }
    });

    points.map((point) => {
      drawContext.beginPath();
      drawContext.fillStyle = colorPoint;
      drawContext.arc(
        (center.x + point.x) * scale,
        (center.y + point.y) * scale,
        pointRadius * scale,
        0,
        Math.PI * 2,
      );
      drawContext.fill();
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const clickAbsoluteX = e.clientX - rect.left;
    const clickAbsoluteY = e.clientY - rect.top;

    setPoints([
      ...points,
      {
        x: (clickAbsoluteX - center.x * scale) / scale,
        y: (clickAbsoluteY - center.y * scale) / scale,
      },
    ]);
  };

  const handlePinchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 2) return;

    const touch1: Point = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    const touch2: Point = {
      x: e.touches[1].clientX,
      y: e.touches[1].clientY,
    };
    setInitialPinchPair([touch1, touch2]);
  };

  const handlePinchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 2 || initialPinchPair === null) return;

    const touch1: Point = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    const touch2: Point = {
      x: e.touches[1].clientX,
      y: e.touches[0].clientY,
    };
    setCurrentPinchPair([touch1, touch2]);

    const initialDistance = Math.hypot(
      initialPinchPair[0].x - initialPinchPair[1].x,
      initialPinchPair[0].y - initialPinchPair[1].y,
    );
    const currentDistance = Math.hypot(
      touch1.x - touch2.x,
      touch1.y - touch2.y,
    );

    if (
      currentDistance / initialDistance >= 0.2 &&
      currentDistance / initialDistance <= 5
    ) {
      setScale(currentDistance / initialDistance);
    }
  };

  const handlePinchEnd = () => {
    setInitialPinchPair(null);
    setCurrentPinchPair(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas !== null) {
      canvas.width = width;
      canvas.height = height;
      contextRef.current = canvas.getContext("2d");
    }
    drawDart();
  }, []);

  useEffect(() => drawDart(), [points, scale]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      onTouchStart={handlePinchStart}
      onTouchMove={throttle(
        (e: React.TouchEvent<HTMLCanvasElement>) => handlePinchMove(e),
        16,
      )}
      onTouchEnd={handlePinchEnd}
    />
  );
}
