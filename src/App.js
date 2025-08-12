import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Paper,
  TextField,
  Button,
  Avatar,
  Divider,
  Chip,
  Fab,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Alert,
  Snackbar,
  CssBaseline,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Send,
  Person,
  Description,
  TableChart,
  Save
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ChatHistory from './components/ChatHistory';
import './App.css';

// API URL configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#8B5CF6' },
    secondary: { main: '#6366F1' },
    background: { default: '#000000', paper: '#0A0A0A' },
    text: { primary: '#FFFFFF', secondary: '#E5E7EB' },
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    warning: { main: '#FFC107' }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 12, textTransform: 'none', fontWeight: 600, padding: '10px 20px' },
        contained: {
          boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 30px rgba(139, 92, 246, 0.6)',
            background: 'linear-gradient(135deg, #A78BFA 0%, #818CF8 100%)',
          }
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 16,
        },
      },
    },
  },
});

const drawerWidth = 280;

// Function to handle mixed Hebrew-English text
const formatMixedText = (text) => {
  if (!text) return text;
  
  // Simple regex to detect English words/phrases
  const englishPattern = /([a-zA-Z0-9]+(?:\s+[a-zA-Z0-9]+)*)/g;
  
  return text.replace(englishPattern, (match) => {
    // If it's a common English term in Hebrew context, wrap it
    return `<span class="english-term" dir="ltr">${match}</span>`;
  });
};

