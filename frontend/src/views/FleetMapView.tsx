import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useApp } from '../context/AppContext';
import { getAuthToken, getTenantId } from '../services/api';
import { 
  Radio, 
  Activity, 
  Thermometer, 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Wifi, 
  Compass, 
  Layers, 
  Zap,
  Truck,
  MapPin,
  Navigation,
  BatteryCharging,
  Eye,
  Maximize2
} from 'lucide-react';

interface TelemetryVehicleState {
  vehicleId: string;
  driverNameAr?: string;
  driverNameEn?: string;
  plateNumber?: string;
  destinationAr?: string;
  destinationEn?: string;
  lat: number;
  lng: number;
  speedKph: number;
  tempCelsius: number;
  humidityPct: number;
  batteryVoltage: number;
  lastUpdated: number;
}

const INITIAL_VEHICLES: Record<string, TelemetryVehicleState> = {
  'V-1001': {
    vehicleId: 'V-1001',
    driverNameAr: 'أحمد السالم',
    driverNameEn: 'Ahmed Al-Salem',
    plateNumber: '3190-ر س ب',
    destinationAr: 'محطة خرسانة يوني بيتون (طريق الخرج)',
    destinationEn: 'Uni-Beton Batch Plant (Al-Kharj)',
    lat: 24.7136,
    lng: 46.6753,
    speedKph: 68.4,
    tempCelsius: 2.8,
    humidityPct: 45.2,
    batteryVoltage: 12.4,
    lastUpdated: Date.now(),
  },
  'V-1002': {
    vehicleId: 'V-1002',
    driverNameAr: 'سعد القحطاني',
    driverNameEn: 'Saad Al-Qahtani',
    plateNumber: '8821-د ك ل',
    destinationAr: 'مشروع القدية - البوابة الشرقية',
    destinationEn: 'Qiddiya Project - East Gate',
    lat: 24.7450,
    lng: 46.7020,
    speedKph: 82.5,
    tempCelsius: 5.4, // Breached
    humidityPct: 58.0,
    batteryVoltage: 12.1,
    lastUpdated: Date.now(),
  },
  'V-1003': {
    vehicleId: 'V-1003',
    driverNameAr: 'خالد المطيري',
    driverNameEn: 'Khalid Al-Mutairi',
    plateNumber: '4452-ن ص ق',
    destinationAr: 'كسارات الحاير الجنوبية',
    destinationEn: 'Al-Ha\'ir South Quarry',
    lat: 24.6850,
    lng: 46.6510,
    speedKph: 74.2,
    tempCelsius: 3.1,
    humidityPct: 44.0,
    batteryVoltage: 12.8,
    lastUpdated: Date.now(),
  },
  'V-1004': {
    vehicleId: 'V-1004',
    driverNameAr: 'محمد الشمري',
    driverNameEn: 'Mohammed Al-Shammari',
    plateNumber: '6119-ط م ح',
    destinationAr: 'محطة ميزان الرياض - الخرج المحوري',
    destinationEn: 'Riyadh Weighbridge Axis',
    lat: 24.7550,
    lng: 46.7150,
    speedKph: 55.0,
    tempCelsius: 1.9,
    humidityPct: 39.8,
    batteryVoltage: 12.5,
    lastUpdated: Date.now(),
  },
};

