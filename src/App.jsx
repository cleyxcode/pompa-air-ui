import React, { useState, useEffect } from 'react';
import {
  Droplets, Thermometer, Wind, Power, Settings,
  CloudRain, ShieldAlert, History, Activity, AlertTriangle,
  Play, Square, RefreshCcw, Sun, Moon, User
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  SiReact, SiTailwindcss, SiVite, SiSupabase,
  SiEspressif, SiArduino, SiJavascript, SiFigma,
  SiNodedotjs, SiGithub
} from 'react-icons/si';
import { FaMicrochip } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import Aurora from './Aurora';
import ProfileCard from './ProfileCard';
import { LogoLoop } from './components/LogoLoop';
import './index.css';

const API_URL = 'https://ml-api-supabase.vercel.app';
const API_KEY = 'yuli1';
const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

const techLogos = [
  { node: <SiReact color="#61DAFB" />, title: "React", href: "https://react.dev" },
  { node: <SiTailwindcss color="#06B6D4" />, title: "Tailwind CSS", href: "https://tailwindcss.com" },
  { node: <SiVite color="#646CFF" />, title: "Vite", href: "https://vitejs.dev" },
  { node: <SiSupabase color="#3ECF8E" />, title: "Supabase", href: "https://supabase.com" },
  { node: <SiEspressif color="#E7352C" />, title: "ESP32", href: "https://www.espressif.com" },
  { node: <SiArduino color="#00979D" />, title: "Arduino", href: "https://www.arduino.cc" },
  { node: <FaMicrochip color="#FFD700" />, title: "IoT Engineering" },
  { node: <SiFigma color="#F24E1E" />, title: "Figma", href: "https://www.figma.com" },
  { node: <SiJavascript color="#F7DF1E" />, title: "JavaScript" },
  { node: <SiNodedotjs color="#339933" />, title: "Node.js", href: "https://nodejs.org" },
  { node: <SiGithub color="var(--text-primary)" title="GitHub" href="https://github.com" /> }
];

