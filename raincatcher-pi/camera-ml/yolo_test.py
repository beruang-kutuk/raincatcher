from ultralytics import YOLO
import cv2

CAMERA_DEVICE = "/dev/video0"

model = YOLO("yolo11n.pt")

camera = cv2.VideoCapture(CAMERA_DEVICE, cv2.CAP_V4L2)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

if not camera.isOpened():
    print("Camera failed to open")
    raise SystemExit

ok, frame = camera.read()
camera.release()

if not ok:
    print("Failed to capture frame")
    raise SystemExit

results = model(frame, imgsz=320, conf=0.35, verbose=False)

annotated = results[0].plot()
cv2.imwrite("yolo_test_result.jpg", annotated)

detections = []
for box in results[0].boxes:
    class_id = int(box.cls[0])
    label = model.names[class_id]
    confidence = float(box.conf[0])
    xyxy = box.xyxy[0].tolist()

    detections.append({
        "label": label,
        "confidence": round(confidence, 3),
        "box": [round(v, 2) for v in xyxy]
    })

print("Saved yolo_test_result.jpg")
print("Detections:")
print(detections)
