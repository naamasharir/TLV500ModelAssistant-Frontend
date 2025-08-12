import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  Paper,
  TextField,
  Button,
  Avatar,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Badge
} from '@mui/material';
import { 
  Folder, 
  InsertDriveFile, 
  Chat, 
  Upload, 
  Send, 
  Person,
  Settings,
  Analytics,
  AttachFile,
  PictureAsPdf,
  TableChart
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8B5CF6', // Purple
      light: '#A78BFA',
      dark: '#7C3AED',
    },
    secondary: {
      main: '#10B981', // Green for changes
      light: '#34D399',
      dark: '#059669',
    },
    background: {
      default: '#0F0F0F', // Very dark
      paper: '#1A1A1A', // Dark gray
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#9CA3AF',
    },
    error: {
      main: '#EF4444', // Red for deletions
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        },
      },
    },
  },
});

const drawerWidth = 280;

function App() {
  const [messages, setMessages] = useState([
    { text: 'Hello! I\'m your financial analysis assistant. Upload your Excel model and PDF reports to get started.', sender: 'assistant', timestamp: new Date() }
  ]);
  const [question, setQuestion] = useState('');
  const [excelData, setExcelData] = useState([]);
  const [changedCells, setChangedCells] = useState(new Set());
  const [newCells, setNewCells] = useState(new Set());
  const [projects] = useState([
    { name: 'TechGlobal Valuation', status: 'active', lastModified: '2 min ago' },
    { name: 'FinCorp Q3 Analysis', status: 'draft', lastModified: '1 hour ago' },
    { name: 'Startup Pitch Deck', status: 'completed', lastModified: '2 days ago' }
  ]);

  // Sample Excel data
  useEffect(() => {
    const sampleData = [
      ['', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'],
      ['Revenue', '1,250,000', '1,350,000', '1,450,000', ''],
      ['COGS', '750,000', '810,000', '870,000', ''],
      ['Gross Profit', '500,000', '540,000', '580,000', ''],
      ['Operating Expenses', '300,000', '320,000', '340,000', ''],
      ['EBITDA', '200,000', '220,000', '240,000', ''],
      ['Net Income', '150,000', '165,000', '180,000', ''],
    ];
    setExcelData(sampleData);
  }, []);

  const handleFileUpload = (event, fileType) => {
    const file = event.target.files[0];
    if (file) {
      const timestamp = new Date();
      setMessages(prev => [...prev, {
        text: `📎 ${fileType} file "${file.name}" uploaded successfully`,
        sender: 'system',
        timestamp
      }]);
    }
  };

  const sendMessage = () => {
    if (!question.trim()) return;
    
    const timestamp = new Date();
    const userMessage = { text: question, sender: 'user', timestamp };
    setMessages(prev => [...prev, userMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can see your Q3 2024 data is missing. Based on the trend, I estimate Q3 revenue should be around $1,450,000. Should I update this?",
        "I notice the EBITDA margin is improving. Would you like me to calculate the projected Q4 figures based on this trend?",
        "I found discrepancies between your PDF report and Excel model. Let me highlight the differences for you.",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, {
        text: randomResponse,
        sender: 'assistant',
        timestamp: new Date()
      }]);
      
      // Simulate cell changes
      setChangedCells(new Set(['1-3', '2-3']));
      setNewCells(new Set(['1-4']));
    }, 1000);
    
    setQuestion('');
  };

  const getCellStyle = (rowIndex, colIndex) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (changedCells.has(cellKey)) {
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #EF4444' };
    }
    if (newCells.has(cellKey)) {
      return { backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981' };
    }
    return {};
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
        {/* Sidebar */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: '1px solid rgba(139, 92, 246, 0.2)',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Fin-Copilot
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI Financial Assistant
            </Typography>
          </Box>
          
          <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.2)' }} />
          
          {/* User Profile */}
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <Person />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={500}>David Analyst</Typography>
              <Typography variant="caption" color="text.secondary">Premium User</Typography>
            </Box>
          </Box>
          
          <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.2)' }} />
          
          {/* Projects */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Recent Projects
            </Typography>
            <List dense>
              {projects.map((project, index) => (
                <ListItem key={index} sx={{ px: 0, py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Folder sx={{ color: 'primary.main', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={project.name}
                    secondary={project.lastModified}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  <Chip 
                    label={project.status} 
                    size="small" 
                    color={project.status === 'active' ? 'primary' : 'default'}
                    sx={{ fontSize: '0.7rem' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
          
          <Divider sx={{ borderColor: 'rgba(139, 92, 246, 0.2)' }} />
          
          {/* Navigation */}
          <List>
            <ListItem button>
              <ListItemIcon><Analytics sx={{ color: 'primary.main' }} /></ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItem>
            <ListItem button>
              <ListItemIcon><Settings sx={{ color: 'text.secondary' }} /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
          </List>
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* App Bar */}
          <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
                TechGlobal Valuation Model
              </Typography>
              <Badge badgeContent={2} color="secondary">
                <Chat sx={{ color: 'text.secondary' }} />
              </Badge>
            </Toolbar>
          </AppBar>

          {/* Content Area */}
          <Box sx={{ flexGrow: 1, display: 'flex' }}>
            {/* Excel Visualization - Left Side */}
            <Box sx={{ flex: 1, p: 2 }}>
              <Paper sx={{ height: '100%', p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Financial Model</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="2 Changes" color="error" size="small" />
                    <Chip label="1 New" color="secondary" size="small" />
                  </Box>
                </Box>
                
                <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        {excelData[0]?.map((header, index) => (
                          <TableCell key={index} sx={{ bgcolor: 'background.paper', fontWeight: 600 }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {excelData.slice(1).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, colIndex) => (
                            <TableCell 
                              key={colIndex} 
                              sx={{
                                ...getCellStyle(rowIndex + 1, colIndex),
                                cursor: 'pointer',
                                '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.1)' }
                              }}
                            >
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            {/* Chat Interface - Right Side */}
            <Box sx={{ width: 400, p: 2 }}>
              <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Chat Header */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <Typography variant="h6">AI Assistant</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ready to help with your analysis
                  </Typography>
                </Box>

                {/* File Upload Area */}
                <Box sx={{ p: 2, borderBottom: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<PictureAsPdf />}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      PDF
                      <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'PDF')} />
                    </Button>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<TableChart />}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      Excel
                      <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => handleFileUpload(e, 'Excel')} />
                    </Button>
                  </Box>
                </Box>

                {/* Messages */}
                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((msg, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        mb: 1
                      }}>
                        <Paper sx={{ 
                          p: 1.5, 
                          maxWidth: '80%',
                          bgcolor: msg.sender === 'user' ? 'primary.main' : 'background.paper',
                          color: msg.sender === 'user' ? 'white' : 'text.primary'
                        }}>
                          <Typography variant="body2">{msg.text}</Typography>
                        </Paper>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ 
                        display: 'block', 
                        textAlign: msg.sender === 'user' ? 'right' : 'left',
                        px: 1
                      }}>
                        {msg.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Message Input */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Ask me anything about your financial data..."
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        }
                      }}
                    />
                    <IconButton 
                      onClick={sendMessage}
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <Send />
                    </IconButton>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
