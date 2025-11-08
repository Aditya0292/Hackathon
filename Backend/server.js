//Backend/server.js
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
const instructorDataDir = path.join(__dirname, 'instructor_data');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(instructorDataDir)) {
  fs.mkdirSync(instructorDataDir);
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

// Helper function to run Python script and get output
function runPythonScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(PYTHON_CMD, [scriptPath, ...args]);
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject({ code, stderr: errorString, stdout: dataString });
      } else {
        resolve(dataString);
      }
    });

    pythonProcess.on('error', (error) => {
      reject({ error: error.message });
    });
  });
}

// File upload and split by instructor
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  if (!PYTHON_CMD) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      error: 'Python is not installed or not found in PATH.'
    });
  }

  const filePath = req.file.path;
  const extractScript = path.join(__dirname, 'extract_instructor_data.py');

  if (!fs.existsSync(extractScript)) {
    fs.unlinkSync(filePath);
    return res.status(500).json({
      success: false,
      error: 'extract_instructor_data.py not found in server directory.'
    });
  }

  console.log('Splitting CSV by instructor:', req.file.originalname);

  try {
    // Run extraction script
    await runPythonScript(extractScript, [filePath]);
    
    // Clean up original file
    fs.unlinkSync(filePath);

    // Read instructor files
    const files = fs.readdirSync(instructorDataDir).filter(f => f.endsWith('_feedback.csv'));
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No instructor data found. Make sure CSV has "Instructor" column.'
      });
    }

    // Extract instructor names from filenames
    const instructors = files.map(file => {
      const instructorName = file.replace('_feedback.csv', '').replace(/_/g, ' ');
      return {
        id: file.replace('_feedback.csv', ''),
        name: instructorName,
        filename: file
      };
    });

    console.log(`✓ Split into ${instructors.length} instructor files`);

    res.json({
      success: true,
      instructors: instructors,
      message: `Found ${instructors.length} instructors`
    });

  } catch (err) {
    console.error('Split error:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    res.status(500).json({
      success: false,
      error: 'Failed to split CSV by instructor: ' + (err.stderr || err.error || 'Unknown error')
    });
  }
});

// Analyze specific instructor
app.post('/api/analyze-instructor', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({
      success: false,
      error: 'Filename is required'
    });
  }

  if (!PYTHON_CMD) {
    return res.status(500).json({
      success: false,
      error: 'Python is not installed or not found in PATH.'
    });
  }

  const instructorFilePath = path.join(instructorDataDir, filename);
  const analyzeScript = path.join(__dirname, 'analyze.py');

  if (!fs.existsSync(instructorFilePath)) {
    return res.status(404).json({
      success: false,
      error: 'Instructor file not found'
    });
  }

  if (!fs.existsSync(analyzeScript)) {
    return res.status(500).json({
      success: false,
      error: 'analyze.py not found in server directory.'
    });
  }

  console.log('Analyzing instructor file:', filename);

  try {
    const output = await runPythonScript(analyzeScript, [instructorFilePath]);
    const result = JSON.parse(output);

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result,
      filename: filename
    });

  } catch (err) {
    console.error('Analysis error:', err);
    
    let errorMessage = 'Analysis failed';
    if (err.stderr && err.stderr.includes('ModuleNotFoundError')) {
      errorMessage = 'Python dependencies missing. Run: pip install transformers torch pandas';
    } else if (err.stdout) {
      try {
        const jsonError = JSON.parse(err.stdout);
        errorMessage = jsonError.error || errorMessage;
      } catch (e) {
        errorMessage = err.stdout || err.stderr || errorMessage;
      }
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: {
        stderr: err.stderr,
        stdout: err.stdout
      }
    });
  }
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

