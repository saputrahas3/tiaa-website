  // auto-fetch latest trusted market news (Edukasi & Berita)
  (function(){
    const grid = document.getElementById('newsGrid');
    const refreshBtn = document.getElementById('newsRefreshBtn');
    if(!grid) return;

    function rss2json(rssUrl){
      return 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rssUrl);
    }

    const SOURCES = [
      { url: rss2json('https://www.cnbc.com/id/100003114/device/rss/rss.html'), label:'CNBC International' },
      { url: rss2json('https://www.coindesk.com/arc/outboundfeeds/rss/'), label:'CoinDesk · Crypto' },
      { url: rss2json('https://cointelegraph.com/rss'), label:'Cointelegraph · Crypto' }
    ];

    function formatDate(dateStr){
      try{
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
      }catch(e){ return ''; }
    }

    function extractThumb(item){
      if(item.thumbnail) return item.thumbnail;
      const match = (item.description||item.content||'').match(/<img[^>]+src="([^">]+)"/);
      return match ? match[1] : '';
    }

    async function loadNews(){
      grid.innerHTML = '<div class="news-loading">Memuat berita terbaru…</div>';
      try{
        const results = await Promise.all(SOURCES.map(s =>
          fetch(s.url).then(r=>{ if(!r.ok) throw new Error('bad response'); return r.json(); })
            .then(json => (json.items || []).map(item => ({...item, __source: s.label})))
            .catch(()=> [])
        ));
        let items = results.flat();
        if(items.length === 0){ throw new Error('empty'); }

        items.sort((a,b)=> new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        items = items.slice(0, 9);

        grid.innerHTML = '';
        items.forEach(item=>{
          const a = document.createElement('a');
          a.className = 'news-card';
          a.href = item.link || '#';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';

          const imgUrl = extractThumb(item);
          if(imgUrl){
            const img = document.createElement('img');
            img.className = 'news-thumb';
            img.src = imgUrl;
            img.alt = item.title || '';
            img.loading = 'lazy';
            img.onerror = function(){ this.remove(); };
            a.appendChild(img);
          }

          const body = document.createElement('div');
          body.className = 'news-body';
          body.innerHTML = `
            <div class="news-source">${item.__source}</div>
            <div class="news-title">${(item.title||'').replace(/</g,'&lt;')}</div>
            <div class="news-date">${formatDate(item.pubDate)}</div>
          `;
          a.appendChild(body);
          grid.appendChild(a);
        });
      }catch(err){
        grid.innerHTML = '<div class="news-error">Berita tidak bisa dimuat saat ini — coba muat ulang, atau periksa koneksi internet Anda.</div>';
      }
    }

    loadNews();
    refreshBtn?.addEventListener('click', loadNews);
  })();

