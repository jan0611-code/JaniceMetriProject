# LC Nematic Phase Detector

A web-based tool for detecting Normal vs Anomaly phases in Liquid Crystal Nematic images using computer vision techniques.

## Features
- Image upload and processing
- Real-time phase detection
- Visual processing pipeline display
- Interactive parameter tuning
- Feature analysis and visualization
- Export results and images

## How to Use
1. Upload an LC Nematic image (JPG, PNG, BMP)
2. Adjust processing parameters using sliders
3. View the processing steps in real-time
4. See the phase prediction (Normal/Anomaly)
5. Download results or processed images

## Processing Pipeline
1. **Grayscale Conversion** - Convert to single channel
2. **Bilateral Filter** - Edge-preserving smoothing
3. **Adaptive Threshold** - Local thresholding
4. **Canny Edge Detection** - Find edges
5. **Hough Line Transform** - Detect straight lines
6. **Feature Extraction** - Analyze lines and angles
7. **Phase Detection** - Apply rule-based classification

## Detection Rules
- **Minimum Lines**: Normal phases typically have more lines
- **Angle Variance**: Normal phases have consistent orientation
- **Average Length**: Normal phases have longer, more continuous lines

## Technologies Used
- OpenCV.js for computer vision
- Chart.js for data visualization
- HTML5 Canvas for image processing
- Vanilla JavaScript for UI interactions

## Deployment
This is a static web application that can be deployed on:
- GitHub Pages
- Netlify
- Vercel
- Any static web hosting service

## License
MIT License