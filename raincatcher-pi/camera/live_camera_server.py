from flask import Flask, Response, render_template_string
import cv2
import time

app = Flask(__name__)

camera = cv2.VideoCapture("/dev/video0", cv2.CAP_V4L2)
camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
camera.set(cv2.CAP_PROP_FPS, 15)

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <title>Raincatcher Live Tank Feed</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: white;
            text-align: center;
            padding: 30px;
        }
        .card {
            background: #1e293b;
            padding: 20px;
            border-radius: 16px;
            display: inline-block;
        }
        img {
            width: 100%;
            max-width: 900px;
            border-radius: 12px;
            border: 2px solid #38bdf8;
        }
        .status {
            margin-top: 10px;
            color: #22c55e;
        }
    </style>
</head>
<body>
    <h1>Raincatcher Live Tank Feed</h1>
    <div class="card">
        <img src="/video-feed" />
        <div class="status">Camera status: Live</div>
    </div>
</body>
</html>
"""

def generate_frames():
    while True:
        success, frame = camera.read()

        if not success:
            time.sleep(0.5)
            continue

        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
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

@app.route("/")
def index():
    return render_template_string(HTML_PAGE)

@app.route("/health")
def health():
    from flask import jsonify
    status = "online" if camera.isOpened() else "offline"
    return jsonify({"status": status, "service": "camera"}), 200

@app.route("/video-feed")
def video_feed():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )

if __name__ == "__main__":
    if not camera.isOpened():
        print("Error: Could not open webcam.")
    else:
        print("Starting Raincatcher camera server...")
        print("Open from laptop: http://192.168.100.204:5000")

    app.run(host="0.0.0.0", port=5050, debug=False)
