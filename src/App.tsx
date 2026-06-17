import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { createFaceLandmarker } from "./services/faceLandmarker";

type Direction =
  | "LEFT"
  | "RIGHT"
  | "UP"
  | "DOWN"
  | "CENTER";

const MENU_ITEMS = [
  "Home",
  "Products",
  "Pricing",
  "Contact",
  "Login",
  "Settings",
];

function App() {
  const webcamRef = useRef<Webcam>(null);

  const [faceDetected, setFaceDetected] =
    useState(false);

  const [isCalibrated, setIsCalibrated] =
    useState(false);

  const [neutralX, setNeutralX] =
    useState(0);

  const [neutralY, setNeutralY] =
    useState(0);

  const [direction, setDirection] =
    useState<Direction>("CENTER");

  const [selectedIndex, setSelectedIndex] =
    useState(0);

  const [noseX, setNoseX] = useState(0);
  const [noseY, setNoseY] = useState(0);

  const gestureStartRef =
    useRef<number | null>(null);

  const repeatStartRef =
    useRef<number | null>(null);

  const lastRepeatRef =
    useRef<number>(0);

  const activeDirectionRef =
    useRef<Direction>("CENTER");

  const executeCommand = (
    dir: Direction
  ) => {
    if (dir === "LEFT") {
      setSelectedIndex((prev) =>
        Math.max(0, prev - 1)
      );
    }

    if (dir === "RIGHT") {
      setSelectedIndex((prev) =>
        Math.min(
          MENU_ITEMS.length - 1,
          prev + 1
        )
      );
    }

    if (dir === "UP") {
      setSelectedIndex(0);
    }

    if (dir === "DOWN") {
      setSelectedIndex(
        MENU_ITEMS.length - 1
      );
    }
  };

  useEffect(() => {
    let animationFrameId: number;

    async function init() {
      const faceLandmarker =
        await createFaceLandmarker();

      let calibrationSamples: number[] =
        [];
      let calibrationSamplesY: number[] =
        [];

      let calibrationStart =
        performance.now();

      const detect = () => {
        const video =
          webcamRef.current?.video;

        if (
          video &&
          video.readyState === 4
        ) {
          const results =
            faceLandmarker.detectForVideo(
              video,
              performance.now()
            );

          const hasFace =
            results.faceLandmarks.length > 0;

          setFaceDetected(hasFace);

          if (hasFace) {
            const landmarks =
              results.faceLandmarks[0];

            const nose =
              landmarks[1];

            setNoseX(nose.x);
            setNoseY(nose.y);

            if (!isCalibrated) {
              calibrationSamples.push(
                nose.x
              );

              calibrationSamplesY.push(
                nose.y
              );

              if (
                performance.now() -
                  calibrationStart >
                2000
              ) {
                const avgX =
                  calibrationSamples.reduce(
                    (a, b) => a + b,
                    0
                  ) /
                  calibrationSamples.length;

                const avgY =
                  calibrationSamplesY.reduce(
                    (a, b) => a + b,
                    0
                  ) /
                  calibrationSamplesY.length;

                setNeutralX(avgX);
                setNeutralY(avgY);
                setIsCalibrated(true);
              }
            } else {
              const dx =
                nose.x - neutralX;

              const dy =
                nose.y - neutralY;

              let currentDirection: Direction =
                "CENTER";

              if (dx > 0.04)
                currentDirection =
                  "LEFT";
              else if (dx < -0.03)
                currentDirection =
                  "RIGHT";
              else if (dy < -0.08)
                currentDirection =
                  "UP";
              else if (dy > 0.08)
                currentDirection =
                  "DOWN";

              setDirection(
                currentDirection
              );

              const now =
                performance.now();

              if (
                currentDirection ===
                "CENTER"
              ) {
                gestureStartRef.current =
                  null;

                repeatStartRef.current =
                  null;

                activeDirectionRef.current =
                  "CENTER";
              } else {
                if (
                  activeDirectionRef.current !==
                  currentDirection
                ) {
                  activeDirectionRef.current =
                    currentDirection;

                  gestureStartRef.current =
                    now;

                  repeatStartRef.current =
                    null;
                }

                const gestureTime =
                  now -
                  (gestureStartRef.current ||
                    now);

                if (
                  gestureTime >
                    200 &&
                  repeatStartRef.current ===
                    null
                ) {
                  executeCommand(
                    currentDirection
                  );

                  repeatStartRef.current =
                    now;
                }

                if (
                  repeatStartRef.current !==
                  null
                ) {
                  const holdTime =
                    now -
                    repeatStartRef.current;

                  if (
                    holdTime >
                    1000
                  ) {
                    if (
                      now -
                        lastRepeatRef.current >
                      200
                    ) {
                      executeCommand(
                        currentDirection
                      );

                      lastRepeatRef.current =
                        now;
                    }
                  }
                }
              }
            }
          }
        }

        animationFrameId =
          requestAnimationFrame(
            detect
          );
      };

      detect();
    }

    init();

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );
    };
  }, [
    isCalibrated,
    neutralX,
    neutralY,
  ]);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <h1>EyeBridge V4</h1>

      <h2>
        Face:
        {faceDetected
          ? " ✅"
          : " ❌"}
      </h2>

      {!isCalibrated && (
        <h2>
          Look straight at the screen...
          Calibrating
        </h2>
      )}

      {isCalibrated && (
        <>
          <h2>
            Direction: {direction}
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap: "12px",
              marginTop: "30px",
              width: "300px",
            }}
          >
            {MENU_ITEMS.map(
              (item, index) => (
                <div
                  key={item}
                  style={{
                    padding:
                      "15px",
                    borderRadius:
                      "10px",
                    border:
                      index ===
                      selectedIndex
                        ? "4px solid lime"
                        : "2px solid #444",
                    boxShadow:
                      index ===
                      selectedIndex
                        ? "0 0 20px lime"
                        : "none",
                    fontSize:
                      "22px",
                  }}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </>
      )}

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          background:
            "black",
          color: "white",
          padding: "12px",
          borderRadius:
            "8px",
          fontFamily:
            "monospace",
        }}
      >
        <div>
          noseX:
          {noseX.toFixed(3)}
        </div>

        <div>
          noseY:
          {noseY.toFixed(3)}
        </div>

        <div>
          neutralX:
          {neutralX.toFixed(3)}
        </div>

        <div>
          neutralY:
          {neutralY.toFixed(3)}
        </div>

        <div>
          direction:
          {direction}
        </div>
      </div>

      <Webcam
        ref={webcamRef}
        mirrored
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 320,
          borderRadius: "12px",
        }}
      />
    </div>
  );
}

export default App;