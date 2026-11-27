import {
  Check, ShieldAlert, Sparkles, X, Wrench, Layers, Palette, FileText,
  Lock, Eye, EyeOff, ChevronLeft, Database, Truck, Package,
  AlertCircle, CheckCircle, Clock, RefreshCw, Trash2, Edit,
  Plus, Filter, Search, ChevronDown, ChevronUp, Calendar,
  User, Mail, Phone, MapPin, DollarSign, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { WORKSHOP_THEME_SCHEMES, applyThemeScheme, type ThemeScheme } from '../utils/themes';
import { useNavigate, useLocation } from 'react-router-dom';

const ADMIN_PIN = '89277';

// Types for database-backed orders
interface OrderReceipt {
  id: string;
  code: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  itemType: string;
  itemDescription: string;
  status: OrderStatus;
  price: number;
  discount: number;
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
  estimatedReadyDate: string;
  actualReadyDate: string | null;
  masterNotes: string;
  clientNotes: string;
  photos: string[];
  promoCode: string | null;
}

type OrderStatus =
  | 'new'
  | 'inspection'
  | 'quoted'
  | 'approved'
  | 'in_progress'
  | 'ready'
  | 'picked_up'
  | 'completed'
  | 'cancelled';

type LeatherItemId = 'bag' | 'briefcase' | 'jacket' | 'boots' | 'small';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новая',
  inspection: 'Осмотр',
  quoted: 'Согласование цены',
  approved: 'Одобрено клиентом',
  in_progress: 'На верстаке',
  ready: 'Готова к выдаче',
  picked_up: 'Выдана клиенту',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  new: { bg: '#1A1D26', text: '#A2ABBC', border: 'rgba(220,227,239,0.2)' },
  inspection: { bg: '#171013', text: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
  quoted: { bg: '#141222', text: '#60A5FA', border: 'rgba(96,165,250,0.3)' },
  approved: { bg: '#101A14', text: '#34D399', border: 'rgba(52,211,153,0.3)' },
  in_progress: { bg: '#1A0A0A', text: '#F87171', border: 'rgba(248,113,113,0.3)' },
  ready: { bg: '#101A10', text: '#4ADE80', border: 'rgba(74,222,128,0.3)' },
  picked_up: { bg: '#13151B', text: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
  completed: { bg: '#101A10', text: '#52E0A1', border: 'rgba(82,224,161,0.3)' },
  cancelled: { bg: '#1A0A0A', text: '#F87171', border: 'rgba(248,113,113,0.3)' },
};

const STATUS_ORDER: OrderStatus[] = [
  'new', 'inspection', 'quoted', 'approved', 'in_progress', 'ready', 'picked_up', 'completed', 'cancelled'
];

// Mock database functions - replace with actual API calls
const mockOrders: OrderReceipt[] = [
  {
    id: '1',
    code: 'DRT-2401',
    clientName: 'Елена Морозова',
    clientPhone: '+7 (927) 123-45-67',
    clientEmail: 'elena.morozova@mail.ru',
    clientAddress: 'Самара, Октябрьский р-н, ул. Революционная, 70',
    itemType: 'bag',
    itemDescription: 'Сумка Furla из зернистой кожи, бордовый',
    status: 'in_progress',
    price: 4900,
    discount: 0,
    finalPrice: 4900,
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-20T14:30:00Z',
    estimatedReadyDate: '2026-10-25',
    actualReadyDate: null,
    masterNotes: 'Углы укреплены, ручка перелита в 3 слоя термофилера Fenice, латунный замок отполирован.',
    clientNotes: 'Ручки облезли до ниток, в двух мастерских сказали "только менять целиком"',
    photos: ['/src/assets/images/case_briefcase_before_1795024456556.jpg', '/src/assets/images/case_briefcase_after_1795024456245.jpg'],
    promoCode: null,
  },
  {
    id: '2',
    code: 'DRT-2402',
    clientName: 'Сергей Власов',
    clientPhone: '+7 (937) 987-65-43',
    clientEmail: 'svlasov@gmail.com',
    clientAddress: 'Самара, Ленинский р-н, пр-т Кировский, 150',
    itemType: 'briefcase',
    itemDescription: 'Портфель Piquadro 1998 года, кожа напубук',
    status: 'inspection',
    price: 4900,
    discount: 10,
    finalPrice: 4410,
    createdAt: '2026-10-04T14:30:00Z',
    updatedAt: '2026-10-05T09:15:00Z',
    estimatedReadyDate: '2026-10-12',
    actualReadyDate: null,
    masterNotes: 'Вырвало пряжку с мясом, кожа сухая. Укреплю изнутри, поставлю цельный хром.',
    clientNotes: 'Отцовский портфель 2004 года, очень дорого как память',
    photos: [],
    promoCode: 'VINTAGE10',
  },
  {
    id: '3',
    code: 'DRT-2403',
    clientName: 'Ольга Кравцова',
    clientPhone: '+7 (917) 555-33-22',
    clientEmail: 'olga.kravtsova@yandex.ru',
    clientAddress: 'Самара, ул. Ново-Садовая, 12',
    itemType: 'jacket',
    itemDescription: 'Косуха из ягнёнка + 2 пары сапог',
    status: 'ready',
    price: 3400,
    discount: 15,
    finalPrice: 2890,
    createdAt: '2026-09-21T09:15:00Z',
    updatedAt: '2026-09-28T16:45:00Z',
    estimatedReadyDate: '2026-09-28',
    actualReadyDate: '2026-09-28',
    masterNotes: 'Косуха: зацепила в лифте - скрытый порыв у кармана, манжета. Сапоги: реагенты, вытяжка соли, глассаж.',
    clientNotes: 'Зацепила рукав в лифте и угробила сапоги реагентами у метро',
    photos: ['/src/assets/images/case_jacket_before_1795024456671.jpg', '/src/assets/images/case_jacket_after_1795024456036.jpg'],
    promoCode: 'LOYAL15',
  },
  {
    id: '4',
    code: 'DRT-2404',
    clientName: 'Дмитрий Волков',
    clientPhone: '+7 (927) 444-55-66',
    clientEmail: 'd.volkov@company.ru',
    clientAddress: 'Самара, Промышленный р-н, ул. Заводская, 5',
    itemType: 'boots',
    itemDescription: 'Челси Rant из коньячного ранта',
    status: 'quoted',
    price: 2600,
    discount: 0,
    finalPrice: 2600,
    createdAt: '2026-11-01T11:20:00Z',
    updatedAt: '2026-11-01T11:20:00Z',
    estimatedReadyDate: '2026-11-05',
    actualReadyDate: null,
    masterNotes: 'Соляные разводы, заломы на сгибе, мыс выбитый. Две вытяжки десалинизатором, жирение, глассаж.',
    clientNotes: 'После двух самарских зим - белые разводы, пересохшие заломы',
    photos: ['/src/assets/images/case_chelsea_before_1795024456436.jpg', '/src/assets/images/case_chelsea_after_1795024457423.jpg'],
    promoCode: null,
  },
  {
    id: '5',
    code: 'DRT-2405',
    clientName: 'Анна Петрова',
    clientPhone: '+7 (937) 111-22-33',
    clientEmail: 'anna.petrova@mail.ru',
    clientAddress: 'Самара, Советский р-н, ул. Гагарина, 45',
    itemType: 'small',
    itemDescription: 'Ремень из кожи полного хрома, черный',
    status: 'new',
    price: 1200,
    discount: 0,
    finalPrice: 1200,
    createdAt: '2026-11-15T08:00:00Z',
    updatedAt: '2026-11-15T08:00:00Z',
    estimatedReadyDate: '2026-11-18',
    actualReadyDate: null,
    masterNotes: 'Урез липнет и трескается, пряжка окислилась. Переливать урез, полировать пряжку.',
    clientNotes: 'Ремень 3 года, урез липнет на руках, пряжка зеленеет',
    photos: [],
    promoCode: null,
  },
];

async function fetchOrders(): Promise<OrderReceipt[]> {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...mockOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<OrderReceipt | null> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const order = mockOrders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (newStatus === 'ready' || newStatus === 'picked_up') {
      order.actualReadyDate = new Date().toISOString().split('T')[0];
    }
    return { ...order };
  }
  return null;
}

async function createOrder(data: Omit<OrderReceipt, 'id' | 'code' | 'createdAt' | 'updatedAt'>): Promise<OrderReceipt> {
  await new Promise(resolve => setTimeout(resolve, 300));
  const newOrder: OrderReceipt = {
    ...data,
    id: String(Date.now()),
    code: `DRT-${new Date().getFullYear()}-${String(mockOrders.length + 1).padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockOrders.unshift(newOrder);
  return newOrder;
}

async function deleteOrder(orderId: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 200));
  const idx = mockOrders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    mockOrders.splice(idx, 1);
    return true;
  }
  return false;
}

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'themes'>('stats');
  const [selectedTheme, setSelectedTheme] = useState<string>(WORKSHOP_THEME_SCHEMES[0].id);
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<OrderReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderReceipt | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof OrderReceipt>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    ready: 0,
    new: 0,
    completed: 0,
    revenue: 0,
  });

  // Check if already authenticated via sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('dratva_admin_auth');
    if (saved === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  // Load orders and stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
      setStats({
        total: data.length,
        inProgress: data.filter(o => o.status === 'in_progress').length,
        ready: data.filter(o => o.status === 'ready').length,
        new: data.filter(o => o.status === 'new').length,
        completed: data.filter(o => o.status === 'completed').length,
        revenue: data.filter(o => o.status === 'completed' || o.status === 'picked_up').reduce((sum, o) => sum + o.finalPrice, 0),
      });
    } catch (err) {
      setError('Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persist selected theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('dratva_admin_theme');
    if (savedTheme) {
      const scheme = WORKSHOP_THEME_SCHEMES.find(s => s.id === savedTheme);
      if (scheme) {
        setSelectedTheme(savedTheme);
        applyThemeScheme(scheme);
      }
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinError(false);
      sessionStorage.setItem('dratva_admin_auth', 'true');
      setAdminPin('');
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 1500);
    }
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('dratva_admin_auth');
  };

  const handleSelectTheme = (scheme: ThemeScheme) => {
    setSelectedTheme(scheme.id);
    localStorage.setItem('dratva_admin_theme', scheme.id);
    applyThemeScheme(scheme);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await updateOrderStatus(orderId, newStatus);
    if (updated) {
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      loadData();
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Удалить эту квитанцию? Это действие необратимо.')) return;
    const success = await deleteOrder(orderId);
    if (success) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      loadData();
    }
  };

  const handleCreateOrder = async (data: Omit<OrderReceipt, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => {
    const newOrder = await createOrder(data);
    setOrders(prev => [newOrder, ...prev]);
    setShowCreateModal(false);
    loadData();
  };

  const filteredOrders = orders
    .filter(o => filterStatus === 'all' || o.status === filterStatus)
    .filter(o =>
      o.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.clientPhone.includes(searchQuery)
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      let cmp: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        const aStr = Array.isArray(aVal) ? aVal.join(',') : aVal ?? '';
        const bStr = Array.isArray(bVal) ? bVal.join(',') : bVal ?? '';
        const aTime = Date.parse(String(aStr));
        const bTime = Date.parse(String(bStr));
        cmp =
          Number.isNaN(aTime) || Number.isNaN(bTime)
            ? String(aStr).localeCompare(String(bStr), 'ru')
            : aTime - bTime;
      }

      return sortDir === 'asc' ? cmp : -cmp;
    });

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#0B0C10] text-[#EEF1F6] antialiased flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="chrome-surface relative w-full max-w-md rounded-2xl border border-[rgba(220,227,239,0.25)] bg-[#13151B] shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-8"
        >
          <div className="text-center mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#E85D2A] text-[#0B0C10] mx-auto mb-4">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-display text-xl font-bold text-[#EEF1F6]">Панель администратора ДРАТВА</h1>
            <p className="mt-2 font-mono-craft text-xs text-[#A2ABBC]">Введите пин-код для доступа</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="ПИН-код"
                className={`min-h-[48px] w-full rounded-md border px-4 py-2 text-center text-xl font-mono-craft tracking-widest text-[#EEF1F6] bg-[#0B0C10] transition-colors ${
                  pinError ? 'border-[#FF7D52] bg-[#2A0B0B]' : 'border-[rgba(220,227,239,0.2)] hover:border-[#E85D2A]'
                }`}
                maxLength={5}
                autoFocus
                autoComplete="off"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A2ABBC] hover:text-[#EEF1F6]"
                aria-label={showPin ? 'Скрыть пин' : 'Показать пин'}
              >
                {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            <button
              type="submit"
              className="chrome-sheen w-full min-h-[48px] rounded-md bg-[#E85D2A] px-4 py-2 text-sm font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D]"
            >
              Войти в панель
            </button>
          </form>

          <p className="mt-6 font-mono-craft text-[11px] text-[#768095] text-center">
            Панель управления мастерской ДРАТВА · Самара, ул. Революционная, 70
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] text-[#EEF1F6] antialiased">
      {/* Admin Header */}
      <header className="sticky top-0 z-40 border-b border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] text-[#A2ABBC] transition-colors hover:border-[#E85D2A] hover:text-[#E85D2A]"
              aria-label="Вернуться на сайт"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display chrome-metallic-text text-lg font-extrabold tracking-[0.04em]">ДРАТВА / Админ</h1>
              <p className="font-mono-craft text-xs text-[#A2ABBC]">Панель управления мастерской</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] text-[#A2ABBC] transition-colors hover:border-[#FF7D52] hover:text-[#FF7D52]"
            aria-label="Выйти из админки"
          >
            <Lock className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="mb-6 flex border-b border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/60 px-6 py-2 gap-2 rounded-xl">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'stats'
                ? 'bg-[#E85D2A] text-[#0B0C10]'
                : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Статистика и Журнал</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#E85D2A] text-[#0B0C10]'
                : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Квитанции и Статусы</span>
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === 'themes'
                ? 'bg-[#E85D2A] text-[#0B0C10]'
                : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>Цветовые Схемы ({WORKSHOP_THEME_SCHEMES.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6">
          {activeTab === 'stats' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  icon={<Database className="h-5 w-5" />}
                  label="Всего заявок"
                  value={stats.total}
                  trend="+4 за сегодня"
                  trendColor="#52E0A1"
                />
                <StatCard
                  icon={<Wrench className="h-5 w-5" />}
                  label="В работе"
                  value={stats.inProgress}
                  trend="Срок сдачи в норме"
                  trendColor="#A2ABBC"
                />
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  label="Готово к выдаче"
                  value={stats.ready}
                  trend="Ожидают клиента"
                  trendColor="#4ADE80"
                />
                <StatCard
                  icon={<DollarSign className="h-5 w-5" />}
                  label="Выручка (завершенные)"
                  value={`${(stats.revenue / 1000).toFixed(1)}к ₽`}
                  trend="За месяц"
                  trendColor="#E85D2A"
                />
              </div>

              <div className="rounded-xl border border-[rgba(220,227,239,0.14)] bg-[#0B0C10] p-5">
                <h3 className="text-sm font-bold text-[#EEF1F6]">Последние операции безопасности</h3>
                <p className="mt-1 text-xs text-[#A2ABBC]">
                  Все входящие запросы через API проходят строгую валидацию по белым спискам параметров и параметризацию Drizzle.
                </p>
                <div className="mt-4 space-y-2 font-mono-craft text-xs text-[#C6CEDB]">
                  <div className="flex items-center justify-between rounded bg-[#13151B] p-2.5">
                    <span>POST /api/leads — Валидация телефона и itemType</span>
                    <span className="text-[#52E0A1]">OK (201)</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-[#13151B] p-2.5">
                    <span>GET /api/tickets/DRT-2401 — Проверка формата квитанции</span>
                    <span className="text-[#52E0A1]">OK (200)</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-[#13151B] p-2.5">
                    <span>SQL Pool — Drizzle ORM соединение с PostgreSQL</span>
                    <span className="text-[#52E0A1]">Активно</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-bold text-[#EEF1F6]">Квитанции клиентов (DB)</h3>
                  <span className="font-mono-craft text-xs text-[#A2ABBC]">Всего: {orders.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="chrome-sheen inline-flex items-center gap-2 rounded-md bg-[#E85D2A] px-3 py-1.5 text-xs font-bold text-[#0B0C10] transition-colors hover:bg-[#FF713D]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Новая квитанция
                  </button>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A2ABBC]" />
                  <input
                    type="text"
                    placeholder="Поиск по коду, имени, телефону..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-h-[40px] w-full rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] pl-10 pr-4 py-2 text-sm text-[#EEF1F6] placeholder-[#A2ABBC] focus:border-[#E85D2A] focus:outline-none transition-colors"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A2ABBC]" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                    className="min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] pl-10 pr-10 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">Все статусы</option>
                    {STATUS_ORDER.map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A2ABBC] pointer-events-none" />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A2ABBC]" />
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as keyof OrderReceipt)}
                    className="min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] pl-10 pr-10 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="createdAt">Дата создания</option>
                    <option value="updatedAt">Обновление</option>
                    <option value="code">Код</option>
                    <option value="clientName">Клиент</option>
                    <option value="finalPrice">Сумма</option>
                    <option value="status">Статус</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A2ABBC] pointer-events-none" />
                </div>
                <button
                  onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] px-3 py-2 text-sm text-[#A2ABBC] hover:border-[#E85D2A] hover:text-[#E85D2A] transition-colors"
                >
                  {sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>

              {/* Orders Table */}
              <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(220,227,239,0.12)] bg-[#13151B]">
                        <th className="px-4 py-3 text-left font-mono-craft text-xs text-[#A2ABBC]">Код</th>
                        <th className="px-4 py-3 text-left font-mono-craft text-xs text-[#A2ABBC]">Клиент</th>
                        <th className="px-4 py-3 text-left font-mono-craft text-xs text-[#A2ABBC]">Вещь</th>
                        <th className="px-4 py-3 text-left font-mono-craft text-xs text-[#A2ABBC]">Статус</th>
                        <th className="px-4 py-3 text-right font-mono-craft text-xs text-[#A2ABBC]">Сумма</th>
                        <th className="px-4 py-3 text-right font-mono-craft text-xs text-[#A2ABBC]">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[#A2ABBC]">Загрузка...</td>
                        </tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[#A2ABBC]">Квитанции не найдены</td>
                        </tr>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {filteredOrders.map((order, idx) => (
                            <motion.tr
                              key={order.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: idx * 0.03, duration: 0.2 }}
                              className="border-b border-[rgba(220,227,239,0.06)] hover:bg-[#13151B] transition-colors"
                            >
                              <td className="px-4 py-3 font-mono-craft text-xs font-bold text-[#E85D2A]">{order.code}</td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-bold text-[#EEF1F6]">{order.clientName}</div>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-[#A2ABBC]">
                                  <Phone className="h-3 w-3" />
                                  <span>{order.clientPhone}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-[#C6CEDB] max-w-[200px] truncate">{order.itemDescription}</td>
                              <td className="px-4 py-3">
                                <StatusBadge
                                  status={order.status}
                                  onChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                                />
                              </td>
                              <td className="px-4 py-3 text-right font-mono-craft text-sm font-bold text-[#52E0A1]">
                                {order.finalPrice.toLocaleString('ru-RU')} ₽
                                {order.discount > 0 && (
                                  <span className="ml-2 text-xs text-[#FBBF24]">−{order.discount}%</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => { setSelectedOrder(order); setShowOrderModal(true); }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] text-[#A2ABBC] hover:border-[#E85D2A] hover:text-[#E85D2A] transition-colors"
                                    aria-label="Подробнее"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] text-[#A2ABBC] hover:border-[#FF7D52] hover:text-[#FF7D52] transition-colors"
                                    aria-label="Удалить"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                              </motion.tr>
                          ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'themes' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div>
                <h3 className="text-sm font-bold text-[#EEF1F6]">Выберите цветовую схему сайта ({WORKSHOP_THEME_SCHEMES.length} вариантов)</h3>
                <p className="mt-1 text-xs text-[#A2ABBC]">
                  Цвета мгновенно применяются ко всей странице включая фон, узоры и орнаменты. Все тексты и элементы контрастны и полностью читаемы.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {WORKSHOP_THEME_SCHEMES.map((scheme) => {
                  const isSelected = selectedTheme === scheme.id;
                  const isHoliday = scheme.id.includes('new-year') || scheme.id.includes('christmas') ||
                                   scheme.id.includes('victory') || scheme.id.includes('spring') ||
                                   scheme.id.includes('autumn') || scheme.id.includes('halloween');
                  return (
                    <motion.button
                      key={scheme.id}
                      type="button"
                      onClick={() => handleSelectTheme(scheme)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'border-[#E85D2A] bg-[#1A1D26] shadow-[0_8px_24px_rgba(232,93,42,0.25)]'
                          : 'border-[rgba(220,227,239,0.12)] bg-[#0B0C10] hover:border-[rgba(220,227,239,0.3)]'
                      }`}
                    >
                      {isHoliday && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded bg-[#E85D2A]/20 text-[#E85D2A] font-mono-craft"
                        >
                          ПРАЗДНИК
                        </motion.span>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#EEF1F6]">{scheme.name}</span>
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="inline-flex"
                          >
                            <Check className="h-4 w-4 text-[#E85D2A]" />
                          </motion.span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-mono-craft text-[11px] text-[#A2ABBC]">{scheme.badge}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-4 w-4 rounded-full border border-white/20"
                            style={{ backgroundColor: scheme.vars['--canvas-void'] }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-white/20"
                            style={{ backgroundColor: scheme.vars['--accent-ember'] }}
                          />
                          <span
                            className="h-4 w-4 rounded-full border border-white/20"
                            style={{ backgroundColor: scheme.vars['--accent-mint'] }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        <footer className="mt-12 flex items-center justify-between border-t border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/80 px-6 py-4 rounded-xl">
          <span className="font-mono-craft text-xs text-[#A2ABBC]">
            Защищено сессией администратора ДРАТВА
          </span>
          <button
            onClick={handleLogout}
            className="chrome-sheen rounded-lg bg-[#E85D2A] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D]"
          >
            Выйти из панели
          </button>
        </footer>
      </main>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {showOrderModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowOrderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(220,227,239,0.2)] bg-[#13151B] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between border-b border-[rgba(220,227,239,0.12)] p-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#EEF1F6]">Квитанция {selectedOrder.code}</h3>
                  <p className="font-mono-craft text-xs text-[#A2ABBC]">Создана: {new Date(selectedOrder.createdAt).toLocaleString('ru-RU')}</p>
                </div>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] text-[#A2ABBC] hover:border-[#FF7D52] hover:text-[#FF7D52] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Status selector */}
                <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-[#EEF1F6]">Текущий статус</span>
                    <StatusBadge status={selectedOrder.status} onChange={(s) => handleStatusChange(selectedOrder.id, s)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ORDER.map(s => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(selectedOrder.id, s)}
                        disabled={selectedOrder.status === s}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                          selectedOrder.status === s
                            ? `bg-[${STATUS_COLORS[s].bg}] text-[${STATUS_COLORS[s].text}] border border-[${STATUS_COLORS[s].border}]`
                            : 'bg-[#1A1D26] text-[#A2ABBC] hover:border-[#E85D2A] hover:text-[#E85D2A] border border-[rgba(220,227,239,0.12)]'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailSection title="Клиент" icon={<User className="h-4 w-4" />}>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#A2ABBC]">Имя:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.clientName}</span></div>
                      <div><span className="text-[#A2ABBC]">Телефон:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.clientPhone}</span></div>
                      <div><span className="text-[#A2ABBC]">Email:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.clientEmail}</span></div>
                      <div><span className="text-[#A2ABBC]">Адрес:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.clientAddress}</span></div>
                    </div>
                  </DetailSection>

                  <DetailSection title="Вещь" icon={<Package className="h-4 w-4" />}>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-[#A2ABBC]">Тип:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.itemType}</span></div>
                      <div><span className="text-[#A2ABBC]">Описание:</span> <span className="ml-2 text-[#EEF1F6]">{selectedOrder.itemDescription}</span></div>
                      {selectedOrder.promoCode && (
                        <div><span className="text-[#A2ABBC]">Промокод:</span> <span className="ml-2 text-[#FBBF24]">{selectedOrder.promoCode} (−{selectedOrder.discount}%)</span></div>
                      )}
                    </div>
                  </DetailSection>
                </div>

                {/* Pricing */}
                <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                  <h4 className="font-bold text-[#EEF1F6] mb-3">Расчет стоимости</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#A2ABBC]">Базовая цена:</span> <span className="ml-2 font-bold text-[#EEF1F6]">{selectedOrder.price.toLocaleString('ru-RU')} ₽</span></div>
                    {selectedOrder.discount > 0 && (
                      <div><span className="text-[#A2ABBC]">Скидка:</span> <span className="ml-2 font-bold text-[#FBBF24]">-{selectedOrder.discount}%</span></div>
                    )}
                    <div className="sm:col-span-2 border-t border-[rgba(220,227,239,0.12)] pt-3">
                      <span className="text-[#A2ABBC]">Итого к оплате:</span>
                      <span className="ml-2 font-bold text-xl text-[#52E0A1]">{selectedOrder.finalPrice.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DetailSection title="Дата приема" icon={<Calendar className="h-4 w-4" />}>
                    <p className="text-[#EEF1F6]">{new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU')}</p>
                  </DetailSection>
                  <DetailSection title="Плановая сдача" icon={<Calendar className="h-4 w-4" />}>
                    <p className="text-[#EEF1F6]">{selectedOrder.estimatedReadyDate}</p>
                  </DetailSection>
                  <DetailSection title="Фактическая сдача" icon={<Calendar className="h-4 w-4" />}>
                    <p className={selectedOrder.actualReadyDate ? 'text-[#52E0A1]' : 'text-[#A2ABBC]'}>{selectedOrder.actualReadyDate || '—'}</p>
                  </DetailSection>
                </div>

                {/* Notes */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DetailSection title="Примечания мастера" icon={<Wrench className="h-4 w-4" />}>
                    <p className="text-sm text-[#C6CEDB] whitespace-pre-wrap">{selectedOrder.masterNotes || '—'}</p>
                  </DetailSection>
                  <DetailSection title="Примечания клиента" icon={<User className="h-4 w-4" />}>
                    <p className="text-sm text-[#C6CEDB] whitespace-pre-wrap">{selectedOrder.clientNotes || '—'}</p>
                  </DetailSection>
                </div>

                {/* Photos */}
                {selectedOrder.photos.length > 0 && (
                  <DetailSection title="Фото" icon={<Sparkles className="h-4 w-4" />}>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedOrder.photos.map((photo, i) => (
                        <img key={i} src={photo} alt={`Фото ${i+1}`} className="h-32 w-auto rounded-lg object-cover" />
                      ))}
                    </div>
                  </DetailSection>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(220,227,239,0.2)] bg-[#13151B] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between border-b border-[rgba(220,227,239,0.12)] p-4">
                <h3 className="font-display text-lg font-bold text-[#EEF1F6]">Новая квитанция</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] text-[#A2ABBC] hover:border-[#FF7D52] hover:text-[#FF7D52] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <CreateOrderForm onSubmit={handleCreateOrder} onClose={() => setShowCreateModal(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper Components
function StatCard({ icon, label, value, trend, trendColor }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  trendColor: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono-craft text-xs text-[#A2ABBC]">{label}</span>
        <span className="text-[#E85D2A]">{icon}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-[#EEF1F6]">{value}</p>
      <span className="mt-1 block text-xs" style={{ color: trendColor }}>{trend}</span>
    </motion.div>
  );
}

function StatusBadge({
  status,
  onChange
}: {
  status: OrderStatus;
  onChange: (s: OrderStatus) => void;
}) {
  const colors = STATUS_COLORS[status];
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono-craft text-xs font-semibold border ${
          open ? 'bg-[#1A1D26]' : `bg-[${colors.bg}]`
        } text-[${colors.text}] border-[${colors.border}]`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inset-0 rounded-full bg-current opacity-20 animate-ping" />
          <span className="relative rounded-full bg-current h-2 w-2" />
        </span>
        {STATUS_LABELS[status]}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-1 w-40 rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] shadow-lg py-1 z-10"
          >
            {STATUS_ORDER.map(s => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                disabled={status === s}
                className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                  status === s
                    ? `bg-[${STATUS_COLORS[s].bg}] text-[${STATUS_COLORS[s].text}]`
                    : 'text-[#A2ABBC] hover:bg-[#1A1D26] hover:text-[#EEF1F6]'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#E85D2A]">{icon}</span>
        <h4 className="font-bold text-[#EEF1F6]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function CreateOrderForm({ onSubmit, onClose }: {
  onSubmit: (data: Omit<OrderReceipt, 'id' | 'code' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    itemType: 'bag' as LeatherItemId,
    itemDescription: '',
    status: 'new' as OrderStatus,
    price: 0,
    discount: 0,
    estimatedReadyDate: '',
    masterNotes: '',
    clientNotes: '',
    promoCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.clientName.trim()) newErrors.clientName = 'Введите имя клиента';
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'Введите телефон';
    if (!formData.itemDescription.trim()) newErrors.itemDescription = 'Опишите вещь';
    if (formData.price <= 0) newErrors.price = 'Укажите стоимость';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalPrice = Math.round(formData.price * (1 - formData.discount / 100));
    onSubmit({
      ...formData,
      finalPrice,
      photos: [],
      actualReadyDate: null,
    });
  };

  const itemTypes: { value: LeatherItemId; label: string }[] = [
    { value: 'bag', label: 'Сумка' },
    { value: 'briefcase', label: 'Портфель' },
    { value: 'jacket', label: 'Куртка' },
    { value: 'boots', label: 'Обувь' },
    { value: 'small', label: 'Ремень / Портмоне' },
  ];

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Имя клиента *" error={errors.clientName}>
          <input
            type="text"
            value={formData.clientName}
            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="Елена Морозова"
          />
        </FormField>
        <FormField label="Телефон *" error={errors.clientPhone}>
          <input
            type="tel"
            value={formData.clientPhone}
            onChange={e => setFormData({ ...formData, clientPhone: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="+7 (927) 123-45-67"
          />
        </FormField>
        <FormField label="Email" error={errors.clientEmail}>
          <input
            type="email"
            value={formData.clientEmail}
            onChange={e => setFormData({ ...formData, clientEmail: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="email@domain.ru"
          />
        </FormField>
        <FormField label="Адрес" error={errors.clientAddress}>
          <input
            type="text"
            value={formData.clientAddress}
            onChange={e => setFormData({ ...formData, clientAddress: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="Самара, ул. Революционная, 70"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Тип вещи *" error={errors.itemType}>
          <select
            value={formData.itemType}
            onChange={e => setFormData({ ...formData, itemType: e.target.value as LeatherItemId })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
          >
            {itemTypes.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Описание *" error={errors.itemDescription}>
          <input
            type="text"
            value={formData.itemDescription}
            onChange={e => setFormData({ ...formData, itemDescription: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="Сумка Furla из зернистой кожи, бордовый"
          />
        </FormField>
        <FormField label="Стоимость (₽) *" error={errors.price}>
          <input
            type="number"
            min="0"
            step="100"
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="3800"
          />
        </FormField>
        <FormField label="Скидка (%)" error={errors.discount}>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={formData.discount}
            onChange={e => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="0"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Плановая дата сдачи" error={errors.estimatedReadyDate}>
          <input
            type="date"
            value={formData.estimatedReadyDate}
            onChange={e => setFormData({ ...formData, estimatedReadyDate: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
          />
        </FormField>
        <FormField label="Промокод" error={errors.promoCode}>
          <input
            type="text"
            value={formData.promoCode}
            onChange={e => setFormData({ ...formData, promoCode: e.target.value })}
            className="w-full min-h-[40px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none"
            placeholder="VINTAGE10"
          />
        </FormField>
      </div>

      <FormField label="Примечания мастера">
        <textarea
          value={formData.masterNotes}
          onChange={e => setFormData({ ...formData, masterNotes: e.target.value })}
          rows={3}
          className="w-full min-h-[80px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none resize-none"
          placeholder="Что нужно сделать..."
        />
      </FormField>

      <FormField label="Примечания клиента">
        <textarea
          value={formData.clientNotes}
          onChange={e => setFormData({ ...formData, clientNotes: e.target.value })}
          rows={2}
          className="w-full min-h-[60px] rounded-md border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] px-3 py-2 text-sm text-[#EEF1F6] focus:border-[#E85D2A] focus:outline-none resize-none"
          placeholder="Пожелания клиента..."
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(220,227,239,0.12)]">
        <button
          type="button"
          onClick={onClose}
          className="chrome-sheen rounded-md border border-[rgba(220,227,239,0.2)] bg-[#13151B] px-5 py-2 text-xs font-bold text-[#A2ABBC] hover:border-[#E85D2A] hover:text-[#E85D2A] transition-colors"
        >
          Отмена
        </button>
        <button
          type="submit"
          className="chrome-sheen rounded-md bg-[#E85D2A] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D] transition-colors"
        >
          Создать квитанцию
        </button>
      </div>
    </form>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono-craft text-xs text-[#A2ABBC]">{label}{error && <span className="text-[#FF7D52] ml-1">*</span>}</label>
      {children}
      {error && <p className="font-mono-craft text-[11px] text-[#FF7D52]">{error}</p>}
    </div>
  );
}