// Download report endpoint
app.post('/api/download-report', (req, res) => {
  const { data, instructor } = req.body;
  
  let report = 'EDUSENSE - FEEDBACK ANALYSIS REPORT\n';
  report += '=' .repeat(50) + '\n\n';
  report += `Instructor: ${instructor || 'All'}\n`;
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

    report += '\nRECOMMENDATIONS\n';
    report += '-'.repeat(50) + '\n';
    data.summary.recommendations.forEach((rec, i) => {
      report += `${i + 1}. ${rec}\n`;
    });
  }
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=${instructor ? instructor.replace(/\s+/g, '_') : 'feedback'}_report.txt`);
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
// Add this to your server.js - REPLACE the /api/upload endpoint

// File upload and split by instructor
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No file uploaded'
    });
  }

  if (!PYTHON_CMD) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      error: 'Python is not installed or not found in PATH.'
    });
  }

  const filePath = req.file.path;
  const extractScript = path.join(__dirname, 'extract_instructor_data.py');

  if (!fs.existsSync(extractScript)) {
    fs.unlinkSync(filePath);
    return res.status(500).json({
      success: false,
      error: 'extract_instructor_data.py not found in server directory.'
    });
  }

  console.log('Splitting CSV by instructor:', req.file.originalname);

  try {
    // Run extraction script
    const output = await runPythonScript(extractScript, [filePath]);
    console.log('Python output:', output);
    
    // Clean up original file
    fs.unlinkSync(filePath);

    // Read instructor files
    const files = fs.readdirSync(instructorDataDir)
      .filter(f => f.endsWith('_feedback.csv'))
      .sort(); // Sort to ensure consistent order
    
    console.log('Files found:', files);
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No instructor data found. Make sure CSV has "Instructor" column.'
      });
    }

    // Extract instructor names from filenames with better parsing
    const instructorMap = new Map();
    
    files.forEach(file => {
      const baseName = file.replace('_feedback.csv', '');
      // Convert underscores back to spaces for display
      const displayName = baseName.replace(/_/g, ' ');
      
      // Use the base name (without extension) as the key to avoid duplicates
      if (!instructorMap.has(baseName)) {
        instructorMap.set(baseName, {
          id: baseName,
          name: displayName,
          filename: file
        });
      }
    });

    const instructors = Array.from(instructorMap.values());
    
    console.log(`✓ Found ${instructors.length} unique instructors:`, instructors.map(i => i.name));

    res.json({
      success: true,
      instructors: instructors,
      message: `Found ${instructors.length} instructors`
    });

  } catch (err) {
    console.error('Split error:', err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    res.status(500).json({
      success: false,
      error: 'Failed to split CSV by instructor: ' + (err.stderr || err.error || 'Unknown error')
    });
  }
});
// Add these endpoints to your server.js file

// Download CSV with analysis results
app.post('/api/download-csv', (req, res) => {
  const { data, instructor } = req.body;
  
  if (!data || !data.individual_analysis) {
    return res.status(400).json({ success: false, error: 'No data provided' });
  }

  // Create CSV content
  let csv = 'Student ID,Course,Instructor,Rating,Sentiment,Category,Feedback\n';
  
  data.individual_analysis.forEach(item => {
    const row = [
      item.student_id,
      item.course,
      item.instructor,
      item.rating,
      item.sentiment,
      item.category,
      `"${item.feedback_text.replace(/"/g, '""')}"`
    ].join(',');
    csv += row + '\n';
  });
  
  // Add summary section
  csv += '\n\nSUMMARY\n';
  csv += `Total Responses,${data.summary.total_responses}\n`;
  csv += `Average Rating,${data.summary.average_rating}\n`;
  csv += `Positive Sentiment %,${data.summary.avg_sentiment_percentage}\n`;
  csv += `Key Themes,${data.summary.key_themes_count}\n`;
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `${instructor ? instructor.replace(/\s+/g, '_') : 'feedback'}_analysis_${date}.csv`;
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

// AI Chatbot endpoint
app.post('/api/chat', async (req, res) => {
  const { message, analysisData, instructor, conversationHistory } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'No message provided' });
  }

  try {
    // Build context from analysis data
    const summary = analysisData?.summary || {};
    
    const context = `You are an AI teaching assistant helping ${instructor || 'an instructor'} understand their student feedback.

FEEDBACK ANALYSIS SUMMARY:
- Total Responses: ${summary.total_responses || 0}
- Average Rating: ${summary.average_rating || 0}/5
- Positive Sentiment: ${summary.avg_sentiment_percentage || 0}%
- Key Themes: ${summary.key_themes_count || 0}

TOP PRAISE AREAS:
${(summary.top_praise_areas || []).map((area, i) => `${i + 1}. ${area}`).join('\n')}

AREAS FOR IMPROVEMENT:
${(summary.improvement_areas || []).map((area, i) => `${i + 1}. ${area}`).join('\n')}

RECOMMENDATIONS:
${(summary.recommendations || []).join('\n')}

Based on this feedback analysis, provide helpful, actionable advice to the instructor. Be specific, supportive, and focused on practical improvements.`;

    // Call Anthropic API (you'll need to add your API key)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '', // Add your API key
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: context
          },
          ...conversationHistory.slice(-4).map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    const aiData = await response.json();

    if (aiData.content && aiData.content[0]) {
      res.json({
        success: true,
        response: aiData.content[0].text
      });
    } else {
      throw new Error('Invalid response from AI');
    }

  } catch (err) {
    console.error('Chat error:', err);
    
    // Fallback response when AI is not available
    const fallbackResponses = {
      'teaching style': `Based on the feedback, students appreciate ${summary.top_praise_areas?.[0] || 'your teaching approach'}. Consider focusing on ${summary.improvement_areas?.[0] || 'interactive activities'} to enhance engagement further.`,
      'improvement': `Key areas for improvement include: ${(summary.improvement_areas || []).slice(0, 3).join(', ')}. I recommend creating an action plan to address these points systematically.`,
      'positive': `Students particularly praised: ${(summary.top_praise_areas || []).slice(0, 3).join(', ')}. These are your strengths - continue building on them!`,
      'rating': `Your average rating is ${summary.average_rating}/5 with ${summary.avg_sentiment_percentage}% positive sentiment. ${summary.average_rating >= 4 ? 'This is excellent!' : 'There is room for improvement in key areas.'}`,
      'default': `I can help you understand your feedback better. You have ${summary.total_responses} responses with an average rating of ${summary.average_rating}/5. Your strengths include ${summary.top_praise_areas?.[0] || 'clear teaching'}, and students suggest improving ${summary.improvement_areas?.[0] || 'course materials'}.`
    };

    // Simple keyword matching for fallback
    let response = fallbackResponses.default;
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('teaching') || lowerMessage.includes('style')) {
      response = fallbackResponses['teaching style'];
    } else if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      response = fallbackResponses.improvement;
    } else if (lowerMessage.includes('positive') || lowerMessage.includes('good') || lowerMessage.includes('strength')) {
      response = fallbackResponses.positive;
    } else if (lowerMessage.includes('rating') || lowerMessage.includes('score')) {
      response = fallbackResponses.rating;
    }

    res.json({
      success: true,
      response: response
    });
  }
});
// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 EduSense Server running on http://localhost:${PORT}`);
  console.log(`📊 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/login`);
  console.log('\n✅ Server is ready to accept requests!\n');
});