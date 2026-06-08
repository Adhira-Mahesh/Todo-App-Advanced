'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { logoutUser } from '@/app/auth/actions';
import {
  getUserTodos, createTodo, toggleTodo, editTodo,
  archiveTodo, trashTodo, deleteTodoPermanently, changeTodoTag
} from './actions';
import {
  getShareInfo, enableShare, disableShare,
  setShareEditMode, regenerateShareLink
} from './shareActions';
import {
  CheckSquare, Plus, Inbox, Calendar,
  Archive, Trash2, Search, Bell, Settings,
  MoreVertical, BarChart2, Check, X, Clock,
  Play, Pause, RotateCcw, Edit2, Sun, Moon,
  Sparkles, Trash, CheckCircle, Crown, LogOut, Loader2,
  Share2, Copy, RefreshCw, Lock
} from 'lucide-react';

const TAG_COLORS = {
  'Urgent':     'bg-tertiary-container text-on-tertiary-container',
  'Work':       'bg-surface-container-highest text-on-surface-variant',
  'High Focus': 'bg-secondary-container text-on-secondary-container',
  'General':    'bg-surface-container-low text-on-surface-variant',
};

const CALENDAR_TAG_COLORS = {
  'Urgent':     'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/50',
  'Work':       'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/50',
  'High Focus': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/50',
  'General':    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/50',
};

/**
 * @param {object} props
 * @param {any} [props.sessionUser]
 */
