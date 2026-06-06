from flask import Flask, jsonify, Response
from flask_cors import CORS
from datetime import datetime
from ultralytics import YOLO
import cv2
import numpy as np
import os

app = Flask(__name__)
CORS(app)

CAMERA_DEVICE = "/dev/video0"
CAPTURE_DIR = "/home/raincatcher/raincatcher-pi/camera-ml/captured_images"
CUSTOM_MODEL_PATH = "/home/raincatcher/raincatcher-pi/camera-ml/raincatcher_yolo_best.pt"
DEFAULT_MODEL_PATH = "/home/raincatcher/raincatcher-pi/camera-ml/yolo11n.pt"

YOLO_MODEL_PATH = CUSTOM_MODEL_PATH if os.path.exists(CUSTOM_MODEL_PATH) else DEFAULT_MODEL_PATH

os.makedirs(CAPTURE_DIR, exist_ok=True)

print(f"Loading YOLO model from: {YOLO_MODEL_PATH}")
yolo_model = YOLO(YOLO_MODEL_PATH)
print("YOLO model loaded.")
print(f"YOLO class names: {yolo_model.names}")


def open_camera():
    camera = cv2.VideoCapture(CAMERA_DEVICE, cv2.CAP_V4L2)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    camera.set(cv2.CAP_PROP_FPS, 15)
    return camera


def get_frame():
    camera = open_camera()

    if not camera.isOpened():
        return None, "Camera could not be opened"

    success, frame = camera.read()
    camera.release()

    if not success:
        return None, "Camera frame could not be read"

    return frame, None


def analyse_frame(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    brightness = float(np.mean(gray))
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    dark_ratio = float(np.sum(gray < 35) / gray.size)
    bright_ratio = float(np.sum(gray > 245) / gray.size)

    camera_blocked = dark_ratio > 0.65 or blur_score < 15
    overexposed = bright_ratio > 0.45
    too_dark = brightness < 45
    blurry = blur_score < 35

    if camera_blocked:
        status = "blocked_or_unusable"
        severity = "high"
        recommendation = "Camera view may be blocked or too blurry. Check the webcam position and lens."
    elif overexposed:
        status = "overexposed"
        severity = "medium"
        recommendation = "Camera image is too bright. Reduce glare or adjust camera angle."
    elif too_dark:
        status = "too_dark"
        severity = "medium"
        recommendation = "Camera image is too dark. Improve lighting around the Rainwater Tank."
    elif blurry:
        status = "blurry"
        severity = "medium"
        recommendation = "Camera image appears blurry. Clean lens or refocus the camera."
    else:
        status = "normal"
        severity = "low"
        recommendation = "Camera image quality is acceptable."

    return {
        "camera_source": "Raspberry Pi 5 USB Webcam",
        "tank": "Rainwater Tank",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "status": status,
        "severity": severity,
        "metrics": {
            "brightness": round(brightness, 2),
            "blur_score": round(blur_score, 2),
            "dark_ratio": round(dark_ratio, 4),
            "bright_ratio": round(bright_ratio, 4),
        },
        "ai_recommendation": recommendation,
        "future_ml_note": "Prepared for future YOLO/image-classification integration."
    }


def run_yolo_detection(frame):
    results = yolo_model(frame, imgsz=320, conf=0.35, verbose=False)

    detections = []

    for box in results[0].boxes:
        class_id = int(box.cls[0])
        label = yolo_model.names[class_id]
        confidence = float(box.conf[0])
        xyxy = box.xyxy[0].tolist()

        detections.append({
            "label": label,
            "confidence": round(confidence, 3),
            "box": [round(value, 2) for value in xyxy]
        })

    labels = [item["label"] for item in detections]

    if "person" in labels:
        visual_status = "person_detected"
        severity = "medium"
        recommendation = "Person detected in camera view. Check if the Rainwater Tank camera is being blocked."
    elif len(detections) > 0:
        visual_status = "object_detected"
        severity = "low"
        recommendation = "Object detected in camera view. Review the camera image if this object should not be near the Rainwater Tank."
    else:
        visual_status = "no_object_detected"
        severity = "low"
        recommendation = "No major object detected in the camera view."

    return {
        "tank": "Rainwater Tank",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "model": YOLO_MODEL_PATH,
        "visual_status": visual_status,
        "severity": severity,
        "detections": detections,
        "detection_count": len(detections),
        "ai_recommendation": recommendation,
        "future_training_note": "Current model is pretrained YOLO. Custom Rainwater Tank debris/leak/tank-condition detection requires custom training later."
    }


def annotate_yolo_frame(frame):
    results = yolo_model(frame, imgsz=320, conf=0.35, verbose=False)
    annotated = results[0].plot()
    return annotated


@app.route("/")
def home():
    return jsonify({
        "service": "Raincatcher Camera ML Backend",
        "status": "running",
        "camera_device": CAMERA_DEVICE,
        "yolo_model": YOLO_MODEL_PATH,
        "endpoints": [
            "/api/camera/health",
            "/health",
            "/api/camera/analyse",
            "/analyze-latest",
            "/analyse-latest",
            "/api/camera/capture",
            "/capture",
            "/api/camera/latest-frame",
            "/latest-frame",
            "/api/camera/yolo-detect",
            "/yolo-detect",
            "/api/camera/yolo-frame",
            "/yolo-frame"
        ]
    })


@app.route("/health")
@app.route("/api/camera/health")
def camera_health():
    camera = open_camera()
    is_opened = camera.isOpened()
    camera.release()

    return jsonify({
        "camera_device": CAMERA_DEVICE,
        "camera_connected": is_opened,
        "yolo_model": YOLO_MODEL_PATH,
        "timestamp": datetime.now().isoformat(timespec="seconds")
    })


@app.route("/analyze-latest")
@app.route("/analyse-latest")
@app.route("/api/camera/analyse")
def analyse_camera():
    frame, error = get_frame()

    if error:
        return jsonify({
            "error": error,
            "camera_device": CAMERA_DEVICE
        }), 500

    return jsonify(analyse_frame(frame))


@app.route("/capture", methods=["GET", "POST"])
@app.route("/api/camera/capture")
def capture_image():
    frame, error = get_frame()

    if error:
        return jsonify({
            "error": error,
            "camera_device": CAMERA_DEVICE
        }), 500

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"rainwater_tank_{timestamp}.jpg"
    filepath = os.path.join(CAPTURE_DIR, filename)

    cv2.imwrite(filepath, frame)

    return jsonify({
        "message": "Image captured successfully",
        "filename": filename,
        "filepath": filepath,
        "tank": "Rainwater Tank",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "analysis": analyse_frame(frame)
    })


@app.route("/latest-frame")
@app.route("/api/camera/latest-frame")
def latest_frame():
    frame, error = get_frame()

    if error:
        return jsonify({
            "error": error,
            "camera_device": CAMERA_DEVICE
        }), 500

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        frame,
        timestamp,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2
    )

    ret, buffer = cv2.imencode(".jpg", frame)

    if not ret:
        return jsonify({
            "error": "Frame could not be encoded"
        }), 500

    return Response(buffer.tobytes(), mimetype="image/jpeg")


