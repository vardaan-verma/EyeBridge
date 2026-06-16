
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

  const [debugData, setDebugData] = useState({
    irisX: 0,
    irisY: 0,
    normalizedEyeX: 0,
    normalizedEyeY: 0,
    noseX: 0,
    noseY: 0,
    eyeDistance: 0,
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

            const leftIris = landmarks[468];
            const rightIris = landmarks[473];

            const irisX =
              (leftIris.x + rightIris.x) / 2;

            const irisY =
              (leftIris.y + rightIris.y) / 2;

            const nose = landmarks[1];

            const leftEyeCorner =
              landmarks[33];

            const rightEyeCorner =
              landmarks[263];

            const eyeDistance = Math.abs(
              rightEyeCorner.x -
                leftEyeCorner.x
            );

            const normalizedEyeX =
              (irisX -
                leftEyeCorner.x) /
              (rightEyeCorner.x -
                leftEyeCorner.x);

            const normalizedEyeY =
              irisY;

            setDebugData({
              irisX,
              irisY,
              normalizedEyeX,
              normalizedEyeY,
              noseX: nose.x,
              noseY: nose.y,
              eyeDistance,
            });

            setLatestIris({
              x: irisX,
              y: irisY,
            });

            // V2 Cursor Logic

            const eyeSensitivityX = 10;
            const eyeSensitivityY = 10;

            const eyeOffsetX =
              (0.5 - normalizedEyeX) *
              window.innerWidth *
              eyeSensitivityX;

            const eyeOffsetY =
              (normalizedEyeY - 0.5) *
              window.innerHeight *
              eyeSensitivityY;

            const targetX =
              window.innerWidth / 2 +
              eyeOffsetX;

            const targetY =
              window.innerHeight / 2 +
              eyeOffsetY;

            setSmoothX(
              (prev) =>
                prev * 0.9 +
                targetX * 0.1
            );

            setSmoothY(
              (prev) =>
                prev * 0.9 +
                targetY * 0.1
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
        <h1>EyeBridge V2</h1>

        <h2>
          Face Detected:
          {faceDetected
            ? " ✅ YES"
            : " ❌ NO"}
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

      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "black",
          color: "white",
          padding: "12px",
          borderRadius: "8px",
          zIndex: 10002,
          fontFamily: "monospace",
        }}
      >
        <div>irisX: {debugData.irisX.toFixed(3)}</div>
        <div>irisY: {debugData.irisY.toFixed(3)}</div>
        <div>
          normalizedEyeX:
          {debugData.normalizedEyeX.toFixed(3)}
        </div>
        <div>
          normalizedEyeY:
          {debugData.normalizedEyeY.toFixed(3)}
        </div>
        <div>noseX: {debugData.noseX.toFixed(3)}</div>
        <div>noseY: {debugData.noseY.toFixed(3)}</div>
        <div>
          eyeDistance:
          {debugData.eyeDistance.toFixed(3)}
        </div>
      </div>
    </>
  );
}

export default App;