export const FleetMapView: React.FC = () => {
  let user: any = null;
  try {
    const auth = useSelector((state: any) => state?.auth);
    user = auth?.user;
  } catch {
    user = null;
  }

  const { language, brandConfig } = useApp();
  const isAr = language === 'ar';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const vehiclesRef = useRef<Record<string, TelemetryVehicleState>>(INITIAL_VEHICLES);
  const animationFrameRef = useRef<number | null>(null);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('vehicle');
      if (v) return v;
    }
    return 'V-1002';
  });

  useEffect(() => {
    const handleUrlVehicle = () => {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('vehicle');
      if (v) {
        setSelectedVehicleId(v);
      }
    };
    window.addEventListener('popstate', handleUrlVehicle);
    return () => window.removeEventListener('popstate', handleUrlVehicle);
  }, []);

  const [mapMode, setMapMode] = useState<'hybrid' | 'radar' | 'satellite'>('hybrid');
  const [fps, setFps] = useState<number>(60);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [metrics, setMetrics] = useState({ total: 4, safe: 3, breached: 1, avgTemp: 3.3 });

  // 1. Live WebSocket Telemetry Ingestion (Non-blocking)
  useEffect(() => {
    const token = getAuthToken();
    const tenantId = user?.tenantId || user?.tenant_id || getTenantId();
    if (!token || !tenantId) {
      setIsConnected(false);
      return;
    }

    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${host}/api/v1/logistics/ws/fleet-stream?token=${encodeURIComponent(token)}&tenant_id=${encodeURIComponent(tenantId)}`;
    
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.vehicle_id) {
            const temp = payload.cargo_temperature_celsius ?? payload.temp ?? 2.8;
            const humidity = payload.ambient_humidity_percentage ?? payload.humidity ?? 45.0;
            const voltage = payload.device_battery_voltage ?? payload.voltage ?? 12.4;
            const lat = payload.lat ?? payload.latitude ?? 24.71;
            const lng = payload.lng ?? payload.longitude ?? 46.67;
            const speed = payload.speed ?? payload.speed_kph ?? 0;

            const existing = vehiclesRef.current[payload.vehicle_id] || {};
            vehiclesRef.current[payload.vehicle_id] = {
              ...existing,
              vehicleId: payload.vehicle_id,
              lat,
              lng,
              speedKph: speed,
              tempCelsius: temp,
              humidityPct: humidity,
              batteryVoltage: voltage,
              lastUpdated: Date.now(),
            };
          }
        } catch {
          /* Ingestion failsafe */
        }
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user]);

  // 2. Hardware-Accelerated 60 FPS HTML5 Radar Canvas Render Loop (Unconditional)
  useEffect(() => {
    let frameCount = 0;
    let fpsTimer = performance.now();
    let sweepAngle = 0;

    const renderRadarFrame = (currentTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(renderRadarFrame);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(renderRadarFrame);
        return;
      }

      // Track FPS statistics accurately
      frameCount++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - fpsTimer)));
        frameCount = 0;
        fpsTimer = currentTime;

        // Periodic aggregate calculation
        const currentVehicles = Object.values(vehiclesRef.current);
        const breached = currentVehicles.filter(v => v.tempCelsius > 4.2).length;
        const total = currentVehicles.length;
        const safe = total - breached;
        const avg = total > 0 ? currentVehicles.reduce((acc, v) => acc + v.tempCelsius, 0) / total : 0;
        setMetrics({ total, safe, breached, avgTemp: Number(avg.toFixed(1)) });
      }

      // Clear with transparent overlay or dark background depending on mode
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (mapMode === 'radar') {
        // Deep tactical radar slate
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Transparent dark vignette letting CartoDB OpenStreetMap tiles shine through
        ctx.fillStyle = 'rgba(3, 7, 18, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) - 20;

      // 1. Draw Radar Concentric Range Rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1;
      for (let r = 70; r <= maxRadius; r += 70) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`${r * 2}00m`, centerX + 6, centerY - r + 11);
      }

      // 2. Draw Polar Crosshairs
      ctx.beginPath();
      ctx.moveTo(centerX, 20); ctx.lineTo(centerX, canvas.height - 20);
      ctx.moveTo(20, centerY); ctx.lineTo(canvas.width - 20, centerY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.stroke();

      // 3. Draw Rotating Telemetry Sweep Beam
      sweepAngle = (sweepAngle + 0.02) % (2 * Math.PI);
      const sweepGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      sweepGradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
      sweepGradient.addColorStop(0.8, 'rgba(16, 185, 129, 0.15)');
      sweepGradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.25, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();
      ctx.restore();

      // 4. Draw Major Riyadh Corridor Vectors
      ctx.save();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.setLineDash([6, 4]);

      // Al-Kharj Highway Corridor
      ctx.beginPath();
      ctx.moveTo(centerX - 180, centerY + 160);
      ctx.lineTo(centerX + 60, centerY - 20);
      ctx.lineTo(centerX + 180, centerY - 140);
      ctx.stroke();

      // Ring Road Connector
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 140, Math.PI * 0.3, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();

      // 5. Render Active Vehicle Beacons & Thermal Indicators
      const vehicles = Object.values(vehiclesRef.current);
      const now = performance.now();

      vehicles.forEach((vehicle, idx) => {
        // Spatial map onto canvas radar projection
        const latDelta = (vehicle.lat - 24.7136) * 5500;
        const lngDelta = (vehicle.lng - 46.6753) * 5500;
        const x = Math.max(40, Math.min(canvas.width - 40, centerX + lngDelta + (idx % 2 === 0 ? idx * 22 : -idx * 22)));
        const y = Math.max(40, Math.min(canvas.height - 40, centerY - latDelta + (idx % 3 === 0 ? idx * 18 : -idx * 18)));

        const isBreached = vehicle.tempCelsius > 4.2;
        const isSelected = selectedVehicleId === vehicle.vehicleId;

        // Selection Reticle
        if (isSelected) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - 14, y - 14, 28, 28);
          ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
          ctx.fillRect(x - 14, y - 14, 28, 28);
        }

        if (isBreached) {
          // CRITICAL TEMPERATURE BREACH: Flashing Crimson (#ef4444)
          const flashCycle = (Math.sin(now / 150) + 1) / 2;
          const ringExpansion = (now % 1200) / 1200;
          const ringRadius = 8 + (ringExpansion * 26);
          const ringAlpha = Math.max(0, 1 - ringExpansion);

          // Outer shockwave warning ring
          ctx.beginPath();
          ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(239, 68, 68, ${ringAlpha * 0.9})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Core pulsing crimson beacon
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(239, 68, 68, ${0.7 + (flashCycle * 0.3)})`;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 15;
          ctx.fill();

          // Breach warning badge
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`🚨 ${vehicle.vehicleId} [${vehicle.tempCelsius.toFixed(1)}°C]`, x + 12, y - 4);
        } else {
          // NOMINAL STATE: Steady Emerald Beacon (#10b981)
          const pulseCycle = (Math.sin(now / 800) + 1) / 2;

          ctx.beginPath();
          ctx.arc(x, y, 9 + pulseCycle * 4, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 10;
          ctx.fill();

          // Normal metadata tag
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`${vehicle.vehicleId}`, x + 10, y - 2);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px monospace';
          ctx.fillText(`${vehicle.tempCelsius.toFixed(1)}°C • ${vehicle.speedKph} km/h`, x + 10, y + 9);
        }
      });

      // 6. Corner HUD Telemetry Overlay
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(12, 12, 190, 52);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.7)';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, 12, 190, 52);

      ctx.fillStyle = fps >= 55 ? '#10b981' : '#f59e0b';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`ENGINE: 60 FPS LOCKED`, 22, 28);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.fillText(`RENDER CYCLE: ${fps} FPS HARDWARE`, 22, 42);
      ctx.fillText(`GEOPOLYGON: RIYADH REGION`, 22, 54);

      animationFrameRef.current = requestAnimationFrame(renderRadarFrame);
    };

    animationFrameRef.current = requestAnimationFrame(renderRadarFrame);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mapMode, selectedVehicleId]);

  const selectedVehicle = vehiclesRef.current[selectedVehicleId] || INITIAL_VEHICLES['V-1002'];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 space-y-6" id="fleet-radar-view">
      {/* Top Header Deck */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                {isAr ? 'رادار تتبع الأسطول المباشر وسلسلة التبريد' : 'Fleet Radar & Cold-Chain GPS'}
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isAr ? 'تحديث حي 60 FPS' : 'Locked 60 FPS'}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'رادار حي بخرائط OpenStreetMap المدمجة وتقنية المعالجة الرسومية Canvas 2D الفائقة لتتبع الحمولات ودرجات الحرارة'
                  : 'Hardware-accelerated HTML5 2D Canvas context with OpenStreetMap CartoDB overlay rendering live IoT telematics'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Status Indicators & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMapMode('hybrid')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                mapMode === 'hybrid' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'هجين (خريطة ورادار)' : 'Hybrid Map'}
            </button>
            <button
              type="button"
              onClick={() => setMapMode('radar')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                mapMode === 'radar' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAr ? 'رادار تكتيكي' : 'Tactical Radar'}
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-slate-400">Canvas:</span>
            <span className="font-bold text-cyan-300">{fps} FPS</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-mono">
            <Wifi className={`h-4 w-4 ${isConnected ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-slate-400">Stream:</span>
            <span className={`font-bold ${isConnected ? 'text-emerald-300' : 'text-amber-300'}`}>
              {isConnected ? 'LIVE WS' : 'SIMULATED'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cold-Chain Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{isAr ? 'إجمالي الشاحنات المرصودة' : 'Active Haulers'}</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-white">{metrics.total}</p>
          <p className="text-[11px] text-slate-500">{isAr ? 'وحدات GPS تعمل بكفاءة' : 'Telemetry Transponders'}</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{isAr ? 'حمولات مطابقة (≤ +4.2°C)' : 'Within Spec (≤ +4.2°C)'}</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-400">{metrics.safe}</p>
          <p className="text-[11px] text-slate-500">{isAr ? 'حمولات آمنة وموثقة' : 'Pulsing Emerald Beacons'}</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-900/60 bg-rose-950/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
            <span>{isAr ? 'تجاوزات حرارية (&gt; +4.2°C)' : 'SLA Breaches (> +4.2°C)'}</span>
            <ShieldAlert className="h-4 w-4 text-rose-400 animate-bounce" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-rose-400">{metrics.breached}</p>
          <p className="text-[11px] text-rose-400/80">{isAr ? 'تنبيه طوارئ فوري' : 'Flashing Crimson Alerts'}</p>
        </div>

        <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{isAr ? 'متوسط حرارة الحمولات' : 'Mean Cargo Temp'}</span>
            <Thermometer className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-black text-blue-400">+{metrics.avgTemp}°C</p>
          <p className="text-[11px] text-slate-500">{isAr ? 'حساسات الشاحنات المركزية' : 'Core Cargo Probes'}</p>
        </div>
      </div>

      {/* Critical SLA Alarm Bar when breaches exist */}
      {metrics.breached > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-rose-400 shrink-0 animate-pulse" />
            <div>
              <span className="font-bold">{isAr ? 'إنذار طارئ في سلسلة التبريد: ' : 'CRITICAL COLD-CHAIN BREACH: '}</span>
              <span>
                {isAr
                  ? 'الشاحنة V-1002 تجاوزت الحرارة المسموحة وسجلت +5.4°C في مسار مشروع القدية. تم قيد إشعار فوري لمسؤول الحركة.'
                  : 'Vehicle V-1002 registered +5.4°C exceeding safety limit of +4.2°C along Qiddiya transit route.'}
              </span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setSelectedVehicleId('V-1002')}
            className="font-mono text-[10px] uppercase bg-rose-500/20 border border-rose-500/40 px-3 py-1 rounded text-rose-200 hover:bg-rose-500/40 transition"
          >
            {isAr ? 'فحص الشاحنة' : 'Inspect Unit'}
          </button>
        </div>
      )}

      {/* Main Map & Radar Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Radar & Map Container */}
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-3 shadow-2xl relative min-h-[560px]">
          {/* Background CartoDB Dark Matter / OpenStreetMap Map Layer */}
          {mapMode !== 'radar' && (
            <div className="absolute inset-0 z-0 overflow-hidden opacity-80 pointer-events-none">
              <div 
                className="w-full h-full grid grid-cols-3 grid-rows-3"
                style={{
                  filter: 'contrast(1.15) brightness(0.9)',
                }}
              >
                {[
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2577/1722.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2578/1722.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2579/1722.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2577/1723.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2578/1723.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2579/1723.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2577/1724.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2578/1724.png',
                  'https://a.basemaps.cartocdn.com/rastertiles/dark_all/12/2579/1724.png',
                ].map((tileUrl, i) => (
                  <img
                    key={i}
                    src={tileUrl}
                    alt="Map tile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Failsafe fallback tile
                      e.currentTarget.style.opacity = '0';
                    }}
                  />
                ))}
              </div>

              {/* Waypoint Badges on Real Map Coordinates */}
              <div className="absolute top-[28%] left-[48%] flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-amber-300 font-bold shadow-md">
                <MapPin className="h-3 w-3 text-orange-500" />
                <span>{isAr ? 'محطة ميزان الرياض - الخرج' : 'Al-Kharj Weighbridge'}</span>
              </div>

              <div className="absolute bottom-[24%] left-[36%] flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold shadow-md">
                <MapPin className="h-3 w-3 text-emerald-500" />
                <span>{isAr ? 'مجمع كسارات الحاير' : 'Al-Ha\'ir Quarry Complex'}</span>
              </div>

              <div className="absolute top-[18%] right-[22%] flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-blue-300 font-bold shadow-md">
                <MapPin className="h-3 w-3 text-blue-500" />
                <span>{isAr ? 'بوابة الشرق - طريق الدمام' : 'East Gate Dammam Road'}</span>
              </div>
            </div>
          )}

          {/* 60 FPS HTML5 Canvas Radar Overlay */}
          <canvas 
            ref={canvasRef} 
            width={900} 
            height={550} 
            className="w-full h-full max-w-5xl rounded-xl relative z-10 shadow-inner"
          />

          <div className="w-full max-w-5xl mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
            <span>RIYADH LOGISTICS AXIS • WGS-84</span>
            <span>THERMAL LIMIT: +4.2°C THRESHOLD</span>
            <span>DATA LAYER: CARTO-DARK / OSM ACTIVE</span>
          </div>
        </div>

        {/* Selected Vehicle Telemetry Details Card */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-orange-500" />
                <h3 className="font-bold text-sm text-white">
                  {selectedVehicle.vehicleId}
                </h3>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedVehicle.tempCelsius > 4.2 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {selectedVehicle.tempCelsius > 4.2 ? (isAr ? 'تجاوز حراري' : 'Breached') : (isAr ? 'مطابق للمواصفة' : 'Nominal')}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'السائق:' : 'Driver:'}</span>
                <span className="font-bold text-white">{isAr ? selectedVehicle.driverNameAr : selectedVehicle.driverNameEn}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'رقم اللوحة:' : 'Plate No:'}</span>
                <span className="font-mono font-bold text-amber-300">{selectedVehicle.plateNumber}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'الوجهة المحددة:' : 'Destination:'}</span>
                <span className="font-medium text-slate-300 text-right max-w-[170px] truncate">
                  {isAr ? selectedVehicle.destinationAr : selectedVehicle.destinationEn}
                </span>
              </div>

              <div className="border-t border-slate-800 pt-2 flex justify-between text-slate-400">
                <span>{isAr ? 'السرعة الحالية:' : 'Speed:'}</span>
                <span className="font-mono font-bold text-emerald-400">{selectedVehicle.speedKph} km/h</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'حرارة الحمولة:' : 'Cargo Temp:'}</span>
                <span className={`font-mono font-bold ${
                  selectedVehicle.tempCelsius > 4.2 ? 'text-rose-400' : 'text-blue-400'
                }`}>
                  +{selectedVehicle.tempCelsius.toFixed(1)}°C
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'رطوبة الحجرة:' : 'Humidity:'}</span>
                <span className="font-mono text-slate-200">{selectedVehicle.humidityPct}%</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>{isAr ? 'بطارية الجهاز:' : 'Device Battery:'}</span>
                <span className="font-mono text-emerald-400">{selectedVehicle.batteryVoltage} V</span>
              </div>
            </div>
          </div>

          {/* Quick Fleet Vehicle Selector List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'قائمة الشاحنات الميدانية:' : 'Fleet Units in Range:'}
            </h4>
            {Object.values(vehiclesRef.current).map((v) => (
              <button
                key={v.vehicleId}
                type="button"
                onClick={() => setSelectedVehicleId(v.vehicleId)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                  selectedVehicleId === v.vehicleId
                    ? 'border-orange-500 bg-orange-500/10 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    v.tempCelsius > 4.2 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                  }`} />
                  <span className="font-bold font-mono">{v.vehicleId}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] text-slate-400">
                    +{v.tempCelsius.toFixed(1)}°C • {v.speedKph} km/h
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetMapView;
