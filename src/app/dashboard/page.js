'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  CheckSquare, Plus, Inbox, Calendar, Folder, 
  Archive, Trash2, Search, Bell, Settings, 
  MoreVertical, BarChart2, Check, X, Clock,
  Play, Pause, RotateCcw, Edit2, Sun, Moon, 
  Sparkles, Trash, CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  // --- 1. State Management ---
  const [tasks, setTasks] = useState([
    { 
      id: 1, 
      text: 'Finalize Q4 strategy presentation', 
      time: 'Today, 4:00 PM', 
      tag: 'Urgent', 
      tagColor: 'bg-tertiary-container text-on-tertiary-container', 
      completed: false,
      isArchived: false,
      isDeleted: false
    },
    { 
      id: 2, 
      text: 'Conduct 1:1 with design team', 
      time: 'Today, 11:30 AM', 
      tag: 'Work', 
      tagColor: 'bg-surface-container-highest text-on-surface-variant', 
      completed: false,
      isArchived: false,
      isDeleted: false
    },
    { 
      id: 3, 
      text: 'Research SerenityTask user feedback', 
      time: 'Today, 2:00 PM', 
      tag: 'High Focus', 
      tagColor: 'bg-secondary-container text-on-secondary-container', 
      completed: false,
      isArchived: false,
      isDeleted: false
    }
  ]);
  
  const [newTaskInput, setNewTaskInput] = useState('');
  const [activeTab, setActiveTab] = useState('today'); // 'inbox' | 'today' | 'upcoming' | 'archive' | 'trash'
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Modal State for adding new task
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalText, setModalText] = useState('');
  const [modalTime, setModalTime] = useState('Today, 5:00 PM');
  const [modalTag, setModalTag] = useState('General');

  // Editing State
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // Dropdown options menu State
  const [activeDropdownTaskId, setActiveDropdownTaskId] = useState(null);
  const dropdownRef = useRef(null);

  // Pomodoro Focus Timer State
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 minutes default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('work'); // 'work' (25m) | 'break' (5m)

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [notification, setNotification] = useState(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownTaskId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync Dark Mode state to root element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Pomodoro Countdown Logic
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      triggerTimerAlert();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // --- 2. Action Handlers ---

  const triggerNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const triggerTimerAlert = () => {
    // Play programmatic sound
    if (typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {
        console.warn('Web Audio API not supported/blocked by user gesture:', e);
      }
    }
    
    if (timerMode === 'work') {
      triggerNotification('专注时间结束！休息一下吧 ☕');
      setTimerMode('break');
      setTimerSeconds(300); // 5 mins break
    } else {
      triggerNotification('休息结束！开始专注 💪');
      setTimerMode('work');
      setTimerSeconds(1500); // 25 mins work
    }
  };

  // Checkbox completion handler
  const toggleTaskCompletion = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    const task = tasks.find(t => t.id === id);
    if (task) {
      triggerNotification(task.completed ? 'Task marked active' : 'Task completed! 🎉');
    }
  };

  // Add tasks
  const handleQuickAddTask = (e) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    
    const tagColors = {
      'Urgent': 'bg-tertiary-container text-on-tertiary-container',
      'Work': 'bg-surface-container-highest text-on-surface-variant',
      'High Focus': 'bg-secondary-container text-on-secondary-container',
      'General': 'bg-surface-container-low text-on-surface-variant'
    };

    const newTask = {
      id: Date.now(),
      text: newTaskInput.trim(),
      time: 'Today, 5:00 PM',
      tag: 'General',
      tagColor: tagColors['General'],
      completed: false,
      isArchived: false,
      isDeleted: false
    };

    setTasks([newTask, ...tasks]);
    setNewTaskInput('');
    triggerNotification('Task added to Focus List!');
  };

  const handleModalAddTask = (e) => {
    e.preventDefault();
    if (!modalText.trim()) return;

    const tagColors = {
      'Urgent': 'bg-tertiary-container text-on-tertiary-container',
      'Work': 'bg-surface-container-highest text-on-surface-variant',
      'High Focus': 'bg-secondary-container text-on-secondary-container',
      'General': 'bg-surface-container-low text-on-surface-variant'
    };

    const newTask = {
      id: Date.now(),
      text: modalText.trim(),
      time: modalTime.trim() || 'Today, 5:00 PM',
      tag: modalTag,
      tagColor: tagColors[modalTag] || tagColors['General'],
      completed: false,
      isArchived: false,
      isDeleted: false
    };

    setTasks([newTask, ...tasks]);
    setModalText('');
    setModalTime('Today, 5:00 PM');
    setModalTag('General');
    setIsAddModalOpen(false);
    triggerNotification('New custom task created!');
  };

  // Edit Task
  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    setActiveDropdownTaskId(null);
  };

  const saveEditedTask = (id) => {
    if (!editingText.trim()) return;
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, text: editingText.trim() } : task
    ));
    setEditingTaskId(null);
    triggerNotification('Task edited successfully.');
  };

  // Archive & Delete operations
  const archiveTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isArchived: true } : task
    ));
    setActiveDropdownTaskId(null);
    triggerNotification('Task moved to Archive.');
  };

  const unarchiveTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isArchived: false } : task
    ));
    setActiveDropdownTaskId(null);
    triggerNotification('Task restored to Inbox.');
  };

  const deleteTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isDeleted: true } : task
    ));
    setActiveDropdownTaskId(null);
    triggerNotification('Task moved to Trash.');
  };

  const restoreTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, isDeleted: false } : task
    ));
    setActiveDropdownTaskId(null);
    triggerNotification('Task restored from Trash.');
  };

  const permanentlyDeleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
    setActiveDropdownTaskId(null);
    triggerNotification('Task deleted permanently.');
  };

  // Change Task Tag
  const changeTaskTag = (id, newTag) => {
    const tagColors = {
      'Urgent': 'bg-tertiary-container text-on-tertiary-container',
      'Work': 'bg-surface-container-highest text-on-surface-variant',
      'High Focus': 'bg-secondary-container text-on-secondary-container',
      'General': 'bg-surface-container-low text-on-surface-variant'
    };

    setTasks(tasks.map(task => 
      task.id === id ? { ...task, tag: newTag, tagColor: tagColors[newTag] } : task
    ));
    setActiveDropdownTaskId(null);
    triggerNotification(`Tag updated to ${newTag}`);
  };

  // Timer commands
  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);
  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(timerMode === 'work' ? 1500 : 300);
  };
  const switchTimerMode = (mode) => {
    setIsTimerRunning(false);
    setTimerMode(mode);
    setTimerSeconds(mode === 'work' ? 1500 : 300);
  };

  const formatTimerValue = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- 3. Filter Task Computation ---
  const filteredTasks = tasks.filter(task => {
    // First apply search query if exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!task.text.toLowerCase().includes(query) && !task.tag.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Now apply tab filters
    if (activeTab === 'trash') {
      return task.isDeleted;
    }
    
    // Non-trash views should ignore deleted tasks
    if (task.isDeleted) return false;

    if (activeTab === 'archive') {
      return task.isArchived;
    }
    
    // Regular views should ignore archived tasks
    if (task.isArchived) return false;

    if (activeTab === 'inbox') {
      return true;
    }
    if (activeTab === 'today') {
      return task.time.toLowerCase().includes('today');
    }
    if (activeTab === 'upcoming') {
      return !task.time.toLowerCase().includes('today');
    }
    return true;
  });

  // Calculate statistics
  const completedCount = tasks.filter(t => !t.isDeleted && !t.isArchived && t.completed).length;
  const totalActiveCount = tasks.filter(t => !t.isDeleted && !t.isArchived).length;
  const progressPercentage = totalActiveCount ? Math.round((completedCount / totalActiveCount) * 100) : 0;

  return (
    <div className="bg-background text-on-background flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300">
      
      {/* Dynamic Slide Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-primary text-on-primary px-lg py-md rounded-xl shadow-lg z-[100] flex items-center gap-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <CheckCircle size={18} />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* SideNavBar */}
      <aside className="w-[280px] h-screen sticky left-0 top-0 bg-surface-container-low dark:bg-surface-dim shadow-sm flex flex-col p-md gap-sm z-40">
        <div className="flex items-center gap-sm px-sm py-md">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-md">
            <CheckSquare size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary dark:text-primary-fixed-dim leading-none">Workspace</h2>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Personal Focus</p>
          </div>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full py-md px-lg bg-primary text-on-primary rounded-xl text-md font-semibold flex items-center justify-center gap-sm cursor-pointer transition-all duration-200 active:scale-95 shadow-md hover:bg-opacity-90 hover:shadow-lg"
        >
          <Plus size={18} /> Add Task
        </button>

        <nav className="flex-1 mt-lg space-y-1">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
              activeTab === 'inbox' 
                ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
            }`}
          >
            <Inbox size={18} /> <span className="text-sm">Inbox</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('today')}
            className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
              activeTab === 'today' 
                ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
            }`}
          >
            <Calendar size={18} /> <span className="text-sm">Today</span>
          </button>

          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
              activeTab === 'upcoming' 
                ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
            }`}
          >
            <Calendar size={18} /> <span className="text-sm">Upcoming</span>
          </button>
        </nav>

        <div className="pt-md border-t border-outline-variant space-y-1">
          <button 
            onClick={() => setActiveTab('archive')}
            className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
              activeTab === 'archive' 
                ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
            }`}
          >
            <Archive size={18} /> <span className="text-sm">Archive</span>
          </button>

          <button 
            onClick={() => setActiveTab('trash')}
            className={`w-full flex items-center gap-md px-md py-sm rounded-lg transition-all text-left font-medium cursor-pointer ${
              activeTab === 'trash' 
                ? 'text-primary bg-surface-container-highest dark:bg-surface-container-high font-bold' 
                : 'text-on-surface-variant hover:bg-surface-container-high dark:hover:bg-surface-container'
            }`}
          >
            <Trash2 size={18} /> <span className="text-sm">Trash</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TopNavBar */}
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
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-lg">
            <div className="flex gap-md">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant"
                title="Toggle Theme"
              >
                {darkMode ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} />}
              </button>
              <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant">
                <Bell size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-surface-container-low dark:hover:bg-surface transition-colors cursor-pointer text-on-surface-variant">
                <Settings size={18} />
              </button>
            </div>
            <div className="w-8 h-8 rounded-full border border-outline-variant bg-gray-300 overflow-hidden shadow-sm">
              <img alt="User profile" className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"/>
            </div>
          </div>
        </header>

        {/* Main Canvas */}
        <main className="flex-1 overflow-y-auto px-xl py-xl bg-background transition-colors duration-300">
          <div className="max-w-[1200px] mx-auto space-y-xl">
            
            {/* Quick Add & Title */}
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

              {/* Only show Quick Add for non-trash, non-archive states */}
              {activeTab !== 'trash' && activeTab !== 'archive' && (
                <form onSubmit={handleQuickAddTask} className="flex gap-sm items-center w-full bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/60 rounded-2xl p-sm shadow-sm hover:shadow-md transition-all">
                  <input 
                    className="flex-1 bg-transparent border-none text-base p-md text-on-background focus:outline-none placeholder:text-on-surface-variant/75" 
                    placeholder="Quickly add a task to focus list..." 
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    className="px-lg py-md bg-primary text-on-primary rounded-xl text-sm font-bold shadow-sm transition-all hover:bg-opacity-95 hover:shadow cursor-pointer active:scale-95"
                  >
                    Add
                  </button>
                </form>
              )}
            </section>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              
              {/* Task List Column */}
              <div className="lg:col-span-2 space-y-sm">
                <div className="flex items-center justify-between mb-md px-sm">
                  <h3 className="text-md font-bold text-on-surface-variant">
                    {activeTab === 'trash' ? 'Deleted Tasks' : activeTab === 'archive' ? 'Archived Items' : 'Primary Objectives'}
                  </h3>
                  <span className="text-xs bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-bold shadow-sm">
                    {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
                  </span>
                </div>
                
                {filteredTasks.length === 0 ? (
                  <div className="bg-surface-container-lowest dark:bg-surface-container p-xl rounded-2xl border border-dashed border-outline-variant/60 flex flex-col items-center justify-center text-center space-y-md">
                    <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                      <Sparkles size={24} />
                    </div>
                    <div>
                      <p className="font-semibold text-on-surface">No tasks found here</p>
                      <p className="text-xs text-on-surface-variant mt-1">Select another tab, clear search, or add a new task!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-sm">
                    {filteredTasks.map((task) => (
                      <div 
                        key={task.id}
                        className={`group bg-surface-container-lowest dark:bg-surface-container p-md rounded-xl border border-outline-variant/20 hover:border-primary transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-md relative`}
                      >
                        {/* Custom Circular Checkbox */}
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
                            <form 
                              onSubmit={(e) => { e.preventDefault(); saveEditedTask(task.id); }} 
                              className="flex gap-sm items-center w-full"
                            >
                              <input 
                                className="flex-1 bg-surface-container-low dark:bg-surface border border-outline-variant rounded-lg px-3 py-1 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                autoFocus
                              />
                              <button 
                                type="submit" 
                                className="p-2 bg-primary text-on-primary rounded-lg hover:bg-opacity-95 text-xs font-bold"
                              >
                                Save
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setEditingTaskId(null)} 
                                className="p-2 bg-surface-container-highest text-on-surface-variant rounded-lg text-xs"
                              >
                                Cancel
                              </button>
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

                        {/* Custom Dropdown Option Trigger */}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdownTaskId(activeDropdownTaskId === task.id ? null : task.id)}
                            className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-surface-container-low transition-colors text-outline hover:text-primary cursor-pointer"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {/* Options Dropdown Menu */}
                          {activeDropdownTaskId === task.id && (
                            <div 
                              ref={dropdownRef} 
                              className="absolute right-0 mt-2 w-48 bg-surface-container-lowest dark:bg-surface border border-outline-variant/60 rounded-xl shadow-lg z-50 py-2 divide-y divide-outline-variant/20 animate-in fade-in slide-in-from-top-2 duration-150"
                            >
                              {!task.isDeleted && (
                                <div className="py-1">
                                  <button 
                                    onClick={() => startEditing(task)}
                                    className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left"
                                  >
                                    <Edit2 size={14} /> Edit Objective
                                  </button>
                                  
                                  {task.isArchived ? (
                                    <button 
                                      onClick={() => unarchiveTask(task.id)}
                                      className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left"
                                    >
                                      <Archive size={14} /> Restore to Inbox
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={() => archiveTask(task.id)}
                                      className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left"
                                    >
                                      <Archive size={14} /> Archive Task
                                    </button>
                                  )}
                                </div>
                              )}

                              <div className="py-1">
                                {task.isDeleted ? (
                                  <>
                                    <button 
                                      onClick={() => restoreTask(task.id)}
                                      className="flex items-center gap-sm w-full px-md py-sm text-sm text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container transition-colors text-left"
                                    >
                                      <Archive size={14} /> Restore Task
                                    </button>
                                    <button 
                                      onClick={() => permanentlyDeleteTask(task.id)}
                                      className="flex items-center gap-sm w-full px-md py-sm text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors text-left font-semibold"
                                    >
                                      <Trash size={14} /> Delete Forever
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => deleteTask(task.id)}
                                    className="flex items-center gap-sm w-full px-md py-sm text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors text-left font-semibold"
                                  >
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
                                        className={`text-[10px] px-1 py-1 rounded text-center border font-bold ${
                                          task.tag === tg ? 'border-primary bg-primary-container text-on-primary-container' : 'border-outline-variant/40 hover:border-primary'
                                        }`}
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

              {/* Widgets Column */}
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
                      <div 
                        className="h-full bg-secondary dark:bg-secondary-fixed-dim transition-all duration-500 rounded-full" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
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

                {/* Deep Focus Mode Widget (Pomodoro Timer) */}
                <section className="bg-primary dark:bg-primary-container text-on-primary dark:text-on-primary-container p-lg rounded-2xl shadow-md space-y-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-lg opacity-10">
                    <Clock size={80} />
                  </div>

                  <div className="relative z-10 space-y-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-extrabold tracking-tight">Deep Focus Pomodoro</h3>
                      <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 bg-white/20 dark:bg-black/20 rounded-full">
                        {timerMode === 'work' ? 'Focus Session' : 'Short Break'}
                      </span>
                    </div>
                    
                    <div className="text-center py-md">
                      <span className="text-5xl font-black tracking-tighter tabular-nums block select-none">
                        {formatTimerValue(timerSeconds)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-sm pb-1">
                      <button 
                        onClick={() => switchTimerMode('work')}
                        className={`text-xs py-1 rounded-lg font-bold transition-all border ${
                          timerMode === 'work' ? 'bg-white text-primary border-white' : 'border-white/30 hover:bg-white/10'
                        }`}
                      >
                        25m Focus
                      </button>
                      <button 
                        onClick={() => switchTimerMode('break')}
                        className={`text-xs py-1 rounded-lg font-bold transition-all border ${
                          timerMode === 'break' ? 'bg-white text-primary border-white' : 'border-white/30 hover:bg-white/10'
                        }`}
                      >
                        5m Break
                      </button>
                      <button 
                        onClick={resetTimer}
                        className="text-xs py-1 border border-white/30 hover:bg-white/10 rounded-lg flex items-center justify-center gap-1 font-bold"
                      >
                        <RotateCcw size={12} /> Reset
                      </button>
                    </div>

                    <button 
                      onClick={toggleTimer}
                      className="w-full py-md bg-white dark:bg-background text-primary dark:text-primary font-black rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-sm cursor-pointer hover:shadow-lg"
                    >
                      {isTimerRunning ? (
                        <>
                          <Pause size={16} className="fill-current" /> Pause Session
                        </>
                      ) : (
                        <>
                          <Play size={16} className="fill-current" /> Start Focus Session
                        </>
                      )}
                    </button>
                  </div>
                </section>

            

              </div>
            </div>

          </div>
        </main>
      </div>

      {/* --- ADD TASK MODAL OVERLAY --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-surface-container text-on-background max-w-md w-full rounded-2xl p-lg shadow-xl border border-outline-variant/50 space-y-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-sm border-b border-outline-variant/30">
              <h3 className="text-lg font-extrabold tracking-tight">Create Focus Objective</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full hover:bg-surface-container-high dark:hover:bg-surface text-outline cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalAddTask} className="space-y-md">
              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Objective</label>
                <input 
                  type="text" 
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder="What will you focus on?"
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl p-md text-base text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider">Schedule / Time</label>
                <input 
                  type="text" 
                  value={modalTime}
                  onChange={(e) => setModalTime(e.target.value)}
                  placeholder="e.g. Today, 5:00 PM or Tomorrow, 10:00 AM"
                  className="w-full bg-surface-container-low dark:bg-surface border border-outline-variant/60 rounded-xl p-md text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-xs font-black text-outline uppercase tracking-wider block mb-1">Priority Classification</label>
                <div className="grid grid-cols-4 gap-sm">
                  {['Urgent', 'Work', 'High Focus', 'General'].map((tg) => (
                    <button 
                      key={tg} 
                      type="button"
                      onClick={() => setModalTag(tg)}
                      className={`text-xs py-2 rounded-xl border font-bold transition-all ${
                        modalTag === tg 
                          ? 'border-primary bg-primary-container text-on-primary-container shadow-sm' 
                          : 'border-outline-variant/50 text-on-surface-variant hover:border-primary'
                      }`}
                    >
                      {tg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-sm pt-md border-t border-outline-variant/30">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-lg py-md border border-outline-variant/60 hover:bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-lg py-md bg-primary text-on-primary hover:bg-opacity-95 shadow-sm rounded-xl text-sm font-bold cursor-pointer"
                >
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