'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CheckSquare, Check, Trash2, Plus, Clock,
  Eye, Edit3, Sparkles, ExternalLink
} from 'lucide-react';
import {
  addTaskViaShare, toggleTaskViaShare, deleteTaskViaShare
} from '@/app/dashboard/shareActions';

const TAG_COLORS = {
  'Urgent':     'bg-red-100 text-red-700 border-red-200',
  'Work':       'bg-slate-100 text-slate-700 border-slate-200',
  'High Focus': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'General':    'bg-violet-100 text-violet-700 border-violet-200',
};

export default function ShareView({ token, ownerName, shareEditEnabled, initialTodos }) {
  const [todos, setTodos] = useState(initialTodos);
  const [newTask, setNewTask] = useState('');
  const [notification, setNotification] = useState(null);
  const [isPending, startTransition] = useTransition();

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const optimistic = {
      id: `temp-${Date.now()}`,
      text: newTask.trim(),
      tag: 'General',
      time: 'Today, 5:00 PM',
      completed: false,
    };
    setTodos(prev => [optimistic, ...prev]);
    const title = newTask.trim();
    setNewTask('');

    startTransition(async () => {
      const result = await addTaskViaShare(token, title);
      if (result.error) {
        setTodos(prev => prev.filter(t => t.id !== optimistic.id));
        notify(`Error: ${result.error}`);
      } else {
        setTodos(prev => prev.map(t => t.id === optimistic.id ? result.todo : t));
        notify('Task added!');
      }
    });
  };

  const handleToggle = (id) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    startTransition(async () => {
      const result = await toggleTaskViaShare(token, id);
      if (result.error) {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        notify(`Error: ${result.error}`);
      }
    });
  };

  const handleDelete = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    startTransition(async () => {
      const result = await deleteTaskViaShare(token, id);
      if (result.error) {
        notify(`Error: ${result.error}`);
      } else {
        notify('Task removed.');
      }
    });
  };

  const completed = todos.filter(t => t.completed).length;
  const progress = todos.length ? Math.round((completed / todos.length) * 100) : 0;

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)' }}>

      {/* Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-slate-800 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold border border-violet-100 animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2">
          <Check size={16} className="text-emerald-500" /> {notification}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/70 border-b border-violet-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-md">
              <CheckSquare size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-violet-500 uppercase tracking-widest">Shared List</p>
              <h1 className="text-base font-extrabold text-slate-800 leading-tight">
                {ownerName}'s Focus List
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode badge */}
            <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
              shareEditEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {shareEditEnabled ? <><Edit3 size={11} /> Can Edit</> : <><Eye size={11} /> View Only</>}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* Progress bar */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-5 shadow-sm border border-violet-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-700">Progress</span>
            <span className="text-sm font-extrabold text-violet-600">{completed}/{todos.length} done</span>
          </div>
          <div className="h-2.5 bg-violet-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {progress === 100 && todos.length > 0 ? '🎉 All tasks complete!' : `${progress}% completed`}
          </p>
        </div>

        {/* Quick add — only in edit mode */}
        {shareEditEnabled && (
          <form onSubmit={handleAdd} className="flex gap-2 bg-white/90 backdrop-blur rounded-2xl p-2 shadow-sm border border-violet-100">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder={`Add a task to ${ownerName}'s list...`}
              className="flex-1 bg-transparent px-4 py-2.5 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 font-medium"
            />
            <button
              type="submit"
              disabled={isPending || !newTask.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-violet-700 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Plus size={15} /> Add
            </button>
          </form>
        )}

        {/* Task list */}
        <div className="space-y-2.5">
          {todos.length === 0 ? (
            <div className="bg-white/80 backdrop-blur rounded-2xl p-10 border border-dashed border-violet-200 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center">
                <Sparkles size={22} className="text-violet-400" />
              </div>
              <p className="font-semibold text-slate-600">No tasks yet</p>
              <p className="text-xs text-slate-400">
                {shareEditEnabled ? 'Use the box above to add the first task.' : 'This list is empty.'}
              </p>
            </div>
          ) : (
            todos.map(task => (
              <div
                key={task.id}
                className={`group flex items-center gap-3 bg-white/85 backdrop-blur rounded-xl px-4 py-3.5 border shadow-sm transition-all duration-200 ${
                  task.id.startsWith('temp-') ? 'opacity-60' : 'border-violet-100 hover:border-violet-300 hover:shadow-md'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => shareEditEnabled && handleToggle(task.id)}
                  disabled={!shareEditEnabled || isPending || task.id.startsWith('temp-')}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    task.completed
                      ? 'bg-violet-600 border-violet-600'
                      : 'border-slate-300 hover:border-violet-400'
                  } ${shareEditEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {task.completed && <Check size={11} className="text-white stroke-[3]" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-semibold block truncate transition-all ${
                    task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}>
                    {task.text}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Clock size={9} /> {task.time}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${TAG_COLORS[task.tag] || TAG_COLORS['General']}`}>
                      {task.tag}
                    </span>
                  </div>
                </div>

                {/* Delete — edit mode only */}
                {shareEditEnabled && !task.id.startsWith('temp-') && (
                  <button
                    onClick={() => handleDelete(task.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* CTA footer */}
        <div className="text-center pt-4 pb-8">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 text-sm text-violet-600 font-bold hover:text-violet-800 transition-colors"
          >
            <ExternalLink size={14} />
            Create your own list on Workspace
          </Link>
        </div>
      </main>
    </div>
  );
}
