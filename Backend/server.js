const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Function to find working Python command
function findPythonCommand() {
  const commands = process.platform === 'win32' 
    ? ['python', 'py', 'python3'] 
    : ['python3', 'python'];
  
  return new Promise((resolve) => {
    let index = 0;
    
    function tryCommand() {
      if (index >= commands.length) {
        resolve(null);
        return;
      }
      
      const cmd = commands[index];
      const test = spawn(cmd, ['--version']);
      
      test.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Found Python: ${cmd}`);
          resolve(cmd);
        } else {
          index++;
          tryCommand();
        }
      });
      
      test.on('error', () => {
        index++;
        tryCommand();
      });
    }
    
    tryCommand();
  });
}

// Global Python command
let PYTHON_CMD = null;

// Initialize Python command on startup
(async () => {
  PYTHON_CMD = await findPythonCommand();
  if (PYTHON_CMD) {
    console.log(`🐍 Python command: ${PYTHON_CMD}`);
  } else {
    console.error('❌ Python not found! Please install Python and add to PATH');
    console.error('   Windows: https://www.python.org/downloads/');
    console.error('   Or run: winget install Python.Python.3.11');
  }
})();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Admin credentials (in production, use environment variables and hashed passwords)
const ADMIN_CREDENTIALS = {
  username: 'admin@edusense.com',
  password: 'demo123' // In production, use bcrypt to hash passwords
};

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        username: username,
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// File upload and analysis endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  // Check if Python is available
  if (!PYTHON_CMD) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      error: 'Python is not installed or not found in PATH. Please install Python from https://www.python.org/downloads/ and restart the server.'
    });
  }

  const filePath = req.file.path;
  const pythonScript = path.join(__dirname, 'analyze.py');

  // Check if Python script exists
  if (!fs.existsSync(pythonScript)) {
    fs.unlinkSync(filePath);
    return res.status(500).json({
      success: false,
      error: 'Analysis script (analyze.py) not found. Please ensure analyze.py is in the server directory.'
    });
  }

  console.log('Starting analysis for:', req.file.originalname);
  console.log(`Using Python command: ${PYTHON_CMD}`);

  // Spawn Python process
  const pythonProcess = spawn(PYTHON_CMD, [pythonScript, filePath]);

  let dataString = '';
  let errorString = '';

  // Collect data from Python script
  pythonProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    errorString += data.toString();
    console.error('Python stderr:', data.toString());
  });

  // Handle process completion
  pythonProcess.on('close', (code) => {
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    if (code !== 0) {
      console.error('Python process exited with code:', code);
      console.error('Error output:', errorString);
      console.error('Data output:', dataString);
      
      let errorMessage = 'Analysis failed';
      
      if (errorString.includes('ModuleNotFoundError') || errorString.includes('No module named')) {
        errorMessage = 'Python dependencies missing. Please run: pip install transformers torch pandas';
      } else if (errorString.includes('FileNotFoundError')) {
        errorMessage = 'CSV file could not be read. Please check the file format.';
      } else if (errorString) {
        errorMessage = errorString;
      } else if (dataString) {
        errorMessage = dataString;
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: code,
        details: {
          stderr: errorString,
          stdout: dataString
        }
      });
    }

    try {
      const result = JSON.parse(dataString);
      
      if (result.error) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result,
        filename: req.file.originalname
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Received data:', dataString);
      res.status(500).json({
        success: false,
        error: 'Failed to parse analysis results',
        details: parseError.message
      });
    }
  });

  // Handle process errors
  pythonProcess.on('error', (error) => {
    console.error('Failed to start Python process:', error);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    res.status(500).json({
      success: false,
      error: 'Failed to start analysis: ' + error.message
    });
  });
});

// Health check endpoint with Python version check
app.get('/api/health', async (req, res) => {
  if (!PYTHON_CMD) {
    return res.json({
      status: 'warning',
      timestamp: new Date().toISOString(),
      python_available: false,
      python_version: 'Not found',
      message: 'Python is not installed or not in PATH'
    });
  }

  // Check Python version
  const checkPython = spawn(PYTHON_CMD, ['--version']);
  let pythonVersion = '';
  
  checkPython.stdout.on('data', (data) => {
    pythonVersion += data.toString();
  });
  
  checkPython.stderr.on('data', (data) => {
    pythonVersion += data.toString();
  });
  
  checkPython.on('close', (code) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      python_available: code === 0,
      python_version: pythonVersion.trim(),
      python_command: PYTHON_CMD
    });
  });
});

// Download report endpoint (placeholder)
app.post('/api/download-report', (req, res) => {
  const { data } = req.body;
  
  // Generate a simple text report
  let report = 'EDUSENSE - FEEDBACK ANALYSIS REPORT\n';
  report += '=' .repeat(50) + '\n\n';
  report += `Generated: ${new Date().toLocaleString()}\n\n`;
  
  if (data && data.summary) {
    report += 'SUMMARY\n';
    report += '-'.repeat(50) + '\n';
    report += `Total Responses: ${data.summary.total_responses}\n`;
    report += `Average Rating: ${data.summary.average_rating}\n`;
    report += `Positive Sentiment: ${data.summary.avg_sentiment_percentage}%\n`;
    report += `Key Themes: ${data.summary.key_themes_count}\n\n`;
    
    report += 'TOP PRAISE AREAS\n';
    report += '-'.repeat(50) + '\n';
    data.summary.top_praise_areas.forEach((area, i) => {
      report += `${i + 1}. ${area}\n`;
    });
    
    report += '\nAREAS FOR IMPROVEMENT\n';
    report += '-'.repeat(50) + '\n';
    data.summary.improvement_areas.forEach((area, i) => {
      report += `${i + 1}. ${area}\n`;
    });
  }
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename=feedback-report.txt');
  res.send(report);
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum size is 10MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 EduSense Server running on http://localhost:${PORT}`);
  console.log(`📊 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/login`);
  console.log('\n✅ Server is ready to accept requests!\n');
});