@app.route("/yolo-detect")
@app.route("/api/camera/yolo-detect")
def yolo_detect():
    frame, error = get_frame()

    if error:
        return jsonify({
            "error": error,
            "camera_device": CAMERA_DEVICE
        }), 500

    basic_analysis = analyse_frame(frame)
    yolo_result = run_yolo_detection(frame)

    return jsonify({
        "camera_source": "Raspberry Pi 5 USB Webcam",
        "tank": "Rainwater Tank",
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "basic_analysis": basic_analysis,
        "yolo": yolo_result
    })


@app.route("/yolo-frame")
@app.route("/api/camera/yolo-frame")
def yolo_frame():
    frame, error = get_frame()

    if error:
        return jsonify({
            "error": error,
            "camera_device": CAMERA_DEVICE
        }), 500

    annotated = annotate_yolo_frame(frame)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(
        annotated,
        timestamp,
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2
    )

    ret, buffer = cv2.imencode(".jpg", annotated)

    if not ret:
        return jsonify({
            "error": "YOLO frame could not be encoded"
        }), 500

    return Response(buffer.tobytes(), mimetype="image/jpeg")


if __name__ == "__main__":
    print("Starting Raincatcher Camera ML Backend with YOLO...")
    print("Open from laptop: http://192.168.100.137:5050")
    app.run(host="0.0.0.0", port=5050, debug=False)

DEFAULT_MODEL_PATH = "/home/raincatcher/raincatcher-pi/camera-ml/yolo11n.pt"
CUSTOM_MODEL_PATH = "/home/raincatcher/raincatcher-pi/camera-ml/raincatcher_yolo_best.pt"

YOLO_MODEL_PATH = os.environ.get("RAINCATCHER_YOLO_MODEL", CUSTOM_MODEL_PATH)

if not os.path.exists(YOLO_MODEL_PATH):
    print(f"Custom YOLO model not found at {YOLO_MODEL_PATH}. Falling back to {DEFAULT_MODEL_PATH}")
    YOLO_MODEL_PATH = DEFAULT_MODEL_PATH

print(f"Loading YOLO model from: {YOLO_MODEL_PATH}")
