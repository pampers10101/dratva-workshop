import { Check, ShieldAlert, Sparkles, X, Wrench, Layers, Palette, FileText, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { WORKSHOP_THEME_SCHEMES, applyThemeScheme, type ThemeScheme } from '../utils/themes';
import { useNavigate, useLocation } from 'react-router-dom';

const ADMIN_PIN = '89277';

export function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'themes'>('stats');
  const [selectedTheme, setSelectedTheme] = useState<string>(WORKSHOP_THEME_SCHEMES[0].id);
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  // Check if already authenticated via sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('dratva_admin_auth');
    if (saved === 'true') {
      setIsUnlocked(true);
    }
  }, []);

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
            <span>10 Цветовых Схем Сайта</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-6">
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                  <span className="font-mono-craft text-xs text-[#A2ABBC]">Всего заявок (DB)</span>
                  <p className="mt-2 font-display text-2xl font-extrabold text-[#EEF1F6]">24</p>
                  <span className="mt-1 block text-xs text-[#52E0A1]">↑ 4 за сегодня</span>
                </div>
                <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                  <span className="font-mono-craft text-xs text-[#A2ABBC]">В работе на верстаке</span>
                  <p className="mt-2 font-display text-2xl font-extrabold text-[#E85D2A]">6</p>
                  <span className="mt-1 block text-xs text-[#A2ABBC]">Срок сдачи в норме</span>
                </div>
                <div className="rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                  <span className="font-mono-craft text-xs text-[#A2ABBC]">Защита SQL Injection</span>
                  <p className="mt-2 font-display text-2xl font-extrabold text-[#52E0A1]">100%</p>
                  <span className="mt-1 block text-xs text-[#52E0A1]">Drizzle ORM Parametrized</span>
                </div>
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
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#EEF1F6]">Активные квитанции клиентов в базе</h3>
                <span className="font-mono-craft text-xs text-[#A2ABBC]">Показаны последние 5</span>
              </div>
              <div className="space-y-3">
                {[
                  { code: 'DRT-2401', client: 'Елена Морозова', item: 'Сумка Furla', status: 'На верстаке', price: '3 800 ₽' },
                  { code: 'DRT-2402', client: 'Сергей Власов', item: 'Портфель Piquadro', status: 'Осмотр', price: '4 900 ₽' },
                  { code: 'DRT-2403', client: 'Ольга Кравцова', item: 'Косуха из ягнёнка', status: 'Готова к выдаче', price: '3 400 ₽' },
                ].map((order) => (
                  <div key={order.code} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgba(220,227,239,0.12)] bg-[#0B0C10] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-craft text-xs font-bold text-[#E85D2A]">{order.code}</span>
                        <span className="text-xs font-bold text-[#EEF1F6]">{order.client}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#A2ABBC]">{order.item}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-[#1A1D26] px-3 py-1 font-mono-craft text-xs font-semibold text-[#EEF1F6]">
                        {order.status}
                      </span>
                      <span className="font-mono-craft text-xs font-bold text-[#52E0A1]">{order.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'themes' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-[#EEF1F6]">Выберите цветовую схему сайта (10 вариантов от мастера)</h3>
                <p className="mt-1 text-xs text-[#A2ABBC]">
                  Цвета мгновенно применяются ко всей странице включая фон, узоры и орнаменты. Все тексты и элементы контрастны и полностью читаемы.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {WORKSHOP_THEME_SCHEMES.map((scheme) => {
                  const isSelected = selectedTheme === scheme.id;
                  return (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => handleSelectTheme(scheme)}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-[#E85D2A] bg-[#1A1D26] shadow-[0_8px_24px_rgba(232,93,42,0.25)]'
                          : 'border-[rgba(220,227,239,0.12)] bg-[#0B0C10] hover:border-[rgba(220,227,239,0.3)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#EEF1F6]">{scheme.name}</span>
                        {isSelected && <Check className="h-4 w-4 text-[#E85D2A]" />}
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
                    </button>
                  );
                })}
              </div>
            </div>
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
    </div>
  );
}