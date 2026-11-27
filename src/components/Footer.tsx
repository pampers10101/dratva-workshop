import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { CSSProperties } from 'react';

interface FooterLinks {
  href: string;
  label: string;
}

const FOOTER_NAV: FooterLinks[] = [
  { href: '#about', label: 'О деле' },
  { href: '#services', label: 'Услуги' },
  { href: '#gallery', label: 'До / После' },
  { href: '#workbench-game', label: 'Верстак-игра' },
  { href: '#estimator', label: 'Расчёт' },
  { href: '#craft-lounge', label: 'Шпаргалка' },
  { href: '#reviews', label: 'Отзывы' },
  { href: '#intake', label: 'Приёмка' },
];

export function Footer() {
  return (
    <footer className="bg-[#0B0C10] text-[#A2ABBC]">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8"
      >
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <motion.div
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={{ delay: 0 }}
              className="flex items-center gap-4"
            >
              <svg
                width="46"
                height="46"
                viewBox="0 0 48 48"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect
                  x="2"
                  y="2"
                  width="44"
                  height="44"
                  rx="10"
                  stroke="#DCE3EF"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                />
                <rect
                  x="6"
                  y="6"
                  width="36"
                  height="36"
                  rx="7"
                  stroke="#E85D2A"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <text
                  x="24"
                  y="30"
                  textAnchor="middle"
                  fill="#EEF1F6"
                  fontFamily="Unbounded, sans-serif"
                  fontSize="18"
                  fontWeight="700"
                >
                  Д
                </text>
              </svg>
              <div>
                <p className="font-display chrome-metallic-text text-lg font-extrabold">ДРАТВА</p>
                <p className="text-xs text-[#A2ABBC]">
                  Мастерская реставрации и ремонта кожи · Самара
                </p>
              </div>
            </motion.div>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              transition={{ delay: 0.1 }}
              className="mt-4 max-w-sm text-sm leading-relaxed text-[#A2ABBC]"
            >
              Работаем аккуратно, без «пластикового» блеска и лишних накруток. Прежде чем ехать с
              крупной сумкой или курткой, напишите или позвоните — иногда я ухожу за кожей на склад.
            </motion.p>
          </div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            transition={{ delay: 0.2 }}
            className="space-y-2 text-sm md:col-span-4"
          >
            <p className="font-mono-craft text-xs text-[#E85D2A]">Адрес и время</p>
            <p className="text-[#EEF1F6]">г. Самара, ул. Революционная, 70, лит. 3</p>
            <p className="text-xs text-[#A2ABBC]">
              Вход со двора, железная дверь с металлической табличкой (ориентир — рядом с Мягковым).
            </p>
            <p className="pt-2 font-mono-craft text-xs text-[#DCE3EF]">
              Пн–Пт, Вс: 10:00–19:30 · Сб: выходной
            </p>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
            transition={{ delay: 0.3 }}
            className="space-y-2 text-sm md:col-span-3"
          >
            <p className="font-mono-craft text-xs text-[#E85D2A]">Прямая связь</p>
            <p>
              <a
                href="tel:+79608115424"
                className="font-mono-craft text-[#EEF1F6] transition-colors hover:text-[#E85D2A]"
              >
                +7 (960) 811-54-24
              </a>
            </p>
            <p>
              <a
                href="#intake"
                className="text-xs text-[#DCE3EF] underline decoration-[#E85D2A]/80 underline-offset-4 hover:text-[#EEF1F6]"
              >
                Оставить заявку на оценку
              </a>
            </p>
            <nav
              aria-label="Навигация в подвале"
              className="flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-[#A2ABBC]"
            >
              {FOOTER_NAV.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  whileHover={{ y: -1, color: '#EEF1F6' }}
                  className="inline-flex"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(220,227,239,0.12)] pt-6 text-xs text-[#768095]"
        >
          <span>© 2015–2026 Мастерская «Дратва», Самара</span>
          <div className="flex items-center gap-5">
            <span className="font-mono-craft">Ручной шов · Воск · Честная оценка</span>
            <motion.a
              href="#top"
              whileHover={{ y: -1, color: '#E85D2A' }}
              whileTap={{ scale: 0.95 }}
              className="font-mono-craft text-[#DCE3EF]"
            >
              Наверх ↑
            </motion.a>
          </div>
        </motion.div>
      </motion.div>
    </footer>
  );
}