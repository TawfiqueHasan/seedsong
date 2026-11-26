// In-page overlays for the demo recordings: an audio tap on the AudioContext destination, a visible
// cursor with click ripples, key badges, a caption pill and an end card, all in the browser top layer.
// Passed to page.addInitScript, so it must be self-contained.
export function installOverlay() {
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode && this.context instanceof AudioContext) {
      const ctx = this.context;
      if (!ctx.__tap) {
        ctx.__tap = ctx.createMediaStreamDestination();
        window.__tapCtx = ctx;
      }
      orig.call(this, ctx.__tap);
    }
    return r;
  };

  window.addEventListener('DOMContentLoaded', () => {
    const css = document.createElement('style');
    css.textContent = `
      .demo-layer{position:fixed;inset:auto;margin:0;padding:0;border:0;background:transparent;overflow:visible;pointer-events:none}
      #demo-cursor{left:0;top:0;width:28px;height:28px;transition:transform 60ms linear;filter:drop-shadow(0 2px 6px rgba(0,0,0,.55))}
      #demo-cursor .ring{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.85);opacity:0;transform:scale(.4)}
      #demo-cursor.click .ring{animation:demo-ring 600ms ease-out}
      @keyframes demo-ring{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(1.6)}}
      #demo-caption{left:50%;bottom:212px;transform:translateX(-50%);max-width:1100px;text-align:center;font:600 25px/1.4 'Manrope Variable',system-ui,sans-serif;color:#EEF1F8;letter-spacing:.005em;
        padding:12px 24px;border-radius:16px;background:rgba(10,14,28,.58);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);opacity:0;transition:opacity 700ms cubic-bezier(.65,0,.35,1)}
      #demo-caption.on{opacity:1}
      #demo-key{right:48px;bottom:212px;font:600 22px 'JetBrains Mono Variable',monospace;color:#EEF1F8;padding:10px 18px;border-radius:12px;background:rgba(10,14,28,.7);border:1px solid rgba(255,255,255,.25);border-bottom-width:3px;opacity:0;transition:opacity 300ms}
      #demo-key.on{opacity:1}
      #demo-key small{display:block;font:500 13px 'Manrope Variable',sans-serif;color:#AAB3C8;margin-top:2px;text-align:center}
      #demo-end{inset:0;width:100vw;height:100vh;display:grid;place-items:center;text-align:center;opacity:0;transition:opacity 1800ms cubic-bezier(.65,0,.35,1);
        background:radial-gradient(ellipse at 50% 120%,rgba(245,179,138,.22),rgba(11,16,32,.78) 55%,rgba(8,11,22,.92))}
      #demo-end.on{opacity:1}
      #demo-end h1{font:400 132px/1 'Fraunces Variable',Georgia,serif;margin:0;color:#EEF1F8;letter-spacing:-.02em}
      #demo-end p{margin:18px 0 0;color:#B4BCD0;font:400 24px/1.5 'Manrope Variable',sans-serif}
      #demo-end .tag{font:italic 300 32px 'Fraunces Variable',serif;color:#EEF1F8;margin-top:22px}
      #demo-end .links{margin-top:44px;font:500 22px/1.8 'JetBrains Mono Variable',monospace;color:#F5B38A}
      #demo-end .foot{margin-top:40px;font-size:18px;color:#8F98AD}`;
    document.head.appendChild(css);
    const mk = (id, html) => {
      const el = document.createElement('div');
      el.id = id;
      el.className = 'demo-layer';
      el.setAttribute('popover', 'manual');
      el.innerHTML = html;
      document.body.appendChild(el);
      return el;
    };
    const end = mk('demo-end', '');
    const caption = mk('demo-caption', '');
    const key = mk('demo-key', '');
    const cursor = mk(
      'demo-cursor',
      '<span class="ring"></span><svg width="26" height="30" viewBox="0 0 26 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16.5 26.2 L12.2 17 L20.5 17 Z" fill="#fff" stroke="#0B1020" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    );
    cursor.style.transform = 'translate(1500px, 760px)';
    window.__demo = {
      raise() {
        for (const el of [end, caption, key, cursor]) {
          try {
            if (el.matches(':popover-open')) el.hidePopover();
            el.showPopover();
          } catch {
            /* ignore */
          }
        }
      },
      caption(text) {
        caption.classList.remove('on');
        setTimeout(() => {
          caption.textContent = text;
          if (text) caption.classList.add('on');
        }, text && caption.textContent ? 650 : 0);
      },
      key(k, label) {
        key.innerHTML = `${k}<small>${label}</small>`;
        key.classList.add('on');
        clearTimeout(window.__keyT);
        window.__keyT = setTimeout(() => key.classList.remove('on'), 1600);
      },
      end(html) {
        end.innerHTML = html;
        end.classList.add('on');
      },
      cursorVisible(v) {
        cursor.style.opacity = v ? '1' : '0';
      },
    };
    window.__demo.raise();
    document.addEventListener('mousemove', (e) => (cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`), true);
    document.addEventListener(
      'mousedown',
      () => {
        cursor.classList.remove('click');
        void cursor.offsetWidth;
        cursor.classList.add('click');
      },
      true,
    );
  });
}
