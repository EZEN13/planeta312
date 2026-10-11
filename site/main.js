/* Планета-312, лендинг v3. Без зависимостей: движение на CSS-переходах,
   IntersectionObserver и одном requestAnimationFrame-цикле на скролл. */
(function () {
  'use strict';

  /* Настройки в одном месте. В рабочей версии клиент правит только этот блок. */
  var CONFIG = {
    whatsapp: '79268260822',      // макет: какой номер в WhatsApp, уточнить у клиента
    telegram: 'ipoteka_sng',      // макет: сейчас канал, нужен аккаунт менеджера
    rate: 22,                     // макет: условная ставка для иностранцев, % годовых
    rateDate: '10.10.2026',
    incomeShare: 0.5              // платёж не больше половины дохода
  };

  var fmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  var rub = function (n) { return fmt.format(Math.round(n)) + ' ₽'; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = function () { return reduceMq.matches; };
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var easeOut = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }; // та же экспо-кривая, что в CSS

  function waUrl(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }
  function tgUrl() { return 'https://t.me/' + CONFIG.telegram; }

  /* Твин числа: от from к to за dur мс, на каждом кадре пишет текст */
  function tween(from, to, dur, write, done) {
    if (reduced() || from === to) { write(to); if (done) done(); return function () {}; }
    var start = null, raf;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      write(from + (to - from) * easeOut(t));
      if (t < 1) raf = requestAnimationFrame(frame); else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return function () { cancelAnimationFrame(raf); };
  }

  /* Тост */
  var toastEl = $('[data-toast]');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 4000);
  }

  /* Ссылки на мессенджеры */
  $$('[data-wa]').forEach(function (a) {
    if (a.hasAttribute('data-calc-wa')) return;
    a.href = waUrl(a.getAttribute('data-wa-text') || 'Здравствуйте, я с сайта planeta312.com.');
    a.target = '_blank';
    a.rel = 'noopener';
  });
  $$('[data-tg]').forEach(function (a) { a.href = tgUrl(); a.target = '_blank'; a.rel = 'noopener'; });
  $$('[data-stub]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); toast('Макет: документ появится, когда клиент пришлёт файл.'); });
  });

  /* Переключатель языка (заглушка) */
  var lang = $('[data-lang]');
  var langOpen = false;
  if (lang) {
    var btn = $('.lang__btn', lang);
    var list = $('.lang__list', lang);
    var close = function () { list.hidden = true; langOpen = false; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function () {
      var open = list.hidden;
      list.hidden = !open;
      langOpen = open;
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) { if (!lang.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(); } });
    $$('[data-lang-stub]', lang).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        close();
        toast('Версия «' + a.textContent + '» появится после перевода и вычитки носителем языка.');
      });
    });
  }

  /* ---------- Шапка: sticky, фон с blur после 40px, прячется при скролле вниз ---------- */
  var header = $('[data-header]');
  var lastY = window.scrollY;

  /* ---------- Этапы: линия заполняется по скроллу ---------- */
  var stepsTrack = $('[data-steps]');
  var stepsFill = $('[data-steps-fill]');
  var stepItems = $$('[data-step-item]');
  var stepsNow = $('[data-steps-now]');
  var activeStep = -1;
  var lastRailBottom = null;

  function onScrollFrame() {
    var y = window.scrollY;

    if (header) {
      header.classList.toggle('is-scrolled', y > 40);
      var dy = y - lastY;
      var focusInside = !!header.querySelector(':focus-visible');
      if (y < 120 || langOpen || focusInside) header.classList.remove('is-hidden');
      else if (dy > 6) header.classList.add('is-hidden');
      else if (dy < -6) header.classList.remove('is-hidden');
      lastY = y;
    }

    if (stepsTrack && stepItems.length) {
      // сначала все чтения геометрии, потом записи: без layout thrash
      var vh = window.innerHeight;
      var rect = stepsTrack.getBoundingClientRect();
      var badges = stepItems.map(function (s) { return $('.step__num', s).getBoundingClientRect(); });
      var first = badges[0].top + badges[0].height / 2;
      var last = badges[badges.length - 1].top + badges[badges.length - 1].height / 2;
      var line = vh * 0.6; // точка «здесь читаю» на 60% высоты экрана
      var p = (line - first) / Math.max(1, last - first);
      p = Math.max(0, Math.min(1, p));
      var railBottom = Math.round(rect.bottom - last);
      if (railBottom !== lastRailBottom) { stepsTrack.style.setProperty('--rail-bottom', railBottom + 'px'); lastRailBottom = railBottom; }
      var tops = badges.map(function (r) { return r.top + r.height / 2; });
      var idx = -1;
      tops.forEach(function (t, k) { if (t < line) idx = k; });
      stepsFill.style.setProperty('--progress', p.toFixed(4));
      if (idx !== activeStep) {
        stepItems.forEach(function (s, k) { s.classList.toggle('is-active', k <= idx); });
        activeStep = idx;
        if (stepsNow) {
          stepsNow.textContent = String(Math.max(1, idx + 1));
          stepsNow.classList.remove('is-tick'); void stepsNow.offsetWidth; stepsNow.classList.add('is-tick');
        }
      }
    }
  }
  var ticking = false;
  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; onScrollFrame(); });
  }
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  onScrollFrame();

  /* ---------- Разбивка заголовка на слова ---------- */
  var wi = 0;
  function splitNode(el) {
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        // делим только по обычным пробелам: неразрывный пробел остаётся внутри слова
        n.textContent.split(/([ \t\n\r]+)/).forEach(function (part) {
          if (!part) return;
          if (/^[ \t\n\r]+$/.test(part)) {
            el.appendChild(document.createTextNode(' '));
            return;
          }
          var w = document.createElement('span'); w.className = 'w';
          var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--wi', wi++);
          w.appendChild(inner); el.appendChild(w);
        });
      } else {
        // элемент-слово (например, название страны) оборачиваем целиком
        var w2 = document.createElement('span'); w2.className = 'w';
        var wrap = document.createElement('span'); wrap.style.setProperty('--wi', wi++);
        wrap.appendChild(n); w2.appendChild(wrap); el.appendChild(w2);
      }
    });
  }
  var title = $('.hero__title');
  if (title) {
    $$('[data-split]', title).forEach(splitNode);
    requestAnimationFrame(function () { requestAnimationFrame(function () { title.classList.add('is-split'); }); });
  }

  /* ---------- Появление при скролле и счётчики ---------- */
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, k) {
      if (el.parentElement === group || el.parentElement.parentElement === group) el.style.setProperty('--i', k);
    });
  });

  function runCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    var to = Number(el.dataset.count);
    var from = Number(el.dataset.countFrom || 0);
    var plain = el.hasAttribute('data-plain');
    tween(from, to, 1400, function (v) { el.textContent = plain ? String(Math.round(v)) : fmt.format(Math.round(v)); });
  }

  function settle(el) {
    // после появления снимаем атрибут, чтобы задержка stagger не мешала наведению
    el.removeAttribute('data-reveal');
    el.style.removeProperty('--i');
    el.style.removeProperty('--d');
  }

  // [data-draw]: блок не прячется, только получает .is-in, чтобы прочертить линию (путь основателя, переход к офисам)
  var revealEls = $$('[data-reveal], [data-draw]');
  if ('IntersectionObserver' in window && !reduced()) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        el.classList.add('is-in');
        $$('[data-count]', el).forEach(runCounter);
        if (el.hasAttribute('data-count')) runCounter(el);
        var done = false;
        var finish = function () { if (done) return; done = true; settle(el); };
        el.addEventListener('transitionend', function te(ev) { if (ev.target === el && ev.propertyName === 'transform') { el.removeEventListener('transitionend', te); finish(); } });
        setTimeout(finish, 2400);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });

    // счётчики вне reveal-блоков
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { cio.unobserve(e.target); runCounter(e.target); } });
    }, { threshold: 0.4 });
    $$('[data-count]').forEach(function (el) { cio.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-in'); settle(el); });
  }

  /* ---------- Маршрут на первом экране ---------- */
  var hero = $('[data-hero]');
  var route = $('[data-route]');
  var countries = ['kg', 'tj', 'uz'];
  var activeCountry = 'kg';
  var cycleTimer = null;
  var paused = false;

  function setCountry(c) {
    activeCountry = c;
    if (route) route.setAttribute('data-active', c);
    if (hero) hero.setAttribute('data-active', c);
  }
  if (route) {
    setCountry('kg');

    // Точка-путешественник едет по активным линиям к Москве и Петербургу
    var traveler = $('[data-traveler]', route);
    var travelStart = null, travelLeg = 0;
    var heroVisible = true, travelling = false, travelReady = false;
    function startTravel() {
      if (travelling || !travelReady || !heroVisible || reduced() || !traveler) return;
      travelling = true; travelStart = null;
      requestAnimationFrame(travel);
    }
    function travel(ts) {
      // цикл останавливается, когда герой ушёл с экрана или вкладка скрыта
      if (!heroVisible || document.hidden) { travelling = false; traveler.style.opacity = 0; return; }
      if (travelStart === null) travelStart = ts;
      var paths = $$('.route__path[data-from="' + activeCountry + '"]', route);
      var path = paths[travelLeg % paths.length];
      var t = Math.min(1, (ts - travelStart) / 2200);
      var len = path.getTotalLength();
      var pt = path.getPointAtLength(len * easeOut(t));
      traveler.setAttribute('cx', pt.x.toFixed(1));
      traveler.setAttribute('cy', pt.y.toFixed(1));
      traveler.style.opacity = t < 0.05 ? t * 20 : t > 0.85 ? (1 - t) / 0.15 : 1;
      if (t >= 1) { travelStart = null; travelLeg++; }
      requestAnimationFrame(travel);
    }
    setTimeout(function () { travelReady = true; startTravel(); }, 2400);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) startTravel(); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; startTravel(); }).observe(route);
    }

    // Автоперебор стран; наведение на название страны в заголовке подсвечивает её маршрут
    function cycle() {
      clearTimeout(cycleTimer);
      if (paused || reduced()) return;
      cycleTimer = setTimeout(function () {
        if (!heroVisible || document.hidden) { cycle(); return; }
        var next = countries[(countries.indexOf(activeCountry) + 1) % countries.length];
        setCountry(next);
        cycle();
      }, 3200);
    }
    cycle();

    if (finePointer) {
      $$('.hero__title .hl').forEach(function (h) {
        h.addEventListener('mouseenter', function () { paused = true; clearTimeout(cycleTimer); setCountry(h.dataset.from); });
        h.addEventListener('mouseleave', function () { paused = false; cycle(); });
      });
    }
  }

  /* ---------- Магнитная главная кнопка (только мышь) ---------- */
  if (finePointer) {
    $$('[data-magnetic]').forEach(function (b) {
      var raf = null;
      b.addEventListener('pointermove', function (e) {
        if (reduced()) return;
        var r = b.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        var y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          b.style.setProperty('--mx', (x * 8).toFixed(1) + 'px');
          b.style.setProperty('--my', (y * 6).toFixed(1) + 'px');
        });
      });
      b.addEventListener('pointerleave', function () {
        if (raf) cancelAnimationFrame(raf);
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- Вкладки «Какой у вас документ» ---------- */
  var tabs = $$('.doc-tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      var was = !panel.hidden;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panel.hidden = !on;
      if (on && !was) {
        panel.classList.remove('is-entering'); void panel.offsetWidth; panel.classList.add('is-entering');
      }
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ---------- Квиз ---------- */
  var quiz = $('[data-quiz]');
  if (quiz) {
    var steps = $$('.quiz__step', quiz);
    var total = steps.length;
    var answers = {};
    var labels = {};
    var history = [];
    var current = 0;
    var progress = $('[data-quiz-progress]', quiz);
    var bar = $('[data-quiz-bar]', quiz);
    var back = $('[data-quiz-back]', quiz);
    var result = $('[data-quiz-result]', quiz);

    var DOCS = {
      patent: ['Паспорт с нотариальным переводом', 'Патент и чеки об оплате за весь срок', 'Миграционная карта и регистрация', 'Трудовой договор или справка о доходе'],
      rvp: ['Паспорт с нотариальным переводом', 'Отметка о РВП и регистрация', 'СНИЛС и ИНН', 'Справка о доходе или выписка по счёту'],
      vnzh: ['Паспорт с нотариальным переводом', 'Вид на жительство и регистрация', 'СНИЛС и ИНН', 'Справка о доходе'],
      rf: ['Паспорт РФ', 'СНИЛС', 'Справка о доходе', 'Сертификат на маткапитал, если есть']
    };

    function animateIn(el, dir) {
      el.classList.remove('is-fwd', 'is-back');
      void el.offsetWidth;
      el.classList.add(dir === 'back' ? 'is-back' : 'is-fwd');
    }

    function show(i, dir) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      result.hidden = true;
      back.hidden = history.length === 0;
      progress.textContent = 'Вопрос ' + (i + 1) + ' из ' + total;
      bar.style.setProperty('--p', (i / total).toFixed(4));
      var step = steps[i];
      $$('.option', step).forEach(function (o) {
        o.setAttribute('aria-pressed', String(answers[step.dataset.step] === o.dataset.value));
      });
      if (dir) animateIn(step, dir);
    }

    var skipDoc = false;
    function next() {
      history.push(current);
      var n = current + 1;
      if (steps[n] && steps[n].dataset.step === 'doc') {
        // Гражданам РФ вопрос про документ не задаём; если документ выбран во вкладке, тоже пропускаем
        if (answers.country === 'ru') { answers.doc = 'rf'; labels.doc = 'Паспорт РФ'; n += 1; }
        else if (skipDoc) { n += 1; }
      }
      skipDoc = false;
      if (n >= total) finish(); else show(n, 'fwd');
    }

    function finish() {
      steps.forEach(function (s) { s.hidden = true; });
      back.hidden = false;
      progress.textContent = 'Результат';
      bar.style.setProperty('--p', '1');

      var docScore = { patent: 0, rvp: 1, vnzh: 2, rf: 3 }[answers.doc];
      var incScore = { contract: 2, self: 1, informal: 0 }[answers.income];
      var stay = Number(answers.stay);
      var down = Number(answers.down);
      var score = docScore + incScore + stay + down;
      var hard = stay === 0 || (answers.doc === 'patent' && answers.income === 'informal' && down < 2);

      var todo = [];
      if (answers.income === 'informal') todo.push('Подтвердить доход: трудовой договор, самозанятость или выписка по счёту');
      if (answers.income === 'self') todo.push('Собрать выписки и декларации о доходе минимум за 6 месяцев');
      if (stay < 2) todo.push('Банкам важен стаж в России: обычно от года, лучше больше');
      if (down < 2) todo.push('Накопить взнос: для иностранцев он обычно выше 20%');
      if (answers.doc === 'patent') todo.push('Платить патент без перерывов и сохранять все чеки');
      if (!todo.length) todo.push('Собрать документы из списка ниже и прийти на бесплатную консультацию');

      var title, text;
      if (hard) {
        title = 'Сейчас сложно, но это можно исправить';
        text = 'С такими данными банки скорее откажут. Ниже написано, что сделать, чтобы шансы выросли. Менеджер подскажет, когда лучше подавать заявку.';
      } else if (score >= 8) {
        title = 'Хорошие шансы';
        text = 'По вашим ответам есть банки, которые могут рассмотреть заявку. Точный ответ дадим после проверки документов на бесплатной консультации.';
      } else {
        title = 'Нужна подготовка';
        text = 'Ипотека возможна, но сначала стоит закрыть несколько пунктов. Так меньше риск отказа и испорченной кредитной истории.';
      }

      $('[data-result-title]', result).textContent = title;
      $('[data-result-text]', result).textContent = text;
      fillList($('[data-result-todo]', result), todo, 0);
      fillList($('[data-result-docs]', result), DOCS[answers.doc] || DOCS.patent, todo.length);

      var msg = 'Здравствуйте, я с сайта planeta312.com. Мои ответы в проверке «Подхожу ли я»:\n' +
        'Страна: ' + labels.country + '\nДокумент: ' + labels.doc + '\nДоход: ' + labels.income +
        '\nВ России: ' + labels.stay + '\nПервый взнос: ' + labels.down + '\nГде покупаю: ' + labels.city +
        '\nРезультат: ' + title;
      var wa = $('[data-quiz-wa]', result);
      wa.href = waUrl(msg); wa.target = '_blank'; wa.rel = 'noopener';
      var tg = $('[data-quiz-tg]', result);
      tg.href = tgUrl(); tg.target = '_blank'; tg.rel = 'noopener';
      tg.onclick = function () {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(msg).then(function () { $('[data-tg-hint]', result).hidden = false; }, function () {});
        }
      };

      result.hidden = false;
      animateIn(result, 'fwd');
      result.focus({ preventScroll: true });
    }

    function fillList(ul, items, offset) {
      ul.textContent = '';
      items.forEach(function (t, k) {
        var li = document.createElement('li');
        li.textContent = t;
        li.style.setProperty('--li', offset + k);
        ul.appendChild(li);
      });
    }

    steps.forEach(function (step) {
      $$('.option', step).forEach(function (o) {
        o.addEventListener('click', function () {
          answers[step.dataset.step] = o.dataset.value;
          labels[step.dataset.step] = o.textContent.trim();
          o.setAttribute('aria-pressed', 'true');
          next();
          var visible = steps[current];
          if (!result.hidden) return;
          var first = $('.option', visible);
          if (first) first.focus({ preventScroll: true });
        });
      });
    });

    back.addEventListener('click', function () {
      if (!history.length) return;
      show(history.pop(), 'back');
    });

    $('[data-quiz-restart]', quiz).addEventListener('click', function () {
      answers = {}; labels = {}; history = []; skipDoc = false;
      $('[data-tg-hint]', result).hidden = true;
      show(0, 'back');
      $('.option', steps[0]).focus();
    });

    // Переход из вкладки документа: документ уже выбран
    $$('[data-quiz-doc]').forEach(function (a) {
      a.addEventListener('click', function () {
        var doc = a.getAttribute('data-quiz-doc');
        answers = {}; labels = {}; history = [];
        if (doc === 'rf') {
          answers.country = 'ru'; labels.country = 'Россия';
          answers.doc = 'rf'; labels.doc = 'Паспорт РФ';
          history = [0];
          show(2, 'fwd');
        } else {
          answers.doc = doc;
          labels.doc = { patent: 'Патент', rvp: 'РВП', vnzh: 'ВНЖ' }[doc];
          show(0, 'fwd');
          skipDoc = true;
        }
      });
    });

    show(0);
  }

  /* Формы «Перезвоните мне» (в результате квиза и в финальной карточке): проверка полей */
  $$('[data-callback]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.namedItem('name');
      var phone = form.elements.namedItem('phone');
      var okName = name.value.trim().length > 1;
      var digits = phone.value.replace(/\D/g, '');
      var okPhone = digits.length === 11 && /^[78]/.test(digits);
      setError(name, !okName);
      setError(phone, !okPhone);
      if (!okName) { name.focus(); return; }
      if (!okPhone) { phone.focus(); return; }
      $('[data-callback-ok]', form).hidden = false;
    });
  });

  function setError(input, on) {
    input.setAttribute('aria-invalid', String(on));
    var id = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return /-err$/.test(x); })[0];
    if (id) document.getElementById(id).hidden = !on;
  }

  /* ---------- Калькулятор: аннуитетный платёж с анимированным пересчётом ---------- */
  var calc = $('[data-calc]');
  if (calc) {
    var f = calc.elements;
    var out = {};
    $$('[data-out]').forEach(function (el) { out[el.dataset.out] = el; });
    var pct = $('[data-down-pct]', calc);
    var calcWa = $('[data-calc-wa]');
    var splitLoan = $('[data-split-loan]');
    f.rate.value = String(CONFIG.rate).replace('.', ',');
    $('[data-rate-date]', calc).textContent = 'Условная ставка для иностранцев на ' + CONFIG.rateDate + '. Банк может предложить другую.';

    var parseNum = function (v) { return Number(String(v).replace(/\s| /g, '').replace(',', '.')); };
    var ranges = {};
    $$('[data-range]', calc).forEach(function (r) { ranges[r.dataset.range] = r; });

    function paintRange(r) {
      var min = Number(r.min), max = Number(r.max), v = Number(r.value);
      var p = max > min ? (v - min) / (max - min) * 100 : 0;
      r.style.setProperty('--fill', Math.max(0, Math.min(100, p)).toFixed(2) + '%');
    }

    // Текущие показанные значения, чтобы твин шёл от них, а не от нуля
    var shown = { payment: 0, loan: 0, over: 0, income: 0 };
    var stops = {};
    function animateOut(key, to, prefix) {
      if (stops[key]) stops[key]();
      var from = shown[key] || 0;
      stops[key] = tween(from, to, 600, function (v) {
        shown[key] = v;
        out[key].textContent = (prefix || '') + rub(v);
      });
    }

    function compute() {
      var price = parseNum(f.price.value);
      var down = parseNum(f.down.value);
      var years = parseNum(f.term.value);
      var rate = parseNum(f.rate.value);

      var bad = {
        price: !(price >= 1000000),
        down: !(down >= 0) || down >= price,
        term: !(years >= 1 && years <= 30),
        rate: !(rate > 0 && rate <= 50)
      };
      setError(f.price, bad.price);
      setError(f.down, !bad.price && bad.down);
      setError(f.term, bad.term);
      setError(f.rate, bad.rate);

      Object.keys(ranges).forEach(function (k) { paintRange(ranges[k]); });

      if (!bad.price && down >= 0) pct.textContent = Math.round(down / price * 100) + '%';
      if (bad.price || bad.down || bad.term || bad.rate) {
        ['payment', 'loan', 'over', 'income'].forEach(function (k) {
          if (stops[k]) stops[k]();
          shown[k] = 0;
          out[k].textContent = '—';
        });
        return;
      }

      var loan = price - down;
      var n = Math.round(years * 12);
      var r = rate / 100 / 12;
      var pay = loan * r / (1 - Math.pow(1 + r, -n));
      var over = pay * n - loan;

      animateOut('payment', pay);
      animateOut('loan', loan);
      animateOut('over', over);
      animateOut('income', pay / CONFIG.incomeShare, 'от ');
      if (splitLoan) splitLoan.style.setProperty('--loan', (loan / (loan + over)).toFixed(4));

      calcWa.href = waUrl('Здравствуйте, я с сайта planeta312.com. Посчитал ипотеку: квартира ' + rub(price) +
        ', взнос ' + rub(down) + ', срок ' + years + ' лет, платёж около ' + rub(pay) + ' в месяц. Хочу обсудить.');
      calcWa.target = '_blank'; calcWa.rel = 'noopener';
    }

    function formatField(input) {
      var v = parseNum(input.value);
      if (isFinite(v) && input.value.trim() !== '') input.value = fmt.format(v);
    }

    ['price', 'down', 'term'].forEach(function (k) {
      f[k].addEventListener('input', function () {
        var v = parseNum(f[k].value);
        if (isFinite(v)) ranges[k].value = v;
        if (k === 'price' && isFinite(v)) ranges.down.max = v;
        compute();
      });
      f[k].addEventListener('blur', function () { formatField(f[k]); });
      ranges[k].addEventListener('input', function () {
        f[k].value = fmt.format(Number(ranges[k].value));
        if (k === 'price') ranges.down.max = ranges.price.value;
        compute();
      });
    });
    f.rate.addEventListener('input', compute);
    ranges.down.max = ranges.price.value;
    compute();
  }

  /* ---------- Видеоотзывы: фасад. Плеер Boomstream грузится только по нажатию ---------- */
  var vmodal = $('[data-vmodal]');
  var vframe = $('[data-vmodal-frame]');
  var vOpener = null;
  if (vmodal && typeof vmodal.showModal === 'function') {
    var closeVideo = function () { if (vmodal.open) vmodal.close(); };
    vmodal.addEventListener('close', function () {
      vframe.textContent = ''; // убираем iframe: звук и загрузка останавливаются
      if (vOpener) vOpener.focus({ preventScroll: true });
    });
    vmodal.addEventListener('click', function (e) { if (e.target === vmodal) closeVideo(); }); // клик по фону
    $('[data-vmodal-close]', vmodal).addEventListener('click', closeVideo);
    $$('[data-video]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        vOpener = a;
        var f = document.createElement('iframe');
        // autostart и title — параметры плеера Boomstream: старт по нажатию, без имени файла поверх видео
        f.src = 'https://play.boomstream.com/' + encodeURIComponent(a.dataset.video) + '?autostart=1&title=0';
        f.title = a.getAttribute('aria-label') || 'Видеоотзыв';
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.setAttribute('allowfullscreen', '');
        vframe.textContent = '';
        vframe.appendChild(f);
        vmodal.showModal();
        $('[data-vmodal-close]', vmodal).focus();
      });
    });
  }
  // без поддержки <dialog> ссылка просто открывает плеер в новой вкладке
})();
