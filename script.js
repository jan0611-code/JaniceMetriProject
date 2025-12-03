// OpenCV.js ready callback
cv.onRuntimeInitialized = () => {
    console.log('OpenCV.js loaded successfully');
    document.getElementById('loadingOverlay').style.display = 'none';
    
    // Initialize UI components
    initUI();
};

// Global variables
let currentImage = null;
let processingResults = null;
let featuresChart = null;

// Initialize UI
function initUI() {
    const uploadArea = document.getElementById('uploadArea');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const resetBtn = document.getElementById('resetBtn');
    
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Browse button click
    browseBtn.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Reset button
    resetBtn.addEventListener('click', resetAnalysis);
    
    // Initialize sliders
    initSliders();
    
    // Initialize download buttons
    document.getElementById('downloadReport').addEventListener('click', downloadReport);
    document.getElementById('downloadImage').addEventListener('click', downloadImage);
    
    // Drag and drop support
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#eef1ff';
        uploadArea.style.borderColor = '#764ba2';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.background = '#f8f9ff';
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f8f9ff';
        uploadArea.style.borderColor = '#667eea';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect();
        }
    });
}

// Initialize sliders
function initSliders() {
    const sliders = [
        { id: 'bilateralStrength', valueId: 'bilateralValue' },
        { id: 'thresholdSens', valueId: 'thresholdValue' },
        { id: 'houghThreshold', valueId: 'houghValue' },
        { id: 'minLines', valueId: 'minLinesValue' },
        { id: 'maxAngleVar', valueId: 'maxAngleValue' },
        { id: 'minAvgLength', valueId: 'minLengthValue' }
    ];
    
    sliders.forEach(slider => {
        const sliderElement = document.getElementById(slider.id);
        const valueElement = document.getElementById(slider.valueId);
        
        valueElement.textContent = sliderElement.value;
        
        sliderElement.addEventListener('input', (e) => {
            valueElement.textContent = e.target.value;
            
            // Re-process if image is already loaded
            if (currentImage) {
                processImage(currentImage);
            }
        });
    });
}

// Handle file selection
function handleFileSelect() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Show loading
    showLoading();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            currentImage = img;
            processImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Show loading animation
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    const steps = document.querySelectorAll('.progress-steps .step');
    
    overlay.style.display = 'flex';
    
    // Animate steps
    steps.forEach((step, index) => {
        setTimeout(() => {
            steps.forEach(s => s.classList.remove('active'));
            step.classList.add('active');
        }, index * 500);
    });
}

// Hide loading
function hideLoading() {
    setTimeout(() => {
        document.getElementById('loadingOverlay').style.display = 'none';
    }, 500);
}

// Main processing function
function processImage(img) {
    showLoading();
    
    setTimeout(() => {
        try {
            // Create OpenCV mat from image
            const src = cv.imread(img);
            
            // Display original
            cv.imshow('canvasOrig', src);
            
            // Step 1: Grayscale
            const gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
            cv.imshow('canvasGray', gray);
            
            // Step 2: Gaussian blur (simulating bilateral)
            const bilateral = new cv.Mat();
            const bilateralSize = parseInt(document.getElementById('bilateralStrength').value);
            const kernelSize = bilateralSize % 2 === 0 ? bilateralSize + 1 : bilateralSize;
            cv.GaussianBlur(gray, bilateral, new cv.Size(kernelSize, kernelSize), 0);
            cv.imshow('canvasBilateral', bilateral);
            
            // Step 3: Adaptive threshold
            const thresh = new cv.Mat();
            const blockSize = parseInt(document.getElementById('thresholdSens').value);
            cv.adaptiveThreshold(bilateral, thresh, 255, 
                cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 
                blockSize % 2 === 0 ? blockSize + 1 : blockSize, 1);
            cv.imshow('canvasThresh', thresh);
            
            // Step 4: Canny edge detection
            const edges = new cv.Mat();
            cv.Canny(thresh, edges, 100, 200);
            
            // Step 5: Hough lines
            const lines = new cv.Mat();
            const houghThreshold = parseInt(document.getElementById('houghThreshold').value);
            cv.HoughLinesP(edges, lines, 1, Math.PI/180, houghThreshold, 2, 2);
            
            // Step 6: Draw lines and analyze
            const lineImg = new cv.Mat();
            cv.cvtColor(thresh, lineImg, cv.COLOR_GRAY2RGBA);
            
            // Analyze lines
            const analysis = analyzeLines(lines, lineImg);
            
            // Display final image with lines
            cv.imshow('canvasLines', lineImg);
            
            // Update results
            updateResults(analysis);
            
            // Update chart
            updateChart(analysis);
            
            // Clean up
            src.delete(); gray.delete(); bilateral.delete();
            thresh.delete(); edges.delete(); lines.delete(); lineImg.delete();
            
            // Show results section
            document.getElementById('resultsSection').style.display = 'block';
            
            // Scroll to results
            document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
            
            hideLoading();
            
        } catch (error) {
            console.error('Processing error:', error);
            alert('Error processing image: ' + error.message);
            hideLoading();
        }
    }, 500);
}

