/* Планета-312, макет главной. Без зависимостей. */
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
  var rub = function (n) { return fmt.format(Math.round(n)) + ' ₽'; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function waUrl(text) { return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(text); }
  function tgUrl() { return 'https://t.me/' + CONFIG.telegram; }

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
  if (lang) {
    var btn = $('.lang__btn', lang);
    var list = $('.lang__list', lang);
    var close = function () { list.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', function () {
      var open = list.hidden;
      list.hidden = !open;
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

  /* Вкладки «Какой у вас документ» */
  var tabs = $$('.doc-tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* Квиз */
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

    function show(i) {
      current = i;
      steps.forEach(function (s, k) { s.hidden = k !== i; });
      result.hidden = true;
      back.hidden = history.length === 0;
      progress.textContent = 'Вопрос ' + (i + 1) + ' из ' + total;
      bar.style.width = (i / total * 100) + '%';
      var step = steps[i];
      $$('.option', step).forEach(function (o) {
        o.setAttribute('aria-pressed', String(answers[step.dataset.step] === o.dataset.value));
      });
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
      if (n >= total) finish(); else show(n);
    }

    function finish() {
      steps.forEach(function (s) { s.hidden = true; });
      back.hidden = false;
      progress.textContent = 'Результат';
      bar.style.width = '100%';

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
      fillList($('[data-result-todo]', result), todo);
      fillList($('[data-result-docs]', result), DOCS[answers.doc] || DOCS.patent);

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
      result.focus({ preventScroll: true });
    }

    function fillList(ul, items) {
      ul.textContent = '';
      items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    }

    steps.forEach(function (step) {
      $$('.option', step).forEach(function (o) {
        o.addEventListener('click', function () {
          answers[step.dataset.step] = o.dataset.value;
          labels[step.dataset.step] = o.textContent.trim();
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
      show(history.pop());
    });

    $('[data-quiz-restart]', quiz).addEventListener('click', function () {
      answers = {}; labels = {}; history = []; skipDoc = false;
      $('[data-tg-hint]', result).hidden = true;
      show(0);
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
          show(2);
        } else {
          answers.doc = doc;
          labels.doc = { patent: 'Патент', rvp: 'РВП', vnzh: 'ВНЖ' }[doc];
          show(0);
          skipDoc = true;
        }
      });
    });

    show(0);

    /* Форма «Перезвоните мне»: проверка полей */
    var form = $('[data-callback]', quiz);
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
  }

  function setError(input, on) {
    input.setAttribute('aria-invalid', String(on));
    var id = (input.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return /-err$/.test(x); })[0];
    if (id) document.getElementById(id).hidden = !on;
  }

  /* Калькулятор: аннуитетный платёж */
  var calc = $('[data-calc]');
  if (calc) {
    var f = calc.elements;
    var out = {};
    $$('[data-out]').forEach(function (el) { out[el.dataset.out] = el; });
    var pct = $('[data-down-pct]', calc);
    var calcWa = $('[data-calc-wa]');
    f.rate.value = String(CONFIG.rate).replace('.', ',');
    $('[data-rate-date]', calc).textContent = 'Условная ставка для иностранцев на ' + CONFIG.rateDate + '. Банк может предложить другую.';

    var parseNum = function (v) { return Number(String(v).replace(/\s| /g, '').replace(',', '.')); };
    var ranges = {};
    $$('[data-range]', calc).forEach(function (r) { ranges[r.dataset.range] = r; });

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

      if (!bad.price && down >= 0) pct.textContent = Math.round(down / price * 100) + '%';
      if (bad.price || bad.down || bad.term || bad.rate) {
        ['payment', 'loan', 'over', 'income'].forEach(function (k) { out[k].textContent = '—'; });
        return;
      }

      var loan = price - down;
      var n = Math.round(years * 12);
      var r = rate / 100 / 12;
      var pay = loan * r / (1 - Math.pow(1 + r, -n));
      var over = pay * n - loan;

      out.payment.textContent = rub(pay);
      out.loan.textContent = rub(loan);
      out.over.textContent = rub(over);
      out.income.textContent = 'от ' + rub(pay / CONFIG.incomeShare);
      out.payment.classList.remove('is-updated');
      void out.payment.offsetWidth;
      out.payment.classList.add('is-updated');

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

  /* Фильтр кейсов */
  var filters = $$('.filter');
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.dataset.filter;
      filters.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      $$('.case').forEach(function (card) { card.hidden = c !== 'all' && card.dataset.country !== c; });
    });
  });
})();
