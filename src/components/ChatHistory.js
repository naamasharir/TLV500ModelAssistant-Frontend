import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  Chat,
  Add,
  MoreVert,
  Edit,
  Delete,
  History,
  SmartToy
} from '@mui/icons-material';

// API URL configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ChatHistory = ({ accessToken, onSessionSelect, currentSessionId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newSessionDialog, setNewSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (accessToken) {
      fetchSessions();
    }
  }, [accessToken]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/chat/sessions`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched sessions:', data);
        setSessions(data);
      } else {
        console.error('Failed to fetch sessions:', response.status);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    if (!newSessionTitle.trim()) return;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/session/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ title: newSessionTitle })
      });
      
      if (response.ok) {
        const newSession = await response.json();
        setSessions(prev => [newSession, ...prev]);
        setNewSessionDialog(false);
        setNewSessionTitle('');
        onSessionSelect(newSession.sessionId);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const updateSessionTitle = async () => {
    if (!editTitle.trim() || !editingSession) return;
    
    try {
      const response = await fetch(`${API_URL}/api/chat/session/${editingSession.sessionId}/title`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ title: editTitle })
      });
      
      if (response.ok) {
        setSessions(prev => prev.map(session => 
          session.sessionId === editingSession.sessionId 
            ? { ...session, title: editTitle }
            : session
        ));
        setEditDialog(false);
        setEditingSession(null);
        setEditTitle('');
      }
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/session/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setSessions(prev => prev.filter(session => session.sessionId !== sessionId));
        if (currentSessionId === sessionId) {
          onSessionSelect(null);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleMenuClick = (event, session) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedSession(null);
  };

  const handleEdit = () => {
    setEditingSession(selectedSession);
    setEditTitle(selectedSession.title);
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedSession) {
      deleteSession(selectedSession.sessionId);
    }
    handleMenuClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'לפני דקות';
    } else if (diffInHours < 24) {
      return `לפני ${Math.floor(diffInHours)} שעות`;
    } else {
      return date.toLocaleDateString('he-IL');
    }
  };

  if (!accessToken) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          התחבר כדי לראות היסטוריית שיחות
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(139, 92, 246, 0.4)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <History />
            היסטוריית שיחות
          </Typography>
          <Tooltip title="שיחה חדשה">
            <IconButton 
              onClick={() => setNewSessionDialog(true)}
              sx={{ 
                bgcolor: 'rgba(139, 92, 246, 0.1)',
                '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' }
              }}
            >
              <Add />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <List dense>
            {sessions.map((session) => (
              <ListItem
                key={session.sessionId}
                button
                selected={currentSessionId === session.sessionId}
                onClick={() => onSessionSelect(session.sessionId)}
                sx={{
                  mb: 1,
                  mx: 1,
                  borderRadius: 2,
                  border: currentSessionId === session.sessionId 
                    ? '1px solid rgba(139, 92, 246, 0.5)' 
                    : '1px solid transparent',
                  '&:hover': {
                    bgcolor: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(139, 92, 246, 0.15)',
                    '&:hover': {
                      bgcolor: 'rgba(139, 92, 246, 0.2)'
                    }
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Chat sx={{ color: 'primary.main', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      className="chat-message-text"
                      sx={{
                        fontWeight: currentSessionId === session.sessionId ? 600 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {session.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(session.lastActivity)}
                      </Typography>
                      <Chip 
                        label={session.totalMessages}
                        size="small"
                        sx={{ 
                          height: 16,
                          fontSize: '0.6rem',
                          bgcolor: 'rgba(139, 92, 246, 0.2)',
                          color: 'primary.main'
                        }}
                      />
                    </Box>
                  }
                />
                <IconButton
                  size="small"
                  onClick={(e) => handleMenuClick(e, session)}
                  sx={{ ml: 1 }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
            {sessions.length === 0 && !loading && (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <SmartToy sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  אין עדיין שיחות
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  התחל שיחה חדשה כדי לראות אותה כאן
                </Typography>
              </Box>
            )}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          ערוך כותרת
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          מחק שיחה
        </MenuItem>
      </Menu>

      {/* New Session Dialog */}
      <Dialog open={newSessionDialog} onClose={() => setNewSessionDialog(false)}>
        <DialogTitle>שיחה חדשה</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="כותרת השיחה"
            fullWidth
            variant="outlined"
            className="hebrew-input"
            value={newSessionTitle}
            onChange={(e) => setNewSessionTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createNewSession();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSessionDialog(false)}>ביטול</Button>
          <Button onClick={createNewSession} variant="contained">
            צור שיחה
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Session Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)}>
        <DialogTitle>ערוך כותרת שיחה</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="כותרת השיחה"
            fullWidth
            variant="outlined"
            className="hebrew-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                updateSessionTitle();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>ביטול</Button>
          <Button onClick={updateSessionTitle} variant="contained">
            שמור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatHistory;