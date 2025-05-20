import os
import shutil

# Define directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(BASE_DIR, 'static', 'img')
OUTPUTS_DIR = os.path.join(BASE_DIR, 'static', 'outputs')

# Ensure directories exist
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Create placeholder images if they don't exist
def create_placeholder_image(path, text):
    import cv2
    import numpy as np
    
    if os.path.exists(path):
        print(f"File already exists: {path}")
        return
    
    # Create a blank image
    img = np.zeros((480, 640, 3), np.uint8)
    img[:] = (40, 40, 40)  # Dark gray background
    
    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    textsize = cv2.getTextSize(text, font, 1, 2)[0]
    text_x = (img.shape[1] - textsize[0]) // 2
    text_y = (img.shape[0] + textsize[1]) // 2
    
    cv2.putText(img, text, (text_x, text_y), font, 1, (0, 255, 200), 2, cv2.LINE_AA)
    
    # Save the image
    cv2.imwrite(path, img)
    print(f"Created placeholder image: {path}")

# Create placeholder videos (just a static image saved as a video)
def create_placeholder_video(path, text, duration_sec=5):
    import cv2
    import numpy as np
    
    if os.path.exists(path):
        print(f"File already exists: {path}")
        return
    
    # Create a blank image
    img = np.zeros((480, 640, 3), np.uint8)
    img[:] = (40, 40, 40)  # Dark gray background
    
    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    textsize = cv2.getTextSize(text, font, 1, 2)[0]
    text_x = (img.shape[1] - textsize[0]) // 2
    text_y = (img.shape[0] + textsize[1]) // 2
    
    cv2.putText(img, text, (text_x, text_y), font, 1, (0, 255, 200), 2, cv2.LINE_AA)
    
    # Create a video
    fps = 30
    fourcc = cv2.VideoWriter_fourcc(*'avc1')
    writer = cv2.VideoWriter(path, fourcc, fps, (640, 480))
    
    # Write the same frame for duration_sec seconds
    for _ in range(fps * duration_sec):
        writer.write(img)
    
    writer.release()
    print(f"Created placeholder video: {path}")

# Create placeholder files
create_placeholder_image(os.path.join(IMG_DIR, 'squat.jpg'), "Squat Exercise")
create_placeholder_image(os.path.join(IMG_DIR, 'plank.jpg'), "Plank Exercise")
create_placeholder_video(os.path.join(OUTPUTS_DIR, 'plank_expert.mp4'), "Plank Expert Demo")

print("Static files setup completed!")