export default function Dashboard({ sessionUser = null }) {
  // --- 1. State ---
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newTaskInput, setNewTaskInput] = useState('');
  const [activeTab, setActiveTab] = useState('today');
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalTime, setModalTime] = useState('Today, 5:00 PM');
  const [modalTag, setModalTag] = useState('General');

  // Editing
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Dropdown
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState(null);
  const dropdownRef = useRef(null);

  // Pomodoro
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('work');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [notification, setNotification] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const notifiedRef = useRef(false);

  // Sharing States
  const [shareInfo, setShareInfo] = useState({ isEnabled: false, shareEditEnabled: false, token: null });
  const [shareLoading, setShareLoading] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  const [scheduleInput, setScheduleInput] = useState('');

  // --- Calendar Helpers ---
  const getTaskDate = (dueTimeStr) => {
    if (!dueTimeStr) return null;
    const str = dueTimeStr.toLowerCase().trim();
    
    if (str.includes('today')) {
      return new Date();
    }
    if (str.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    }
    
    // Parse YYYY-MM-DD
    const matchYMD = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (matchYMD) {
      return new Date(parseInt(matchYMD[1], 10), parseInt(matchYMD[2], 10) - 1, parseInt(matchYMD[3], 10));
    }
    
    // Parse Month Day, Year (e.g. "May 3, 2024" or "May 3")
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    for (let i = 0; i < 12; i++) {
      if (str.includes(months[i])) {
        const monthIndex = str.indexOf(months[i]);
        const afterMonth = str.substring(monthIndex + 3).trim();
        const dayMatch = afterMonth.match(/^(\d{1,2})/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1], 10);
          let year = new Date().getFullYear();
          const afterDay = afterMonth.substring(dayMatch[1].length).trim();
          const yearMatch = afterDay.match(/^,?\s*(\d{4})/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }
          return new Date(year, i, day);
        }
      }
    }
    
    const parsed = Date.parse(dueTimeStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    return null;
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isTomorrow = (date) => {
    if (!date) return false;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameDay(date, tomorrow);
  };

  const getDaysInMonthGrid = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    let startDayOfWeek = firstDay.getDay();
    // Adjust Monday-indexed (0 = Monday, ..., 6 = Sunday)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthLastDay; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    const totalCells = days.length <= 35 ? 35 : 42;
    const padding = totalCells - days.length;
    for (let i = 1; i <= padding; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    return days;
  };

  const getDaysInWeekGrid = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextD = new Date(monday);
      nextD.setDate(monday.getDate() + i);
      days.push({
        date: nextD,
        isCurrentMonth: nextD.getMonth() === date.getMonth(),
      });
    }
    return days;
  };

  const getTasksForDay = (date) => {
    return tasks.filter(t => !t.isDeleted && !t.isArchived && isSameDay(getTaskDate(t.time), date));
  };

  const getTaskTimeStr = (dueTimeStr) => {
    if (!dueTimeStr) return '12:00 PM';
    const timeMatch = dueTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/);
    if (timeMatch) {
      const hours = timeMatch[1];
      const minutes = timeMatch[2];
      const ampm = timeMatch[3] ? ` ${timeMatch[3].toUpperCase()}` : '';
      return `${hours}:${minutes}${ampm}`;
    }
    return '12:00 PM';
  };

  const handleScheduleTask = async (e) => {
    e.preventDefault();
    if (!scheduleInput.trim() || !selectedDate) return;
    
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    const dueTime = `${formattedDate}, 12:00 PM`;
    
    const optimisticTask = {
      id: `temp-${Date.now()}`,
      text: scheduleInput.trim(),
      time: dueTime,
      tag: 'General',
      tagColor: TAG_COLORS['General'],
      completed: false,
      isArchived: false,
      isDeleted: false,
    };
    
    setTasks(prev => [optimisticTask, ...prev]);
    const textToSubmit = scheduleInput.trim();
    setScheduleInput('');
    
    const result = await createTodo({ title: textToSubmit, tag: 'General', dueTime });
    if (result.error) {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      triggerNotification('Failed to schedule task');
    } else {
      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? result.todo : t));
      triggerNotification('Task scheduled!');
    }
  };

  // --- 2. Load tasks from DB on mount ---
  const loadTasks = useCallback(async () => {
    try {
      const data = await getUserTodos();
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShareInfo = useCallback(async () => {
    try {
      const info = await getShareInfo();
      setShareInfo(info);
    } catch (e) {
      console.error('Failed to load share info', e);
    } finally {
      setShareLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    loadShareInfo();
  }, [loadTasks, loadShareInfo]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownTaskId(null);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dark mode sync
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Pomodoro countdown
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => setTimerSeconds(p => p - 1), 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      triggerTimerAlert();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Toast notification for tomorrow tasks
  useEffect(() => {
    if (!loading && tasks.length > 0 && !notifiedRef.current) {
      const dueTomorrow = tasks.filter(t => !t.isDeleted && !t.isArchived && !t.completed && isTomorrow(getTaskDate(t.time)));
      if (dueTomorrow.length > 0) {
        triggerNotification(`Reminder: You have ${dueTomorrow.length} task(s) due tomorrow! ⏰`);
      }
      notifiedRef.current = true;
    }
  }, [loading, tasks]);

  // --- 3. Helpers ---
  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const triggerTimerAlert = () => {
    if (typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        console.warn('Audio error:', e);
      }
    }
    if (timerMode === 'work') {
      triggerNotification('Focus session done! Take a break ☕');
      setTimerMode('break');
      setTimerSeconds(300);
    } else {
      triggerNotification('Break over! Back to work 💪');
      setTimerMode('work');
      setTimerSeconds(1500);
    }
  };

  // Optimistic helper: apply update locally then sync
  const optimisticUpdate = (id, patch) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
  };

  // --- 4. Action Handlers (all hit the DB) ---

  const handleEnableShare = async () => {
    setShareLoading(true);
    try {
      await enableShare();
      await loadShareInfo();
      triggerNotification('Sharing enabled! 🔗');
    } catch (e) {
      triggerNotification('Failed to enable sharing');
    } finally {
      setShareLoading(false);
    }
  };

  const handleDisableShare = async () => {
    setShareLoading(true);
    try {
      await disableShare();
      await loadShareInfo();
      triggerNotification('Sharing disabled 🔒');
    } catch (e) {
      triggerNotification('Failed to disable sharing');
    } finally {
      setShareLoading(false);
    }
  };

  const handleToggleEditMode = async () => {
    setShareLoading(true);
    try {
      const newMode = !shareInfo.shareEditEnabled;
      await setShareEditMode(newMode);
      setShareInfo(prev => ({ ...prev, shareEditEnabled: newMode }));
      triggerNotification(newMode ? 'Collaborative editing enabled! 👥' : 'List is now view-only 👁️');
    } catch (e) {
      triggerNotification('Failed to update share permissions');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRegenerateLink = async () => {
    if (!confirm('Are you sure? This will invalidate your old share link.')) return;
    setShareLoading(true);
    try {
      await regenerateShareLink();
      await loadShareInfo();
      triggerNotification('Generated new share link! 🔄');
    } catch (e) {
      triggerNotification('Failed to regenerate share link');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!shareInfo.token) return;
    const url = `${window.location.origin}/share/${shareInfo.token}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback(true);
    triggerNotification('Link copied to clipboard! 📋');
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const toggleTaskCompletion = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    optimisticUpdate(id, { completed: !task.completed });
    const result = await toggleTodo(id);
    if (result.error) { optimisticUpdate(id, { completed: task.completed }); }
    else triggerNotification(task.completed ? 'Task marked active' : 'Task completed! 🎉');
  };

  const handleQuickAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const optimisticTask = {
      id: `temp-${Date.now()}`,
      text: newTaskInput.trim(),
      time: 'Today, 5:00 PM',
      tag: 'General',
      tagColor: TAG_COLORS['General'],
      completed: false,
      isArchived: false,
      isDeleted: false,
    };
    setTasks(prev => [optimisticTask, ...prev]);
    setNewTaskInput('');
    const result = await createTodo({ title: newTaskInput.trim() });
    if (result.error) {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      triggerNotification('Failed to add task');
    } else {
      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? result.todo : t));
      triggerNotification('Task added to Focus List!');
    }
  };

  const handleModalAddTask = async (e) => {
    e.preventDefault();
    if (!modalText.trim()) return;
    const optimisticTask = {
      id: `temp-${Date.now()}`,
      text: modalText.trim(),
      time: modalTime.trim() || 'Today, 5:00 PM',
      tag: modalTag,
      tagColor: TAG_COLORS[modalTag] || TAG_COLORS['General'],
      completed: false,
      isArchived: false,
      isDeleted: false,
    };
    setTasks(prev => [optimisticTask, ...prev]);
    setModalText(''); setModalTime('Today, 5:00 PM'); setModalTag('General');
    setIsAddModalOpen(false);
    const result = await createTodo({ title: modalText.trim(), tag: modalTag, dueTime: modalTime.trim() || 'Today, 5:00 PM' });
    if (result.error) {
      setTasks(prev => prev.filter(t => t.id !== optimisticTask.id));
      triggerNotification('Failed to add task');
    } else {
      setTasks(prev => prev.map(t => t.id === optimisticTask.id ? result.todo : t));
      triggerNotification('New custom task created!');
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    setActiveDropdownTaskId(null);
  };

  const saveEditedTask = async (id) => {
    if (!editingText.trim()) return;
    const old = tasks.find(t => t.id === id);
    optimisticUpdate(id, { text: editingText.trim() });
    setEditingTaskId(null);
    const result = await editTodo(id, editingText.trim());
    if (result.error) { optimisticUpdate(id, { text: old.text }); }
    else triggerNotification('Task edited successfully.');
  };

  const archiveTask = async (id) => {
    optimisticUpdate(id, { isArchived: true });
    setActiveDropdownTaskId(null);
    await archiveTodo(id, true);
    triggerNotification('Task moved to Archive.');
  };

  const unarchiveTask = async (id) => {
    optimisticUpdate(id, { isArchived: false });
    setActiveDropdownTaskId(null);
    await archiveTodo(id, false);
    triggerNotification('Task restored to Inbox.');
  };

  const deleteTask = async (id) => {
    optimisticUpdate(id, { isDeleted: true });
    setActiveDropdownTaskId(null);
    await trashTodo(id, true);
    triggerNotification('Task moved to Trash.');
  };

  const restoreTask = async (id) => {
    optimisticUpdate(id, { isDeleted: false });
    setActiveDropdownTaskId(null);
    await trashTodo(id, false);
    triggerNotification('Task restored from Trash.');
  };

  const permanentlyDeleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setActiveDropdownTaskId(null);
    await deleteTodoPermanently(id);
    triggerNotification('Task deleted permanently.');
  };

  const changeTaskTag = async (id, newTag) => {
    optimisticUpdate(id, { tag: newTag, tagColor: TAG_COLORS[newTag] });
    setActiveDropdownTaskId(null);
    await changeTodoTag(id, newTag);
    triggerNotification(`Tag updated to ${newTag}`);
  };

  // Timer
  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => { setIsTimerRunning(false); setTimerSeconds(timerMode === 'work' ? 1500 : 300); };
  const switchTimerMode = (mode) => { setIsTimerRunning(false); setTimerMode(mode); setTimerSeconds(mode === 'work' ? 1500 : 300); };
  const formatTimerValue = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- 5. Filter ---
  const filteredTasks = tasks.filter(task => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.text.toLowerCase().includes(q) && !task.tag.toLowerCase().includes(q)) return false;
    }
    if (activeTab === 'trash') return task.isDeleted;
    if (task.isDeleted) return false;
    if (activeTab === 'archive') return task.isArchived;
    if (task.isArchived) return false;
    if (activeTab === 'inbox') return true;
    if (activeTab === 'today') return task.time.toLowerCase().includes('today');
    if (activeTab === 'upcoming') return !task.time.toLowerCase().includes('today');
    return true;
  });

  const completedCount = tasks.filter(t => !t.isDeleted && !t.isArchived && t.completed).length;
  const totalActiveCount = tasks.filter(t => !t.isDeleted && !t.isArchived).length;
  const progressPercentage = totalActiveCount ? Math.round((completedCount / totalActiveCount) * 100) : 0;

  const renderCalendarView = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const gridDays = getDaysInMonthGrid(currentDate);
    const selectedDayTasks = getTasksForDay(selectedDate);
    
    const getMinutesFromMidnight = (timeStr) => {
      if (!timeStr) return 720;
      const tStr = getTaskTimeStr(timeStr);
      const match = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return 720;
      let hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const ampm = match[3] ? match[3].toUpperCase() : 'AM';
      if (ampm === 'PM' && hrs < 12) hrs += 12;
      if (ampm === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    };
    
    const sortedTasks = [...selectedDayTasks].sort((a, b) => getMinutesFromMidnight(a.time) - getMinutesFromMidnight(b.time));
    
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const isSelectedDateToday = isSameDay(selectedDate, now);
    
    let nowRendered = false;
    const timelineItems = [];
    sortedTasks.forEach((task) => {
      const taskMins = getMinutesFromMidnight(task.time);
      if (isSelectedDateToday && !nowRendered && nowMins < taskMins) {
        timelineItems.push({ type: 'now' });
        nowRendered = true;
      }
      timelineItems.push({ type: 'task', task });
    });
    if (isSelectedDateToday && !nowRendered) {
      timelineItems.push({ type: 'now' });
    }
    
    const handleNextPeriod = () => {
      if (calendarView === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      } else if (calendarView === 'week') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 7);
        setCurrentDate(d);
      } else {
        const d = new Date(currentDate);
        d.setDate(d.getDate() + 1);
        setCurrentDate(d);
        setSelectedDate(d);
      }
    };
    const handlePrevPeriod = () => {
      if (calendarView === 'month') {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      } else if (calendarView === 'week') {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 7);
        setCurrentDate(d);
      } else {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - 1);
        setCurrentDate(d);
        setSelectedDate(d);
      }
    };

    const getWeekRangeStr = (date) => {
      const weekDays = getDaysInWeekGrid(date);
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      const startMonth = months[start.getMonth()];
      const endMonth = months[end.getMonth()];
      
      if (start.getFullYear() !== end.getFullYear()) {
        return `Week of ${startMonth} ${start.getDate()}, ${start.getFullYear()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
      }
      if (start.getMonth() !== end.getMonth()) {
        return `Week of ${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `Week of ${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
    };

    return (
      <div className="flex flex-col lg:flex-row gap-lg h-full overflow-hidden p-0 m-0">
        {/* Left Area: Calendar Grid */}
        <div className="flex-1 bg-surface-container-lowest dark:bg-surface-container p-lg rounded-3xl border border-outline-variant/30 flex flex-col min-h-[580px] shadow-sm relative">
          {/* Calendar Control Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-md mb-lg">
            <div className="flex items-center gap-md">
              <h2 className="text-xl font-extrabold text-on-background select-none">
                {calendarView === 'month' 
                  ? `${months[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                  : calendarView === 'week'
                  ? getWeekRangeStr(currentDate)
                  : currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }
              </h2>
              <div className="flex gap-sm border border-outline-variant/40 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={handlePrevPeriod}
                  className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button
                  type="button"
                  onClick={handleNextPeriod}
                  className="p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </div>
            </div>
            
            {/* View selectors */}
            <div className="flex border border-outline-variant/40 rounded-xl p-0.5 bg-surface-container-low">
              {['Month', 'Week', 'Day'].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setCalendarView(view.toLowerCase())}
                  className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                    calendarView === view.toLowerCase()
                      ? 'bg-white dark:bg-surface text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>
          
          {/* Weekday headers for non-day views */}
          {calendarView !== 'day' && (
            <div className="grid grid-cols-7 gap-sm mb-sm text-center">
              {weekdays.map(day => (
                <span key={day} className="text-xs font-extrabold text-outline uppercase tracking-wider py-1 select-none">
                  {day}
                </span>
              ))}
            </div>
          )}
          
          {/* Calendar Views */}
          {calendarView === 'month' && (
            <div className="grid grid-cols-7 gap-sm flex-1">
              {gridDays.map(({ date, isCurrentMonth }, idx) => {
                const dayTasks = getTasksForDay(date);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`min-h-[80px] sm:min-h-[100px] p-2 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-primary-container/10 dark:bg-primary-fixed-dim/5'
                        : isToday
                        ? 'border-secondary-container bg-secondary-container/5'
                        : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/60 dark:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-sm font-extrabold select-none ${
                        isCurrentMonth
                          ? isSelected
                            ? 'text-primary dark:text-primary-fixed-dim'
                            : 'text-on-surface'
                          : 'text-outline/40 dark:text-outline/30'
                      }`}>
                        {date.getDate()}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 overflow-hidden flex-1 flex flex-col justify-end">
                      {dayTasks.slice(0, 2).map((t) => {
                        const colorClass = CALENDAR_TAG_COLORS[t.tag] || CALENDAR_TAG_COLORS['General'];
                        return (
                          <div
                            key={t.id}
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border truncate ${colorClass}`}
                            title={`${t.text} (${t.tag})`}
                          >
                            {t.text}
                          </div>
                        );
                      })}
                      {dayTasks.length > 2 && (
                        <div className="text-[9px] font-black text-center text-primary dark:text-primary-fixed-dim bg-primary/10 dark:bg-primary-fixed-dim/10 rounded-md py-0.5">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calendarView === 'week' && (
            <div className="grid grid-cols-7 gap-md flex-1">
              {getDaysInWeekGrid(currentDate).map(({ date }, idx) => {
                const dayTasks = getTasksForDay(date);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                const dayName = weekdays[idx];
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedDate(date);
                      setCurrentDate(date);
                    }}
                    className={`flex-1 min-h-[400px] p-md rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-lg ${
                      isSelected
                        ? 'border-primary bg-primary-container/10 dark:bg-primary-fixed-dim/5 shadow-md'
                        : isToday
                        ? 'border-secondary-container bg-secondary-container/5'
                        : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/60 dark:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex flex-col gap-xs mb-sm">
                      <span className="text-xs font-black uppercase text-outline tracking-wider">{dayName}</span>
                      <div className="flex justify-between items-center">
                        <span className={`text-lg font-black select-none ${
                          isSelected
                            ? 'text-primary dark:text-primary-fixed-dim'
                            : 'text-on-surface'
                        }`}>
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="w-2 h-2 rounded-full bg-secondary" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-sm flex-1 overflow-y-auto pr-xs">
                      {dayTasks.map((t) => {
                        const colorClass = CALENDAR_TAG_COLORS[t.tag] || CALENDAR_TAG_COLORS['General'];
                        return (
                          <div
                            key={t.id}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border leading-snug break-words ${colorClass}`}
                            title={`${t.text} (${t.tag})`}
                          >
                            <span className={t.completed ? 'line-through opacity-60' : ''}>{t.text}</span>
                          </div>
                        );
                      })}
                      {dayTasks.length === 0 && (
                        <div className="h-full flex items-center justify-center border border-dashed border-outline-variant/20 rounded-xl p-sm opacity-30">
                          <span className="text-[10px] font-bold">No tasks</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {calendarView === 'day' && (
            <div className="flex-1 flex flex-col bg-surface-container-lowest dark:bg-surface-container rounded-3xl p-md border border-outline-variant/10 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-xs pr-sm max-h-[480px]">
                {(() => {
                  const dayHours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM', '8 PM'];
                  const anytimeTasks = selectedDayTasks.filter(t => {
                    const tStr = getTaskTimeStr(t.time).toLowerCase();
                    const taskTimeMatch = tStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
                    if (!taskTimeMatch) return true;
                    const tHour = parseInt(taskTimeMatch[1], 10);
                    const tAmpm = taskTimeMatch[3] ? taskTimeMatch[3].toLowerCase() : 'am';
                    
                    const matchesAnyHour = dayHours.some(hour => {
                      const hourNum = parseInt(hour.split(' ')[0], 10);
                      const ampm = hour.split(' ')[1].toLowerCase();
                      return tHour === hourNum && tAmpm === ampm;
                    });
                    return !matchesAnyHour;
                  });

                  return (
                    <>
                      {anytimeTasks.length > 0 && (
                        <div className="flex gap-md py-sm border-b border-outline-variant/20 items-start">
                          <div className="w-16 text-right shrink-0 py-1">
                            <span className="text-[10px] font-black text-outline uppercase tracking-wider">Anytime</span>
                          </div>
                          <div className="flex-1 flex gap-xs flex-wrap items-center">
                            {anytimeTasks.map((t) => {
                              const colorClass = CALENDAR_TAG_COLORS[t.tag] || CALENDAR_TAG_COLORS['General'];
                              return (
                                <div
                                  key={t.id}
                                  className={`px-3 py-1 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md flex items-center gap-2 ${colorClass}`}
                                  title={`${t.text} (${t.tag})`}
                                >
                                  <span className={`text-xs font-semibold ${t.completed ? 'line-through opacity-60' : ''}`}>{t.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {dayHours.map((hour) => {
                        const matchingTasks = selectedDayTasks.filter(t => {
                          const tStr = getTaskTimeStr(t.time).toLowerCase();
                          const hourNum = parseInt(hour.split(' ')[0], 10);
                          const ampm = hour.split(' ')[1].toLowerCase();
                          const taskTimeMatch = tStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
                          if (taskTimeMatch) {
                            const tHour = parseInt(taskTimeMatch[1], 10);
                            const tAmpm = taskTimeMatch[3] ? taskTimeMatch[3].toLowerCase() : 'am';
                            return tHour === hourNum && tAmpm === ampm;
                          }
                          return false;
                        });
                        
                        return (
                          <div key={hour} className="flex gap-md py-sm border-b border-outline-variant/10 items-center group">
                            <div className="w-16 text-right shrink-0">
                              <span className="text-xs font-bold text-outline">{hour}</span>
                            </div>
                            <div className="flex-1 flex gap-xs flex-wrap items-center min-h-[36px]">
                              {matchingTasks.map((t) => {
                                  const colorClass = CALENDAR_TAG_COLORS[t.tag] || CALENDAR_TAG_COLORS['General'];
                                  return (
                                    <div
                                      key={t.id}
                                      className={`px-3 py-1 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md flex items-center gap-2 ${colorClass}`}
                                      title={`${t.text} (${t.tag})`}
                                    >
                                      <span className={`text-xs font-semibold ${t.completed ? 'line-through opacity-60' : ''}`}>{t.text}</span>
                                    </div>
                                  );
                                })}
                              {matchingTasks.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const yyyy = selectedDate.getFullYear();
                                    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                                    const dd = String(selectedDate.getDate()).padStart(2, '0');
                                    const formattedDate = `${yyyy}-${mm}-${dd}`;
                                    setModalTime(`${formattedDate}, ${hour}`);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-outline/50 hover:text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-dashed border-outline-variant/30 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-xs cursor-pointer"
                                >
                                  <Plus size={10} /> Add at {hour}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Floating Action Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="absolute bottom-16 right-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center cursor-pointer z-20 hover:scale-105"
            title="Create Focus Objective"
          >
            <Edit2 size={18} />
          </button>
        </div>
        
        {/* Right Area: Selected Day Timeline Details */}
        <div className="w-full lg:w-[350px] bg-surface-container-lowest dark:bg-surface-container p-lg rounded-3xl border border-outline-variant/30 flex flex-col gap-lg shadow-sm relative">
          <div className="space-y-sm">
            <span className="text-[10px] font-black tracking-widest text-outline uppercase block">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-on-surface">
                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <div className="flex gap-xs">
                <span className="text-[9px] font-black bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">
                  {selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'TASK' : 'TASKS'}
                </span>
                {selectedDayTasks.filter(t => t.completed).length > 0 && (
                  <span className="text-[9px] font-black bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">
                    {selectedDayTasks.filter(t => t.completed).length} DONE
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-md pr-sm min-h-[250px]">
            {timelineItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-md gap-sm opacity-60">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline">
                  <Calendar size={22} />
                </div>
                <p className="text-xs font-bold text-on-surface-variant">No tasks scheduled for this day</p>
                <p className="text-[10px] text-outline">Use the box below to schedule an objective.</p>
              </div>
            ) : (
              <div className="relative pl-4 border-l border-outline-variant/30 space-y-lg py-1">
                {timelineItems.map((item, index) => {
                  if (item.type === 'now') {
                    return (
                      <div key={`now-${index}`} className="relative -ml-4 flex items-center gap-sm my-md">
                        <span className="text-[8px] font-black uppercase text-secondary tracking-widest bg-secondary-container/40 px-1.5 py-0.5 rounded">NOW</span>
                        <div className="flex-1 h-0.5 bg-secondary opacity-60" />
                      </div>
                    );
                  }
                  
                  const { task } = item;
                  const dotColor = task.completed ? 'bg-outline-variant' : 'bg-primary';
                  return (
                    <div key={task.id} className="relative group flex flex-col gap-1">
                      <span className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-surface-container-lowest dark:border-surface-container ${dotColor}`} />
                      
                      <div className="flex justify-between items-start gap-md">
                        <span className="text-xs font-black text-outline w-16 shrink-0">
                          {getTaskTimeStr(task.time)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold block truncate ${task.completed ? 'line-through text-outline' : 'text-on-surface'}`}>
                            {task.text}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-outline">
                            {task.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="bg-surface-container-low dark:bg-surface p-md rounded-2xl border border-outline-variant/30 space-y-xs">
            <div className="flex items-center gap-sm text-primary dark:text-primary-fixed-dim">
              <Sun size={14} className="animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase">Daily Focus Tip</span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-medium italic leading-relaxed">
              "Your deep-focus sessions are most effective when scheduled in advance. Take a few minutes to organize."
            </p>
          </div>
          
          <form onSubmit={handleScheduleTask} className="flex gap-sm items-center w-full bg-surface-container-low dark:bg-surface border border-outline-variant/55 rounded-xl p-xs">
            <input
              type="text"
              placeholder="Schedule new task..."
              value={scheduleInput}
              onChange={e => setScheduleInput(e.target.value)}
              className="flex-1 bg-transparent border-none text-xs p-sm text-on-background focus:outline-none placeholder:text-outline/70"
            />
            <button
              type="submit"
              disabled={!scheduleInput.trim()}
              className="p-2 bg-primary text-on-primary rounded-lg shadow-sm hover:opacity-95 disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
            >
              <Plus size={14} />
            </button>
          </form>
          {/* Floating Action Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="absolute bottom-16 right-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center cursor-pointer z-20 hover:scale-105"
            title="Create Focus Objective"
          >
            <Edit2 size={18} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background text-on-background flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300">

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-primary text-on-primary px-lg py-md rounded-xl shadow-lg z-[100] flex items-center gap-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-[280px] h-screen sticky left-0 top-0 bg-surface-container-low dark:bg-surface-dim shadow-sm flex flex-col p-md gap-sm z-40">
        <div className="flex items-center gap-sm px-sm py-md">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-md">
            <CheckSquare size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary dark:text-primary-fixed-dim leading-none">Workspace</h2>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">
              {sessionUser?.name || 'Personal Focus'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-md px-lg bg-primary text-on-primary rounded-xl text-md font-semibold flex items-center justify-center gap-sm cursor-pointer transition-all duration-200 active:scale-95 shadow-md hover:bg-opacity-90 hover:shadow-lg"
        >
          <Plus size={18} /> Add Task
        </button>

        <nav className="flex-1 mt-lg space-y-1">
          {[
            { id: 'inbox', label: 'Inbox', icon: Inbox },
            { id: 'today', label: 'Today', icon: Calendar },
            { id: 'upcoming', label: 'Upcoming', icon: Calendar },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
                activeTab === id
                  ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
              }`}
            >
              <Icon size={18} /> <span className="text-sm">{label}</span>
            </button>
          ))}
        </nav>

        <div className="pt-md border-t border-outline-variant space-y-1">
          {[
            { id: 'archive', label: 'Archive', icon: Archive },
            { id: 'trash', label: 'Trash', icon: Trash2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
                activeTab === id
                  ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold'
                  : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
              }`}
            >
              <Icon size={18} /> <span className="text-sm">{label}</span>
            </button>
          ))}

          {sessionUser?.role === 'ADMIN' && (
            <Link
              href="/admin"
              className="w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              <Crown size={18} /> <span className="text-sm font-bold">Admin Panel</span>
            </Link>
          )}
        </div>

        <div className="pb-sm">
          <form action={logoutUser}>
            <button
              type="submit"
              className="w-full flex items-center gap-md px-md py-sm rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors text-left font-medium cursor-pointer text-sm"
            >
              <LogOut size={16} /> <span>Sign Out</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* TopNav */}
        <header className="w-full h-16 sticky top-0 z-30 bg-surface dark:bg-surface-container border-b border-outline-variant dark:border-outline flex justify-between items-center px-lg">
          <div className="flex items-center gap-md flex-1">
            <div className="relative w-full max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low dark:bg-surface border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary focus:outline-none text-on-surface"
                placeholder="Search tasks or priority..."
                type="text"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-lg">
            <div className="flex gap-md">
              <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant" title="Toggle Theme">
                {darkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
              </button>
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant relative"
                  title="View Reminders"
                >
                  <Bell size={18} />
                  {tomorrowTasks.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
                  )}
                </button>
                
                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest dark:bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 p-md space-y-sm animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex justify-between items-center pb-xs border-b border-outline-variant/20">
                      <span className="text-xs font-black uppercase text-outline tracking-wider">Due-Date Reminders</span>
                      {tomorrowTasks.length > 0 && (
                        <span className="text-[9px] font-black bg-error text-on-error px-1.5 py-0.5 rounded">
                          {tomorrowTasks.length} TOMORROW
                        </span>
                      )}
                    </div>
                    <div className="space-y-sm max-h-[200px] overflow-y-auto pr-xs">
                      {tomorrowTasks.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/80 text-center py-sm font-medium">No tasks due tomorrow.</p>
                      ) : (
                        tomorrowTasks.map(t => (
                          <div key={t.id} className="flex gap-sm p-sm rounded-lg bg-surface-container-low dark:bg-surface-container hover:bg-surface-container-high transition-colors items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-on-surface block truncate">{t.text}</span>
                              <span className="text-[10px] text-outline font-medium block">Due tomorrow at {getTaskTimeStr(t.time)}</span>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-tertiary-container text-on-tertiary-container rounded">
                              {t.tag}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant">
                <Settings size={18} />
              </button>
            </div>
            <div className="w-8 h-8 rounded-full border border-outline-variant bg-primary-container flex items-center justify-center shadow-sm">
              <span className="text-xs font-black text-on-primary-container">
                {sessionUser?.name ? sessionUser.name[0].toUpperCase() : sessionUser?.email ? sessionUser.email[0].toUpperCase() : '?'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto px-xl py-xl bg-background transition-colors duration-300">
          <div className={`${activeTab === 'upcoming' ? 'max-w-[1400px]' : 'max-w-[1200px]'} mx-auto space-y-xl h-full`}>
            {activeTab === 'upcoming' ? (
              renderCalendarView()
            ) : (
              <>

            {/* Title + Quick Add */}
            <section className="space-y-lg">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-on-background capitalize">
                    {activeTab === 'trash' ? 'Trash Bin' : activeTab === 'archive' ? 'Archived Focus' : `${activeTab}'s focus`}
                  </h1>
                  <p className="text-base text-on-surface-variant font-medium">
                    {activeTab === 'trash' ? 'Restore or permanently delete tasks.' : activeTab === 'archive' ? 'Review your archived goals.' : 'Stay sharp. Stay intentional.'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-outline tracking-wider uppercase bg-surface-container-high px-md py-sm rounded-full shadow-sm">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {activeTab !== 'trash' && activeTab !== 'archive' && (
                <form onSubmit={handleQuickAddTask} className="flex gap-sm items-center w-full bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/60 rounded-2xl p-sm shadow-sm hover:shadow-md transition-all">
                  <input
                    className="flex-1 bg-transparent border-none text-base p-md text-on-background focus:outline-none placeholder:text-on-surface-variant/75"
                    placeholder="Quickly add a task to focus list..."
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                  />
                  <button type="submit" className="px-lg py-md bg-primary text-on-primary rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-opacity-95 hover:shadow cursor-pointer active:scale-95">
                    Add
                  </button>
                </form>
              )}
            </section>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

              {/* Task List */}
              <div className="lg:col-span-2 space-y-sm">
                <div className="flex items-center justify-between mb-md px-sm">
                  <h3 className="text-md font-bold text-on-surface-variant">
                    {activeTab === 'trash' ? 'Deleted Tasks' : activeTab === 'archive' ? 'Archived Items' : 'Primary Objectives'}
                  </h3>
                  <span className="text-xs bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-bold shadow-sm">
                    {loading ? '...' : `${filteredTasks.length} ${filteredTasks.length === 1 ? 'Task' : 'Tasks'}`}
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading your tasks...</p>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="bg-surface-container-lowest dark:bg-surface-container p-xl rounded-2xl border border-dashed border-outline-variant/60 flex flex-col items-center justify-center text-center space-y-md">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">
                        {activeTab === 'trash' || activeTab === 'archive' ? 'Nothing here yet' : 'No tasks yet — add one above!'}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {activeTab === 'trash' || activeTab === 'archive' ? 'Items you move here will appear.' : 'Start by adding your first focus objective.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-sm">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group bg-surface-container-lowest dark:bg-surface-container p-md rounded-xl border border-outline-variant/20 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-md relative"
                      >
                        {/* Checkbox */}
                        <button
                          disabled={task.isDeleted}
                          onClick={() => toggleTaskCompletion(task.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0 ${
                            task.completed
                              ? 'bg-primary border-primary text-on-primary'
                              : 'border-outline-variant hover:border-primary dark:hover:border-primary-fixed-dim bg-transparent'
                          } ${task.isDeleted ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {task.completed && <Check size={14} className="stroke-[3]" />}
                        </button>

                        <div className="flex-1">
                          {editingTaskId === task.id ? (
                            <form onSubmit={(e) => { e.preventDefault(); saveEditedTask(task.id); }} className="flex gap-sm items-center w-full">
                              <input
                                className="flex-1 bg-surface-container-low dark:bg-surface border border-outline-variant rounded-lg px-3 py-1 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                autoFocus
                              />
                              <button type="submit" className="p-2 bg-primary text-on-primary rounded-lg hover:bg-opacity-95 text-xs font-bold">Save</button>
                              <button type="button" onClick={() => setEditingTaskId(null)} className="p-2 bg-surface-container-highest text-on-surface-variant rounded-lg text-xs">Cancel</button>
                            </form>
                          ) : (
                            <>
                              <span className={`text-base font-semibold block transition-all ${task.completed ? 'line-through opacity-50 text-on-surface-variant' : 'text-on-background group-hover:text-primary dark:group-hover:text-primary-fixed-dim'}`}>
                                {task.text}
                              </span>
                              <div className="flex items-center gap-md mt-1.5">
                                <span className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
                                  <Clock size={12} /> {task.time}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase shadow-sm ${task.tagColor}`}>
                                  {task.tag}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdownTaskId(activeDropdownTaskId === task.id ? null : task.id)}
                            className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container-low transition-colors text-outline hover:text-primary cursor-pointer"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {activeDropdownTaskId === task.id && (
                            <div ref={dropdownRef} className="absolute right-0 mt-2 w-48 bg-surface-container-lowest dark:bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 py-2 divide-y divide-outline-variant/20 animate-in fade-in slide-in-from-top-2 duration-150">
                              {!task.isDeleted && (
                                <div className="py-1">
                                  <button onClick={() => startEditing(task)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left">
                                    <Edit2 size={14} /> Edit Objective
                                  </button>
                                  {task.isArchived ? (
                                    <button onClick={() => unarchiveTask(task.id)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left">
                                      <Archive size={14} /> Restore to Inbox
                                    </button>
                                  ) : (
                                    <button onClick={() => archiveTask(task.id)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left">
                                      <Archive size={14} /> Archive Task
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="py-1">
                                {task.isDeleted ? (
                                  <>
                                    <button onClick={() => restoreTask(task.id)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left">
                                      <Archive size={14} /> Restore Task
                                    </button>
                                    <button onClick={() => permanentlyDeleteTask(task.id)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors text-left font-semibold">
                                      <Trash size={14} /> Delete Forever
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => deleteTask(task.id)} className="flex items-center gap-sm w-full px-md py-sm text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors text-left font-semibold">
                                    <Trash2 size={14} /> Move to Trash
                                  </button>
                                )}
                              </div>

                              {!task.isDeleted && (
                                <div className="py-2 px-md space-y-1">
                                  <span className="text-[10px] text-outline font-extrabold uppercase tracking-widest block">Change Tag</span>
                                  <div className="grid grid-cols-2 gap-1 mt-1">
                                    {['Urgent', 'Work', 'High Focus', 'General'].map((tg) => (
                                      <button
                                        key={tg}
                                        onClick={() => changeTaskTag(task.id, tg)}
                                        className={`text-[10px] px-1 py-1 rounded text-center border font-bold ${task.tag === tg ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant/40 hover:border-primary'}`}
                                      >
                                        {tg}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Widgets */}
              <div className="space-y-lg">

                {/* Progress Widget */}
                <section className="bg-surface-container-lowest dark:bg-surface-container p-lg rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden relative">
                  <div className="relative z-10">
                    <h3 className="text-md font-bold mb-lg text-on-surface">Focus Metrics</h3>
                    <div className="flex items-center justify-between mb-sm">
                      <span className="text-2xl font-black text-primary dark:text-primary-fixed-dim">{progressPercentage}%</span>
                      <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{completedCount} of {totalActiveCount} Completed</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-high dark:bg-surface rounded-full overflow-hidden shadow-inner">
                      <div className="h-full bg-secondary dark:bg-secondary-fixed-dim transition-all duration-500 rounded-full" style={{ width: `${progressPercentage}%` }} />
                    </div>
                    <p className="text-xs text-on-surface-variant mt-lg italic font-medium">
                      {progressPercentage === 100 && totalActiveCount > 0
                        ? "Amazing job! You've cleared your focus list today. 🎉"
                        : `"Plan the work, work the plan. Complete objectives to reach 100%!"`}
                    </p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 opacity-[0.03] text-on-surface pointer-events-none">
                    <BarChart2 size={120} />
                  </div>
                </section>

                {/* Pomodoro Timer */}
                <section className="bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container p-lg rounded-2xl shadow-md space-y-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-lg opacity-10"><Clock size={80} /></div>
                  <div className="relative z-10 space-y-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-extrabold tracking-tight">Deep Focus Pomodoro</h3>
                      <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-white/20 dark:bg-black/20 rounded-full">
                        {timerMode === 'work' ? 'Focus Session' : 'Short Break'}
                      </span>
                    </div>
                    <div className="text-center py-md">
                      <span className="text-5xl font-black tracking-tighter tabular-nums block select-none">{formatTimerValue(timerSeconds)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-sm pb-1">
                      {[
                        { mode: 'work', label: '25m Focus' },
                        { mode: 'break', label: '5m Break' },
                      ].map(({ mode, label }) => (
                        <button key={mode} onClick={() => switchTimerMode(mode)} className={`text-xs py-1 rounded-lg font-bold transition-all border ${timerMode === mode ? 'bg-white text-primary border-white' : 'border-white/30 hover:bg-white/10'}`}>
                          {label}
                        </button>
                      ))}
                      <button onClick={resetTimer} className="text-xs py-1 border border-white/30 hover:bg-white/10 rounded-lg flex items-center justify-center gap-1 font-bold">
                        <RotateCcw size={12} /> Reset
                      </button>
                    </div>
                    <button onClick={toggleTimer} className="w-full py-md bg-white dark:bg-background text-primary dark:text-primary font-black rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-sm cursor-pointer hover:shadow-lg">
                      {isTimerRunning ? <><Pause size={16} className="fill-current" /> Pause Session</> : <><Play size={16} className="fill-current" /> Start Focus Session</>}
                    </button>
                  </div>
                </section>

                {/* Share List Widget */}
                <section className="bg-surface-container-lowest dark:bg-surface-container p-lg rounded-2xl shadow-sm border border-outline-variant/30 relative overflow-hidden">
                  <div className="relative z-10 space-y-md">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-bold text-on-surface">Share List</h3>
                      <span className={`text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full ${
                        shareInfo.isEnabled 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}>
                        {shareInfo.isEnabled ? 'Public' : 'Private'}
                      </span>
                    </div>

                    {shareLoading ? (
                      <div className="flex items-center justify-center py-4 text-on-surface-variant">
                        <Loader2 size={20} className="animate-spin text-primary mr-2" />
                        <span className="text-xs font-semibold">Updating...</span>
                      </div>
                    ) : !shareInfo.isEnabled ? (
                      <div className="space-y-sm">
                        <p className="text-xs text-on-surface-variant leading-relaxed font-medium">
                          Share your todo list with others! You can let them just view it, or collaborate and edit it with you in real-time.
                        </p>
                        <button
                          onClick={handleEnableShare}
                          className="w-full py-md bg-primary text-on-primary font-black rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center gap-sm cursor-pointer hover:shadow hover:bg-opacity-95"
                        >
                          <Share2 size={14} /> Enable Sharing
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-md">
                        {/* Link Input & Copy */}
                        <div className="space-y-xs">
                          <label className="text-[10px] font-black text-outline uppercase tracking-wider">Share Link</label>
                          <div className="flex gap-sm">
                            <input
                              readOnly
                              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareInfo.token}`}
                              className="flex-1 bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none truncate"
                            />
                            <button
                              onClick={copyShareLink}
                              className="px-3 bg-secondary text-on-secondary rounded-xl text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                            >
                              {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>

                        {/* Toggle collaborative editing */}
                        <div className="flex items-center justify-between p-sm bg-surface-container-low dark:bg-surface rounded-xl border border-outline-variant/20">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-on-surface block">Collaborative Editing</span>
                            <span className="text-[10px] text-on-surface-variant block">Allow anyone with the link to edit tasks</span>
                          </div>
                          <button
                            onClick={handleToggleEditMode}
                            className={`w-10 h-6 rounded-full p-0.5 transition-colors focus:outline-none flex items-center ${
                              shareInfo.shareEditEnabled ? 'bg-primary justify-end' : 'bg-surface-container-highest justify-start'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                          </button>
                        </div>

                        {/* Reset / Disable actions */}
                        <div className="grid grid-cols-2 gap-sm pt-xs">
                          <button
                            onClick={handleRegenerateLink}
                            className="py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            title="Generate a new URL and invalidate the old one"
                          >
                            <RefreshCw size={12} /> Reset Link
                          </button>
                          <button
                            onClick={handleDisableShare}
                            className="py-2 border border-error text-error hover:bg-error-container hover:text-on-error-container rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Lock size={12} /> Disable Share
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

              </div>
            </div>
          </>
        )}
      </div>
    </main>
      </div>

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          className="backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            style={{ width: '100%', maxWidth: '448px', maxHeight: '90vh', overflowY: 'auto' }}
            className="bg-surface-container-lowest dark:bg-surface-container rounded-2xl p-lg shadow-xl border border-outline-variant/50 space-y-md animate-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center pb-sm border-b border-outline-variant/30">
              <h3 className="text-lg font-extrabold tracking-tight">Create Focus Objective</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full hover:bg-surface-container-high dark:hover:bg-surface text-outline cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalAddTask} className="space-y-md">
              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Objective</label>
                <input
                  type="text" value={modalText} onChange={(e) => setModalText(e.target.value)}
                  placeholder="What will you focus on?" required
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl p-md text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Schedule / Time</label>
                <input
                  type="text" value={modalTime} onChange={(e) => setModalTime(e.target.value)}
                  placeholder="e.g. Today, 5:00 PM or Tomorrow, 10:00 AM"
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl p-md text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider block mb-1">Priority Classification</label>
                <div className="grid grid-cols-4 gap-sm">
                  {['Urgent', 'Work', 'High Focus', 'General'].map((tg) => (
                    <button
                      key={tg} type="button" onClick={() => setModalTag(tg)}
                      className={`text-xs py-2 rounded-xl border font-bold transition-all ${modalTag === tg ? 'border-primary bg-primary-container text-on-primary-container shadow-sm' : 'border-outline-variant/50 text-on-surface-variant hover:border-primary'}`}
                    >
                      {tg}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-sm pt-md border-t border-outline-variant/30">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-lg py-md border border-outline-variant/60 hover:bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-lg py-md bg-primary text-on-primary hover:bg-opacity-95 shadow-sm rounded-xl text-sm font-bold cursor-pointer">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}