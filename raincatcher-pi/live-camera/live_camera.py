from flask import Flask, Response
import cv2
from datetime import datetime

app = Flask(__name__)

CAMERA_DEVICE = "/dev/video0"

def generate_frames():
    camera = cv2.VideoCapture(CAMERA_DEVICE, cv2.CAP_V4L2)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    camera.set(cv2.CAP_PROP_FPS, 15)

    if not camera.isOpened():
        print("Camera could not be opened")
        return

    while True:
        success, frame = camera.read()

        if not success:
            break

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
            continue

        frame_bytes = buffer.tobytes()

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
        )

    camera.release()

@app.route("/")
def index():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Raincatcher Live Camera</title>
        <style>
            body {
                margin: 0;
                background: #0f172a;
                color: white;
                font-family: Arial, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
            }
            h1 {
                margin-bottom: 16px;
            }
            img {
                width: 90vw;
                max-width: 1000px;
                border-radius: 16px;
                border: 2px solid #334155;
                background: #020617;
            }
        </style>
    </head>
    <body>
        <h1>Raincatcher Live Camera</h1>
        <img src="/video-feed" />
    </body>
    </html>
    """

@app.route("/video-feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

if __name__ == "__main__":
    print("Starting Raincatcher Live Camera...")
    print("Open from laptop: http://192.168.100.137:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)
