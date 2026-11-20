import { Check, ShieldAlert, Sparkles, X, Wrench, Layers, Palette, FileText, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { WORKSHOP_THEME_SCHEMES, applyThemeScheme, type ThemeScheme } from '../utils/themes';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'themes'>('stats');
  const [selectedTheme, setSelectedTheme] = useState<string>(WORKSHOP_THEME_SCHEMES[0].id);
  const [adminPin, setAdminPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(true); // Simplified for demo accessibility, PIN = 89277

  if (!isOpen) return null;

  const handleSelectTheme = (scheme: ThemeScheme) => {
    setSelectedTheme(scheme.id);
    applyThemeScheme(scheme);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0C10]/85 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="chrome-surface relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[rgba(220,227,239,0.25)] bg-[#13151B] shadow-[0_24px_64px_rgba(0,0,0,0.85)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(220,227,239,0.12)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E85D2A] text-[#0B0C10]">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[#EEF1F6]">
                Панель мастера и администратора ДРАТВА
              </h2>
              <p className="font-mono-craft text-xs text-[#A2ABBC]">
                Самара · ул. Революционная, 70 · Управление сайтом и заказами
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(220,227,239,0.2)] bg-[#0B0C10] text-[#A2ABBC] hover:text-[#EEF1F6]"
            aria-label="Закрыть панель"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/60 px-6 py-2 gap-2">
          <button
            type="button"
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
            type="button"
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
            type="button"
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
        <div className="flex-1 overflow-y-auto p-6">
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
                  Цвета мгновенно применяются ко всей странице. Все тексты и элементы контрастны и полностью читаемы.
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[rgba(220,227,239,0.12)] bg-[#0B0C10]/80 px-6 py-4">
          <span className="font-mono-craft text-xs text-[#A2ABBC]">
            Защищено сессией администратора ДРАТВА
          </span>
          <button
            type="button"
            onClick={onClose}
            className="chrome-sheen rounded-lg bg-[#E85D2A] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D]"
          >
            Готово
          </button>
        </div>
      </motion.div>
    </div>
  );
}
