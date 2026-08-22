  // dark / light theme toggle
  (function(){
    const root = document.documentElement;
    const btn = document.getElementById('themeToggle');
    const saved = localStorage.getItem('tiaa-theme');
    if(saved === 'light'){ root.setAttribute('data-theme','light'); }

    btn?.addEventListener('click', ()=>{
      const isLight = root.getAttribute('data-theme') === 'light';
      if(isLight){
        root.removeAttribute('data-theme');
        localStorage.setItem('tiaa-theme','dark');
      }else{
        root.setAttribute('data-theme','light');
        localStorage.setItem('tiaa-theme','light');
      }
    });
  })();

  // running crypto price ticker
  (function(){
    const track = document.getElementById('tickerTrack');
    if(!track) return;

    const PAIRS = [
      { id:'bitcoin', symbol:'BTC/USDT', fallbackPrice:97250, fallbackChange:1.8 },
      { id:'ethereum', symbol:'ETH/USDT', fallbackPrice:3620, fallbackChange:2.4 },
      { id:'binancecoin', symbol:'BNB/USDT', fallbackPrice:712, fallbackChange:0.6 },
      { id:'solana', symbol:'SOL/USDT', fallbackPrice:198, fallbackChange:3.1 },
      { id:'ripple', symbol:'XRP/USDT', fallbackPrice:2.31, fallbackChange:-0.9 },
      { id:'dogecoin', symbol:'DOGE/USDT', fallbackPrice:0.365, fallbackChange:1.2 },
      { id:'cardano', symbol:'ADA/USDT', fallbackPrice:0.912, fallbackChange:-1.4 },
      { id:'polkadot', symbol:'DOT/USDT', fallbackPrice:6.84, fallbackChange:0.3 },
      { id:'tron', symbol:'TRX/USDT', fallbackPrice:0.268, fallbackChange:0.9 },
      { id:'avalanche-2', symbol:'AVAX/USDT', fallbackPrice:41.2, fallbackChange:2.0 }
    ];

    function fmtPrice(n){
      if(n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits:0 });
      if(n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits:2 });
      return n.toLocaleString('en-US', { maximumFractionDigits:5 });
    }

    function buildItem(symbol, priceVal, change){
      const price = fmtPrice(priceVal);
      const dir = change >= 0 ? 'up' : 'down';
      const sign = change >= 0 ? '+' : '';
      return `<div class="ticker-item">
        <span class="ticker-pair">${symbol}</span>
        <span class="ticker-price">$${price}</span>
        <span class="ticker-change ${dir}">${sign}${change.toFixed(2)}%</span>
      </div>`;
    }

    function renderFallback(){
      const itemsHtml = PAIRS.map(p => buildItem(p.symbol, p.fallbackPrice, p.fallbackChange)).join('');
      // duplicate content so the marquee always has enough width to loop seamlessly
      track.innerHTML = itemsHtml + itemsHtml;
    }

    async function loadTicker(){
      try{
        const ids = PAIRS.map(p=>p.id).join(',');
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
        if(!res.ok) throw new Error('bad response');
        const data = await res.json();

        const itemsHtml = PAIRS.map(p=>{
          const d = data[p.id];
          if(!d) return '';
          return buildItem(p.symbol, d.usd, d.usd_24h_change || 0);
        }).join('');

        if(!itemsHtml){ throw new Error('empty'); }
        // duplicate content for seamless infinite scroll loop
        track.innerHTML = itemsHtml + itemsHtml;
      }catch(err){
        // live API unreachable (e.g. opened as a local file, offline, or rate-limited) —
        // keep the ticker moving with the last known reference prices instead of freezing it
        renderFallback();
      }
    }

    loadTicker();
    setInterval(loadTicker, 60000);
  })();

  // side menu (hamburger) open/close
  (function(){
    const btn = document.getElementById('hamburgerBtn');
    const closeBtn = document.getElementById('sideMenuClose');
    const menu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');

    function openMenu(){
      menu.classList.add('open');
      overlay.classList.add('open');
      menu.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu(){
      menu.classList.remove('open');
      overlay.classList.remove('open');
      menu.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }
    btn?.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    overlay?.addEventListener('click', closeMenu);

    // close on link click (so scroll-to-section is visible)
    menu.querySelectorAll('a.side-menu-item, .side-submenu-link').forEach(link=>{
      link.addEventListener('click', closeMenu);
    });

    // accordion: Produk submenu
    const produkItem = document.getElementById('produkMenuItem');
    const produkTrigger = produkItem?.querySelector('.side-menu-trigger');
    produkTrigger?.addEventListener('click', ()=>{
      const isOpen = produkItem.classList.contains('open');
      produkItem.classList.toggle('open', !isOpen);
      produkTrigger.setAttribute('aria-expanded', String(!isOpen));
    });
  })();

  // ambient candlestick field
  (function(){
    const field = document.getElementById('candleField');
    const n = 48;
    for(let i=0;i<n;i++){
      const bar = document.createElement('div');
      bar.className = 'bar';
      const h = 20 + Math.random()*70;
      bar.style.height = h + '%';
      bar.style.animationDelay = (Math.random()*4) + 's';
      field.appendChild(bar);
    }
  })();

  // scroll reveal
  (function(){
    const targets = document.querySelectorAll('.reveal, .f-item, .f-op');
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, {threshold:0.2});
    targets.forEach((t,i)=>{
      t.style.transitionDelay = (i % 6) * 0.05 + 's';
      io.observe(t);
    });
  })();

  // highlight active page in the sidebar menu
  (function(){
    const current = (document.body.getAttribute('data-page') || '').trim();
    if(!current) return;
    const authPages = ['login', 'register'];
    document.querySelectorAll('.side-menu-item[data-page]').forEach(item=>{
      const target = item.getAttribute('data-page');
      const isMatch = target === current || (authPages.includes(current) && target === 'login');
      if(isMatch){
        item.classList.add('active');
      }
    });
  })();
