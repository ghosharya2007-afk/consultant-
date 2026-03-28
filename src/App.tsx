import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  AlertCircle,
  User as UserIcon,
  BookOpen,
  IndianRupee,
  Calendar,
  ArrowRight,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { User, Goal, Task, CareerPath } from './types';
import { geminiService } from './services/geminiService';

const STORAGE_KEY = 'pathwise_user_id';

export default function App() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'onboarding' | 'discovery' | 'dashboard' | 'subscription' | 'library' | 'profile' | 'finance'>('onboarding');
  
  // Onboarding State
  const [onboardingData, setOnboardingData] = useState<{
    name: string;
    age: number | "";
    education: string;
    income: number | "";
    free_time: number | "";
    clarity_level: number;
  }>({
    name: '',
    age: 20,
    education: '',
    income: 0,
    free_time: 2,
    clarity_level: 3
  });

  // Discovery State
  const [discoveryStep, setDiscoveryStep] = useState(0);
  const [discoveryAnswers, setDiscoveryAnswers] = useState<string[]>([]);
  const [suggestedPaths, setSuggestedPaths] = useState<CareerPath[]>([]);
  const [skillGap, setSkillGap] = useState<string | null>(null);
  const [streak, setStreak] = useState(3); // Mock streak for visual interest
  const [momentum, setMomentum] = useState([20, 35, 30, 45, 60, 55, 75]); // Mock momentum data

  const getLevel = (score: number) => {
    if (score < 30) return { name: "Novice", color: "text-stone-400", bg: "bg-stone-100" };
    if (score < 60) return { name: "Executor", color: "text-emerald-600", bg: "bg-emerald-100" };
    if (score < 85) return { name: "Strategist", color: "text-blue-600", bg: "bg-blue-100" };
    return { name: "Master", color: "text-purple-600", bg: "bg-purple-100" };
  };

  // Finance State
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);

  const budgetBreakdown = {
    rent: Math.round(monthlyBudget * 0.30),
    food: Math.round(monthlyBudget * 0.25),
    education: Math.round(monthlyBudget * 0.15),
    misc: Math.round(monthlyBudget * 0.15),
    savings: Math.round(monthlyBudget * 0.15)
  };

  useEffect(() => {
    if (user?.income && monthlyBudget === 0) {
      setMonthlyBudget(user.income);
    }
  }, [user, monthlyBudget]);

  const discoveryQuestions = [
    "What kind of work environments do you prefer? (e.g., office, outdoors, remote, active/physical)",
    "What are your top 3 interests or hobbies? (e.g., gaming, cooking, fixing things, helping people)",
    "Are you more comfortable with numbers, words, or working with your hands?",
    "What is your primary motivation for a new career? (e.g., higher income, stability, passion, flexibility)"
  ];

  useEffect(() => {
    if (userId) {
      fetchUserData(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (goals.length > 0 && user && !skillGap) {
      fetchSkillGap();
    }
  }, [goals, user]);

  const fetchSkillGap = async () => {
    if (!user || goals.length === 0) return;
    try {
      const gap = await geminiService.getSkillGapSnapshot(user, goals[0]);
      setSkillGap(gap);
    } catch (error) {
      console.error("Error fetching skill gap:", error);
    }
  };

  const fetchUserData = async (id: string) => {
    setLoading(true);
    try {
      const userRes = await fetch(`/api/user/${id}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        
        const goalsRes = await fetch(`/api/goals/${id}`);
        const goalsData = await goalsRes.json();
        setGoals(goalsData);

        const tasksRes = await fetch(`/api/tasks/${id}`);
        const tasksData = await tasksRes.json();
        setTasks(tasksData);

        if (goalsData.length > 0) {
          setStep('dashboard');
        } else if (userData.clarity_level <= 2) {
          setStep('discovery');
        } else {
          setStep('dashboard');
        }
      } else {
        setStep('onboarding');
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const id = crypto.randomUUID();
    try {
      const payload = {
        ...onboardingData,
        id,
        age: onboardingData.age === "" ? 0 : onboardingData.age,
        income: onboardingData.income === "" ? 0 : onboardingData.income,
        free_time: onboardingData.free_time === "" ? 0 : onboardingData.free_time,
        subscription_status: 'free'
      };
      await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      localStorage.setItem(STORAGE_KEY, id);
      setUserId(id);
      setUser({ ...payload, execution_readiness_score: 50, subscription_status: 'free' });
      
      if (onboardingData.clarity_level <= 2) {
        setStep('discovery');
      } else {
        setStep('dashboard');
      }
    } catch (error) {
      console.error("Onboarding failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const nextDiscoveryQuestion = (answer: string) => {
    const newAnswers = [...discoveryAnswers, answer];
    setDiscoveryAnswers(newAnswers);
    if (discoveryStep < discoveryQuestions.length - 1) {
      setDiscoveryStep(discoveryStep + 1);
    } else {
      startDiscovery(newAnswers);
    }
  };

  const startDiscovery = async (answers: string[]) => {
    setLoading(true);
    try {
      const paths = await geminiService.discoverGoals(user!, answers);
      setSuggestedPaths(paths);
    } catch (error) {
      console.error("Discovery failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectGoal = async (path: CareerPath) => {
    setLoading(true);
    const goalId = crypto.randomUUID();
    try {
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          user_id: user!.id,
          title: path.title,
          description: path.description,
          google_project_prompt: path.google_project_prompt
        })
      });
      const newGoal = { 
        id: goalId, 
        user_id: user!.id, 
        title: path.title, 
        description: path.description, 
        status: 'active' as const,
        google_project_prompt: path.google_project_prompt
      };
      setGoals([newGoal]);
      
      // Generate first week tasks
      const taskData = await geminiService.generateWeeklyTasks(user!, newGoal, 1, []);
      for (const t of taskData) {
        const tId = crypto.randomUUID();
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: tId,
            user_id: user!.id,
            goal_id: goalId,
            week_number: 1,
            ...t
          })
        });
      }
      
      const tasksRes = await fetch(`/api/tasks/${user!.id}`);
      setTasks(await tasksRes.json());
      setStep('dashboard');
    } catch (error) {
      console.error("Goal selection failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscription = async () => {
    setLoading(true);
    try {
      await fetch(`/api/user/${user!.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pro' })
      });
      setUser(prev => prev ? { ...prev, subscription_status: 'pro' } : null);
      setStep('dashboard');
    } catch (error) {
      console.error("Subscription failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: 'completed' | 'skipped', blocker?: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, blocker_reason: blocker })
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status, blocker_reason: blocker } : t));
    } catch (error) {
      console.error("Task update failed:", error);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-emerald-100">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        
        {/* Header */}
        <header className="p-6 flex items-center justify-between border-b border-stone-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">PathWise</h1>
          </div>
          {user && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">{user.execution_readiness_score}</span>
            </div>
          )}
        </header>

        <main className="flex-1 p-6">
          <AnimatePresence mode="wait">
            
            {/* Onboarding Step */}
            {step === 'onboarding' && (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-10 py-8"
              >
                <div className="text-center space-y-4">
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20 animate-float"
                  >
                    <Target className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-stone-900">PathWise</h1>
                    <p className="text-stone-500 font-medium">Career Execution System</p>
                  </div>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Full Name</label>
                      <input
                        required
                        className="w-full p-5 bg-white border-2 border-stone-100 rounded-3xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-lg"
                        placeholder="John Doe"
                        value={onboardingData.name}
                        onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Age</label>
                        <input
                          type="number"
                          required
                          className="w-full p-5 bg-white border-2 border-stone-100 rounded-3xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-lg"
                          value={onboardingData.age}
                          onChange={(e) => setOnboardingData({ ...onboardingData, age: e.target.value === "" ? "" : parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Daily Free Time (h)</label>
                        <input
                          type="number"
                          required
                          className="w-full p-5 bg-white border-2 border-stone-100 rounded-3xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-lg"
                          value={onboardingData.free_time}
                          onChange={(e) => setOnboardingData({ ...onboardingData, free_time: e.target.value === "" ? "" : parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Education Status</label>
                      <select
                        className="w-full p-5 bg-white border-2 border-stone-100 rounded-3xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-lg appearance-none"
                        value={onboardingData.education}
                        onChange={(e) => setOnboardingData({ ...onboardingData, education: e.target.value })}
                        required
                      >
                        <option value="">Select Level</option>
                        <option value="High School">High School</option>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Self-Taught">Self-Taught</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Monthly Income (₹)</label>
                      <input
                        type="number"
                        required
                        className="w-full p-5 bg-white border-2 border-stone-100 rounded-3xl focus:border-emerald-500 focus:ring-0 outline-none transition-all font-bold text-lg"
                        value={onboardingData.income}
                        onChange={(e) => setOnboardingData({ ...onboardingData, income: e.target.value === "" ? "" : parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-stone-900 text-white p-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-2xl shadow-stone-900/20 active:scale-95"
                  >
                    {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                      <>
                        Initialize System <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Discovery Step */}
            {step === 'discovery' && (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10 py-8"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Discovery Mode</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-none">
                    {suggestedPaths.length === 0 ? "Let's find your path." : "System Analysis"}
                  </h2>
                </div>

                {suggestedPaths.length === 0 ? (
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-black text-stone-400 uppercase tracking-widest">Question {discoveryStep + 1}/{discoveryQuestions.length}</span>
                        <div className="flex gap-1">
                          {discoveryQuestions.map((_, i) => (
                            <div key={i} className={`w-4 h-1 rounded-full transition-all duration-500 ${i <= discoveryStep ? 'bg-emerald-500' : 'bg-stone-200'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <p className="text-2xl font-bold text-stone-800 leading-snug">{discoveryQuestions[discoveryStep]}</p>
                        <textarea
                          key={discoveryStep}
                          autoFocus
                          className="w-full p-6 bg-white border-2 border-stone-100 rounded-[2rem] h-48 focus:border-emerald-500 focus:ring-0 outline-none resize-none transition-all font-medium text-lg shadow-sm"
                          placeholder="Type your answer here..."
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const val = (e.target as HTMLTextAreaElement).value;
                              if (val.trim()) nextDiscoveryQuestion(val);
                            }
                          }}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea && textarea.value.trim()) nextDiscoveryQuestion(textarea.value);
                      }}
                      disabled={loading}
                      className="w-full bg-stone-900 text-white p-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-2xl shadow-stone-900/20 active:scale-95"
                    >
                      {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : (
                        <>
                          {discoveryStep === discoveryQuestions.length - 1 ? "Run Analysis" : "Continue"}
                          <ArrowRight className="w-6 h-6" />
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs font-black uppercase tracking-widest text-stone-400 px-2">Top Career Matches</p>
                    <div className="grid grid-cols-1 gap-4">
                      {suggestedPaths.map((path, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                          className="group relative p-8 bg-white border-2 border-stone-100 rounded-[2.5rem] space-y-4 hover:border-emerald-500 cursor-pointer transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1"
                          onClick={() => selectGoal(path)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h3 className="font-black text-2xl tracking-tight group-hover:text-emerald-600 transition-colors">{path.title}</h3>
                              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Match Score: 98%</p>
                            </div>
                            <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <ArrowRight className="w-5 h-5" />
                            </div>
                          </div>
                          <p className="text-sm text-stone-500 leading-relaxed font-medium">{path.description}</p>
                          <div className="pt-4 border-t border-stone-50 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase">High Growth</span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">Remote Friendly</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Dashboard Step */}
            {step === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Bento Grid Header */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Goal Card - Large */}
                  <div className="col-span-2 p-8 bg-stone-900 text-white rounded-[2.5rem] space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-all duration-700" />
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-500">Active Mission</p>
                          <h2 className="text-3xl font-bold tracking-tight leading-tight">{goals[0]?.title}</h2>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                          <Target className="w-6 h-6 text-emerald-400" />
                        </div>
                      </div>
                      <p className="text-sm text-stone-400 leading-relaxed max-w-[80%]">{goals[0]?.description}</p>
                      <div className="flex gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-300">Week 1</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold uppercase tracking-wider text-stone-300">{user?.free_time}h Daily</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Momentum Card */}
                  <div className="bento-card col-span-1 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Momentum</p>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="h-16 flex items-end gap-1">
                      {momentum.map((val, i) => (
                        <motion.div 
                          key={i}
                          initial={{ height: 0 }}
                          animate={{ height: `${val}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="flex-1 bg-emerald-500/20 rounded-t-sm border-t-2 border-emerald-500"
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 text-center">+12% This Week</p>
                  </div>

                  {/* Streak Card */}
                  <div className="bento-card col-span-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Streak</p>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                    </div>
                    <div className="text-center py-2">
                      <span className="text-4xl font-black text-stone-900">{streak}</span>
                      <span className="text-xs font-bold text-stone-400 ml-1">DAYS</span>
                    </div>
                    <div className="flex gap-1 justify-center">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= streak ? 'bg-orange-500' : 'bg-stone-200'}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Execution Readiness Level */}
                <div className="bento-card flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Readiness Level</p>
                    <h3 className={`text-xl font-black uppercase ${getLevel(user?.execution_readiness_score || 0).color}`}>
                      {getLevel(user?.execution_readiness_score || 0).name}
                    </h3>
                  </div>
                  <div className="flex-1 max-w-[120px] space-y-2">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span>XP</span>
                      <span>{user?.execution_readiness_score}/100</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${user?.execution_readiness_score}%` }}
                        className="h-full bg-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Skill Gap - Bento Style */}
                <div className="bento-card space-y-4 border-l-4 border-l-emerald-500">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-sm uppercase tracking-wider">Skill Gap Snapshot</h3>
                  </div>
                  {!skillGap ? (
                    <div className="flex items-center gap-3 py-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-stone-300" />
                      <span className="text-xs text-stone-400">Scanning requirements...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-stone-600 leading-relaxed font-medium italic">
                      "{skillGap}"
                    </p>
                  )}
                </div>

                {/* Weekly Tasks - The Main Event */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-xl uppercase tracking-tight">Weekly Sprints</h3>
                    <div className="px-3 py-1 bg-stone-900 text-white text-[10px] font-bold rounded-full">
                      {tasks.filter(t => t.status === 'completed').length}/3 DONE
                    </div>
                  </div>

                  <div className="space-y-4">
                    {tasks.filter(t => t.week_number === 1).map((task, i) => (
                      <motion.div 
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.1 } }}
                        className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-500 ${
                          task.status === 'completed' ? 'bg-emerald-50 border-emerald-200' : 
                          task.status === 'skipped' ? 'bg-stone-100 border-stone-200 opacity-60' :
                          'bg-white border-stone-200 hover:border-emerald-500/50 shadow-sm hover:shadow-xl'
                        }`}
                      >
                        <div className="flex gap-6">
                          <div className="pt-1">
                            <button 
                              onClick={() => task.status === 'pending' && updateTaskStatus(task.id, 'completed')}
                              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                                task.status === 'completed' ? 'bg-emerald-600 text-white' : 
                                task.status === 'skipped' ? 'bg-stone-200 text-stone-400' :
                                'bg-stone-100 text-stone-300 group-hover:bg-emerald-100 group-hover:text-emerald-500'
                              }`}
                            >
                              {task.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                            </button>
                          </div>
                          <div className="space-y-4 flex-1">
                            <div className="space-y-1">
                              <div className="flex justify-between items-start">
                                <h4 className={`text-lg font-bold leading-tight ${task.status === 'completed' ? 'text-emerald-900 line-through opacity-50' : 'text-stone-900'}`}>
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-1 px-2 py-1 bg-stone-100 rounded-lg text-[9px] font-black text-stone-500 uppercase">
                                  <Clock className="w-3 h-3" />
                                  {task.time_required}
                                </div>
                              </div>
                              <p className="text-sm text-stone-500 leading-relaxed">{task.description}</p>
                            </div>
                            
                            {/* Visual Resources */}
                            <div className="grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => window.open(`https://www.youtube.com/results?search_query=${task.youtube_recommendation}`, '_blank')}
                                className="p-3 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:border-red-200 transition-all text-left group/res"
                              >
                                <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1">Learning Path</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-red-100 rounded-lg flex items-center justify-center group-hover/res:bg-red-500 group-hover/res:text-white transition-all">
                                    <RefreshCw className="w-3 h-3 text-red-600 group-hover/res:text-white" />
                                  </div>
                                  <p className="text-[10px] font-bold text-stone-700 truncate">{task.youtube_recommendation}</p>
                                </div>
                              </button>
                              <button 
                                onClick={() => window.open(`https://github.com/search?q=${task.github_idea}`, '_blank')}
                                className="p-3 bg-stone-50 rounded-2xl border border-stone-100 hover:bg-white hover:border-emerald-200 transition-all text-left group/res"
                              >
                                <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest mb-1">Build Task</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center group-hover/res:bg-emerald-500 group-hover/res:text-white transition-all">
                                    <ArrowRight className="w-3 h-3 text-emerald-600 group-hover/res:text-white" />
                                  </div>
                                  <p className="text-[10px] font-bold text-stone-700 truncate">{task.github_idea}</p>
                                </div>
                              </button>
                            </div>

                            {task.status === 'pending' && (
                              <div className="flex gap-3 pt-2">
                                <button 
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  className="flex-1 bg-stone-900 text-white text-xs font-black py-3 rounded-xl hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/20"
                                >
                                  Complete Task
                                </button>
                                <button 
                                  onClick={() => {
                                    const reason = prompt("What's blocking you? (Optional)");
                                    updateTaskStatus(task.id, 'skipped', reason || 'No reason provided');
                                  }}
                                  className="px-4 bg-stone-100 text-stone-400 text-xs font-black py-3 rounded-xl hover:bg-stone-200 transition-all"
                                >
                                  Skip
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Google Project - Locked State Elevation */}
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                  <div className={`relative p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${
                    user?.subscription_status === 'free' ? 'bg-white border-stone-100' : 'bg-stone-900 text-white border-stone-800'
                  }`}>
                    {user?.subscription_status === 'free' ? (
                      <div className="space-y-6 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                          <TrendingUp className="w-3 h-3" />
                          Pro Exclusive
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black tracking-tight">Google Capstone</h3>
                          <p className="text-sm text-stone-500">Unlock the ultimate project prompt designed to simulate a real-world Google technical challenge.</p>
                        </div>
                        <button 
                          onClick={() => setStep('subscription')}
                          className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl"
                        >
                          Upgrade to Unlock
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">The Google Challenge</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">Capstone Project</h3>
                        <p className="text-sm text-stone-400 leading-relaxed font-medium italic">
                          "{goals[0]?.google_project_prompt}"
                        </p>
                        <div className="pt-4 flex gap-4">
                          <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[8px] font-bold text-stone-500 uppercase mb-1">Difficulty</p>
                            <p className="text-xs font-bold text-emerald-400">HARD</p>
                          </div>
                          <div className="flex-1 p-3 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-[8px] font-bold text-stone-500 uppercase mb-1">Estimated Time</p>
                            <p className="text-xs font-bold text-emerald-400">20-30 Hours</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Bento */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bento-card col-span-1 bg-amber-50 border-amber-100 space-y-3">
                    <IndianRupee className="w-5 h-5 text-amber-600" />
                    <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">Growth Budget</p>
                    <p className="text-xl font-black text-amber-900">₹200</p>
                  </div>
                  <div className="bento-card col-span-1 bg-blue-50 border-blue-100 space-y-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Focus Block</p>
                    <p className="text-xl font-black text-blue-900">{user?.free_time}h</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Library Step */}
            {step === 'library' && (
              <motion.div
                key="library"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-stone-900 rounded-full" />
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">Resource Hub</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-none">Your Library</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Finance Prep Section */}
                  <div 
                    onClick={() => window.open('https://www.youtube.com/@AssetYogi', '_blank')}
                    className="bento-card bg-amber-50 border-amber-100 space-y-4 cursor-pointer hover:border-amber-300 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black uppercase tracking-widest text-amber-800">Finance Preparation</h3>
                      <IndianRupee className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-200 rounded-2xl flex items-center justify-center shadow-inner">
                        <TrendingUp className="w-6 h-6 text-amber-700" />
                      </div>
                      <div>
                        <p className="font-black text-amber-900">Financial Literacy Prep</p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase">Channel: Asset Yogi / Pranjal Kamra</p>
                      </div>
                    </div>
                  </div>

                  {/* YouTube Channels */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">Learning Channels</p>
                    <div className="grid grid-cols-1 gap-2">
                      {tasks.filter(t => t.youtube_recommendation).map((t, i) => (
                        <motion.div 
                          key={i} 
                          whileHover={{ x: 5 }}
                          onClick={() => window.open(`https://www.youtube.com/results?search_query=${t.youtube_recommendation}`, '_blank')}
                          className="p-5 bg-white border border-stone-200 rounded-3xl flex items-center justify-between group cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
                              <RefreshCw className="w-5 h-5" />
                            </div>
                            <span className="font-black text-stone-800">{t.youtube_recommendation}</span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-900" />
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Project Hub */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">Project Sprint Hub</p>
                    <div className="grid grid-cols-1 gap-3">
                      {tasks.filter(t => t.github_idea).map((t, i) => (
                        <div key={i} className="bento-card space-y-4 group">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-lg leading-tight group-hover:text-emerald-600 transition-colors">{t.github_idea}</h4>
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">GITHUB</span>
                          </div>
                          <p className="text-xs text-stone-500 font-medium">Context: {t.title}</p>
                          <button 
                            onClick={() => window.open(`https://github.com/search?q=${t.github_idea}`, '_blank')}
                            className="w-full py-3 bg-stone-50 rounded-xl text-[10px] font-black text-stone-400 uppercase tracking-widest hover:bg-stone-900 hover:text-white transition-all"
                          >
                            Initialize Repository
                          </button>
                        </div>
                      ))}
                      {user?.subscription_status === 'pro' && goals[0]?.google_project_prompt && (
                        <div className="p-8 bg-stone-900 text-white rounded-[2.5rem] space-y-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Target className="w-20 h-20" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">Pro Capstone</span>
                            </div>
                            <h4 className="text-2xl font-black tracking-tight">Google Project</h4>
                          </div>
                          <p className="text-sm text-stone-400 leading-relaxed italic">"{goals[0].google_project_prompt}"</p>
                          <button 
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(goals[0].google_project_prompt)}`, '_blank')}
                            className="w-full py-4 bg-emerald-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20"
                          >
                            Open Project Workspace
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Finance Step */}
            {step === 'finance' && (
              <motion.div
                key="finance"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Capital Management</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-none">Finance</h2>
                </div>

                <div className="p-8 bg-stone-900 text-white rounded-[2.5rem] space-y-8 relative overflow-hidden">
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                  <div className="space-y-4 relative z-10">
                    <p className="text-[10px] font-black uppercase text-stone-500 tracking-[0.3em]">Monthly Liquidity</p>
                    <div className="relative">
                      <IndianRupee className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 text-emerald-500" />
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-none p-0 pl-10 text-5xl font-black focus:ring-0 outline-none transition-all placeholder:text-stone-800"
                        value={monthlyBudget}
                        onChange={e => setMonthlyBudget(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Rent (30%)</p>
                      <p className="text-xl font-black">₹{budgetBreakdown.rent}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Food (25%)</p>
                      <p className="text-xl font-black">₹{budgetBreakdown.food}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Education (15%)</p>
                      <p className="text-xl font-black text-emerald-400">₹{budgetBreakdown.education}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Misc (15%)</p>
                      <p className="text-xl font-black">₹{budgetBreakdown.misc}</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/5 relative z-10">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-stone-500 uppercase tracking-widest">Savings / Buffer</p>
                        <p className="text-3xl font-black text-blue-400">₹{budgetBreakdown.savings}</p>
                      </div>
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bento-card bg-emerald-50 border-emerald-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Capital Strategy</h4>
                  </div>
                  <p className="text-sm text-emerald-800 leading-relaxed font-medium italic">
                    "The ₹{budgetBreakdown.education} you invest in yourself today is the highest leverage move you can make. Every rupee spent on learning is a brick in your future career."
                  </p>
                </div>
              </motion.div>
            )}

            {/* Profile Step */}
            {step === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-1 bg-stone-900 rounded-full" />
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.4em]">Operator Profile</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight leading-none">Profile</h2>
                </div>

                <div className="flex flex-col items-center gap-6 py-4">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500 to-blue-500 rounded-full blur opacity-20 animate-pulse" />
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-8 border-white shadow-2xl relative z-10 overflow-hidden">
                      <UserIcon className="w-16 h-16 text-stone-200" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center border-4 border-white z-20 shadow-lg">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="text-center space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">{user?.name}</h2>
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-[0.2em]">{user?.education} • {user?.age} Years</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bento-card space-y-2">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Readiness</p>
                    <p className="text-3xl font-black text-emerald-600">{user?.execution_readiness_score}</p>
                  </div>
                  <div className="bento-card space-y-2">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">System Tier</p>
                    <p className="text-xl font-black text-stone-800 uppercase tracking-tighter">{user?.subscription_status}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 px-2">System Controls</p>
                  <div className="bg-white border-2 border-stone-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <button className="w-full p-6 text-left flex justify-between items-center border-b border-stone-50 hover:bg-stone-50 transition-all group">
                      <span className="font-bold text-stone-700 group-hover:text-stone-900">Edit Operator Profile</span>
                      <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-900" />
                    </button>
                    <button className="w-full p-6 text-left flex justify-between items-center border-b border-stone-50 hover:bg-stone-50 transition-all group">
                      <span className="font-bold text-stone-700 group-hover:text-stone-900">System Notifications</span>
                      <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-900" />
                    </button>
                    <button 
                      onClick={() => {
                        localStorage.removeItem(STORAGE_KEY);
                        window.location.reload();
                      }}
                      className="w-full p-6 text-left flex justify-between items-center text-red-500 hover:bg-red-50 transition-all group"
                    >
                      <span className="font-black uppercase tracking-widest text-xs">Terminate Session</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Subscription Step */}
            {step === 'subscription' && (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight">PathWise Pro</h2>
                  <p className="text-stone-500">Unlock your full execution potential.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-white border-2 border-emerald-500 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">Best Value</div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <h3 className="font-bold text-xl">Monthly Plan</h3>
                          <p className="text-xs text-stone-400">Continuous weekly planning</p>
                        </div>
                        <div className="text-right">
                          <span className="text-3xl font-bold">₹100</span>
                          <span className="text-sm text-stone-400">/mo</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-4 border-t border-stone-100">
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Continuous Weekly Planning</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Google Capstone Projects</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Adaptive Feedback Loop</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Historical Progress Tracking</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleSubscription}
                        disabled={loading}
                        className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Subscribe Now"}
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => setStep('dashboard')}
                    className="w-full text-stone-400 text-sm font-bold py-2 hover:text-stone-600 transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Nav (Simulated) */}
        {user && ['dashboard', 'subscription', 'library', 'profile', 'finance'].includes(step) && (
          <nav className="p-4 bg-white border-t border-stone-200 flex justify-around items-center sticky bottom-0">
            <button 
              onClick={() => setStep('dashboard')}
              className={`flex flex-col items-center gap-1 ${step === 'dashboard' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Plan</span>
            </button>
            <button 
              onClick={() => setStep('library')}
              className={`flex flex-col items-center gap-1 ${step === 'library' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Library</span>
            </button>
            <button 
              onClick={() => setStep('finance')}
              className={`flex flex-col items-center gap-1 ${step === 'finance' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <IndianRupee className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Finance</span>
            </button>
            <button 
              onClick={() => setStep('subscription')}
              className={`flex flex-col items-center gap-1 ${step === 'subscription' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Pro</span>
            </button>
            <button 
              onClick={() => setStep('profile')}
              className={`flex flex-col items-center gap-1 ${step === 'profile' ? 'text-emerald-600' : 'text-stone-400'}`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Profile</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
