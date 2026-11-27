import { AlertTriangle, CheckCircle2, HelpCircle, Plus, RotateCcw, ShieldCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { CRAFT_QUIZ_QUESTIONS, LEATHER_EMERGENCIES } from '../data/workshop';
import type { LeatherItemId, RepairOperationId } from '../utils/estimator';
import { usePrefersReducedMotion } from '../hooks/useWorkshopMotion';

export type CraftLoungeTab = 'emergency' | 'quiz';

interface CraftLoungeSectionProps {
  activeTab: CraftLoungeTab;
  onTabChange: (tab: CraftLoungeTab) => void;
  onAddEmergencyRepair: (label: string, item: LeatherItemId, repair: RepairOperationId) => void;
}

export function CraftLoungeSection({
  activeTab,
  onTabChange,
  onAddEmergencyRepair,
}: CraftLoungeSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedEmergencyId, setSelectedEmergencyId] = useState<string>(LEATHER_EMERGENCIES[0].id);
  const sectionRef = useRef<HTMLElement>(null);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [showSummary, setShowSummary] = useState(false);

  const activeEmergency =
    LEATHER_EMERGENCIES.find((entry) => entry.id === selectedEmergencyId) ?? LEATHER_EMERGENCIES[0];

  const currentQuestion = CRAFT_QUIZ_QUESTIONS[quizIndex];
  const answeredCount = Object.keys(answers).length;
  const quizFinished = answeredCount >= CRAFT_QUIZ_QUESTIONS.length;
  const currentChoice = currentQuestion ? answers[currentQuestion.id] : undefined;
  const currentAnswered = typeof currentChoice === 'boolean';
  const isLastQuestion = quizIndex === CRAFT_QUIZ_QUESTIONS.length - 1;

  const correctCount = CRAFT_QUIZ_QUESTIONS.reduce((acc, q) => {
    return answers[q.id] === q.isTrue ? acc + 1 : acc;
  }, 0);

  const handleAnswer = (choice: boolean) => {
    if (!currentQuestion || currentAnswered) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: choice }));
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      setShowSummary(true);
    } else {
      setQuizIndex((prev) => prev + 1);
    }
  };

  const handleResetQuiz = () => {
    setAnswers({});
    setQuizIndex(0);
    setShowSummary(false);
  };

  const quizRankTitle =
    correctCount === 5
      ? 'Глаз-алмаз · Знаток верстака'
      : correctCount >= 4
      ? 'Опытный владелец кожи'
      : correctCount >= 3
      ? 'Уверенная база ухода'
      : 'Полезная разминка перед ремонтом';

  return (
    <section
      id="craft-lounge"
      className="workshop-atelier-dark seam-divider"
      style={{ overflowAnchor: 'none' }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24" style={{ overflowAnchor: 'none' }}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="font-mono-craft text-xs font-medium text-[#A2ABBC]">
              Уголок верстака · Полезное и интерактив
            </p>
            <h2
              className="font-display mt-2.5 text-[clamp(1.65rem,2.9vw,2.55rem)] font-bold leading-[1.12] text-[#EEF1F6]"
              style={{ textWrap: 'balance' }}
            >
              Пока кожа сохнет: шпаргалка при ЧП и тест мастера
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#A2ABBC]">
              Можно почитать до визита или полистать, пока я оцениваю вашу заявку. Короткие советы
              без воды — что спасает вещь дома, а что убивает кожу навсегда.
            </p>
          </div>

          {/* Segmented Mode Switch */}
          <div
            role="tablist"
            aria-label="Разделы уголка мастера"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-[rgba(220,227,239,0.16)] bg-[#13151B] p-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'emergency'}
              onClick={() => onTabChange('emergency')}
              className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === 'emergency'
                  ? 'bg-[#EEF1F6] text-[#0B0C10]'
                  : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
              }`}
            >
              Скорая помощь коже
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'quiz'}
              onClick={() => onTabChange('quiz')}
              className={`min-h-[42px] rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
                activeTab === 'quiz'
                  ? 'bg-[#EEF1F6] text-[#0B0C10]'
                  : 'text-[#A2ABBC] hover:text-[#EEF1F6]'
              }`}
            >
              Тест: миф или правда?
            </button>
          </div>
        </div>

        <div className="mt-8">
          {activeTab === 'emergency' ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
              {/* Left: Incident Selector Buttons */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
                <AnimatePresence mode="popLayout">
                {LEATHER_EMERGENCIES.map((item, index) => {
                  const selected = item.id === activeEmergency.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedEmergencyId(item.id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : index * 0.05 }}
                      layout
                      className={`flex min-h-[54px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                        selected
                          ? 'border-[#E85D2A] bg-[#191D26] text-[#EEF1F6] shadow-[0_10px_28px_rgba(0,0,0,0.35)]'
                          : 'border-[rgba(220,227,239,0.12)] bg-[#13151B] text-[#C6CEDB] hover:border-[rgba(220,227,239,0.32)] hover:text-[#EEF1F6]'
                      }`}
                      whileHover={!prefersReducedMotion && !selected ? { scale: 1.01, y: -2 } : undefined}
                      whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                    >
                      <div>
                        <span className="block text-sm font-bold">{item.label}</span>
                        <span className="mt-0.5 block font-mono-craft text-[11px] text-[#A2ABBC]">
                          {item.urgency}
                        </span>
                      </div>
                      <motion.span
                        layoutId={selected ? 'emergency-tag' : undefined}
                        className={`font-mono-craft text-[11px] font-semibold ${
                          selected ? 'text-[#E85D2A]' : 'text-[#768095]'
                        }`}
                        animate={selected ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                      >
                        {item.shortTag}
                      </motion.span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
              </div>

              {/* Right: Instant First-Aid Triage Card */}
              <div className="chrome-surface rounded-xl p-6 lg:col-span-8" style={{ overflowAnchor: 'none' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeEmergency.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflowAnchor: 'none' }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[rgba(220,227,239,0.12)] pb-4">
                      <h3 className="font-display text-lg font-bold text-[#EEF1F6]">
                        {activeEmergency.label}
                      </h3>
                      <span className="font-mono-craft text-xs font-semibold text-[#E85D2A]">
                        {activeEmergency.urgency}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                      {/* Safe Immediate Steps */}
                      <div className="rounded-lg border border-[#52E0A1]/25 bg-[#0B0C10]/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#52E0A1]">
                          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Сделайте за 5 минут</span>
                        </div>
                        <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#DCE3EF]">
                          {activeEmergency.doNow.map((step, i) => (
                            <li key={step} className="flex gap-2">
                              <span className="font-mono-craft font-bold text-[#52E0A1]">
                                0{i + 1}.
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Strict Don'ts */}
                      <div className="rounded-lg border border-[#E85D2A]/30 bg-[#0B0C10]/85 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#E85D2A]">
                          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Чего делать нельзя</span>
                        </div>
                        <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-[#DCE3EF]">
                          {activeEmergency.neverDo.map((warning) => (
                            <li key={warning} className="flex gap-2">
                              <span className="font-mono-craft font-bold text-[#E85D2A]">×</span>
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(220,227,239,0.12)] pt-4">
                      <p className="max-w-lg text-xs leading-relaxed text-[#A2ABBC]">
                        <strong className="text-[#EEF1F6]">Вердикт Алексея: </strong>
                        {activeEmergency.masterVerdict}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          onAddEmergencyRepair(
                            activeEmergency.label,
                            activeEmergency.recommendedItem,
                            activeEmergency.recommendedRepair
                          )
                        }
                        className="chrome-sheen inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.24)] bg-[#0B0C10] px-4 py-2 text-xs font-bold text-[#EEF1F6] transition-colors hover:border-[#E85D2A] hover:bg-[#E85D2A] hover:text-[#0B0C10] whitespace-nowrap shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        Добавить ремонт в перечень
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          ) : (
            /* Tab 2: 5-Question Interactive Craft Quiz («Миф или правда мастера») */
            <AnimatePresence mode="wait">
              <motion.div
                key={showSummary ? 'summary' : 'quiz'}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                className="chrome-surface mx-auto max-w-3xl rounded-xl p-6 sm:p-8"
              >
                {!showSummary ? (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 font-mono-craft text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#E85D2A]">
                      <HelpCircle className="h-4 w-4" aria-hidden="true" />
                      ВОПРОС {quizIndex + 1} ИЗ {CRAFT_QUIZ_QUESTIONS.length}
                    </span>
                    <span className="text-[#A2ABBC]">
                      Верных ответов: <strong className="text-[#EEF1F6]">{correctCount}</strong>
                    </span>
                  </div>

                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        transition: { staggerChildren: prefersReducedMotion ? 0 : 0.05 }
                      }
                    }}
                    className="mt-3 grid grid-cols-5 gap-1.5"
                    aria-hidden="true"
                  >
                    {CRAFT_QUIZ_QUESTIONS.map((q, idx) => {
                      const ans = answers[q.id];
                      const isCorrect = typeof ans === 'boolean' && ans === q.isTrue;
                      const isWrong = typeof ans === 'boolean' && ans !== q.isTrue;
                      return (
                        <motion.span
                          key={q.id}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeOut' }}
                          className={`h-1.5 rounded-xs ${
                            isCorrect
                              ? 'bg-[#52E0A1]'
                              : isWrong
                              ? 'bg-[#E85D2A]'
                              : idx === quizIndex
                              ? 'bg-[#EEF1F6]'
                              : 'bg-[rgba(220,227,239,0.14)]'
                          }`}
                        />
                      );
                    })}
                  </motion.div>

                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                    className="font-display mt-6 text-lg font-bold leading-snug text-[#EEF1F6] sm:text-xl"
                  >
                    «{currentQuestion.statement}»
                  </motion.h3>

                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 }
                      }
                    }}
                    className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    <motion.button
                      type="button"
                      disabled={currentAnswered}
                      onClick={() => handleAnswer(true)}
                      whileHover={!prefersReducedMotion && !currentAnswered ? { scale: 1.02 } : undefined}
                      whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`min-h-[50px] rounded-lg border px-5 py-3 text-sm font-bold transition-all ${
                        currentAnswered && currentQuestion.isTrue
                          ? 'border-[#52E0A1] bg-[#52E0A1]/18 text-[#52E0A1]'
                          : currentAnswered && currentChoice === true && !currentQuestion.isTrue
                          ? 'border-[#E85D2A] bg-[#E85D2A]/18 text-[#E85D2A]'
                          : 'border-[rgba(220,227,239,0.22)] bg-[#0B0C10] text-[#EEF1F6] hover:border-[#EEF1F6] hover:bg-[#171A23]'
                      }`}
                    >
                      Правда
                    </motion.button>

                    <motion.button
                      type="button"
                      disabled={currentAnswered}
                      onClick={() => handleAnswer(false)}
                      whileHover={!prefersReducedMotion && !currentAnswered ? { scale: 1.02 } : undefined}
                      whileTap={!prefersReducedMotion ? { scale: 0.98 } : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`min-h-[50px] rounded-lg border px-5 py-3 text-sm font-bold transition-all ${
                        currentAnswered && !currentQuestion.isTrue
                          ? 'border-[#52E0A1] bg-[#52E0A1]/18 text-[#52E0A1]'
                          : currentAnswered && currentChoice === false && currentQuestion.isTrue
                          ? 'border-[#E85D2A] bg-[#E85D2A]/18 text-[#E85D2A]'
                          : 'border-[rgba(220,227,239,0.22)] bg-[#0B0C10] text-[#EEF1F6] hover:border-[#EEF1F6] hover:bg-[#171A23]'
                      }`}
                    >
                      Миф
                    </motion.button>
                  </motion.div>

                  {currentAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
                      data-testid="quiz-answer-explanation"
                      className="mt-5 rounded-lg border border-[rgba(220,227,239,0.16)] bg-[#0B0C10]/90 p-4"
                      style={{ overflowAnchor: 'none' }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`font-mono-craft text-xs font-bold ${
                            currentChoice === currentQuestion.isTrue
                              ? 'text-[#52E0A1]'
                              : 'text-[#E85D2A]'
                          }`}
                        >
                          {currentChoice === currentQuestion.isTrue ? 'Верно! ' : 'Не совсем · '}
                          {currentQuestion.verdictLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-[#C6CEDB] sm:text-sm">
                        {currentQuestion.explanation}
                      </p>

                      {currentAnswered && (
                        <button
                          type="button"
                          onClick={handleNextQuestion}
                          className="chrome-sheen mt-4 inline-flex min-h-[42px] items-center rounded-md bg-[#EEF1F6] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#E85D2A]"
                        >
                          {isLastQuestion ? 'Завершить тест →' : 'Следующий вопрос →'}
                        </button>
                      )}
                    </motion.div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
                  data-testid="quiz-summary"
                  className="text-center"
                  style={{ overflowAnchor: 'none' }}
                >
                  <div className="mx-auto inline-flex items-center gap-2 font-mono-craft text-xs font-bold text-[#52E0A1]">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>ТЕСТ ПРОЙДЕН · {correctCount} ИЗ {CRAFT_QUIZ_QUESTIONS.length}</span>
                  </div>
                  <h3 className="font-display mt-2.5 text-xl font-bold text-[#EEF1F6]">
                    {quizRankTitle}
                  </h3>
                  <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-[#C6CEDB]">
                    Теперь вы точно не испортите хорошую кожу спиртовыми салфетками и сушкой у
                    батареи. А если хочется проверить руки в деле — забирайте скидку до −15% в
                    верстак-игре выше.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleResetQuiz}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-md border border-[rgba(220,227,239,0.24)] bg-[#0B0C10] px-5 py-2 text-xs font-semibold text-[#EEF1F6] hover:border-[#EEF1F6]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      Пройти тест ещё раз
                    </button>
                    <a
                      href="#workbench-game"
                      className="chrome-sheen inline-flex min-h-[42px] items-center rounded-md bg-[#E85D2A] px-5 py-2 text-xs font-bold text-[#0B0C10] hover:bg-[#FF713D]"
                    >
                      Попробовать верстак-игру (до −15%)
                    </a>
                  </div>
                </motion.div>
              )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </section>
  );
}

