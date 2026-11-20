/* ISADENT — interactions. Everything here adds to a page that already reads without script. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  /* ---------- navigation: hide on the way down, return on the way up ---------- */
  const nav = document.querySelector('[data-nav]');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    if (nav) nav.classList.toggle('is-hidden', y > lastY && y > 240);
    lastY = y;
  }, { passive: true });
  if (nav) nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- hero: the reel passes through the sentence ---------- */
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    const track = hero.querySelector('.reel__track');
    const frames = [...track.children];
    const count = hero.querySelector('[data-reel-count]');
    const video = hero.querySelector('video');
    let active = -1, queued = false;

    const place = () => {
      queued = false;
      const total = hero.offsetHeight - innerHeight;
      const p = total > 0 ? clamp(-hero.getBoundingClientRect().top / total, 0, 1) : 0;
      const n = frames.length - 1;
      const x = p * n;
      const i = Math.min(n, Math.floor(x));
      const f = i >= n ? 0 : smooth(clamp((x - i - 0.3) / 0.4, 0, 1)); // hold, then move, then hold
      const pos = i + f;
      // desktop: the frames pass vertically through the sentence; phone: they slide sideways in their window
      const dy = frames[1].offsetTop - frames[0].offsetTop;
      const dx = frames[1].offsetLeft - frames[0].offsetLeft;
      track.style.transform = dy > 0
        ? `translate3d(0, ${(-pos * dy).toFixed(1)}px, 0)`
        : `translate3d(${(-pos * dx).toFixed(1)}px, 0, 0)`;
      const now = Math.round(pos);
      if (now !== active) {
        active = now;
        if (count) count.textContent = String(now + 1);
      }
    };
    if (!reduce) {
      addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
      addEventListener('resize', place);
      place();
    }
    if (video && !reduce) {
      const io = new IntersectionObserver(([e]) => { e.isIntersecting ? video.play().catch(() => {}) : video.pause(); }, { threshold: 0.2 });
      io.observe(video);
    }
  }

  /* ---------- reveals, once ---------- */
  // a picture closed by clip-path has no visible area, so its parent is watched in its place
  const once = (els, cb, margin = '0px 0px -12% 0px') => {
    if (!('IntersectionObserver' in window)) { els.forEach(cb); return; }
    const owner = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { cb(owner.get(e.target) || e.target); io.unobserve(e.target); }
    }, { rootMargin: margin, threshold: 0.01 });
    els.forEach((el) => {
      const watch = el.classList.contains('shutter') || el.matches('.reel') ? el.parentElement : el;
      owner.set(watch, el);
      io.observe(watch);
    });
  };
  once([...document.querySelectorAll('[data-reveal]')], (el) => el.classList.add('is-in'));

  // service rows arrive one after another
  document.querySelectorAll('[data-rows]').forEach((t) => {
    t.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--r', i));
  });
  once([...document.querySelectorAll('[data-rows]')], (el) => el.classList.add('is-in'));

  // the results stack rises line by line
  once([...document.querySelectorAll('.results')], (el) => el.classList.add('is-in'), '0px 0px -20% 0px');

  // the quotation travels in from both edges; the footer name rises letter by letter
  once([...document.querySelectorAll('.voice')], (el) => el.classList.add('is-in'), '0px 0px -25% 0px');
  document.querySelectorAll('.footer__word span').forEach((s, i) => s.style.setProperty('--c', i));
  once([...document.querySelectorAll('.footer')], (el) => el.classList.add('is-in'), '0px 0px -10% 0px');

  // each verb arrives letter by letter as its panel comes in
  if (!reduce) {
    document.querySelectorAll('[data-chars]').forEach((el) => {
      const text = el.textContent;
      el.setAttribute('aria-label', text);
      el.textContent = '';
      [...text].forEach((ch, i) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.setAttribute('aria-hidden', 'true');
        s.style.setProperty('--c', i);
        s.textContent = ch === ' ' ? ' ' : ch;
        el.append(s);
      });
      el.classList.add('is-split');
    });
  }
  once([...document.querySelectorAll('.step')], (el) => {
    el.classList.add('is-in');
    el.querySelector('.step__verb')?.classList.add('is-in');
  }, '0px 0px -30% 0px');

  // videos in the steps play only while they are on screen
  document.querySelectorAll('.step video').forEach((v) => {
    if (reduce) return;
    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }, { threshold: 0.15 });
    io.observe(v);
  });

  /* ---------- the rolling 5,0 ---------- */
  document.querySelectorAll('[data-roll]').forEach((el) => {
    const value = el.textContent.trim();
    const said = Object.assign(document.createElement('span'), { className: 'sr-only', textContent: value + ' de 5' });
    const shown = Object.assign(document.createElement('span'), { className: 'roll__digits' });
    shown.setAttribute('aria-hidden', 'true');
    let i = 0;
    for (const ch of value) {
      if (!/\d/.test(ch)) { shown.append(ch); continue; }
      const col = Object.assign(document.createElement('span'), { className: 'roll__col' });
      const strip = Object.assign(document.createElement('span'), { className: 'roll__strip' });
      strip.style.setProperty('--d', ch);
      strip.style.setProperty('--i', i++);
      col.append(strip);
      shown.append(col);
    }
    el.classList.add('roll');
    el.replaceChildren(said, shown);
    once([el], (x) => x.classList.add('is-in'), '0px 0px -15% 0px');
  });

  /* ---------- proof: one name lit at a time, with what that patient wrote ---------- */
  const proof = document.querySelector('[data-proof]');
  if (proof) {
    const names = [...proof.querySelectorAll('.nm[data-q]')];
    const q = proof.querySelector('[data-proof-quote]');
    const who = proof.querySelector('[data-proof-name]');
    const when = proof.querySelector('[data-proof-when]');
    let k = 0, timer = null, visible = false, held = false;
    const light = (i) => {
      names.forEach((n, j) => n.classList.toggle('is-lit', j === i));
      const n = names[i];
      q.textContent = n.dataset.q;
      who.textContent = n.textContent;
      when.textContent = n.dataset.when;
    };
    light(0);
    const tick = () => { if (visible && !held && !document.hidden) { k = (k + 1) % names.length; light(k); } };
    if (!reduce) {
      timer = setInterval(tick, 3200);
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(proof);
      proof.addEventListener('pointerenter', () => { held = true; });
      proof.addEventListener('pointerleave', () => { held = false; });
    }
    // pointing at a name with a review shows it
    names.forEach((n, i) => n.addEventListener('pointerenter', () => { k = i; light(i); }));
  }

  /* ---------- before / after ---------- */
  document.querySelectorAll('[data-ba]').forEach((root) => {
    const frame = root.querySelector('.ba__frame');
    const range = root.querySelector('.ba__range');
    const before = root.querySelector('.ba__img--before');
    const after = root.querySelector('.ba__img--after');
    const set = (v) => frame.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    root.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => {
      root.querySelectorAll('[data-case]').forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', x === b); });
      const c = b.dataset.case;
      before.src = `assets/img/caso-${c}-antes.jpg`;
      after.src = `assets/img/caso-${c}-despues.jpg`;
      after.alt = b.dataset.altAfter;
      range.value = 50; set(50);
    }));
    // a single sweep shows the frame can be moved
    if (!reduce) once([frame], () => {
      const start = performance.now();
      const run = (t) => {
        const p = clamp((t - start - 700) / 1400, 0, 1);
        const v = 50 + Math.sin(p * Math.PI * 2) * 22 * (1 - p);
        if (document.activeElement !== range) set(v.toFixed(2));
        if (p < 1) requestAnimationFrame(run); else set(range.value);
      };
      requestAnimationFrame(run);
    }, '0px 0px -25% 0px');
  });

  /* ---------- booking: the message writes itself ---------- */
  const book = document.querySelector('[data-book]');
  if (book) {
    const form = book.querySelector('form');
    const msg = book.querySelector('[data-msg]');
    const input = book.querySelector('[data-msg-input]');
    const bubble = book.querySelector('.bubble');
    const what = {
      valoracion: 'Quisiera agendar una valoración general.',
      ortodoncia: 'Quisiera agendar una cita de ortodoncia.',
      implantes: 'Quisiera información y una cita para implantes.',
      diseno: 'Quisiera una cita para diseño de sonrisa.',
      aclaramiento: 'Quisiera agendar un aclaramiento dental.',
      ninos: 'Quisiera agendar una cita para mi hijo o hija.',
      dolor: 'Tengo dolor y quisiera una cita lo antes posible.'
    };
    const when = {
      manana: 'Me queda mejor entre semana en la mañana.',
      tarde: 'Me queda mejor entre semana en la tarde.',
      sabado: 'Me queda mejor el sábado.'
    };
    const write = () => {
      const t = form.elements.t.value, w = form.elements.w.value;
      const text = `Hola, Dra. Tatiana. ${what[t]} ${when[w]} ¿Qué horarios tienen disponibles?`;
      msg.textContent = text;
      input.value = text;
      if (!reduce) { bubble.classList.remove('is-pop'); void bubble.offsetWidth; bubble.classList.add('is-pop'); }
    };
    form.addEventListener('change', write);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      window.open(`https://wa.me/573182589906?text=${encodeURIComponent(input.value)}`, '_blank', 'noopener');
    });

    /* open or closed right now, in Bogotá time (UTC-5, no daylight saving) */
    const title = book.querySelector('[data-status]');
    const detail = book.querySelector('[data-status-detail]');
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const hours = (d) => (d === 0 ? null : d === 6 ? [10, 18] : [9, 18]);
    const fmt = (h) => `${h > 12 ? h - 12 : h}:00 ${h < 12 ? 'a. m.' : 'p. m.'}`;
    const status = () => {
      const now = new Date(Date.now() - 5 * 3600 * 1000);
      const d = now.getUTCDay(), h = now.getUTCHours() + now.getUTCMinutes() / 60;
      const today = hours(d);
      book.querySelectorAll('.hours__table tr').forEach((tr) => tr.classList.toggle('is-today', tr.dataset.days.split(',').includes(String(d))));
      if (today && h >= today[0] && h < today[1]) {
        title.textContent = 'Abierto ahora';
        detail.textContent = `Hoy atendemos hasta las ${fmt(today[1])}. Escríbenos y te respondemos en horario de atención.`;
        title.classList.add('is-open'); title.classList.remove('is-closed');
        return;
      }
      let next = d, label;
      if (today && h < today[0]) label = 'hoy';
      else { do { next = (next + 1) % 7; } while (!hours(next)); label = next === (d + 1) % 7 ? 'mañana' : `el ${days[next]}`; }
      title.textContent = 'Cerrado ahora';
      detail.textContent = `Abrimos ${label} a las ${fmt(hours(next)[0])}. Puedes dejar tu mensaje por WhatsApp desde ya.`;
      title.classList.add('is-closed'); title.classList.remove('is-open');
    };
    status();
    setInterval(status, 60 * 1000);
  }
})();
