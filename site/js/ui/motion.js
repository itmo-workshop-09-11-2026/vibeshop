// Декоративный отклик: не задерживает действия и не меняет данные магазина.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const running = new Set();
reduced.addEventListener('change', () => {
  if (reduced.matches) for (const animation of running) animation.cancel();
});

export function animateFeedback(el, frames, duration = 320) {
  if (!el || reduced.matches || !el.animate) return;
  const animation = el.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
  running.add(animation);
  animation.finished.catch(() => {}).finally(() => running.delete(animation));
  return animation;
}

export function addedFeedback(btn) {
  animateFeedback(btn, [
    { transform: 'scale(1)' }, { transform: 'scale(.96)', offset: .25 }, { transform: 'scale(1)' },
  ]);
  const card = btn.closest('.card');
  animateFeedback(card?.querySelector('.card__media'), [
    { boxShadow: '0 0 0 0 #ff5a1f00' },
    { boxShadow: '0 0 0 5px #ff5a1f55', offset: .4 },
    { boxShadow: '0 0 0 0 #ff5a1f00' },
  ], 400);
}

export function promoFeedback(foot, ok) {
  animateFeedback(foot.querySelector('.promo__msg'), [
    { opacity: .3, transform: 'translateY(5px)' }, { opacity: 1, transform: 'translateY(0)' },
  ]);
  if (ok) {
    animateFeedback(foot.querySelector('.sum__total'), [
      { backgroundColor: '#ff5a1f33', transform: 'scale(.98)' },
      { backgroundColor: '#ff5a1f00', transform: 'scale(1)' },
    ], 400);
    animateFeedback(foot.querySelector('.promo__applied'), [
      { opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' },
    ]);
  } else {
    animateFeedback(foot.querySelector('.promo__row'), [
      { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' }, { transform: 'translateX(0)' },
    ], 240);
  }
}

export function initMotion() {
  const header = document.querySelector('.site-header');
  const measure = () => document.documentElement.style.setProperty('--header-size', `${header.getBoundingClientRect().height}px`);
  measure();
  new ResizeObserver(measure).observe(header);

  // Делегирование работает и для перерисованных карточек и диалогов.
  document.addEventListener('click', e => {
    const button = e.target.closest('button, .btn');
    if (!button || button.disabled) return;
    animateFeedback(button, [{ scale: '1' }, { scale: '.97' }, { scale: '1' }], 220);
  });
  const art = document.querySelector('.hero__art');
  art.addEventListener('pointermove', e => {
    if (reduced.matches || e.pointerType !== 'mouse') return;
    const rect = art.getBoundingClientRect();
    art.style.setProperty('--light-x', `${(e.clientX - rect.left) / rect.width * 100}%`);
    art.style.setProperty('--light-y', `${(e.clientY - rect.top) / rect.height * 100}%`);
  });
  art.addEventListener('pointerleave', () => {
    art.style.removeProperty('--light-x'); art.style.removeProperty('--light-y');
  });
}
