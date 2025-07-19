import { useEffect, useRef, useState } from "react";

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
}: PinchableDartProps) {
  const canvasRef = useRef<Optional<HTMLCanvasElement>>(null);
  const context = useRef<Optional<CanvasRenderingContext2D>>(null);

  /* prettier-ignore */
  const [points, setPoints] = useState<Point[]>([]);
  /* prettier-ignore */
  const [draggingPoint, setDraggingPoint] = useState<Optional<Point>>(null);
  /* prettier-ignore */
  const [scale, setScale] = useState<number>(1);

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
    }

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
    const drawContext = context.current;
    if (drawContext === null) return;

    drawContext.clearRect(0, 0, width, height);

    const initialDartCenterX = width / 2;
    const initialDartCenterY = height / 2;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas !== null) {
      canvas.width = width;
      canvas.height = height;
      context.current = canvas.getContext("2d");
    }
  }, []);

  return <canvas ref={canvasRef} />;
}
