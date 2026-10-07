#!/usr/bin/env node
/* ═══════════════════════════════════════════════════
   Смоук-тест флоу rendezvous из терминала (без зависимостей, Node ≥ 14.8)

   Полный тест (страница + структура + отправка в Telegram):
     RDV_TOKEN=<токен> RDV_CHAT=<chat_id> node test/flow-test.mjs

   Тест локальной версии (сначала: python3 -m http.server 8000):
     RDV_URL=http://localhost:8000 node test/flow-test.mjs

   Собрать разовую ссылку для Олеси:
     RDV_TOKEN=<токен> RDV_CHAT=<chat_id> node test/flow-test.mjs --link
   ═══════════════════════════════════════════════════ */

const PAGE  = process.env.RDV_URL  || 'https://arasvet.github.io/rendezvous/';
const TOKEN = process.env.RDV_TOKEN || '';
const CHAT  = process.env.RDV_CHAT  || '';

const pass = m => console.log(`  ✅ ${m}`);
const fail = m => { console.error(`  ❌ ${m}`); process.exitCode = 1; };
const note = m => console.log(`  ·  ${m}`);
const hr   = () => console.log('─'.repeat(56));

/* ── режим --link: собрать ссылку ── */
if (process.argv.includes('--link')){
  if (!TOKEN || !CHAT){
    console.error('Нужны RDV_TOKEN и RDV_CHAT');
    process.exit(1);
  }
  console.log('\nСсылка для Олеси (передай один раз):\n');
  console.log(`  ${PAGE}#token=${encodeURIComponent(TOKEN)}&chat=${encodeURIComponent(CHAT)}\n`);
  console.log('После первого открытия hash уберётся из адреса сам,\nконфиг останется в localStorage её браузера.\n');
  process.exit(0);
}

/* ── 1. Страница ── */
hr();
console.log(`1 · Страница: ${PAGE}`);
const res = await fetch(PAGE);
if (!res.ok){ fail(`HTTP ${res.status}`); process.exit(1); }
pass(`HTTP ${res.status}`);
const html = await res.text();

console.log('2 · Структура:');
const MARKERS = [
  ['id="screenIntro"',          'экран 01 · обложка'],
  ['id="screenQuiz"',           'экран 02 · анкета'],
  ['id="screenDetails"',        'экран 03 · программа'],
  ['id="screenQuestion"',       'экран 04 · вопрос'],
  ['id="screenSuccess"',        'экран 05 · финал'],
  ['id="btnYes"',               'кнопка «Да»'],
  ['id="btnNo"',                'кнопка «Нет»'],
  ['loadTelegramConfig',        'конфиг бота из hash/localStorage'],
  ['RENDEZVOUS',                'моноширинный лог для Telegram'],
  ['data-value="Эльдар"',       'вариант «Эльдар» в Q1'],
  ['data-value="26 июля 2025"', 'правильный ответ Q4 (свадьба)'],
  ['data-value="Мальдивы"',     'плитки bento в Q2'],
  ['Cormorant Garamond',        'шрифт заголовков'],
  ['JetBrains Mono',            'моноширинный шрифт'],
  ['100dvh',                    'dynamic viewport height'],
];
for (const [needle, name] of MARKERS) html.includes(needle) ? pass(name) : fail(name);

console.log('3 · Безопасность:');
if (/[0-9]{8,10}:[A-Za-z0-9_-]{30,}/.test(html)) fail('в коде найден токен бота');
else pass('токенов в исходниках нет');

/* ── 2. Отправка в Telegram (как эшелон 1 сайта) ── */
console.log('4 · Telegram:');
if (!TOKEN || !CHAT){
  note('RDV_TOKEN/RDV_CHAT не заданы — отправка пропущена');
} else {
  try {
    const base = `https://api.telegram.org/bot${TOKEN}`;
    const text = '<pre>RENDEZVOUS · SMOKE TEST\n────────────────────────\nфлоу-тест из терминала</pre>';
    const body = new URLSearchParams({ chat_id: CHAT, text, parse_mode: 'HTML' });
    const r = await fetch(`${base}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });
    const d = await r.json();
    d.ok ? pass('контрольное сообщение доставлено в чат') : fail(`Telegram: ${d.description}`);
  } catch (e) {
    fail(`сеть: ${e.message}`);
  }
}

/* ── 3. Чек-лист ручных шагов (интерактив — в браузере) ── */
hr();
console.log('5 · Ручной прогон (открой страницу в браузере):\n');
const steps = [
  'обложка: «Олеся / Сахипова.» + [ Начать ]',
  'Q1: тап «Я» → вопрос перечёркнут, «Эльдар» подсвечен вином → автопереход',
  'Q2: тап любой плитки → fade-переход',
  'Q3: тап любой плитки → fade-переход',
  'Q4: тап «12 июня 2025» → строка зачёркнута, остаёмся; тап «26 июля 2025» → мини-конфетти → переход',
  'программа: 16:30 / 17:00 / 19:30 + dress code',
  'вопрос: «Нет» растворяется под пальцем (не нажать), «Да» — тёмная плашка',
  'финал: конфетти + «Принято.»; в Telegram приходит <pre>-лог',
];
steps.forEach((s, i) => console.log(`   ${String(i + 1).padStart(2, '0')}. ${s}`));
console.log('');
hr();
console.log(process.exitCode ? 'ИТОГ: есть ошибки' : 'ИТОГ: всё в порядке');