// Analyze lines and extract features
function analyzeLines(lines, lineImg) {
    const lineCount = lines.rows;
    const lengths = [];
    const angles = [];
    
    // Draw lines and collect data
    for (let i = 0; i < lineCount; i++) {
        const line = lines.data32S.subarray(i*4, i*4+4);
        const point1 = new cv.Point(line[0], line[1]);
        const point2 = new cv.Point(line[2], line[3]);
        
        // Draw line
        cv.line(lineImg, point1, point2, [255, 0, 0, 255], 2);
        
        // Calculate length
        const length = Math.sqrt(
            Math.pow(line[2] - line[0], 2) + 
            Math.pow(line[3] - line[1], 2)
        );
        lengths.push(length);
        
        // Calculate angle
        const angle = Math.atan2(line[3] - line[1], line[2] - line[0]) * (180 / Math.PI);
        angles.push((angle + 360) % 360);
    }
    
    // Calculate statistics
    const avgLength = lengths.length > 0 ? 
        lengths.reduce((a, b) => a + b) / lengths.length : 0;
    
    const angleVariance = angles.length > 0 ?
        calculateVariance(angles) : 0;
    
    // Make prediction
    const prediction = makePrediction(lineCount, angleVariance, avgLength);
    
    return {
        lineCount,
        avgLength: parseFloat(avgLength.toFixed(2)),
        angleVariance: parseFloat(angleVariance.toFixed(2)),
        prediction,
        lengths,
        angles
    };
}

// Calculate variance
function calculateVariance(array) {
    const mean = array.reduce((a, b) => a + b) / array.length;
    return array.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / array.length;
}

// Make prediction based on rules
function makePrediction(lineCount, angleVariance, avgLength) {
    const minLines = parseInt(document.getElementById('minLines').value);
    const maxAngleVar = parseInt(document.getElementById('maxAngleVar').value);
    const minAvgLength = parseInt(document.getElementById('minAvgLength').value);
    
    const reasons = [];
    
    if (lineCount < minLines) {
        reasons.push(`Lines detected (${lineCount}) is less than minimum (${minLines})`);
    }
    
    if (angleVariance > maxAngleVar) {
        reasons.push(`Angle variance (${angleVariance.toFixed(1)}) exceeds maximum (${maxAngleVar})`);
    }
    
    if (avgLength < minAvgLength) {
        reasons.push(`Average line length (${avgLength.toFixed(1)}px) is less than minimum (${minAvgLength}px)`);
    }
    
    return {
        phase: reasons.length === 0 ? 'NORMAL' : 'ANOMALY',
        reasons,
        confidence: calculateConfidence(lineCount, angleVariance, avgLength)
    };
}

