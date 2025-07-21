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

const ABSOLUTE_TARGET_DISTANCE = 20;
const LONG_PRESS_TIME_MOBILE = 100;
const LONG_PRESS_TIME = 400;

export type Optional<T> = T | null;

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
  /** The color of points, default to #dddddd */
  colorPoint?: `#${string}`;
  /** The color of dragging point, default to #00ff00 */
  colorDraggingPoint?: `#${string}`;
  /** The color of average point, default to #00ff00 */
  colorAveragePoint?: `#${string}`;
  /** The color of circle stroke, default to #00ff00*/
  colorStrokeCircle?: `#${string}`;
  /** The width of dark stroke, default to 1.5 */
  dartStrokeWidth?: number;
  /** The base radius of points. */
  pointRadius?: number;
  /** The min scale of canvas */
  minScale?: number;
  /** The max scale of canvas */
  maxScale?: number;
  /** The max offset of dart center */
  maxOffset?: number;
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
  colorDraggingPoint = "#00ff00",
  colorAveragePoint = "#00ff00",
  colorStrokeCircle = "#00ff00",
  dartStrokeWidth = 1.5,
  pointRadius = 5,
  minScale = 0.5,
  maxScale = 5,
  maxOffset = 40,
}: PinchableDartProps) {
  const canvasRef = useRef<Optional<HTMLCanvasElement>>(null);
  const contextRef = useRef<Optional<CanvasRenderingContext2D>>(null);
  const touchTimerRef = useRef<Optional<number>>(null);

  /* prettier-ignore */
  const [center, setCenter] = useState<Point>({ x: width / 2, y: height / 2 });
  /* prettier-ignore */
  const [points, setPoints] = useState<Point[]>([]);
  /* prettier-ignore */
  const [initialPinchPair, setInitialPinchPair] = useState<Optional<[Point, Point]>>(null);
  /* prettier-ignore */
  const [ , setCurrentPinchPair] = useState<Optional<[Point, Point]>>(null);
  /* prettier-ignore */
  const [draggingPoint, setDraggingPoint] = useState<Optional<Point>>(null);
  /* prettier-ignore */
  const [scale, setScale] = useState<number>(1);
  /* prettier-ignore */
  const [isPressing, setIsPressing] = useState<boolean>(false);
  /* prettier-ignore */
  const [hasMoved, setHasMoved] = useState<boolean>(false);

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

    RING_RADIUS.forEach((r, index) => {
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

    points.forEach((point) => {
      drawContext.beginPath();
      drawContext.fillStyle = colorPoint;
      drawContext.arc(
        center.x + point.x * scale,
        center.y + point.y * scale,
        pointRadius * scale,
        0,
        Math.PI * 2,
      );
      drawContext.fill();
    });

    if (draggingPoint !== null) {
      drawContext.beginPath();
      drawContext.fillStyle = colorDraggingPoint;
      drawContext.arc(
        center.x + draggingPoint.x * scale,
        center.y + draggingPoint.y * scale,
        pointRadius * scale * 1.1,
        0,
        Math.PI * 2,
      );
      drawContext.fill();

      if (points.length === 0) return;

      let averagePointsX = 0;
      let averagePointsY = 0;
      let sumPointsX = 0;
      let sumPointsY = 0;

      [...points, draggingPoint].forEach((point) => {
        sumPointsX += center.x + point.x * scale;
        sumPointsY += center.y + point.y * scale;
      });

      averagePointsX = sumPointsX / (points.length + 1);
      averagePointsY = sumPointsY / (points.length + 1);

      drawContext.beginPath();
      drawContext.fillStyle = colorAveragePoint;
      drawContext.arc(
        averagePointsX,
        averagePointsY,
        pointRadius * scale * 1.1,
        0,
        Math.PI * 2,
      );
      drawContext.fill();

      let maxRadius = 0;

      [...points, draggingPoint].forEach((point) => {
        const distance = Math.hypot(
          averagePointsX - (center.x + point.x * scale),
          averagePointsY - (center.y + point.y * scale),
        );

        if (distance > maxRadius) {
          maxRadius = distance;
        }
      });

      drawContext.beginPath();
      drawContext.strokeStyle = colorStrokeCircle;
      drawContext.arc(
        averagePointsX,
        averagePointsY,
        maxRadius,
        0,
        Math.PI * 2,
      );
      drawContext.stroke();
    } else {
      if (points.length === 0) return;

      let averagePointsX = 0;
      let averagePointsY = 0;
      let sumPointsX = 0;
      let sumPointsY = 0;

      points.forEach((point) => {
        sumPointsX += center.x + point.x * scale;
        sumPointsY += center.y + point.y * scale;
      });

      averagePointsX = sumPointsX / points.length;
      averagePointsY = sumPointsY / points.length;

      drawContext.beginPath();
      drawContext.fillStyle = colorAveragePoint;
      drawContext.arc(
        averagePointsX,
        averagePointsY,
        pointRadius * scale * 1.1,
        0,
        Math.PI * 2,
      );
      drawContext.fill();

      let maxRadius = 0;

      points.forEach((point) => {
        const distance = Math.hypot(
          averagePointsX - (center.x + point.x * scale),
          averagePointsY - (center.y + point.y * scale),
        );

        if (distance > maxRadius) {
          maxRadius = distance;
        }
      });

      drawContext.beginPath();
      drawContext.strokeStyle = colorStrokeCircle;
      drawContext.arc(
        averagePointsX,
        averagePointsY,
        maxRadius,
        0,
        Math.PI * 2,
      );
      drawContext.stroke();
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      // When the length of touches is 2, then the function should handle
      // pinching event.

      const touch1: Point = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      const touch2: Point = {
        x: e.touches[1].clientX,
        y: e.touches[1].clientY,
      };
      setInitialPinchPair([touch1, touch2]);
    } else if (e.touches.length === 1) {
      // When the length of touches is 1, then the function should handle
      // clicking or dragging according to starting time.

      setIsPressing(true);
      touchTimerRef.current = setTimeout(() => {
        touchTimerRef.current = null;
      }, LONG_PRESS_TIME_MOBILE);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (!isPressing) return;
    setHasMoved(true);

    if (e.touches.length === 2) {
      if (initialPinchPair === null) return;

      const touch1: Point = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      const touch2: Point = {
        x: e.touches[1].clientX,
        y: e.touches[1].clientY,
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

      const currentScale =
        scale *
        (1 + (0.05 * (currentDistance - initialDistance)) / initialDistance);

      if (currentScale < minScale) {
        setScale(minScale);
      } else if (currentScale > maxScale) {
        setScale(maxScale);
      } else {
        setScale(currentScale);
      }

      const absoluteOffsetX =
        (touch1.x + touch2.x) / 2 -
        (initialPinchPair[0].x + initialPinchPair[1].x) / 2;
      const absoluteOffsetY =
        (touch1.y + touch2.y) / 2 -
        (initialPinchPair[0].y + initialPinchPair[1].y) / 2;

      if (
        Math.abs(center.x + absoluteOffsetX * scale - width / 2) <= maxOffset &&
        Math.abs(center.y + absoluteOffsetY * scale - height / 2) <= maxOffset
      ) {
        setCenter({
          x: center.x + absoluteOffsetX * scale,
          y: center.y + absoluteOffsetY * scale,
        });
      }

      // center is the absolute coordinate.
    } else if (e.touches.length === 1) {
      if (touchTimerRef.current === null) {
        // It's long press.

        if (draggingPoint === null) {
          // When draggingPoint is null, the function should sets the dragging
          // point.

          const canvas = canvasRef.current;
          if (!canvas || !contextRef.current) return;

          const rect = canvas.getBoundingClientRect();
          const downAbsoluteX = e.touches[0].clientX - rect.left;
          const downAbsoluteY = e.touches[0].clientY - rect.top;

          let minAbsoluteDistance = Math.hypot(
            downAbsoluteX - center.x - points[0].x * scale,
            downAbsoluteY - center.y - points[0].y * scale,
          );
          let targetPointIndex: Optional<number> = null;

          points.forEach((point, index) => {
            const distance = Math.hypot(
              downAbsoluteX - center.x - point.x * scale,
              downAbsoluteY - center.y - point.y * scale,
            );
            if (distance < minAbsoluteDistance) {
              minAbsoluteDistance = distance;
              if (minAbsoluteDistance < ABSOLUTE_TARGET_DISTANCE) {
                targetPointIndex = index;
              }
            }
          });

          if (targetPointIndex !== null) {
            setDraggingPoint(points[targetPointIndex]);
            setPoints(points.filter((_, index) => index !== targetPointIndex));
          }
        } else {
          const canvas = canvasRef.current;
          if (!canvas || !contextRef.current) return;

          const rect = canvas.getBoundingClientRect();
          const moveAbsoluteX = e.touches[0].clientX - rect.left;
          const moveAbsoluteY = e.touches[0].clientY - rect.top;

          setDraggingPoint({
            x: (moveAbsoluteX - center.x) / scale,
            y: (moveAbsoluteY - center.y) / scale,
          });
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (touchTimerRef.current !== null && e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const clickAbsoluteX = e.touches[0].clientX - rect.left;
      const clickAbsoluteY = e.touches[0].clientY - rect.top;

      setPoints([
        ...points,
        {
          x: (clickAbsoluteX - center.x) / scale,
          y: (clickAbsoluteY - center.y) / scale,
        },
      ]);
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (draggingPoint !== null) {
      setPoints([...points, draggingPoint]);
      setDraggingPoint(null);
    }

    setHasMoved(false);
    setIsPressing(false);
    setInitialPinchPair(null);
    setCurrentPinchPair(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    setIsPressing(true);
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
    }, LONG_PRESS_TIME);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (!isPressing) return;
    setHasMoved(true);

    if (touchTimerRef.current === null) {
      // It's long press.

      if (draggingPoint === null) {
        // When draggingPoint is null, the function should sets the dragging
        // point.

        const canvas = canvasRef.current;
        if (!canvas || !contextRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const downAbsoluteX = e.clientX - rect.left;
        const downAbsoluteY = e.clientY - rect.top;

        let minAbsoluteDistance = Infinity;
        let targetPointIndex: Optional<number> = null;

        points.forEach((point, index) => {
          const distance = Math.hypot(
            downAbsoluteX - center.x - point.x * scale,
            downAbsoluteY - center.y - point.y * scale,
          );
          if (distance < minAbsoluteDistance) {
            minAbsoluteDistance = distance;
            if (minAbsoluteDistance < ABSOLUTE_TARGET_DISTANCE) {
              targetPointIndex = index;
            }
          }
        });

        if (targetPointIndex !== null) {
          setDraggingPoint(points[targetPointIndex]);
          setPoints(points.filter((_, index) => index !== targetPointIndex));
        }
      } else {
        const canvas = canvasRef.current;
        if (!canvas || !contextRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const moveAbsoluteX = e.clientX - rect.left;
        const moveAbsoluteY = e.clientY - rect.top;

        setDraggingPoint({
          x: (moveAbsoluteX - center.x) / scale,
          y: (moveAbsoluteY - center.y) / scale,
        });
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    if (touchTimerRef.current !== null && !hasMoved) {
      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const clickAbsoluteX = e.clientX - rect.left;
      const clickAbsoluteY = e.clientY - rect.top;

      setPoints([
        ...points,
        {
          x: (clickAbsoluteX - center.x) / scale,
          y: (clickAbsoluteY - center.y) / scale,
        },
      ]);
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (draggingPoint !== null) {
      setPoints([...points, draggingPoint]);
      setDraggingPoint(null);
    }

    setHasMoved(false);
    setIsPressing(false);
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

    return () => {
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => drawDart(), [points, scale, draggingPoint]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <canvas
        id="pinchable-dart"
        ref={canvasRef}
        style={{ width: "100%" }}
        onTouchStart={handleTouchStart}
        onTouchMove={throttle(
          (e: React.TouchEvent<HTMLCanvasElement>) => handleTouchMove(e),
          25,
        )}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={throttle(
          (e: React.MouseEvent<HTMLCanvasElement>) => handleMouseMove(e),
          25,
        )}
        onMouseUp={handleMouseUp}
      />
      <input
        type="range"
        value={scale}
        min={minScale}
        max={maxScale}
        step={0.01}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setScale(parseFloat(e.target.value))
        }
      />
    </div>
  );
}
