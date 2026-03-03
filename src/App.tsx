import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  TrendingUp, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Users, 
  ShieldCheck, 
  History, 
  Copy, 
  ExternalLink,
  LayoutDashboard,
  Settings,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  address: string;
  balance: number;
  pendingEarnings: number;
  referrer_id: number | null;
}

interface Stats {
  activeUsers: number;
  totalDeposited: number;
  totalWithdrawn: number;
  minDeposit: number;
  withdrawFee: number;
}

interface Transaction {
  id: number;
  amount: number;
  status: string;
  created_at: string;
  tx_id?: string;
  user_address?: string;
}

// --- Components ---

const Navbar = ({ address, onLogout, onAdmin }: { address: string | null, onLogout: () => void, onAdmin: () => void }) => {
  const isAdmin = address === "TGAgSSF5b8r9cJL9X9ZhiKWfsMf5KQN4jg";

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-black w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">TRON<span className="text-emerald-500">MINER</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          {address && (
            <>
              {isAdmin && (
                <button 
                  onClick={onAdmin}
                  className="text-sm font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Admin Panel
                </button>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-mono text-white/70">{address.slice(0, 6)}...{address.slice(-4)}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-white/50 font-medium uppercase tracking-wider">{label}</div>
  </div>
);

export default function App() {
  const [address, setAddress] = useState<string | null>(localStorage.getItem('tron_address'));
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'dashboard' | 'deposit' | 'withdraw' | 'admin' | 'history'>('dashboard');
  const [txId, setTxId] = useState('');
  const [depositAmount, setDepositAmount] = useState('37');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [adminData, setAdminData] = useState<{ deposits: Transaction[], withdrawals: Transaction[] }>({ deposits: [], withdrawals: [] });
  const [historyData, setHistoryData] = useState<{ deposits: Transaction[], withdrawals: Transaction[] }>({ deposits: [], withdrawals: [] });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const DEPOSIT_ADDRESS = "TJ45GgXnqDgn2Bs4MVhjHxg16FPE715HkS";
  const ADMIN_ADDRESS = "TGAgSSF5b8r9cJL9X9ZhiKWfsMf5KQN4jg";

  useEffect(() => {
    fetchStats();
    if (address) fetchUser();
  }, [address]);

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchUser = async () => {
    if (!address) return;
    const res = await fetch(`/api/user/${address}`);
    const data = await res.json();
    setUser(data);
    fetchHistory();
  };

  const fetchHistory = async () => {
    if (!address) return;
    const res = await fetch(`/api/user/${address}/history`);
    const data = await res.json();
    setHistoryData(data);
  };

  const fetchAdminData = async () => {
    if (address !== ADMIN_ADDRESS) return;
    const res = await fetch('/api/admin/pending', {
      headers: { 'x-admin-address': ADMIN_ADDRESS }
    });
    const data = await res.json();
    setAdminData(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const addr = formData.get('address') as string;
    const ref = new URLSearchParams(window.location.search).get('ref');

    if (!addr) return;

    setLoading(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr, referrerAddress: ref })
    });
    const data = await res.json();
    setAddress(data.address);
    localStorage.setItem('tron_address', data.address);
    setLoading(false);
  };

  const handleLogout = () => {
    setAddress(null);
    setUser(null);
    localStorage.removeItem('tron_address');
    setView('dashboard');
  };

  const handleDeposit = async () => {
    if (!address || !txId || parseFloat(depositAmount) < 37) return;
    setLoading(true);
    const res = await fetch('/api/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, amount: parseFloat(depositAmount), txId })
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ type: 'success', text: 'Deposit submitted! Admin will confirm in 2 minutes.' });
      setTxId('');
      setView('dashboard');
    } else {
      setMessage({ type: 'error', text: data.error });
    }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!address || !withdrawAmount || parseFloat(withdrawAmount) < 10) return;
    setLoading(true);
    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, amount: parseFloat(withdrawAmount) })
    });
    const data = await res.json();
    if (data.success) {
      setMessage({ type: 'success', text: 'Withdrawal requested! Pending admin approval.' });
      setWithdrawAmount('');
      fetchUser();
      setView('dashboard');
    } else {
      setMessage({ type: 'error', text: data.error });
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!address) return;
    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });
    const data = await res.json();
    if (data.claimed > 0) {
      setMessage({ type: 'success', text: `Claimed ${data.claimed.toFixed(4)} TRX!` });
      fetchUser();
    }
  };

  const handleAdminAction = async (type: 'deposit' | 'withdraw', id: number, action: 'approve' | 'reject') => {
    const endpoint = `/api/admin/${type}/action`;
    await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-address': ADMIN_ADDRESS
      },
      body: JSON.stringify({ id, action })
    });
    fetchAdminData();
  };

  if (!address) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
        <Navbar address={null} onLogout={() => {}} onAdmin={() => {}} />
        
        <main className="max-w-7xl mx-auto px-4 py-12 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-widest mb-6">
                <ShieldCheck className="w-3 h-3" />
                Secure Mining Platform
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9] mb-6">
                DOUBLE YOUR <span className="text-emerald-500">TRON</span> IN 6 DAYS.
              </h1>
              <p className="text-lg text-white/50 max-w-lg mb-8 leading-relaxed">
                The most powerful and transparent TRON cloud mining platform. Start mining today and watch your assets grow with real-time tracking.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">37 TRX</div>
                    <div className="text-xs text-white/40">Min Deposit</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">2% Fee</div>
                    <div className="text-xs text-white/40">Withdrawal</div>
                  </div>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
                  <div>
                    <div className="text-xl font-bold">{stats.activeUsers.toLocaleString()}+</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest">Active Users</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{(stats.totalDeposited / 1000).toFixed(0)}K+</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest">Deposited</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{(stats.totalWithdrawn / 1000).toFixed(0)}K+</div>
                    <div className="text-xs text-white/40 uppercase tracking-widest">Withdrawn</div>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -z-10" />
              
              <h2 className="text-2xl font-bold mb-2">Get Started</h2>
              <p className="text-white/40 text-sm mb-8">Enter your TRON (TRC20) address to login or register.</p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40 mb-2 block">TRON Address</label>
                  <input 
                    name="address"
                    type="text" 
                    placeholder="T..."
                    required
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-sm"
                  />
                </div>
                <button 
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      Access Account
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-8 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="text-xs text-white/60 leading-relaxed">
                  Make sure to use a valid TRC20 address. You will need this same address to access your account and withdraw funds.
                </p>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <Navbar 
        address={address} 
        onLogout={handleLogout} 
        onAdmin={() => { setView('admin'); fetchAdminData(); }} 
      />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mb-6 p-4 rounded-xl flex items-center justify-between ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}
            >
              <div className="flex items-center gap-3">
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
              <button onClick={() => setMessage(null)} className="text-xs uppercase font-bold opacity-50 hover:opacity-100">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1 space-y-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-emerald-500 text-black font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => setView('deposit')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'deposit' ? 'bg-emerald-500 text-black font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              Deposit
            </button>
            <button 
              onClick={() => setView('withdraw')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'withdraw' ? 'bg-emerald-500 text-black font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              Withdraw
            </button>
            <button 
              onClick={() => { setView('history'); fetchHistory(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'history' ? 'bg-emerald-500 text-black font-bold' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
            >
              <History className="w-5 h-5" />
              History
            </button>
            <div className="pt-8 px-4">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/20 mb-4">Affiliate Program</div>
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="text-xs text-white/40 mb-2">Your Referral Link</div>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      value={`${window.location.origin}?ref=${address}`}
                      className="bg-transparent text-[10px] font-mono text-emerald-500 truncate w-full focus:outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?ref=${address}`);
                        setMessage({ type: 'success', text: 'Referral link copied!' });
                      }}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-[10px] font-bold text-emerald-500">10%</div>
                    <div className="text-[8px] text-white/40 uppercase">Lvl 1</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-[10px] font-bold text-emerald-500">5%</div>
                    <div className="text-[8px] text-white/40 uppercase">Lvl 2</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg border border-white/10">
                    <div className="text-[10px] font-bold text-emerald-500">2%</div>
                    <div className="text-[8px] text-white/40 uppercase">Lvl 3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {view === 'dashboard' && (
              <div className="space-y-8">
                {/* Balance & Mining Stats */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 rounded-3xl text-black relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                      <Wallet className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Available Balance</div>
                      <div className="text-5xl font-bold tracking-tighter mb-6">{user?.balance.toFixed(2)} <span className="text-2xl">TRX</span></div>
                      <button 
                        onClick={() => setView('withdraw')}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                      >
                        Withdraw Now
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-sm font-bold uppercase tracking-widest text-white/40 mb-1">Mining Earnings</div>
                        <div className="text-3xl font-bold text-emerald-500">{user?.pendingEarnings.toFixed(4)} <span className="text-lg">TRX</span></div>
                      </div>
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={handleClaim}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        Claim Earnings
                      </button>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <Clock className="w-5 h-5 text-white/40" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Daily Profit</div>
                    <div className="text-lg font-bold">33.33%</div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Total Return</div>
                    <div className="text-lg font-bold">200%</div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Duration</div>
                    <div className="text-lg font-bold">6 Days</div>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Min Deposit</div>
                    <div className="text-lg font-bold">37 TRX</div>
                  </div>
                </div>

                {/* Recent Activity Placeholder */}
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="font-bold">Recent Activity</h3>
                    <History className="w-4 h-4 text-white/30" />
                  </div>
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                      <History className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-white/40 text-sm">No recent transactions found.</p>
                  </div>
                </div>
              </div>
            )}

            {view === 'deposit' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-2">Deposit Funds</h2>
                  <p className="text-white/40">Send TRX to the address below to start mining.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                  <div className="p-6 bg-black border border-white/10 rounded-2xl text-center">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-4">Official Deposit Address (TRC20)</div>
                    <div className="text-lg font-mono text-emerald-500 break-all mb-4">{DEPOSIT_ADDRESS}</div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(DEPOSIT_ADDRESS);
                        setMessage({ type: 'success', text: 'Address copied!' });
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-xs font-bold transition-all"
                    >
                      <Copy className="w-3 h-3" />
                      Copy Address
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2 block">Amount (Min 37 TRX)</label>
                      <input 
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2 block">Transaction ID (Hash)</label>
                      <input 
                        type="text"
                        value={txId}
                        onChange={(e) => setTxId(e.target.value)}
                        placeholder="Paste hash here..."
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-xs"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleDeposit}
                    disabled={loading || !txId || parseFloat(depositAmount) < 37}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all"
                  >
                    {loading ? 'Processing...' : 'Submit Deposit'}
                  </button>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex gap-3">
                    <Clock className="w-5 h-5 text-emerald-500 shrink-0" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      After sending the payment, paste the Transaction ID above. Admin will confirm your deposit within 2 minutes. Mining starts automatically after approval.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'withdraw' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto space-y-8"
              >
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-2">Withdraw Funds</h2>
                  <p className="text-white/40">Withdraw your earnings directly to your registered address.</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
                  <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-2xl">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Available to Withdraw</div>
                      <div className="text-2xl font-bold">{user?.balance.toFixed(2)} TRX</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-white/30 mb-1">Withdrawal Fee</div>
                      <div className="text-lg font-bold text-emerald-500">2%</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2 block">Amount to Withdraw</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="Min 10 TRX"
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                      />
                      <button 
                        onClick={() => setWithdrawAmount(user?.balance.toString() || '0')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500 hover:text-emerald-400"
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">Fee (2%)</span>
                      <span className="text-white/60">{(parseFloat(withdrawAmount || '0') * 0.02).toFixed(2)} TRX</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold border-t border-white/10 pt-2">
                      <span>Total You Receive</span>
                      <span className="text-emerald-500">{(parseFloat(withdrawAmount || '0') * 0.98).toFixed(2)} TRX</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleWithdraw}
                    disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) < 10 || parseFloat(withdrawAmount) > (user?.balance || 0)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-4 rounded-xl transition-all"
                  >
                    {loading ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'history' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Transaction History</h2>
                  <button onClick={fetchHistory} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <History className="w-5 h-5 text-white/50" />
                  </button>
                </div>

                <div className="grid gap-8">
                  {/* Deposits History */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                        Deposits
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/50 text-white/40 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">TX Hash</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {historyData.deposits.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-white/20">No deposits found</td></tr>
                          ) : (
                            historyData.deposits.map((dep) => (
                              <tr key={dep.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-xs text-white/60">{new Date(dep.created_at).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold text-emerald-500">{dep.amount} TRX</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-white/40 truncate max-w-[150px]">{dep.tx_id}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                    dep.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                  }`}>
                                    {dep.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Withdrawals History */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                        Withdrawals
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/50 text-white/40 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {historyData.withdrawals.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-white/20">No withdrawals found</td></tr>
                          ) : (
                            historyData.withdrawals.map((w) => (
                              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 text-xs text-white/60">{new Date(w.created_at).toLocaleString()}</td>
                                <td className="px-6 py-4 font-bold text-emerald-500">{w.amount} TRX</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    w.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                    w.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                  }`}>
                                    {w.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'admin' && address === ADMIN_ADDRESS && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-3xl font-bold">Admin Control Panel</h2>
                  <button onClick={fetchAdminData} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <History className="w-5 h-5 text-white/50" />
                  </button>
                </div>

                <div className="grid gap-8">
                  {/* Pending Deposits */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                      <h3 className="font-bold flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
                        Pending Deposits
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/50 text-white/40 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-4">User Address</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">TX Hash</th>
                            <th className="px-6 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminData.deposits.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-white/20">No pending deposits</td></tr>
                          ) : (
                            adminData.deposits.map((dep) => (
                              <tr key={dep.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs">{dep.user_address}</td>
                                <td className="px-6 py-4 font-bold text-emerald-500">{dep.amount} TRX</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-white/40 truncate max-w-[150px]">{dep.tx_id}</td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleAdminAction('deposit', dep.id, 'approve')}
                                      className="px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleAdminAction('deposit', dep.id, 'reject')}
                                      className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-400"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pending Withdrawals */}
                  <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5">
                      <h3 className="font-bold flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
                        Pending Withdrawals
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-black/50 text-white/40 uppercase text-[10px] font-bold">
                          <tr>
                            <th className="px-6 py-4">User Address</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {adminData.withdrawals.length === 0 ? (
                            <tr><td colSpan={3} className="px-6 py-12 text-center text-white/20">No pending withdrawals</td></tr>
                          ) : (
                            adminData.withdrawals.map((w) => (
                              <tr key={w.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs">{w.user_address}</td>
                                <td className="px-6 py-4 font-bold text-emerald-500">{w.amount} TRX</td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => handleAdminAction('withdraw', w.id, 'approve')}
                                      className="px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold rounded-lg hover:bg-emerald-400"
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => handleAdminAction('withdraw', w.id, 'reject')}
                                      className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold rounded-lg hover:bg-red-400"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
