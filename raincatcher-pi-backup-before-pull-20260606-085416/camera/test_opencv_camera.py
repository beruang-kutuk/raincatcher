import cv2

for camera_id in [0, 1, 2, 3]:
    print(f"Testing camera {camera_id}...")
    cap = cv2.VideoCapture(camera_id)

    if not cap.isOpened():
        print(f"Camera {camera_id}: not opened")
        continue

    ret, frame = cap.read()

    if ret:
        filename = f"opencv_test_camera_{camera_id}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Camera {camera_id}: saved {filename}")
    else:
        print(f"Camera {camera_id}: opened but no frame")

    cap.release()