// Calculate confidence score
function calculateConfidence(lineCount, angleVariance, avgLength) {
    const minLines = parseInt(document.getElementById('minLines').value);
    const maxAngleVar = parseInt(document.getElementById('maxAngleVar').value);
    const minAvgLength = parseInt(document.getElementById('minAvgLength').value);
    
    let score = 0;
    let total = 3;
    
    if (lineCount >= minLines) score++;
    if (angleVariance <= maxAngleVar) score++;
    if (avgLength >= minAvgLength) score++;
    
    return Math.round((score / total) * 100);
}

// Update results display
function updateResults(analysis) {
    // Update prediction
    const predictionText = document.getElementById('predictionText');
    const predictionBadge = document.getElementById('predictionBadge');
    
    predictionText.textContent = analysis.prediction.phase;
    predictionBadge.className = `prediction-badge ${analysis.prediction.phase.toLowerCase()}`;
    
    // Update stats
    document.getElementById('lineCount').textContent = analysis.lineCount;
    document.getElementById('avgLength').textContent = analysis.avgLength;
    document.getElementById('angleVar').textContent = analysis.angleVariance.toFixed(1);
    document.getElementById('accuracy').textContent = `${analysis.prediction.confidence}%`;
    
    // Update reasons
    const reasonsList = document.getElementById('reasonsList');
    const reasonsBox = document.getElementById('reasonsBox');
    
    reasonsList.innerHTML = '';
    
    if (analysis.prediction.reasons.length > 0) {
        reasonsBox.style.display = 'block';
        analysis.prediction.reasons.forEach(reason => {
            const li = document.createElement('li');
            li.textContent = reason;
            reasonsList.appendChild(li);
        });
    } else {
        reasonsBox.style.display = 'none';
        const li = document.createElement('li');
        li.textContent = 'All criteria satisfied ✓';
        li.style.color = '#51cf66';
        reasonsList.appendChild(li);
    }
}

// Update chart
function updateChart(analysis) {
    const ctx = document.getElementById('featuresChart').getContext('2d');
    
    // Destroy existing chart
    if (featuresChart) {
        featuresChart.destroy();
    }
    
    // Create new chart
    featuresChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Lines Count', 'Line Length', 'Angle Consistency', 'Pattern Density'],
            datasets: [{
                label: 'Features Analysis',
                data: [
                    Math.min(analysis.lineCount, 20),
                    Math.min(analysis.avgLength, 50),
                    100 - Math.min(analysis.angleVariance / 5, 100),
                    Math.min(analysis.lineCount * 5, 100)
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: '#667eea',
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#667eea'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Download report
function downloadReport() {
    const data = {
        date: new Date().toLocaleString(),
        prediction: document.getElementById('predictionText').textContent,
        lineCount: document.getElementById('lineCount').textContent,
        avgLength: document.getElementById('avgLength').textContent,
        angleVariance: document.getElementById('angleVar').textContent,
        confidence: document.getElementById('accuracy').textContent
    };
    
    const report = `
LC Nematic Phase Detection Report
===================================
Date: ${data.date}
Prediction: ${data.prediction}
Lines Detected: ${data.lineCount}
Average Line Length: ${data.avgLength} px
Angle Variance: ${data.angleVariance}
Confidence: ${data.confidence}
-----------------------------------
Generated by LC Nematic Phase Detector
    `.trim();
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nematic_report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Download processed image
function downloadImage() {
    const canvas = document.getElementById('canvasLines');
    const link = document.createElement('a');
    link.download = 'processed_nematic.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Reset analysis
function resetAnalysis() {
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    currentImage = null;
    processingResults = null;
    
    // Clear canvases
    const canvases = ['canvasOrig', 'canvasGray', 'canvasBilateral', 'canvasThresh', 'canvasLines'];
    canvases.forEach(id => {
        const ctx = document.getElementById(id).getContext('2d');
        ctx.clearRect(0, 0, 256, 256);
    });
    
    // Reset chart
    if (featuresChart) {
        featuresChart.destroy();
        featuresChart = null;
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