function App() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [messages, setMessages] = useState([
    { text: 'שלום! אני העוזר החכם TLV500. התחבר לחשבון Google ובחר גיליון כדי להתחיל.', sender: 'assistant', timestamp: new Date(), id: Date.now() }
  ]);
  const [question, setQuestion] = useState('');
  const [fileName, setFileName] = useState('');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [changesCount, setChangesCount] = useState(0);
  const [isSheetLoaded, setIsSheetLoaded] = useState(false);

  const [isPickerReady, setIsPickerReady] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [sheetsMetadata, setSheetsMetadata] = useState('');
  const [authError, setAuthError] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheetName, setSelectedSheetName] = useState('');
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [extractedPdf, setExtractedPdf] = useState(null);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [extractedExcel, setExtractedExcel] = useState(null);
  const [isExtractingExcel, setIsExtractingExcel] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [isStreamingResponse, setIsStreamingResponse] = useState(false);
  const [isSheetSelected, setIsSheetSelected] = useState(false);
  const [isIframeHovered, setIsIframeHovered] = useState(false);
  
  // 🔄 Undo/Redo State
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [hasGreenCells, setHasGreenCells] = useState(false);
  const [isCheckingGreenCells, setIsCheckingGreenCells] = useState(false);
  
  // Chat History Management
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [user, setUser] = useState(null);
  
  const chatEndRef = useRef(null);
  const iframeContainerRef = useRef(null);

  // 🔥 State חדש לניתוח הגליון עם Gemini
  const [sheetAnalysis, setSheetAnalysis] = useState(null);
  const [sheetInstructions, setSheetInstructions] = useState(null);
  
  // 🔥 State חדש לתוכניות שינויים מורכבות
  const [pendingChangePlan, setPendingChangePlan] = useState(null);
  const [clarificationAnswers, setClarificationAnswers] = useState(['', '', '', '', '']);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
  
  // 🎚️ State חדש לבחירת מצב שינוי משמעותי
  const [isSignificantChange, setIsSignificantChange] = useState(false);
  
  // 🔑 Session ID for backend session storage
  const [sessionId, setSessionId] = useState(() => {
    return Date.now().toString() + '_' + Math.random().toString(36).substring(2, 15);
  });

  // Helper function to extract questions from change plan response
  const extractQuestionsFromResponse = (response) => {
    console.log('Extracting questions from response:', response);
    const questionSection = response.split('🤔 שאלות הבהרה')[1];
    if (!questionSection) {
      console.log('No question section found');
      return [];
    }
    
    console.log('Question section found:', questionSection);
    
    const questions = [];
    // Pattern matches "**1.** question text"
    const questionMatches = questionSection.match(/\*\*\d+\.\*\*\s*([^\n*]+)/g);
    
    if (questionMatches) {
      console.log('Raw question matches:', questionMatches);
      questionMatches.forEach(match => {
        const question = match.replace(/\*\*\d+\.\*\*\s*/, '').trim();
        if (question && question.length > 5) {
          questions.push(question);
        }
      });
    } else {
      console.log('No question matches found, trying alternative pattern');
      // Alternative: look for lines that start with numbers
      const lines = questionSection.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (line.match(/^\*\*\d+\.\*\*/)) {
          const question = line.replace(/^\*\*\d+\.\*\*\s*/, '').trim();
          if (question && question.length > 5) {
            questions.push(question);
          }
        }
      }
    }
    
    console.log('Frontend extracted questions:', questions);
    return questions.slice(0, 5); // Ensure max 5 questions
  };

  // Function to execute change plan with clarification answers
  const executeChangePlan = async () => {
    if (!pendingChangePlan || clarificationAnswers.some(answer => !answer.trim())) {
      setSnackbarMessage('❌ יש לענות על כל 5 השאלות');
      setShowSnackbar(true);
      return;
    }

    setIsStreamingResponse(true);
    const loadingMessageId = Date.now();
    setMessages(prev => [...prev, { 
      text: '', 
      sender: 'assistant', 
      isLoading: true, 
      timestamp: new Date(), 
      id: loadingMessageId 
    }]);

    try {
      // Remove unused variable 'sheetData' - it was assigned but never used
      // const sheetData = (isSheetLoaded && isSheetSelected) ?
      //   await getSheetData(extractSpreadsheetId(googleSheetsUrl), selectedSheetName) : null;
      const spreadsheetId = isSheetLoaded ? extractSpreadsheetId(googleSheetsUrl) : null;

      const payload = {
        planId: pendingChangePlan.id,
        clarificationAnswers: clarificationAnswers,
        spreadsheetId: spreadsheetId,
        accessToken: accessToken,
        sheetsMetadata: sheetsMetadata,
        selectedSheetName: selectedSheetName
      };

      const response = await fetch(`${API_URL}/api/execute-change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        accumulatedResponse += decoder.decode(value, { stream: true });

        // Use functional update to avoid capturing accumulatedResponse in the loop
        setMessages(prev => prev.map(m =>
          m.id === loadingMessageId
            ? { ...m, text: accumulatedResponse, isLoading: true }
            : m
        ));
      }

      // Final processing
      setMessages(prev => prev.map(m =>
        m.id === loadingMessageId
        ? { ...m, text: accumulatedResponse, isLoading: false }
        : m
      ));

      // Reset change plan state
      setPendingChangePlan(null);
      setIsAnsweringQuestions(false);
      setClarificationAnswers(['', '', '', '', '']);

      // Refresh the sheet if needed
      if (googleSheetsUrl && selectedSheetName) {
        setTimeout(() => {
          const iframe = document.querySelector('iframe[title="Google Sheets"]');
          if (iframe) {
            // Force iframe reload by setting src to itself
            const currentSrc = iframe.src;
            iframe.src = currentSrc;
          }
        }, 1000);
      }

    } catch (error) {
      console.error('Error executing change plan:', error);
      setMessages(prev => prev.map(m =>
        m.id === loadingMessageId
        ? { ...m, text: `❌ שגיאה בביצוע התוכנית: ${error.message}`, isLoading: false }
        : m
      ));
    } finally {
      setIsStreamingResponse(false);
    }
  };

  useEffect(() => {
    // Load saved access token ONLY - no chat messages from localStorage
    const savedToken = localStorage.getItem('accessToken');
    if (savedToken) {
      setAccessToken(savedToken);
    }

    // Only load PDF/Excel data from localStorage (temporary files, not chat history)
    const savedPdfJson = localStorage.getItem('extractedPdf');
    if (savedPdfJson) {
      try {
        const savedPdf = JSON.parse(savedPdfJson);
        if (savedPdf && savedPdf.name && savedPdf.data) {
          // Check if PDF still exists on server if it has a fileId
          if (savedPdf.fileId) {
            fetch(`${API_URL}/api/download-pdf/${savedPdf.fileId}`, {
              method: 'HEAD',
              credentials: 'include'
            }).then(response => {
              if (response.ok) {
                setExtractedPdf(savedPdf);
                setMessages(prev => [...prev, { text: `📄 נתונים קודמים שחולצו מ-PDF "${savedPdf.name}" נטענו.`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
              } else {
                // PDF no longer exists on server
                console.log('📄 PDF from localStorage no longer exists on server, removing...');
                localStorage.removeItem('extractedPdf');
              }
            }).catch(() => {
              // Error checking PDF, remove from localStorage
              localStorage.removeItem('extractedPdf');
            });
          } else {
            // Old PDF without fileId, just load it
            setExtractedPdf(savedPdf);
            setMessages(prev => [...prev, { text: `📄 נתונים קודמים שחולצו מ-PDF "${savedPdf.name}" נטענו.`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
          }
        }
      } catch (e) {
        console.error('Failed to parse extracted PDF data from localStorage', e);
        localStorage.removeItem('extractedPdf');
      }
    }

    const savedExcelJson = localStorage.getItem('extractedExcel');
    if (savedExcelJson) {
        try {
            const savedExcel = JSON.parse(savedExcelJson);
            if (savedExcel && savedExcel.name && savedExcel.data) {
                setExtractedExcel(savedExcel);
                setMessages(prev => [...prev, { text: `📊 נתונים קודמים שחולצו מ-Excel "${savedExcel.name}" נטענו.`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
            }
        } catch (e) {
            console.error('Failed to parse extracted Excel data from localStorage', e);
            localStorage.removeItem('extractedExcel');
        }
    }
  }, []);

  // Fetch user info when access token is available
  useEffect(() => {
    if (accessToken) {
      fetchUserInfo();
    }
  }, [accessToken]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setAccessToken(token);
      localStorage.setItem('accessToken', token);
      setSnackbarMessage('התחברת בהצלחה!');
      setShowSnackbar(true);
      window.history.replaceState({}, document.title, "/");
    } else {
      // Check if user is already authenticated
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        if (data.accessToken) {
          setAccessToken(data.accessToken);
          localStorage.setItem('accessToken', data.accessToken);
        }
        setSnackbarMessage('ברוך הבא בחזרה!');
        setShowSnackbar(true);
      }
    } catch (error) {
      console.log('Not authenticated:', error);
      // User is not authenticated, show login button
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => window.gapi.load('picker', { 'callback': () => setIsPickerReady(true) });
    document.head.appendChild(script);
  }, []);

  // ניהול גלילה עבור iframe - הגנה מיוחדת על Mac gestures
  useEffect(() => {
    const handleWheel = (e) => {
      if (isIframeHovered) {
        // הגנה ספציפית על horizontal scrolling במאק
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          // זה גלילה אופקית - בלוק את הnavigation gesture
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleTouchStart = (e) => {
      if (isIframeHovered) {
        e.stopPropagation();
      }
    };

    const handleTouchMove = (e) => {
      if (isIframeHovered) {
        e.stopPropagation();
      }
    };

    // הוסף event listeners עם focus על gestures
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isIframeHovered]);

  // 🔄 Undo/Redo Functions
  const checkUndoRedoStatus = useCallback(async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/action/status/${currentSessionId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
      }
    } catch (error) {
      console.error('Error checking undo/redo status:', error);
    }
  }, [currentSessionId]);

  // 🟢 Check for green cells
  const checkForGreenCells = useCallback(async () => {
    if (!googleSheetsUrl || !selectedSheetName || !currentSessionId || isCheckingGreenCells) return;
    
    setIsCheckingGreenCells(true);
    try {
      // Simple check - if there are undo-able actions of type AI_ACTION that were recently executed
      // we assume there might be green cells
      const response = await fetch(`${API_URL}/api/action/status/${currentSessionId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const status = await response.json();
        // For now, assume green cells exist if there are recent AI actions to undo
        const hasChanges = status.canUndo;
        // Debug: checkForGreenCells result
        console.log('🟢 Full status from backend:', status);
        console.log('🟢 hasGreenCells:', hasChanges, 'changesCount:', status.changesCount);
        setHasGreenCells(hasChanges);
        
        // עדכון ספירת השינויים מהבקענד
        setChangesCount(status.changesCount || 0);
      }
    } catch (error) {
      console.error('Error checking for green cells:', error);
      setHasGreenCells(false);
      setChangesCount(0);
    } finally {
      setIsCheckingGreenCells(false);
    }
  }, [googleSheetsUrl, selectedSheetName, currentSessionId, isCheckingGreenCells]);

  // בדיקת סטטוס אוטומטית כשגליון נבחר
  useEffect(() => {
    if (isSheetSelected && selectedSheetName && currentSessionId) {
      // Auto-check status when sheet is selected
      // בדיקה אוטומטית אחרי טעינת הגליון
      const timer = setTimeout(() => {
        checkUndoRedoStatus();
        checkForGreenCells();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [selectedSheetName, isSheetSelected, currentSessionId, checkUndoRedoStatus, checkForGreenCells]);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleSessionSelect = async (sessionId) => {
    if (!sessionId) {
      setCurrentSessionId(null);
      setMessages([{ text: 'שלום! אני העוזר החכם TLV500. התחבר לחשבון Google ובחר גיליון כדי להתחיל.', sender: 'assistant', timestamp: new Date(), id: Date.now() }]);
      return;
    }

    setCurrentSessionId(sessionId);
    
    try {
      const response = await fetch(`${API_URL}/api/chat/session/${sessionId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const chatHistory = await response.json();
        const loadedMessages = chatHistory.messages.map(msg => ({
          text: msg.content,
          sender: msg.role === 'user' ? 'user' : 'assistant',
          timestamp: new Date(msg.timestamp),
          id: msg._id || Date.now() + Math.random()
        }));
        
        setMessages(loadedMessages);
        // Chat history loaded
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      setSnackbarMessage('שגיאה בטעינת השיחה');
      setShowSnackbar(true);
    }
  };

  const generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };




  
  const makeGoogleSheetsAPICall = async (spreadsheetId, range, values = null, method = 'GET', valueRenderOption = 'FORMATTED_VALUE') => {
    if (!accessToken) throw new Error('No access token available. Please log in.');
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    try {
      let url, options;
      if (method === 'GET') {
        // 🔥 הוסף את valueRenderOption לקריאות GET
        const params = new URLSearchParams({ valueRenderOption });
        url = `${baseUrl}/values/${range}?${params}`;
        console.log('🔥 Google Sheets API call:', url);
        options = { method, headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }};
      } else {
        url = `${baseUrl}/values/${range}?valueInputOption=RAW`;
        options = { method, headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) };
      }
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'API call failed');
      return data;
    } catch (error) {
      console.error('Google Sheets API error:', error);
      throw error;
    }
  };

  // 🔥 פונקציה חדשה לשילוב ערכים ונוסחאות
  const combineValuesAndFormulas = (values, formulas) => {
    const combined = [];
    
    console.log('🔥 Starting combineValuesAndFormulas...');
    console.log('📊 Values:', values?.length || 0, 'rows');
    console.log('📋 Formulas:', formulas?.length || 0, 'rows');
    
    for (let row = 0; row < Math.max(values.length, formulas.length); row++) {
      const valueRow = values[row] || [];
      const formulaRow = formulas[row] || [];
      const combinedRow = [];
      
      for (let col = 0; col < Math.max(valueRow.length, formulaRow.length); col++) {
        const value = valueRow[col] || '';
        const formula = formulaRow[col] || '';
        
        // 🔥 לוג לבדיקה (רק לשורה ראשונה)
        if (row === 0 && col < 3) {
          console.log(`Cell [${row},${col}]: value="${value}" (${typeof value}), formula="${formula}" (${typeof formula})`);
        }
        
        // 🔥 תיקון: בדוק שזה string ומתחיל ב-= לפני שמגדירים כנוסחה
        if (typeof formula === 'string' && formula.length > 0 && formula.startsWith('=')) {
          // זו נוסחה אמיתית
          combinedRow.push({
            value: value,
            formula: formula,
            type: 'formula'
          });
        } else {
          // זה ערך רגיל (לא נוסחה) - קח את הערך או את מה שיש בformula אם הערך ריק
          const finalValue = value !== '' ? value : (formula !== '' ? formula : '');
          combinedRow.push({
            value: finalValue,
            type: 'literal'
          });
        }
      }
      combined.push(combinedRow);
    }
    
    console.log('🔥 Combined values and formulas:', combined.slice(0, 2)); // רק 2 שורות ראשונות
    return combined;
  };

  // 🔥 פונקציה חדשה לניתוח הגליון עם Gemini
  const analyzeSheetWithGemini = async (sheetData, sheetName, currentExtractedPdf = null) => {
    try {
      setMessages(prev => [...prev, { 
        text: `🔍 מנתח את מבנה הגליון "${sheetName}" עם AI...`, 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);

      const payload = {
        sheetData: sheetData,
        sheetName: sheetName,
        sessionId: sessionId,
        analysisType: 'initial_analysis'
      };

      const response = await fetch(`${API_URL}/api/analyze-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // שמור את התוצאות
      setSheetAnalysis(result.summary);
      setSheetInstructions(result.instructions); // שמור את ההוראות שחזרו מהבקאנד

      // הצג את הסיכום למשתמש
      setMessages(prev => [...prev, { 
        text: `📊 ניתוח הגליון:\n${result.summary}`, 
        sender: 'assistant', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);

      console.log('🔥 Sheet analysis completed:', result);
      console.log('📝 Sheet summary saved:', result.summary?.length, 'characters');
      console.log('📋 Sheet instructions saved:', result.instructions?.length, 'characters');

      // הודעה קצרה שההוראות נשמרו
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          text: `✅ הוראות עבודה מפורטות נשמרו למערכת עבור שיחות עתידיות`, 
          sender: 'system', 
          timestamp: new Date(), 
          id: Date.now() 
        }]);
      }, 1000);

      // Return the analysis results for use in handleSheetChange
      return {
        instructions: result.instructions,
        summary: result.summary
      };

    } catch (error) {
      console.error('Error analyzing sheet:', error);
      setMessages(prev => [...prev, { 
        text: `❌ שגיאה בניתוח הגליון: ${error.message}`, 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);
    }
  };

  const extractSpreadsheetId = (url) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };
  
  // פונקציה ליצור URL עם הגליון הנכון
  const getSheetUrlWithGid = (baseUrl, sheetName) => {
    if (!sheetName || !sheetsMetadata) return baseUrl;
    
    const selectedSheet = sheetsMetadata.find(sheet => sheet.name === sheetName);
    if (!selectedSheet) return baseUrl;
    
    // הסר כל gid קיים מה-URL
    const cleanUrl = baseUrl.split('#')[0];
    
    // הוסף את ה-gid החדש
    return `${cleanUrl}#gid=${selectedSheet.id}`;
  };

  const getSpreadsheetMetadata = async (spreadsheetId) => {
    if (!accessToken) return [];
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!response.ok) throw new Error('Failed to fetch spreadsheet metadata');
      const metadata = await response.json();
      return metadata.sheets.map(sheet => ({ name: sheet.properties.title, id: sheet.properties.sheetId }));
    } catch (error) {
      console.error('Error fetching spreadsheet metadata:', error);
      return [];
    }
  };

  const handleFileUpload = async (event, fileType) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type === 'application/pdf') {
        // Clean all previous PDF-related state
        setExtractedPdf(null);
        localStorage.removeItem('extractedPdf');
        setIsExtractingData(true);
        
        // Remove any previous PDF-related messages
        setMessages(prev => prev.filter(msg => 
            !msg.text.includes('נתונים חולצו') && 
            !msg.text.includes('שגיאה בחילוץ') &&
            !msg.text.includes('נתוני ה-PDF נוקו')
        ));
        
        setMessages(prev => [...prev, { text: `⏳ מחלץ נתונים מקובץ "${file.name}"...`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
        
        const formData = new FormData();
        formData.append('pdf', file);
        
        // 🔥 אם יש גליון טעון, שלוף את הנתונים ושלח אותם
        if (isSheetLoaded && isSheetSelected) {
          const currentSheetData = await getSheetData(
            extractSpreadsheetId(googleSheetsUrl), 
            selectedSheetName
          );
          
          if (currentSheetData) {
            formData.append('sheetData', JSON.stringify(currentSheetData));
          }
          if (sheetInstructions) {
            formData.append('sheetInstructions', sheetInstructions);
          }
          if (sheetAnalysis) {
            formData.append('sheetAnalysis', sheetAnalysis);
          }
          if (selectedSheetName) {
            formData.append('sheetName', selectedSheetName);
          }
          
          console.log('🔥 Sending PDF with full sheet context:', {
            hasSheetData: !!currentSheetData,
            sheetDataLength: currentSheetData ? currentSheetData.length : 0,
            hasInstructions: !!sheetInstructions,
            instructionsLength: sheetInstructions ? sheetInstructions.length : 0,
            hasAnalysis: !!sheetAnalysis,
            analysisLength: sheetAnalysis ? sheetAnalysis.length : 0,
            sheetName: selectedSheetName
          });
        } else {
          console.log('🔥 Sending PDF without sheet context (simple OCR mode)');
        }

        fetch(`${API_URL}/api/extract-pdf-data`, {
            method: 'POST', 
            body: formData,
            credentials: 'include'
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || 'Failed to extract data') });
            }
            return response.json();
        })
        .then(result => {
            const pdfInfo = { 
                name: file.name, 
                data: result,
                fileId: result.fileId, // שמירת fileId לפתיחה עתידית
                processingMode: result.processingMode || 'structured', // track processing mode
                isFullText: result.isFullText || false // track if this is full text
            };
            setExtractedPdf(pdfInfo);
            localStorage.setItem('extractedPdf', JSON.stringify(pdfInfo));
            setMessages(prev => prev.filter(msg => !msg.text.includes('⏳ מחלץ נתונים')));
            
            // Different success messages based on processing mode
            let successMessage;
            if (result.processingMode === 'simple_ocr') {
                successMessage = `✅ טקסט חולץ מ-"${file.name}". ניתן לשאול שאלות על התוכן. טען גיליון לניתוח מפורט.`;
            } else {
                successMessage = result.fileId 
                    ? `✅ נתונים חולצו בהצלחה מ-"${file.name}". כעת ניתן לשאול שאלות על הקובץ או לחזור לקובץ המקורי.`
                    : `✅ נתונים חולצו בהצלחה מ-"${file.name}". כעת ניתן לשאול שאלות על הקובץ.`;
            }
            
            setMessages(prev => [...prev, { text: successMessage, sender: 'system', timestamp: new Date(), id: Date.now() }]);
        })
        .catch(error => {
            console.error('PDF data extraction failed:', error);
            setMessages(prev => prev.filter(msg => !msg.text.includes('⏳ מחלץ נתונים')));
            setMessages(prev => [...prev, { text: `❌ שגיאה בחילוץ נתונים מ-"${file.name}": ${error.message}`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
        })
        .finally(() => {
            setIsExtractingData(false);
        });
    } else if (fileType === 'Excel') {
        // Ask user if they want to convert to Google Sheets
        const shouldConvert = window.confirm(
            `האם ברצונך להמיר את קובץ ה-Excel "${file.name}" ל-Google Sheets?\n\n` +
            `כן - העלאה ל-Google Drive והמרה ל-Google Sheets\n` +
            `לא - חילוץ נתונים מקומי בלבד`
        );

        if (shouldConvert) {
            // Convert to Google Sheets
            setIsExtractingExcel(true);
            
            setMessages(prev => prev.filter(msg =>
                !msg.text.includes('ממיר') &&
                !msg.text.includes('Google Sheets') &&
                !msg.text.includes('שגיאה בהמרה')
            ));
            
            setMessages(prev => [...prev, {
                text: `🔄 ממיר את "${file.name}" ל-Google Sheets...`,
                sender: 'system',
                timestamp: new Date(),
                id: Date.now()
            }]);
            
            const formData = new FormData();
            formData.append('excel', file);

            fetch(`${API_URL}/api/excel-to-sheets`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to convert Excel to Google Sheets')
                    });
                }
                return response.json();
            })
            .then(result => {
                setMessages(prev => prev.filter(msg => !msg.text.includes('🔄 ממיר')));
                setMessages(prev => [...prev, {
                    text: `✅ הקובץ "${file.name}" הומר בהצלחה ל-Google Sheets ונשמר בתיקיית "TLV500-AI"!`,
                    sender: 'system',
                    timestamp: new Date(),
                    id: Date.now()
                }]);
                
                // Open the created Google Sheet in a new tab
                const sheetUrl = result.spreadsheetUrl || result.url;
                if (sheetUrl) {
                    window.open(sheetUrl, '_blank');
                    setMessages(prev => [...prev, {
                        text: `📊 Google Sheets נפתח בכרטיסייה חדשה`,
                        sender: 'system',
                        timestamp: new Date(),
                        id: Date.now()
                    }]);
                    
                    // Optionally, also load it in the current interface
                    handleGoogleSheetsUrl(sheetUrl);
                }
            })
            .catch(error => {
                console.error('Excel to Google Sheets conversion failed:', error);
                setMessages(prev => prev.filter(msg => !msg.text.includes('🔄 ממיר')));
                setMessages(prev => [...prev, {
                    text: `❌ שגיאה בהמרה ל-Google Sheets: ${error.message}`,
                    sender: 'system',
                    timestamp: new Date(),
                    id: Date.now()
                }]);
            })
            .finally(() => {
                setIsExtractingExcel(false);
            });
        } else {
            // Original local extraction logic
            setExtractedExcel(null);
            localStorage.removeItem('extractedExcel');
            setIsExtractingExcel(true);
            
            setMessages(prev => prev.filter(msg =>
                !msg.text.includes('חולצו מ-Excel') &&
                !msg.text.includes('שגיאה בחילוץ Excel') &&
                !msg.text.includes('נתוני ה-Excel נוקו')
            ));
            
            setMessages(prev => [...prev, {
                text: `⏳ מחלץ נתונים מקובץ Excel "${file.name}"...`,
                sender: 'system',
                timestamp: new Date(),
                id: Date.now()
            }]);
            
            const formData = new FormData();
            formData.append('excel', file);

            fetch(`${API_URL}/api/extract-excel-data`, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to extract Excel data')
                    });
                }
                return response.json();
            })
            .then(result => {
                const excelInfo = { name: file.name, data: result.data };
                setExtractedExcel(excelInfo);
                localStorage.setItem('extractedExcel', JSON.stringify(excelInfo));
                setMessages(prev => prev.filter(msg => !msg.text.includes('⏳ מחלץ נתונים מקובץ Excel')));
                setMessages(prev => [...prev, {
                    text: `✅ נתונים חולצו בהצלחה מ-Excel "${file.name}".`,
                    sender: 'system',
                    timestamp: new Date(),
                    id: Date.now()
                }]);
            })
            .catch(error => {
                console.error('Excel data extraction failed:', error);
                setMessages(prev => prev.filter(msg => !msg.text.includes('⏳ מחלץ נתונים מקובץ Excel')));
                setMessages(prev => [...prev, {
                    text: `❌ שגיאה בחילוץ נתוני Excel: ${error.message}`,
                    sender: 'system',
                    timestamp: new Date(),
                    id: Date.now()
                }]);
            })
            .finally(() => {
                setIsExtractingExcel(false);
            });
        }
    }
  };

  const loadAvailableSheets = async (spreadsheetId) => {
    setIsLoadingSheets(true);
    setIsSheetSelected(false); // Reset selection
    setSelectedSheetName(''); // Clear any previous selection
    try {
      const sheets = await getSpreadsheetMetadata(spreadsheetId);
      setAvailableSheets(sheets);
      setSheetsMetadata(sheets);
      // רק הודעה שהגליונות נטענו - בלי לבחור גליון אוטומטית
      if (sheets.length > 0) {
        setMessages(prev => [...prev, { 
          text: `📋 נמצאו ${sheets.length} גליונות - בחר גליון כדי להתחיל`, 
          sender: 'system', 
          timestamp: new Date(), 
          id: Date.now() 
        }]);
      }
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleGoogleSheetsUrl = async (url) => {
    setGoogleSheetsUrl(url);
    setIsSheetLoaded(true);
    setIsSheetSelected(false); // Reset sheet selection for new spreadsheet
    setIsAgentMode(false); // Reset agent mode for new spreadsheet
    const spreadsheetId = extractSpreadsheetId(url);
    if (spreadsheetId && accessToken) await loadAvailableSheets(spreadsheetId);
  };
  
  const handleSheetChange = async (newSheetName) => {
    if (newSheetName === selectedSheetName) return;
    
    setSelectedSheetName(newSheetName);
    setIsSheetSelected(true); // מסמן שנבחר גליון
    
    const spreadsheetId = extractSpreadsheetId(googleSheetsUrl);
    if (spreadsheetId) {
      // 🔥 שלוף נתוני גליון עם ערכים ונוסחאות
      const sheetData = await getSheetData(spreadsheetId, newSheetName);
      
      setMessages(prev => [...prev, { 
        text: `✅ מחובר לגליון: ${newSheetName}`, 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);

      // 🔥 נתח את הגליון עם Gemini
      if (sheetData) {
        const analysisResult = await analyzeSheetWithGemini(sheetData, newSheetName, extractedPdf);
        
        // 🔥 Reanalyze PDF if it exists and is in simple OCR mode
        if (extractedPdf && extractedPdf.processingMode === 'simple_ocr' && analysisResult) {
          console.log('🔄 PDF found in simple_ocr mode, triggering reanalysis with sheet context...');
          await reanalyzePdfWithSheetContext(sheetData, analysisResult.instructions, analysisResult.summary, newSheetName);
        }
      }
    }
  };

  // 🔥 Function to reanalyze PDF when sheet context becomes available
  const reanalyzePdfWithSheetContext = async (sheetData, sheetInstructions, sheetAnalysis, selectedSheetName) => {
    if (!extractedPdf || !extractedPdf.fileId || extractedPdf.processingMode === 'structured') {
      return; // No PDF to reanalyze or already analyzed
    }

    console.log('🔄 Reanalyzing PDF with new sheet context...');
    
    setMessages(prev => [...prev, { 
      text: `🔄 מנתח מחדש את "${extractedPdf.name}" עם הקשר הגליון החדש...`, 
      sender: 'system', 
      timestamp: new Date(), 
      id: Date.now() 
    }]);

    try {
      // Create FormData for re-analysis
      const formData = new FormData();
      
      // We need to fetch the PDF file again - check if it exists first
      const pdfResponse = await fetch(`${API_URL}/api/download-pdf/${extractedPdf.fileId}`, {
        credentials: 'include'
      });
      
      if (!pdfResponse.ok) {
        // PDF no longer exists on server - clean up state
        console.log('❌ PDF file no longer exists on server, cleaning up...');
        setExtractedPdf(null);
        localStorage.removeItem('extractedPdf');
        setMessages(prev => prev.filter(msg => !msg.text.includes(extractedPdf.name)));
        return;
      }
      
      const pdfBlob = await pdfResponse.blob();
      formData.append('pdf', pdfBlob, extractedPdf.name);
      
      // Add sheet context data directly to FormData
      console.log('🔄 Reanalyzing PDF with sheet context:', {
        hasSheetData: !!sheetData,
        sheetDataLength: sheetData ? sheetData.length : 0,
        hasInstructions: !!sheetInstructions,
        instructionsLength: sheetInstructions ? sheetInstructions.length : 0,
        hasAnalysis: !!sheetAnalysis,
        analysisLength: sheetAnalysis ? sheetAnalysis.length : 0,
        sheetName: selectedSheetName
      });
      
      if (sheetData) {
        formData.append('sheetData', JSON.stringify(sheetData));
      }
      if (sheetInstructions) {
        formData.append('sheetInstructions', sheetInstructions);
      }
      if (sheetAnalysis) {
        formData.append('sheetAnalysis', sheetAnalysis);
      }
      if (selectedSheetName) {
        formData.append('sheetName', selectedSheetName);
      }
      
      const response = await fetch(`${API_URL}/api/extract-pdf-data`, {
        method: 'POST', 
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to reanalyze PDF');
      }
      
      const result = await response.json();
      
      // Update PDF info with new analysis
      const updatedPdfInfo = { 
        ...extractedPdf,
        data: result,
        processingMode: result.processingMode || 'structured',
        isFullText: result.isFullText || false
      };
      
      setExtractedPdf(updatedPdfInfo);
      localStorage.setItem('extractedPdf', JSON.stringify(updatedPdfInfo));
      
      setMessages(prev => [...prev, { 
        text: `✅ "${extractedPdf.name}" נותח מחדש בהצלחה עם הקשר הגליון`, 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);
      
    } catch (error) {
      console.error('Error reanalyzing PDF:', error);
      setMessages(prev => [...prev, { 
        text: `❌ שגיאה בניתוח מחדש של "${extractedPdf.name}": ${error.message}`, 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);
    }
  };

  const pickerCallback = (data) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      setFileName(doc.name);
      handleGoogleSheetsUrl(doc.url);
      setSnackbarMessage(`טען גיליון: ${doc.name}`);
      setShowSnackbar(true);
    }
  };

  const createPicker = () => {
    const developerKey = process.env.REACT_APP_GEMINI_API_KEY;
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || !developerKey) {
      setAuthError('מפתחות API אינם מוגדרים כראוי.');
      setShowSnackbar(true);
      return;
    }
    const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);
    view.setMimeTypes("application/vnd.google-apps.spreadsheet");
    const picker = new window.google.picker.PickerBuilder()
      .setAppId(clientId.split('-')[0])
      .setOAuthToken(accessToken)
      .setDeveloperKey(developerKey)
      .addView(view)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  const getSheetData = async (spreadsheetId, sheetName = null) => {
    if (!accessToken) return null;
    try {
      const range = sheetName ? `'${sheetName}'!A1:Z1000` : 'A1:Z1000';
      
      console.log('🔥 Fetching sheet data with values and formulas...');
      
      // 🔥 קריאה 1: שלוף ערכים מעוצבים
      const valuesResponse = await makeGoogleSheetsAPICall(
        spreadsheetId, 
        range, 
        null, 
        'GET',
        'FORMATTED_VALUE'
      );
      
      // 🔥 קריאה 2: שלוף נוסחאות  
      const formulasResponse = await makeGoogleSheetsAPICall(
        spreadsheetId, 
        range, 
        null, 
        'GET',
        'FORMULA'
      );
      
      console.log('📊 Values response:', valuesResponse.values?.length || 0, 'rows');
      console.log('📋 Formulas response:', formulasResponse.values?.length || 0, 'rows');
      
      // 🔥 לוגים נוספים לבדיקה
      if (valuesResponse.values?.length > 0) {
        console.log('📊 Sample values row 0:', valuesResponse.values[0]);
      }
      if (formulasResponse.values?.length > 0) {
        console.log('📋 Sample formulas row 0:', formulasResponse.values[0]);
      }
      
      // 🔥 שלב את שניהם לאובייקט עשיר
      const combinedData = combineValuesAndFormulas(
        valuesResponse.values || [], 
        formulasResponse.values || []
      );
      
      // 🔥 הצג הודעה למשתמש על השיפור
      const formulaCount = combinedData.flat().filter(cell => cell.type === 'formula').length;
      if (formulaCount > 0) {
        console.log('🔥 Sample formula cells:', combinedData.flat().filter(cell => cell.type === 'formula').slice(0, 3));
        setMessages(prev => [...prev, { 
          text: `✨ גיליון נטען עם ${formulaCount} נוסחאות - כעת ה-AI יכול לראות גם את הנוסחאות וגם את הערכים!`, 
          sender: 'system', 
          timestamp: new Date(), 
          id: Date.now() 
        }]);
      } else {
        setMessages(prev => [...prev, { 
          text: `📊 גיליון נטען בהצלחה - מכיל נתונים אבל לא נמצאו נוסחאות`, 
          sender: 'system', 
          timestamp: new Date(), 
          id: Date.now() 
        }]);
      }
      
      return combinedData;
      
    } catch (error) {
      console.error('Failed to fetch sheet data:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
      setMessages(prev => [...prev, { text: `❌ שגיאה בטעינת גיליון: ${error.message}`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
      return null;
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([{ text: 'שלום! אני העוזר החכם TLV500. התחבר לחשבון Google ובחר גיליון כדי להתחיל.', sender: 'assistant', timestamp: new Date(), id: Date.now() }]);
    // אפס מצב Agent Mode אם אין גליון נבחר
    if (!isSheetSelected) {
      setIsAgentMode(false);
    }
    // אפס מצב Undo/Redo
    setCanUndo(false);
    setCanRedo(false);
    setHasGreenCells(false);
    setChangesCount(0);
    setSheetAnalysis(null);
    setSheetInstructions(null);
  };


  const handleLogout = async () => {
    try {
      // Call logout endpoint
      await fetch(`${API_URL}/auth/logout`, {
        credentials: 'include'
      });
      
      // Clear local state
      setAccessToken('');
      setUser(null);
      setCurrentSessionId(null);
      setIsSheetSelected(false);
      setIsAgentMode(false);
      setCanUndo(false);
      setCanRedo(false);
      setHasGreenCells(false);
      setChangesCount(0);
      setSheetAnalysis(null);
      setSheetInstructions(null);
      localStorage.removeItem('accessToken');
      
      // Reset session ID for new session
      setSessionId(Date.now().toString() + '_' + Math.random().toString(36).substring(2, 15));
      
      // Reset messages
      setMessages([{ text: 'שלום! אני העוזר החכם TLV500. התחבר לחשבון Google ובחר גיליון כדי להתחיל.', sender: 'assistant', timestamp: new Date(), id: Date.now() }]);
      
      setSnackbarMessage('התנתקת בהצלחה!');
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };


  // ✅ Approve All Changes
  const approveAllChanges = async () => {
    if (!googleSheetsUrl || !selectedSheetName || !currentSessionId) return;

    try {
      const spreadsheetId = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      const sheetId = availableSheets.find(s => s.name === selectedSheetName)?.id || 0;

      const response = await fetch(`${API_URL}/api/action/approve-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetId: spreadsheetId,
          selectedSheetName: selectedSheetName,
          sheetId: sheetId,
          sessionId: currentSessionId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbarMessage(result.message || '✅ כל השינויים אושרו');
        setShowSnackbar(true);
        
        // Refresh status
        await checkUndoRedoStatus();
        await checkForGreenCells();
        
        // רענון חלק של הגליון
        setTimeout(() => {
          const iframe = document.querySelector('iframe[title="Google Sheets"]');
          if (iframe) {
            // Force iframe reload by setting src to itself
            const currentSrc = iframe.src;
            iframe.src = currentSrc;
          }
        }, 500);
      } else {
        throw new Error('Failed to approve changes');
      }
    } catch (error) {
      console.error('Error approving all changes:', error);
      setSnackbarMessage('❌ שגיאה באישור השינויים');
      setShowSnackbar(true);
    }
  };

  // ❌ Reject All Changes
  const rejectAllChanges = async () => {
    if (!googleSheetsUrl || !selectedSheetName || !currentSessionId) return;

    try {
      const spreadsheetId = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
      const sheetId = availableSheets.find(s => s.name === selectedSheetName)?.id || 0;

      const response = await fetch(`${API_URL}/api/action/reject-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          spreadsheetId: spreadsheetId,
          selectedSheetName: selectedSheetName, 
          sheetId: sheetId,
          sessionId: currentSessionId
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setSnackbarMessage(result.message || '❌ כל השינויים נדחו');
        setShowSnackbar(true);
        
        // Refresh status
        await checkUndoRedoStatus();
        await checkForGreenCells();
        
        // רענון חלק של הגליון
        setTimeout(() => {
          const iframe = document.querySelector('iframe[title="Google Sheets"]');
          if (iframe) {
            // Force iframe reload by setting src to itself
            const currentSrc = iframe.src;
            iframe.src = currentSrc;
          }
        }, 500);
      } else {
        throw new Error('Failed to reject changes');
      }
    } catch (error) {
      console.error('Error rejecting all changes:', error);
      setSnackbarMessage('❌ שגיאה בדחיית השינויים');
      setShowSnackbar(true);
    }
  };

  const undoAction = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/action/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: currentSessionId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        setSnackbarMessage('↩️ ' + data.message);
        setShowSnackbar(true);
        
        // עדכון כפתורי קבל/דחה
        await checkForGreenCells();
        
        // רענון חלק של הגליון
        if (googleSheetsUrl && selectedSheetName) {
          setTimeout(() => {
            const iframe = document.querySelector('iframe[title="Google Sheets"]');
            if (iframe) {
              // Force iframe reload by setting src to itself
              const currentSrc = iframe.src;
              iframe.src = currentSrc;
            }
          }, 500); // השהיה קצרה לפני רענון
        }
      } else {
        const error = await response.json();
        setSnackbarMessage('❌ שגיאה בביטול: ' + error.error);
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Error in undo action:', error);
      setSnackbarMessage('❌ שגיאה בביטול הפעולה');
      setShowSnackbar(true);
    }
  };

  const redoAction = async () => {
    if (!currentSessionId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/action/redo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId: currentSessionId })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCanUndo(data.canUndo);
        setCanRedo(data.canRedo);
        setSnackbarMessage('⤴️ ' + data.message);
        setShowSnackbar(true);
        
        // עדכון כפתורי קבל/דחה
        await checkForGreenCells();
        
        // רענון חלק של הגליון
        if (googleSheetsUrl && selectedSheetName) {
          setTimeout(() => {
            const iframe = document.querySelector('iframe[title="Google Sheets"]');
            if (iframe) {
              // Force iframe reload by setting src to itself
              const currentSrc = iframe.src;
              iframe.src = currentSrc;
            }
          }, 500); // השהיה קצרה לפני רענון
        }
      } else {
        const error = await response.json();
        setSnackbarMessage('❌ שגיאה בשחזור: ' + error.error);
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Error in redo action:', error);
      setSnackbarMessage('❌ שגיאה בשחזור הפעולה');
      setShowSnackbar(true);
    }
  };

  const sendMessage = async () => {
    if (!question.trim() || isStreamingResponse) return;

    // 🛡️ בדיקה חדשה - אם יש גליון אבל לא נבחר גליון ספציפי
    if (isSheetLoaded && !isSheetSelected) {
      setMessages(prev => [...prev, { 
        text: '❌ יש לבחור גליון תחילה מהרשימה למעלה', 
        sender: 'system', 
        timestamp: new Date(), 
        id: Date.now() 
      }]);
      return;
    }

    const currentQuestion = question;
    const userMessage = { text: currentQuestion, sender: 'user', timestamp: new Date(), id: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsStreamingResponse(true);
    
    // Generate session ID if this is a new conversation
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = generateSessionId();
      setCurrentSessionId(sessionId);
    }
    
    const loadingMessageId = Date.now() + 1;
    setMessages(prev => [...prev, { text: '', sender: 'assistant', isLoading: true, timestamp: new Date(), id: loadingMessageId }]);

    // User message will be saved automatically by backend in /api/chat-stream

    try {
        const sheetData = (isSheetLoaded && isSheetSelected) ? 
          await getSheetData(extractSpreadsheetId(googleSheetsUrl), selectedSheetName) : null;
        
        // We need to get the spreadsheetId here to send it
        const spreadsheetId = isSheetLoaded ? extractSpreadsheetId(googleSheetsUrl) : null;

        const payload = {
          question: currentQuestion,
          sheetData: sheetData,
          extractedPdfData: extractedPdf ? extractedPdf.data : null,
          extractedExcelData: extractedExcel ? extractedExcel.data : null,
          isAgentMode: isAgentMode,
          isSignificantChange: isSignificantChange,  // 🎚️ הוסף מצב שינוי משמעותי
          conversationHistory: messages.filter(m => !m.isLoading).map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
          })),
          spreadsheetId: spreadsheetId,
          accessToken: accessToken,
          sessionId: sessionId,  // Include session ID
          sheetsMetadata: sheetsMetadata,       // ודא שהמשתנה הזה קיים ומכיל את המידע
          selectedSheetName: selectedSheetName,  // ודא שהמשתנה הזה קיים ומכיל את שם הגיליון
          sheetInstructions: sheetInstructions,   // 🔥 הוסף הוראות ניתוח
          sheetAnalysis: sheetAnalysis           // 🔥 הוסף ניתוח הגליון
        };

        console.log('🔥 Sending payload with sheet instructions:', !!sheetInstructions);
        if (sheetInstructions) {
          console.log('📋 Sheet instructions preview:', sheetInstructions.substring(0, 200) + '...');
        }
        
        const response = await fetch(`${API_URL}/api/chat-stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // This is crucial for session cookies!
            body: JSON.stringify(payload),
        });

        if (!response.ok || !response.body) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            accumulatedResponse += decoder.decode(value, { stream: true });

            const currentResponse = accumulatedResponse;
            setMessages(prev => prev.map(m => {
                if (m.id === loadingMessageId) {
                    // Show the accumulated response directly as text
                    return { ...m, text: currentResponse, isLoading: true };
                }
                return m;
            }));
        }

        // Final response processing - check if this is a change plan with clarification questions
        const isChangePlanResponse = accumulatedResponse.includes('🤔 שאלות הבהרה') && accumulatedResponse.includes('מזהה תוכנית:');
        
        if (isChangePlanResponse) {
          // Extract plan ID from response
          const planIdMatch = accumulatedResponse.match(/מזהה תוכנית:\s*`([^`]+)`/);
          if (planIdMatch) {
            const planId = planIdMatch[1];
            setPendingChangePlan({
              id: planId,
              response: accumulatedResponse,
              questions: extractQuestionsFromResponse(accumulatedResponse)
            });
            setIsAnsweringQuestions(true);
            setClarificationAnswers(['', '', '', '', '']); // Reset answers
          }
        }
        
        setMessages(prev => prev.map(m =>
            m.id === loadingMessageId
            ? { ...m, text: accumulatedResponse, isLoading: false }
            : m
        ));

        // Assistant response is automatically saved by backend in /api/chat-stream
        
                 // אם היה זה פקודת undo/redo, רענן את הגליון
         const questionLower = currentQuestion.toLowerCase().trim();
         const undoRedoKeywords = ['בטל', 'undo', 'שחזר', 'redo', 'בטל פעולה', 'שחזר פעולה'];
         if (undoRedoKeywords.some(keyword => questionLower.includes(keyword))) {
             // רענון חלק של הגליון
             if (googleSheetsUrl && selectedSheetName) {
                 setTimeout(() => {
                     const iframe = document.querySelector('iframe[title="Google Sheets"]');
                     if (iframe) {
                         // Force iframe reload by setting src to itself
                         const currentSrc = iframe.src;
                         iframe.src = currentSrc;
                     }
                 }, 800); // השהיה מעט יותר ארוכה עבור פקודות צ'אט
             }
         }

    } catch (error) {
        console.error('Error in sendMessage:', error);
        setMessages(prev => prev.map(m => 
            m.id === loadingMessageId 
            ? { ...m, text: `אירעה שגיאה: ${error.message}`, isLoading: false, isError: true } 
            : m
        ));
    } finally {
        setIsStreamingResponse(false);
        // בדוק סטטוס Undo/Redo ותאים ירוקים אחרי כל הודעה
        console.log('📋 Message completed, checking status...', { isAgentMode, currentSessionId });
        setTimeout(() => {
          console.log('⏰ Running status checks...');
          checkUndoRedoStatus();
          checkForGreenCells();
        }, 1000); // השהיה קצרה כדי לוודא שהבק-אנד סיים
    }
  };

  const saveAllChanges = () => {
          setMessages(prev => [...prev, { text: `💾 כל השינויים נשמרו לגיליון ${fileName}`, sender: 'system', timestamp: new Date(), id: Date.now() }]);
    };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      

      
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(circle at 20% 30%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 60%)`, pointerEvents: 'none', zIndex: 0 }} />
        {!isMobile && (
          <Drawer variant="permanent" sx={{ width: drawerWidth, flexShrink: 0, zIndex: 1, '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', bgcolor: 'rgba(10, 10, 10, 0.98)', borderRight: '1px solid rgba(139, 92, 246, 0.4)', backdropFilter: 'blur(20px)' }}}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>TLV500</Typography>
              <Typography variant="body2" color="text.secondary">AI Assistant</Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.4)' }} />
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar
                  src={user?.profilePicture}
                  sx={{ width: 45, height: 45, background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)' }}
                >
                  {user?.name ? user.name.charAt(0) : <Person />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {user?.name || 'משתמש אורח'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email || 'לא מחובר'}
                  </Typography>
                </Box>
              </Box>
              {accessToken && (
                <Button
                  variant="outlined"
                  onClick={handleLogout}
                  size="small"
                  fullWidth
                  sx={{
                    borderColor: 'rgba(239, 68, 68, 0.5)',
                    color: 'error.main',
                    '&:hover': {
                      borderColor: 'error.main',
                      bgcolor: 'rgba(239, 68, 68, 0.1)'
                    }
                  }}
                >
                  התנתק
                </Button>
              )}
            </Box>
            <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.4)' }} />
            
            {/* Chat History */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <ChatHistory
                accessToken={accessToken}
                onSessionSelect={handleSessionSelect}
                currentSessionId={currentSessionId}
              />
            </Box>
          </Drawer>
        )}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', zIndex: 1, height: '100vh', overflow: 'hidden' }}>
          <Box sx={{ flex: isMobile ? '1 1 60%' : '0 0 65%', p: 2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" fontWeight={600} color="text.primary">{fileName || 'לא נבחר גיליון'}</Typography>
                {availableSheets.length > 0 && (
                  <FormControl 
                    size="small" 
                    sx={{ 
                      minWidth: 200,
                      '& .MuiOutlinedInput-notchedOutline': { 
                        borderColor: !isSheetSelected ? 'rgba(239, 68, 68, 0.7)' : 'rgba(139, 92, 246, 0.5)' 
                      },
                      '& .MuiInputLabel-root': {
                        color: !isSheetSelected ? 'error.main' : 'text.secondary'
                      }
                    }}
                    error={!isSheetSelected}
                  >
                    <InputLabel>
                      {!isSheetSelected ? '🔴 בחר גליון (חובה)' : 'גליון נוכחי'}
                    </InputLabel>
                    <Select 
                      value={selectedSheetName || ''} 
                      onChange={(e) => handleSheetChange(e.target.value)} 
                      disabled={isLoadingSheets}
                    >
                      {availableSheets.map(sheet => (
                        <MenuItem key={sheet.id} value={sheet.name}>
                          {sheet.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {isLoadingSheets && <CircularProgress size={20} sx={{ color: 'primary.main' }} />}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!accessToken ? (
                  <Button variant="contained" href={API_URL}>התחבר עם Google</Button>
                ) : (
                  <Button variant="outlined" onClick={createPicker} disabled={!isPickerReady}>
                    {!isPickerReady ? 'טוען API...' : 'בחר גיליון מ-Drive'}
                  </Button>
                )}
                {accessToken && (
                  <Button variant="outlined" onClick={startNewChat} sx={{ minWidth: 'auto' }}>
                    + שיחה חדשה
                  </Button>
                )}
              </Box>
              {changesCount > 0 && <Chip label={`${changesCount} שינויים לא שמורים`} size="small" color="warning" />}
              <Button variant="contained" startIcon={<Save />} onClick={saveAllChanges} color="primary" size="small">שמור הכל</Button>
            </Box>
            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(15, 15, 15, 0.98)', border: '1px solid rgba(139, 92, 246, 0.25)', position: 'relative' }}>
              


              {/* שדה קישור - רק כשאין גליון */}
              {!isSheetLoaded && (
                <Box sx={{ p: 1, textAlign: 'center', mt: 2 }}>
                  <TextField 
                    placeholder="הכנס קישור לגוגל שיטס..." 
                    size="small" 
                    sx={{ minWidth: 400 }} 
                    onKeyPress={async (e) => { 
                      if (e.key === 'Enter' && e.target.value) { 
                        await handleGoogleSheetsUrl(e.target.value); 
                        e.target.value = ''; 
                      } 
                    }} 
                  />
                </Box>
              )}
              
              {/* כפתורי קבל/דחה מרובעים צמודים למסגרת מבחוץ */}

              

              <Box 
                ref={iframeContainerRef} 
                sx={{ 
                  flexGrow: 1, 
                  border: '1px solid rgba(139, 92, 246, 0.4)', 
                  borderRadius: 1, 
                  bgcolor: 'rgba(5, 5, 5, 0.8)', 
                  position: 'relative', 
                  overflow: 'hidden',
                  m: 0.5, // רווח מינימלי מהקצוות
                  // הגנה על Mac gestures
                  overscrollBehavior: 'contain',
                  touchAction: 'auto',
                  WebkitOverflowScrolling: 'touch'
                }} 
                onMouseEnter={() => setIsIframeHovered(true)} 
                onMouseLeave={() => setIsIframeHovered(false)}
              >
                {/* כפתורי קבל/דחה צמודים לצד ימין של הקונטיינר */}
                {isSheetLoaded && isSheetSelected && (hasGreenCells || changesCount > 0) && (
                  <div style={{ 
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    display: 'flex', 
                    gap: '0px',
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '2px'
                  }}>
                    {/* כפתור קבל */}
                    <div
                      onClick={() => {
                        approveAllChanges();
                      }}
                      style={{
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: '1px solid #2e7d32',
                        width: '45px',
                        height: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '0px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="אשר כל השינויים"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#45a049';
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.4)';
                        e.target.style.borderColor = '#4caf50';
                        e.target.textContent = 'קבל הכל';
                        e.target.style.fontSize = '0.6rem';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#4caf50';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                        e.target.style.borderColor = '#2e7d32';
                        e.target.textContent = `✓ (${changesCount || 0})`;
                        e.target.style.fontSize = '0.65rem';
                      }}
                    >
                      ✓ ({changesCount || 0})
                    </div>

                    {/* כפתור דחה */}
                    <div
                      onClick={() => {
                        rejectAllChanges();
                      }}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: '1px solid #c62828',
                        width: '45px',
                        height: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '0px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="דחה כל השינויים"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#d32f2f';
                        e.target.style.transform = 'scale(1.05)';
                        e.target.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.4)';
                        e.target.style.borderColor = '#f44336';
                        e.target.textContent = 'דחה הכל';
                        e.target.style.fontSize = '0.6rem';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#f44336';
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                        e.target.style.borderColor = '#c62828';
                        e.target.textContent = `✕ (${changesCount || 0})`;
                        e.target.style.fontSize = '0.65rem';
                      }}
                    >
                      ✕ ({changesCount || 0})
                    </div>
                  </div>
                )}

                {/* כפתורי Undo/Redo בצד ימין תחתון */}
                {isSheetLoaded && isSheetSelected && (canUndo || canRedo) && (
                  <div style={{ 
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    display: 'flex', 
                    gap: '0px',
                    zIndex: 1000,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '4px',
                    padding: '2px'
                  }}>
                    {/* כפתור Undo */}
                    <div
                      onClick={() => {
                        if (canUndo) undoAction();
                      }}
                      style={{
                        backgroundColor: canUndo ? '#2196f3' : '#666',
                        color: 'white',
                        border: `1px solid ${canUndo ? '#1976d2' : '#555'}`,
                        width: '45px',
                        height: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '0px',
                        cursor: canUndo ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        opacity: canUndo ? 1 : 0.5
                      }}
                      title="בטל פעולה"
                      onMouseEnter={(e) => {
                        if (canUndo) {
                          e.target.style.backgroundColor = '#1976d2';
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 4px 8px rgba(33, 150, 243, 0.4)';
                          e.target.style.borderColor = '#2196f3';
                          e.target.textContent = 'בטל';
                          e.target.style.fontSize = '0.6rem';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canUndo) {
                          e.target.style.backgroundColor = '#2196f3';
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                          e.target.style.borderColor = '#1976d2';
                          e.target.textContent = '↩️';
                          e.target.style.fontSize = '0.65rem';
                        }
                      }}
                    >
                      ↩️
                    </div>

                    {/* כפתור Redo */}
                    <div
                      onClick={() => {
                        if (canRedo) redoAction();
                      }}
                      style={{
                        backgroundColor: canRedo ? '#ff9800' : '#666',
                        color: 'white',
                        border: `1px solid ${canRedo ? '#f57c00' : '#555'}`,
                        width: '45px',
                        height: '20px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        borderRadius: '0px',
                        cursor: canRedo ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        opacity: canRedo ? 1 : 0.5
                      }}
                      title="שחזר פעולה"
                      onMouseEnter={(e) => {
                        if (canRedo) {
                          e.target.style.backgroundColor = '#f57c00';
                          e.target.style.transform = 'scale(1.05)';
                          e.target.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.4)';
                          e.target.style.borderColor = '#ff9800';
                          e.target.textContent = 'שחזר';
                          e.target.style.fontSize = '0.6rem';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (canRedo) {
                          e.target.style.backgroundColor = '#ff9800';
                          e.target.style.transform = 'scale(1)';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                          e.target.style.borderColor = '#f57c00';
                          e.target.textContent = '⤴️';
                          e.target.style.fontSize = '0.65rem';
                        }
                      }}
                    >
                      ⤴️
                    </div>
                  </div>
                )}

                {isSheetLoaded && isSheetSelected ? (
                  <iframe src={getSheetUrlWithGid(googleSheetsUrl, selectedSheetName)} width="100%" height="100%" style={{ border: 'none', borderRadius: '4px' }} title="Google Sheets" />
                ) : availableSheets.length > 0 && !isSheetSelected ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                    <TableChart sx={{ fontSize: 60, mb: 2, opacity: 0.5, color: 'error.main' }} />
                    <Typography variant="h6" gutterBottom color="error.main">
                      יש לבחור גליון תחילה
                    </Typography>
                    <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400 }}>
                      בחר גליון מהרשימה למעלה כדי להתחיל לעבוד
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'text.secondary' }}>
                    <TableChart sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" gutterBottom>טען גיליון גוגל שיטס</Typography>
                    <Typography variant="body2" textAlign="center" sx={{ maxWidth: 400 }}>הכנס קישור לגוגל שיטס בשדה למעלה</Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
          <Box sx={{ width: isMobile ? '100%' : '35%', flex: isMobile ? '1 1 40%' : '0 0 35%', p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(25, 25, 25, 0.98)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(139, 92, 246, 0.4)' }}>
                <Typography variant="h6" fontWeight={600}>עוזר AI</Typography>
                <Typography variant="body2" color="text.secondary">מוכן לעזור עם הניתוח שלך</Typography>
              </Box>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(139, 92, 246, 0.4)' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="outlined" component="label" startIcon={<Description />} size="small" disabled={isExtractingData} sx={{ flex: 1, borderColor: 'rgba(139, 92, 246, 0.5)', '&.Mui-disabled': { color: 'text.secondary' } }}>
                      {isExtractingData ? 'מעבד...' : 'PDF'}
                      <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'PDF')} disabled={isExtractingData} />
                    </Button>
                    <Button variant="outlined" component="label" startIcon={<TableChart />} size="small" disabled={isExtractingExcel} sx={{ flex: 1, borderColor: 'rgba(139, 92, 246, 0.5)' }}>
                      {isExtractingExcel ? 'מעבד...' : 'Excel'}
                      <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'Excel')} disabled={isExtractingExcel}/>
                    </Button>
                  </Box>
                  {extractedPdf && (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mt: 1, 
                      p: 1, 
                      bgcolor: extractedPdf.processingMode === 'simple_ocr' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                      borderRadius: 2, 
                      border: extractedPdf.processingMode === 'simple_ocr' ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)'
                    }}>
                      <Description sx={{ 
                        color: extractedPdf.processingMode === 'simple_ocr' ? 'warning.main' : 'primary.main', 
                        fontSize: 20 
                      }} />
                      <Typography variant="body2" sx={{ 
                        flex: 1, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {extractedPdf.name}
                        {extractedPdf.processingMode === 'simple_ocr' && ' 📑'}
                        {extractedPdf.processingMode === 'structured' && ' 🔍'}
                      </Typography>
                      <Button 
                        size="small" 
                        onClick={() => { 
                          setExtractedPdf(null); 
                          localStorage.removeItem('extractedPdf'); 
                          setMessages(prev => [...prev, { 
                            text: '📄 נתוני ה-PDF נוקו מההקשר.', 
                            sender: 'system', 
                            timestamp: new Date(), 
                            id: Date.now() 
                          }]); 
                        }} 
                        sx={{ color: 'error.main', minWidth: 'auto', p: 0.5 }}
                      >
                        ✕
                      </Button>
                    </Box>
                  )}
                  {extractedExcel && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1, bgcolor: 'rgba(16, 185, 129, 0.1)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <TableChart sx={{ color: 'success.main', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{extractedExcel.name}</Typography>
                        <Button size="small" onClick={() => { setExtractedExcel(null); localStorage.removeItem('extractedExcel'); setMessages(prev => [...prev, { text: '📊 נתוני ה-Excel נוקו מההקשר.', sender: 'system', timestamp: new Date(), id: Date.now() }]); }} sx={{ color: 'error.main', minWidth: 'auto', p: 0.5 }}>✕</Button>
                    </Box>
                  )}
                </Box>
              </Box>
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {messages.map((msg, index) => (
                  <Box key={msg.id || index} sx={{ mb: 2 }} className="chat-message">
                    <Box sx={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', mb: 1 }}>
                      <Paper sx={{ 
                        p: 1.5, 
                        maxWidth: '85%', 
                        background: msg.sender === 'user' ? 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)' : 'rgba(35, 35, 35, 0.9)', 
                        color: 'white', 
                        borderRadius: 3
                      }}>
                        {msg.isLoading ? <CircularProgress size={16} color="inherit" /> :
                          <Typography
                            variant="body2"
                            className="chat-message-text"
                            sx={{ whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{
                              __html: formatMixedText(msg.text)
                            }}
                          />
                        }
                      </Paper>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: msg.sender === 'user' ? 'right' : 'left', px: 1 }}>
                      {msg.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Box>
              
              {/* Clarification Questions UI */}
              {isAnsweringQuestions && pendingChangePlan && (
                <Box sx={{ p: 2, borderTop: '1px solid rgba(139, 92, 246, 0.4)', backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>
                  <Typography variant="h6" sx={{ mb: 2, color: '#8b5cf6' }}>
                    🤔 שאלות הבהרה לביצוע התוכנית
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    אנא ענה על כל 5 השאלות לביצוע מדויק של השינויים:
                  </Typography>
                  
                  {pendingChangePlan.questions.map((question, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                        {index + 1}. {question}
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        value={clarificationAnswers[index]}
                        onChange={(e) => {
                          const newAnswers = [...clarificationAnswers];
                          newAnswers[index] = e.target.value;
                          setClarificationAnswers(newAnswers);
                        }}
                        placeholder="הכנס תשובה..."
                        variant="outlined"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            '& fieldset': {
                              borderColor: 'rgba(139, 92, 246, 0.3)',
                            },
                            '& textarea': {
                              textAlign: 'right',
                              direction: 'rtl',
                            },
                          },
                        }}
                      />
                    </Box>
                  ))}
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={executeChangePlan}
                      disabled={isStreamingResponse || clarificationAnswers.some(answer => !answer.trim())}
                      sx={{ 
                        bgcolor: '#8b5cf6',
                        '&:hover': { bgcolor: '#7c3aed' },
                        flex: 1
                      }}
                    >
                      {isStreamingResponse ? 'מבצע...' : 'בצע תוכנית'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setIsAnsweringQuestions(false);
                        setPendingChangePlan(null);
                        setClarificationAnswers(['', '', '', '', '']);
                      }}
                      disabled={isStreamingResponse}
                      sx={{ borderColor: 'rgba(139, 92, 246, 0.5)' }}
                    >
                      ביטול
                    </Button>
                  </Box>
                </Box>
              )}

              <Box sx={{ p: 2, borderTop: '1px solid rgba(139, 92, 246, 0.4)' }}>
                {/* 🎚️ כפתור בחירת מצב שינוי משמעותי */}
                {isAgentMode && isSheetLoaded && isSheetSelected && (
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch 
                      checked={isSignificantChange}
                      onChange={(e) => setIsSignificantChange(e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#8B5CF6',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#8B5CF6',
                        },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: isSignificantChange ? '#8B5CF6' : '#666' }}>
                      {isSignificantChange ? '🤔 שינוי משמעותי (עם הבהרות)' : '⚡ שינוי רגיל (מיידי)'}
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={isAnsweringQuestions ? "ענה על השאלות למעלה תחילה..." : "שאל אותי כל דבר... (Shift+Enter לשורה חדשה)"}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); // Prevents adding a new line
                        sendMessage();
                      }
                    }}
                    multiline
                    minRows={2}
                    maxRows={5}
                    disabled={isStreamingResponse || isAnsweringQuestions}
                    className="hebrew-input"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                      }
                    }}
                  />
                  <Fab 
                    color="primary" 
                    onClick={sendMessage} 
                    size="small"
                    disabled={isStreamingResponse || isAnsweringQuestions}
                  >
                    <Send />
                  </Fab>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isAgentMode}
                      onChange={(e) => setIsAgentMode(e.target.checked)}
                      disabled={!googleSheetsUrl || !isSheetSelected}
                    />
                  }
                  label={`Agent Mode: Allow Sheet Editing ${!isSheetSelected ? '(בחר גליון תחילה)' : ''}`}
                  sx={{ 
                    color: (!googleSheetsUrl || !isSheetSelected) ? 'text.disabled' : 'text.secondary', 
                    mt: 1, 
                    mr: 0 
                  }}
                />
              </Box>
            </Paper>
          </Box>
        </Box>
        <Snackbar open={showSnackbar} autoHideDuration={6000} onClose={() => setShowSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ bottom: { xs: 90, sm: 24 } }}>
          <Alert onClose={() => setShowSnackbar(false)} severity={authError ? "error" : "success"} sx={{ width: '100%', bgcolor: '#2E2E2E', color: 'white' }}>
            {snackbarMessage || authError}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;
