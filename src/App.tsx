import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { createFaceLandmarker } from "./services/faceLandmarker";

function App() {
  const webcamRef = useRef<Webcam>(null);

  const [faceDetected, setFaceDetected] = useState(false);

  const [smoothX, setSmoothX] = useState(window.innerWidth / 2);
  const [smoothY, setSmoothY] = useState(window.innerHeight / 2);

  const [latestIris, setLatestIris] = useState({
    x: 0,
    y: 0,
  });

  const calibrationPoints = [
    { x: 100, y: 100 },
    { x: window.innerWidth - 100, y: 100 },
    { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    { x: 100, y: window.innerHeight - 100 },
    { x: window.innerWidth - 100, y: window.innerHeight - 100 },
  ];

  const [currentPoint, setCurrentPoint] = useState(0);
  const [samples, setSamples] = useState<any[]>([]);
  const [calibrated, setCalibrated] = useState(false);

  const captureCalibration = () => {
    const point = calibrationPoints[currentPoint];

    const sample = {
      irisX: latestIris.x,
      irisY: latestIris.y,
      screenX: point.x,
      screenY: point.y,
    };

    const updated = [...samples, sample];

    setSamples(updated);

    if (currentPoint < calibrationPoints.length - 1) {
      setCurrentPoint(currentPoint + 1);
    } else {
      setCalibrated(true);

      console.log("Calibration Complete");
      console.table(updated);
    }
  };

  useEffect(() => {
    let animationFrameId: number;

    async function init() {
      const faceLandmarker = await createFaceLandmarker();

      const detect = () => {
        const video = webcamRef.current?.video;

        if (video && video.readyState === 4) {
          const results = faceLandmarker.detectForVideo(
            video,
            performance.now()
          );

          const hasFace =
            results.faceLandmarks.length > 0;

          setFaceDetected(hasFace);

          if (hasFace) {
            const landmarks =
              results.faceLandmarks[0];

            const leftIris =
              landmarks[468];

            const rightIris =
              landmarks[473];

            const irisX =
              (leftIris.x + rightIris.x) / 2;

            const irisY =
              (leftIris.y + rightIris.y) / 2;

            setLatestIris({
              x: irisX,
              y: irisY,
            });

            const sensitivity = 3;

            const targetX =
              window.innerWidth / 2 +
              (0.5 - irisX) *
                window.innerWidth *
                sensitivity;

            const targetY =
              window.innerHeight / 2 +
              (irisY - 0.5) *
                window.innerHeight *
                sensitivity;

            setSmoothX(
              (prev) =>
                prev * 0.85 +
                targetX * 0.15
            );

            setSmoothY(
              (prev) =>
                prev * 0.85 +
                targetY * 0.15
            );
          }
        }

        animationFrameId =
          requestAnimationFrame(detect);
      };

      detect();
    }

    init();

    return () => {
      cancelAnimationFrame(
        animationFrameId
      );
    };
  }, []);

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "20px",
        }}
      >
        <h1>EyeBridge</h1>

        <h2>
          Face Detected:{" "}
          {faceDetected
            ? "✅ YES"
            : "❌ NO"}
        </h2>

        <Webcam
          ref={webcamRef}
          mirrored
          style={{
            width: 640,
            borderRadius: "12px",
            border: "2px solid #444",
          }}
        />
      </div>

      {!calibrated && (
        <>
          <div
            style={{
              position: "fixed",
              width: 40,
              height: 40,
              borderRadius: "50%",
              backgroundColor: "blue",
              left:
                calibrationPoints[
                  currentPoint
                ].x,
              top:
                calibrationPoints[
                  currentPoint
                ].y,
              transform:
                "translate(-50%, -50%)",
              zIndex: 10000,
            }}
          />

          <button
            onClick={captureCalibration}
            style={{
              position: "fixed",
              bottom: 20,
              left: 20,
              padding: "10px 20px",
              zIndex: 10001,
            }}
          >
            Capture Point
          </button>
        </>
      )}

      <div
        style={{
          position: "fixed",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          backgroundColor: "red",
          left: smoothX,
          top: smoothY,
          transform:
            "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 9999,
          boxShadow:
            "0 0 10px red",
        }}
      />
    </>
  );
}

export default App;