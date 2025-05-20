import os
import sys
import cv2
import time
import numpy as np
from flask import Flask, render_template, Response, request, jsonify, send_from_directory
import tempfile
from flask_cors import CORS
from werkzeug.utils import secure_filename

from utils import get_mediapipe_pose
from process_frame import ProcessFrame
from thresholds import get_thresholds_beginner, get_thresholds_pro

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['OUTPUT_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'outputs')
app.config['IMAGE_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'img')

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)
os.makedirs(app.config['IMAGE_FOLDER'], exist_ok=True)

# Global variables
camera = None
live_process_frame = None
pose = get_mediapipe_pose()
current_exercise_type = 'squat'  # Default exercise type

# Routes for traditional Flask templates (legacy)
@app.route('/legacy')
def legacy_index():
    return render_template('index.html')

@app.route('/legacy/live_stream')
def legacy_live_stream():
    return render_template('live_stream.html')

@app.route('/legacy/upload_video')
def legacy_upload_video():
    return render_template('upload_video.html')

# Main route for SPA frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    # This will handle all requests for React routes
    # in a production environment you'd serve the React build
    # For development, we'll just redirect to the React dev server
    if os.environ.get('FLASK_ENV') == 'production':
        return send_from_directory('frontend/dist', 'index.html')
    return jsonify({'message': 'API is running, frontend should be at http://localhost:3000'})

# API Routes
@app.route('/api/modes', methods=['GET'])
def get_modes():
    return jsonify({
        'modes': [
            {'id': 'Beginner', 'name': 'Beginner Mode'},
            {'id': 'Pro', 'name': 'Professional Mode'}
        ]
    })

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    return jsonify({
        'exercises': [
            {
                'id': 'squat',
                'name': 'Squat Analysis',
                'description': 'Perfect your squat form with AI feedback.',
                'image': f"{request.host_url}static/img/squat.jpg"
            },
            {
                'id': 'plank',
                'name': 'Plank Form',
                'description': 'Maintain proper plank position with real-time posture correction.',
                'image': f"{request.host_url}static/img/plank.jpg"
            }
        ]
    })

@app.route('/set_mode', methods=['POST'])
def set_mode():
    global live_process_frame, current_exercise_type
    
    mode = request.json.get('mode', 'Beginner')
    exercise_type = request.json.get('exerciseType', 'squat')
    current_exercise_type = exercise_type
    
    thresholds = get_thresholds_beginner() if mode == 'Beginner' else get_thresholds_pro()
    live_process_frame = ProcessFrame(thresholds=thresholds, flip_frame=True)
    
    return jsonify({'status': 'success', 'mode': mode, 'exerciseType': exercise_type})

@app.route('/api/video_feed_url')
def get_video_feed_url():
    exercise_type = request.args.get('exercise', 'squat')
    return jsonify({
        'url': f"http://{request.host}/video_feed?exercise={exercise_type}"
    })

def generate_frames():
    global camera, live_process_frame
    
    if camera is None:
        camera = cv2.VideoCapture(0)
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    if live_process_frame is None:
        # Default to beginner mode if not set
        thresholds = get_thresholds_beginner()
        live_process_frame = ProcessFrame(thresholds=thresholds, flip_frame=True)
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        # Process frame
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Here you would use different processing for different exercise types
        # For now, we'll use the same squat processing for demonstration
        out_frame, _ = live_process_frame.process(frame, pose)
        out_frame = cv2.cvtColor(out_frame, cv2.COLOR_RGB2BGR)
        
        # Encode as jpeg
        ret, buffer = cv2.imencode('.jpg', out_frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        # Small delay to reduce CPU usage
        time.sleep(0.01)

@app.route('/video_feed')
def video_feed():
    exercise_type = request.args.get('exercise', 'squat')
    # In a real implementation, you would handle different exercise types differently
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_camera')
def start_camera():
    global camera, current_exercise_type
    current_exercise_type = request.args.get('exercise', 'squat')
    if camera is None:
        camera = cv2.VideoCapture(0)
    return jsonify({'status': 'started', 'exerciseType': current_exercise_type})

@app.route('/stop_camera')
def stop_camera():
    global camera
    if camera is not None:
        camera.release()
        camera = None
    return jsonify({'status': 'stopped'})

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'})
    
    file = request.files['file']
    mode = request.form.get('mode', 'Beginner')
    exercise_type = request.form.get('exerciseType', 'squat')
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'})
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Process video
        output_filename = f"processed_{exercise_type}_{filename}"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        # Get thresholds based on mode
        thresholds = get_thresholds_beginner() if mode == 'Beginner' else get_thresholds_pro()
        process_frame = ProcessFrame(thresholds=thresholds)
        
        # Process video file
        cap = cv2.VideoCapture(file_path)
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_size = (width, height)
        fourcc = cv2.VideoWriter_fourcc(*'avc1')
        video_output = cv2.VideoWriter(output_path, fourcc, fps, frame_size)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Convert frame from BGR to RGB before processing it
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # In a real implementation, you would handle different exercise types differently
            out_frame, _ = process_frame.process(frame, pose)
            
            # Convert back to BGR for writing to video
            video_output.write(out_frame[..., ::-1])
        
        cap.release()
        video_output.release()
        
        return jsonify({
            'status': 'success',
            'original': f"/uploads/{filename}",
            'processed': f"/outputs/{output_filename}",
            'exerciseType': exercise_type
        })
    
    return jsonify({'status': 'error', 'message': 'Failed to process file'})

@app.after_request
def add_header(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/outputs/<filename>')
def output_file(filename):
    return send_from_directory(app.config['OUTPUT_FOLDER'], filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
