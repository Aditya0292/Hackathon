"use client"
import React, { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, FileText, TrendingUp, AlertCircle, CheckCircle, Download, LogOut, Sun, Moon, Loader } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Navbar = ({ showActions = false, onNewUpload, onDownload, onLogout, isDark, onToggleTheme }) => {
  return (
    <nav className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>EduSense</h1>
          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button onClick={onToggleTheme} className={`p-2 rounded-lg ${isDark ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-700'}`}>
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            {showActions && (
              <div className="flex items-center gap-3">
                {onNewUpload && <button onClick={onNewUpload} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"><Upload size={18} />New Upload</button>}
                {onDownload && <button onClick={onDownload} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"><Download size={18} />Download Report</button>}
                {onLogout && <button onClick={onLogout} className={`px-4 py-2 border rounded-lg ${isDark ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-700'}`}><LogOut size={18} className="inline mr-2" />Logout</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const Card = ({ title, value, subtitle, icon: Icon, color = "blue", isDark }) => {
  const colors = {
    blue: isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-50 text-blue-600",
    green: isDark ? "bg-green-900/30 text-green-400" : "bg-green-50 text-green-600",
    amber: isDark ? "bg-amber-900/30 text-amber-400" : "bg-amber-50 text-amber-600"
  };
  return (
    <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
          <p className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {subtitle && <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{subtitle}</p>}
        </div>
        {Icon && <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={24} /></div>}
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin, isDark, onToggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Please ensure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    setUsername('admin@edusense.com');
    setPassword('demo123');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'} flex items-center justify-center p-4`}>
      <div className="absolute top-4 right-4">
        <button onClick={onToggleTheme} className={`p-2 rounded-lg ${isDark ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-700'} shadow-lg`}>
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      <div className={`w-full max-w-md rounded-2xl shadow-xl border p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="text-center mb-8">
          <div className={`inline-block p-3 rounded-2xl mb-4 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
            <FileText size={40} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-blue-600 mb-2">EduSense</h1>
          <h2 className={`text-2xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Admin Login</h2>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="admin@edusense.com"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={20} /> : null}
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <button
            type="button"
            onClick={handleDemo}
            className={`w-full border py-3 rounded-lg font-semibold ${isDark ? 'border-blue-500 text-blue-400 hover:bg-blue-900/20' : 'border-blue-600 text-blue-600 hover:bg-blue-50'}`}
          >
            Use Demo Credentials
          </button>
        </form>

        <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}`}>
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Demo Credentials:</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email: admin@edusense.com</p>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password: demo123</p>
        </div>
      </div>
    </div>
  );
};

const UploadPage = ({ onAnalysisComplete, onBack, isDark, onToggleTheme }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        onAnalysisComplete(data.data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Please ensure the backend is running.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar showActions={false} onLogout={onBack} isDark={isDark} onToggleTheme={onToggleTheme} />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className={`rounded-2xl shadow-xl border p-8 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Upload Feedback CSV</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Upload a CSV file containing student feedback for AI-powered analysis
          </p>

          <div className={`border-2 border-dashed rounded-lg p-12 text-center ${isDark ? 'border-gray-600' : 'border-gray-300'}`}>
            <Upload size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-lg mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {file ? file.name : 'Select a CSV file to upload'}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700"
            >
              Choose File
            </label>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="mt-6 w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />}
            {uploading ? 'Analyzing...' : 'Analyze Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = ({ analysisData, onNewUpload, onLogout, isDark, onToggleTheme }) => {
  const summary = analysisData?.summary || {};
  
  const handleDownloadReport = async () => {
    try {
      const response = await fetch(`${API_URL}/download-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: analysisData })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'feedback-report.txt';
      a.click();
    } catch (err) {
      alert('Failed to download report');
    }
  };

  const sentimentData = Object.entries(summary.sentiment_distribution || {}).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  const categoryData = Object.entries(summary.dashboard_categories || {}).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Navbar showActions onNewUpload={onNewUpload} onDownload={handleDownloadReport} onLogout={onLogout} isDark={isDark} onToggleTheme={onToggleTheme} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Feedback Analysis Dashboard</h1>
        <p className={`text-lg mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Comprehensive insights from {summary.total_responses || 0} student responses
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Total Feedback" value={summary.total_responses || 0} subtitle="Responses analyzed" icon={FileText} color="blue" isDark={isDark} />
          <Card title="Sentiment Score" value={`${summary.average_rating || 0}/5`} subtitle="Overall satisfaction" icon={TrendingUp} color="green" isDark={isDark} />
          <Card title="Avg Sentiment" value={`${summary.avg_sentiment_percentage || 0}%`} subtitle="Positive feedback" icon={CheckCircle} color="green" isDark={isDark} />
          <Card title="Key Themes" value={summary.key_themes_count || 0} subtitle="Topics identified" icon={AlertCircle} color="amber" isDark={isDark} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" labelLine={false} label={(entry) => `${entry.name}: ${entry.value}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Feedback Categories</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="name" stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDark ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff' }} />
                <Bar dataKey="value" fill="#818CF8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Top Praise Areas</h3>
            <ul className="space-y-3">
              {(summary.top_praise_areas || []).map((area, i) => (
                <li key={i} className={`flex items-start gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Areas for Improvement</h3>
            <ul className="space-y-3">
              {(summary.improvement_areas || []).map((area, i) => (
                <li key={i} className={`flex items-start gap-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>AI-Generated Recommendations</h3>
          <div className="space-y-2">
            {(summary.recommendations || []).map((rec, i) => (
              <p key={i} className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{rec}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('upload');
  };

  const handleLogout = () => {
    setUser(null);
    setAnalysisData(null);
    setCurrentPage('login');
  };

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data);
    setCurrentPage('dashboard');
  };

  const handleNewUpload = () => {
    setAnalysisData(null);
    setCurrentPage('upload');
  };

  return (
    <div>
      {currentPage === 'login' && (
        <LoginPage onLogin={handleLogin} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      )}
      {currentPage === 'upload' && (
        <UploadPage onAnalysisComplete={handleAnalysisComplete} onBack={handleLogout} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      )}
      {currentPage === 'dashboard' && analysisData && (
        <DashboardPage analysisData={analysisData} onNewUpload={handleNewUpload} onLogout={handleLogout} isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />
      )}
    </div>
  );
}