// Move ProgressBar outside to prevent unmounting on parent render
const ProgressBar = ({ label, value, max, color }) => {
  const [width, setWidth] = useState(0);
  const targetPercent = Math.min(Math.max((value || 0) / max * 100, 0), 100);

  useEffect(() => {
    // Delay slightly so the CSS transition triggers from 0 to target on initial mount
    const timer = setTimeout(() => {
      setWidth(targetPercent);
    }, 50);
    return () => clearTimeout(timer);
  }, [targetPercent]);

  return (
    <div className="progress-bar-container">
      <div className="progress-header">
        <span>{label}</span>
        <span>{value} / {max}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${width}%`, backgroundColor: color }}></div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply theme on load and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Safe data retrieval
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/status`, { headers: HEADERS });
      if (!res.ok) throw new Error('Gagal mengambil data status');
      const data = await res.json();
      setStatus(data || {});
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (loading) setLoading(false);
    }
  };

  const fetchHistory = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await fetch(`${API_URL}/history?limit=100`, { headers: HEADERS });
      if (!res.ok) throw new Error('Gagal mengambil data riwayat');
      const data = await res.json();
      const formattedData = (data.records || []).map(item => ({
        ...item,
        timeLabel: new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      })).reverse();
      setHistory(formattedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleControl = async (action, mode) => {
    const toastId = toast.loading(`Memproses perintah ${action.toUpperCase()}...`);
    try {
      const res = await fetch(`${API_URL}/control`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ action, mode })
      });
      if (!res.ok) throw new Error(`Gagal mengatur pompa (${action})`);
      toast.success(`Pompa ${action.toUpperCase()}, Mode: ${mode.toUpperCase()}`, { id: toastId });
      fetchStatus();
      if (activeTab === 'history') fetchHistory(true);
    } catch (err) {
      toast.error(err.message, { id: toastId });
    }
  };


  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const getKnnColor = (label) => {
    if (label?.toLowerCase().includes('kering')) return 'var(--danger)';
    if (label?.toLowerCase().includes('lembab')) return 'var(--warning)';
    return 'var(--accent-green)';
  };

  // Realtime Polling Logic
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      if (activeTab === 'history') {
        fetchHistory(true);
      }
    }, 2000); // Changed to 2 seconds for faster realtime feel
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const latest = status?.latest_data || {};
  const isReady = status && !loading;

  // Render components

  return (
    <div className="app-wrapper">
      <div className="aurora-background">
        <Aurora
          colorStops={theme === 'dark' ? ["#10b981", "#3b82f6", "#047857"] : ["#a7f3d0", "#bae6fd", "#34d399"]}
          blend={0.5}
          amplitude={1.2}
          speed={0.5}
        />
      </div>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: 'var(--panel-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--panel-border)',
          fontFamily: 'var(--font-body)',
          fontWeight: '600'
        }
      }} />
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Droplets color="var(--accent-green)" size={32} />
          <div className="sidebar-brand">Siram Pintar</div>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Activity size={20} /> Beranda
          </button>
          <button className={`nav-btn ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>
            <Settings size={20} /> Kontrol Pompa
          </button>
          <button className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
            <History size={20} /> Riwayat
          </button>
          <button className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={20} /> Profil Developer
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="theme-toggle">
            <button className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              <Sun size={18} />
            </button>
            <button className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              <Moon size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="mobile-header">
        <div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Droplets color="var(--accent-green)" size={24} />
          Siram Pintar
        </div>
        <div className="theme-toggle" style={{ padding: '0.25rem' }}>
          <button className={`theme-toggle-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} style={{ padding: '0.35rem' }}>
            <Sun size={16} />
          </button>
          <button className={`theme-toggle-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} style={{ padding: '0.35rem' }}>
            <Moon size={16} />
          </button>
        </div>
      </header>

      {/* MOBILE BOTTOM NAV */}
      <nav className="bottom-nav">
        <button className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Activity size={20} /> Beranda
        </button>
        <button className={`bottom-nav-item ${activeTab === 'control' ? 'active' : ''}`} onClick={() => setActiveTab('control')}>
          <Settings size={20} /> Kontrol
        </button>
        <button className={`bottom-nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={20} /> Riwayat
        </button>
        <button className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <User size={20} /> Profil
        </button>
      </nav>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="page-header">
          <div className="page-title">
            <h2>{activeTab === 'dashboard' ? 'Dashboard Monitoring' : activeTab === 'control' ? 'Kontrol Pompa' : activeTab === 'history' ? 'Riwayat Sensor' : 'Profil Developer'}</h2>
            <p>Sistem Penyiraman Tanaman Otomatis Berbasis IoT</p>
          </div>
        </div>

        {error && activeTab !== 'control' && (
          <div className="notification error" style={{ position: 'relative', top: 0, right: 0, marginBottom: '1.5rem', width: '100%', animation: 'none' }}>
            <XCircle size={20} />
            Error: {error}
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          !isReady ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Memuat data sistem...</p>
            </div>
          ) : (
            <>
              <div className="dashboard-grid">
                {/* Status Pompa */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Power className="card-icon" /> Pompa
                    </div>
                    <span className={`badge ${status.pump_status === true || status.pump_status === 'on' ? 'on' : 'off'}`}>
                      {status.pump_status === true || status.pump_status === 'on' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div className="card-value">{String(status.mode || 'AUTO').toUpperCase()}</div>
                  <div className="card-desc">Mode Operasi Saat Ini</div>
                </div>

                {/* Hujan */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <CloudRain className="card-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }} /> Hujan
                    </div>
                    <span className={`badge ${status.is_raining ? 'warning' : 'safe'}`}>
                      {status.is_raining ? 'HUJAN' : 'CERAH'}
                    </span>
                  </div>
                  <div className="card-value">{status.rain_score ?? 0}</div>
                  <div className="card-desc">Skor Curah Hujan (0-100)</div>
                </div>

                {/* Siram Hari Ini */}
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <RefreshCcw className="card-icon" style={{ backgroundColor: 'var(--off-light)', color: 'var(--off)' }} /> Siram
                    </div>
                  </div>
                  <div className="card-value">{status.watering_today ?? 0} <span style={{ fontSize: '1rem' }}>kali</span></div>
                  <div className="card-desc">Terakhir: {formatDate(status.last_watered_ts)}</div>
                </div>
              </div>

              <h3 style={{ marginBottom: '1rem', marginTop: '1rem' }}>Sensor Real-time</h3>
              <div className="dashboard-grid">
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Droplets className="card-icon" /> Kelembaban Tanah
                    </div>
                    <span className="badge safe" style={{ backgroundColor: 'var(--off-light)', color: getKnnColor(latest?.knn_label) }}>
                      {latest?.knn_label || 'MENUNGGU'}
                    </span>
                  </div>
                  <div className="card-value">{latest?.soil_moisture ?? 0}%</div>
                  <ProgressBar label="Tingkat Kelembaban" value={latest?.soil_moisture} max={100} color="var(--accent-green)" />
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Thermometer className="card-icon" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }} /> Suhu
                    </div>
                  </div>
                  <div className="card-value">{latest?.temperature ?? 0}°C</div>
                  <ProgressBar label="Tingkat Suhu" value={latest?.temperature} max={50} color="var(--danger)" />
                </div>

                <div className="card">
                  <div className="card-header">
                    <div className="card-title">
                      <Wind className="card-icon" style={{ backgroundColor: 'var(--off-light)', color: '#3b82f6' }} /> Udara
                    </div>
                  </div>
                  <div className="card-value">{latest?.air_humidity ?? 0}%</div>
                  <ProgressBar label="Kelembaban Udara" value={latest?.air_humidity} max={100} color="#3b82f6" />
                </div>
              </div>

              <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-header" style={{ marginBottom: '1rem' }}>
                    <div className="card-title">
                      <AlertTriangle className="card-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }} /> Informasi & Keamanan
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>STATUS KEAMANAN</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span className={`badge ${status.safety_locked ? 'locked' : 'safe'}`}>
                          <ShieldAlert size={14} style={{ marginRight: '0.25rem' }} />
                          LOCKED: {status.safety_locked ? 'YA' : 'TIDAK'}
                        </span>
                        <span className={`badge ${status.manual_override ? 'warning' : 'off'}`}>
                          OVERRIDE: {status.manual_override ? 'AKTIF' : 'TIDAK'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>WAKTU AMAN MENYIRAM</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <span className="badge off">PAGI: 05:00 - 07:59</span>
                        <span className="badge off">SORE: 16:00 - 18:59</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )
        )}

        {/* KONTROL */}
        {activeTab === 'control' && (() => {
          const isPumpOn = status?.pump_status === true || status?.pump_status === 'on';
          const isModeAuto = status?.mode === 'auto';

          return (
            <div className="control-grid">
              <div className="card">
                <div className="card-header">
                  <div className="card-title"><Settings className="card-icon" /> Kontrol Pompa</div>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Gunakan panel ini untuk mengoperasikan pompa secara manual atau mengembalikannya ke mode otomatis.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <button
                    className={`btn ${!isModeAuto && isPumpOn ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleControl('on', 'manual')}
                    style={!isModeAuto && isPumpOn ? { outline: '3px solid var(--accent-green-light)', boxShadow: '0 0 15px var(--accent-green-light)' } : {}}
                  >
                    <Play size={20} /> NYALAKAN POMPA (Manual)
                  </button>
                  <button
                    className={`btn ${!isModeAuto && !isPumpOn ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={() => handleControl('off', 'manual')}
                    style={!isModeAuto && !isPumpOn ? { outline: '3px solid var(--danger-light)', boxShadow: '0 0 15px var(--danger-light)' } : {}}
                  >
                    <Square size={20} /> MATIKAN POMPA (Manual)
                  </button>
                  <button
                    className={`btn ${isModeAuto ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleControl('off', 'auto')}
                    style={isModeAuto ? { outline: '3px solid var(--accent-green-light)', boxShadow: '0 0 15px var(--accent-green-light)' } : {}}
                  >
                    <Activity size={20} /> SET KE AUTO
                  </button>
                </div>
              </div>


            </div>
          );
        })()}

        {/* RIWAYAT */}
        {activeTab === 'history' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-secondary" style={{ width: 'auto', padding: '0.5rem 1rem' }} onClick={fetchHistory}>
                <RefreshCcw size={16} /> Refresh Data
              </button>
            </div>

            {loading && history.length === 0 ? (
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Memuat riwayat...</p>
              </div>
            ) : (
              <>
                {history.length > 0 && (
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--warning)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--warning)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" vertical={false} />
                        <XAxis dataKey="timeLabel" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Area type="monotone" name="Kelembaban Tanah (%)" dataKey="soil_moisture" stroke="var(--accent-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorMoisture)" />
                        <Area type="monotone" name="Suhu (°C)" dataKey="temperature" stroke="var(--warning)" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Kelembaban Tanah</th>
                        <th>Suhu</th>
                        <th>Kelembaban Udara</th>
                        <th>Status Tanah</th>
                        <th>Pompa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length > 0 ? history.map((item, index) => (
                        <tr key={index}>
                          <td>{formatDate(item.timestamp)}</td>
                          <td>{item.soil_moisture}%</td>
                          <td>{item.temperature}°C</td>
                          <td>{item.air_humidity}%</td>
                          <td>
                            <span style={{ color: getKnnColor(item.knn_label), fontWeight: '700' }}>
                              {item.knn_label || '-'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${item.pump_on ? 'on' : 'off'}`}>
                              {item.pump_on ? 'ON' : 'OFF'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            Tidak ada data riwayat.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* PROFILE DEVELOPER */}
        {activeTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', width: '100%', paddingBottom: '2rem' }}>
            <div style={{ width: '100%', maxWidth: '340px' }}>
              <ProfileCard
                name="Yuliet Tanamal"
                title="IoT & Software Engineer"
                handle="yuliet_tanamal"
                status="Online"
                contactText="Hubungi Saya"
                avatarUrl="/assets/avatar.png"
                showUserInfo={true}
                enableTilt={true}
                enableMobileTilt={true}
                onContactClick={() => toast('Membuka kontak...', { icon: '👋' })}
                behindGlowEnabled={true}
                behindGlowColor={theme === 'dark' ? "rgba(16, 185, 129, 0.4)" : "rgba(16, 185, 129, 0.2)"}
                innerGradient={theme === 'dark' ? "linear-gradient(145deg,#1f2937 0%,#04785744 100%)" : "linear-gradient(145deg,#ffffff 0%,#a7f3d044 100%)"}
              />
            </div>

            <div className="card" style={{ width: '100%', maxWidth: '600px', textAlign: 'center', zIndex: 10 }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}>Tentang Saya</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Halo! Saya Yuliet Tanamal, seorang pengembang perangkat lunak dan spesialis IoT (Internet of Things). Proyek "Siram Pintar" ini adalah wujud dedikasi saya dalam memadukan otomatisasi perangkat keras dengan antarmuka web modern yang interaktif untuk menyelesaikan tantangan di dunia nyata.
              </p>
              <div style={{ width: '100%', maxWidth: '100%', padding: '1rem 0', margin: '0 auto', overflow: 'hidden' }}>
                <LogoLoop
                  logos={techLogos}
                  speed={12}
                  logoHeight={isMobile ? 36 : 48}
                  gap={isMobile ? 40 : 70}
                  fadeOut={true}
                  fadeOutColor="var(--panel-bg)"
                  scaleOnHover={true}
                  hoverSpeed={0}
                />
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
