import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Upload, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fitnessApi, Mode } from '../api/fitness';

interface TrainingInterfaceProps {
  mode: 'live' | 'upload';
  exerciseType?: 'squat' | 'plank';  // Make it optional with a default value
  onBack: () => void;
}

const TrainingInterface: React.FC<TrainingInterfaceProps> = ({ mode, exerciseType = 'squat', onBack }) => {
  // State variables
  const [isTraining, setIsTraining] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('Beginner');
  const [availableModes, setAvailableModes] = useState<Mode[]>([]);
  const [videoFeedUrl, setVideoFeedUrl] = useState<string>('');
  const [processedResults, setProcessedResults] = useState<{
    original: string;
    processed: string;
  } | null>(null);

  // Exercise specific content
  const exerciseContent = {
    squat: {
      title: "Squat Analysis",
      expertVideo: "http://localhost:5000/static/outputs/expert_vid.mp4",
      instructions: [
        "Stand with feet shoulder-width apart",
        "Keep your back straight",
        "Lower your hips as if sitting in a chair",
        "Ensure knees don't extend beyond toes"
      ],
      apiEndpoint: "squat"
    },
    plank: {
      title: "Plank Form Analysis",
      expertVideo: "http://localhost:5000/static/outputs/plank_expert.mp4",
      instructions: [
        "Position forearms on the ground, elbows under shoulders",
        "Extend legs behind you, resting on toes",
        "Maintain a straight line from head to heels",
        "Engage core and hold position"
      ],
      apiEndpoint: "plank"
    }
  };

  const content = exerciseContent[exerciseType];

  // Load available modes on component mount
  useEffect(() => {
    const fetchModes = async () => {
      const modes = await fitnessApi.getModes();
      setAvailableModes(modes);
    };
    
    fetchModes();
    
    // Clean up if component unmounts while training
    return () => {
      if (isTraining) {
        fitnessApi.stopLiveAnalysis().catch(console.error);
      }
    };
  }, [isTraining]);

  // Handle drag events for file upload
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle file drop for upload
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      try {
        await handleFileUpload(file);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  // Upload and process video file
  const handleFileUpload = async (file: File) => {
    setUploadProgress(0);
    
    // Simulate progress (in a real app, you'd use an upload progress event)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);
    
    try {
      const result = await fitnessApi.uploadVideo(file, selectedMode, exerciseType);
      clearInterval(interval);
      setUploadProgress(100);
      setProcessedResults(result);
    } catch (error) {
      clearInterval(interval);
      console.error('Upload failed:', error);
      setUploadProgress(0);
    }
  };

  // Toggle training (start/stop camera)
  const handleTrainingToggle = async () => {
    try {
      if (!isTraining) {
        await fitnessApi.startLiveAnalysis(selectedMode, exerciseType);
        const feedUrl = await fitnessApi.getVideoFeedUrl(exerciseType);
        setVideoFeedUrl(feedUrl + '?t=' + Date.now());
        setIsTraining(true);
        pollFeedback(); // Start polling for feedback
      } else {
        await fitnessApi.stopLiveAnalysis();
        setIsTraining(false);
        setFeedback([]);
      }
    } catch (error) {
      console.error('Training toggle failed:', error);
    }
  };

  // Poll for feedback from backend
  const pollFeedback = async () => {
    if (isTraining) {
      try {
        const response = await fitnessApi.getFeedback(exerciseType);
        setFeedback(prev => [...prev, response.feedback]);
        setTimeout(pollFeedback, 1000);
      } catch (error) {
        console.error('Failed to get feedback:', error);
        if (isTraining) {
          setTimeout(pollFeedback, 1000); // Keep polling even if there's an error
        }
      }
    }
  };

  // Render the UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-teal-900 text-white p-4"
    >
      <button
        onClick={onBack}
        className="flex items-center text-gray-300 hover:text-teal-400 mb-8 transition-colors duration-300"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Exercises
      </button>

      <div className="max-w-7xl mx-auto">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold mb-8 text-center"
        >
          {content.title}
          <span className="ml-3 text-teal-400">
            {mode === 'live' ? '(Live Analysis)' : '(Video Upload)'}
          </span>
        </motion.h1>

        {/* Mode selection */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-700 mb-6">
          <h3 className="text-lg font-medium mb-3 text-teal-400">Select Training Mode</h3>
          <div className="flex gap-4">
            {availableModes.map(mode => (
              <label key={mode.id} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value={mode.id}
                  checked={selectedMode === mode.id}
                  onChange={() => setSelectedMode(mode.id)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 mr-2 rounded-full border ${selectedMode === mode.id ? 'border-teal-400 bg-teal-400' : 'border-gray-400'}`}></div>
                {mode.name}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-700 mb-6">
          <h3 className="text-lg font-medium mb-3 text-teal-400">Proper Form Guidelines</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            {content.instructions.map((instruction, idx) => (
              <li key={idx}>{instruction}</li>
            ))}
          </ul>
        </div>

        {/* Live training mode */}
        {mode === 'live' ? (
          <>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-700"
              >
                <h2 className="text-xl font-semibold mb-4 text-teal-400">Expert Demo</h2>
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video 
                    src={content.expertVideo} 
                    controls
                    loop
                    autoPlay
                    muted
                    className="w-full h-full object-contain"
                  />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-4 border border-gray-700"
              >
                <h2 className="text-xl font-semibold mb-4 text-teal-400">Your Form</h2>
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                  {!isTraining ? (
                    <div className="text-gray-400">Camera feed will appear here</div>
                  ) : (
                    <div className="relative w-full h-full">
                      <img 
                        src={videoFeedUrl}
                        alt="Live Camera Feed"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <button
                onClick={handleTrainingToggle}
                className="bg-teal-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-teal-600 transition-colors duration-300 flex items-center mx-auto"
              >
                <Play className="w-5 h-5 mr-2" />
                {isTraining ? 'Stop Training' : 'Start Training'}
              </button>
            </motion.div>

            <AnimatePresence>
              {isTraining && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700"
                >
                  <h3 className="text-xl font-semibold mb-4 text-teal-400">Real-time Feedback</h3>
                  <div className="space-y-4">
                    {feedback.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center text-teal-400"
                      >
                        <ChevronRight className="w-5 h-5 mr-2" />
                        <span>{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          // Video upload mode
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-w-3xl mx-auto"
          >
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
                dragActive ? 'border-teal-400 bg-teal-900/20' : 'border-gray-600 bg-gray-800/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-teal-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Your Video</h2>
              <p className="text-gray-400 mb-4">
                Drag and drop your video here, or click to select a file
              </p>
              <input
                type="file"
                className="hidden"
                accept="video/*"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="bg-teal-500 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-teal-600 transition-colors duration-300"
              >
                Select File
              </label>

              {uploadProgress > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6"
                >
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="bg-teal-500 h-2.5 rounded-full transition-all duration-300"
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Upload progress: {uploadProgress}%
                  </p>
                </motion.div>
              )}
            </div>

            <AnimatePresence>
              {processedResults && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg p-6 border border-gray-700"
                >
                  <h3 className="text-xl font-semibold mb-4 text-teal-400">Analysis Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2 text-center">Original Video</h4>
                      <video 
                        src={processedResults.original}
                        controls
                        className="w-full rounded-lg"
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 text-center">Analyzed Video</h4>
                      <video 
                        src={processedResults.processed}
                        controls
                        className="w-full rounded-lg"
                      />
                      <div className="mt-3 text-center">
                        <a 
                          href={processedResults.processed}
                          download
                          className="bg-teal-600 text-white px-4 py-2 rounded inline-block hover:bg-teal-700 transition-colors"
                        >
                          Download Analyzed Video
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default TrainingInterface;