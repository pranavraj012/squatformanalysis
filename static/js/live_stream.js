document.addEventListener('DOMContentLoaded', function() {
    const videoFeed = document.getElementById('videoFeed');
    const startButton = document.getElementById('startCamera');
    const stopButton = document.getElementById('stopCamera');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    
    let isStreamActive = false;
    
    // Set mode and start camera
    function setModeAndStart() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        
        fetch('/set_mode', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({mode: selectedMode})
        })
        .then(response => response.json())
        .then(data => {
            console.log('Mode set to:', data.mode);
            startStream();
        })
        .catch(error => {
            console.error('Error setting mode:', error);
        });
    }
    
    // Start video stream
    function startStream() {
        if (!isStreamActive) {
            fetch('/start_camera')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'started') {
                        videoFeed.src = '/video_feed' + '?t=' + new Date().getTime();
                        isStreamActive = true;
                    }
                })
                .catch(error => {
                    console.error('Error starting camera:', error);
                });
        }
    }
    
    // Stop video stream
    function stopStream() {
        if (isStreamActive) {
            fetch('/stop_camera')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'stopped') {
                        videoFeed.src = '/static/img/camera-placeholder.jpg';
                        isStreamActive = false;
                    }
                })
                .catch(error => {
                    console.error('Error stopping camera:', error);
                });
        }
    }
    
    // Event listeners
    startButton.addEventListener('click', setModeAndStart);
    stopButton.addEventListener('click', stopStream);
    
    // Mode change handling
    modeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (isStreamActive) {
                // If stream is active, update the mode
                setModeAndStart();
            }
        });
    });
    
    // Clean up when page is closed
    window.addEventListener('beforeunload', function() {
        if (isStreamActive) {
            stopStream();
        }
    });
});
