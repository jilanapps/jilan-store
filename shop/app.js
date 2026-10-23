/* Jilan Online Shopping Store — app logic (no external libraries) */
(function () {
  'use strict';
  var WA_NUMBER = '923057867149';
  var PAGE_SIZE = 30;

  var grid = document.getElementById('grid');
  var chipsBox = document.getElementById('chips');
  var searchBox = document.getElementById('search');
  var loadMoreBtn = document.getElementById('loadMore');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var toastEl = document.getElementById('toast');

  var backdrop = document.getElementById('modalBackdrop');
  var mImg = document.getElementById('mImg');
  var mCat = document.getElementById('mCat');
  var mName = document.getElementById('mName');
  var mPrice = document.getElementById('mPrice');
  var mCopy = document.getElementById('mCopy');
  var mDl = document.getElementById('mDl');
  var mOrder = document.getElementById('mOrder');
  document.getElementById('modalClose').addEventListener('click', closeModal);
  backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closeModal(); });

  var activeCat = 'Sab';
  var query = '';
  var filtered = [];
  var shown = 0;
  var currentProduct = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Lakh-style PKR formatting: 1169 -> "Rs 1,169", 123456 -> "Rs 1,23,456"
  function fmtRs(n) {
    n = Math.round(Number(n) || 0);
    var s = n.toString();
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    if (rest) {
      last3 = ',' + last3;
      rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    }
    return 'Rs ' + rest + last3;
  }

  function itemCode(p) {
    var m = String(p.link || '').match(/(\d+)\/?$/);
    return m ? m[1] : '';
  }

  /* Order message — bilkul purana format, bas Markaz link ki jagah Item Code
     (link customer ko nazar a jata tha; code se product foran mil jata hai). */
  function orderMsg(cust, p, qty) {
    var code = itemCode(p);
    return 'Assalam-o-Alaikum, Jilan Online Shopping Store se order karna hai.\n\n' +
      'CUSTOMER DETAILS\nName: ' + cust.name + '\nPhone: ' + cust.phone + '\nCity: ' + cust.city + '\nAddress: ' + cust.addr + '\n\n' +
      'ORDER ITEMS\n  1. ' + p.name + '\nPrice: ' + fmtRs(p.price) + '\nQuantity: ' + qty + '\n' +
      (code ? 'Item Code: JLN-' + code + '\n' : '') +
      '\nSubtotal: ' + fmtRs(p.price * qty) + '\nDelivery charges: Separate\nPayment: Cash on Delivery';
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  var PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#16203a"/><text x="200" y="210" font-size="42" font-family="sans-serif" fill="#e8b93c" text-anchor="middle" font-weight="bold">Jilan</text></svg>'
  );

  function cardHTML(p, i) {
    return '<article class="card" data-view="' + i + '">' +
      '<img loading="lazy" src="' + esc(p.img) + '" alt="' + esc(p.name) + '" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">' +
      '<div class="card-body">' +
      '<span class="cat">' + esc(p.cat) + '</span>' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<div class="price">' + fmtRs(p.price) + '</div>' +
      '<button class="btn-order" data-order="' + i + '">📲 Order Karein</button>' +
      '</div></article>';
  }

  function applyFilters() {
    var q = query.trim().toLowerCase();
    filtered = (window.PRODUCTS || []).filter(function (p) {
      if (activeCat !== 'Sab' && p.cat !== activeCat) return false;
      if (q && (p.name + ' ' + p.cat).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    shown = 0;
    grid.innerHTML = '';
    renderMore(true);
  }

  function renderMore(reset) {
    var next = filtered.slice(shown, shown + PAGE_SIZE);
    var html = '';
    for (var k = 0; k < next.length; k++) html += cardHTML(next[k], shown + k);
    grid.insertAdjacentHTML('beforeend', html);
    shown += next.length;
    countEl.textContent = filtered.length + ' products';
    emptyEl.style.display = filtered.length ? 'none' : 'block';
    loadMoreBtn.disabled = shown >= filtered.length;
    loadMoreBtn.style.display = filtered.length > PAGE_SIZE && shown < filtered.length ? '' : 'none';
  }

  function buildChips() {
    var counts = {};
    (window.PRODUCTS || []).forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    var cats = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var html = '<button class="chip active" data-cat="Sab">Sab</button>';
    cats.forEach(function (c) { html += '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; });
    chipsBox.innerHTML = html;
  }

  function openModal(p) {
    currentProduct = p;
    mImg.src = p.img;
    mImg.alt = p.name;
    mImg.onerror = function () { this.onerror = null; this.src = PLACEHOLDER; };
    mCat.textContent = p.cat;
    mName.textContent = p.name;
    mPrice.textContent = fmtRs(p.price);
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  function copyText(t, okMsg) {
    function done() { toast(okMsg); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
    } else { fallbackCopy(t); done(); }
  }

  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  function downloadImage(p) {
    var fname = p.name.replace(/[^\w\-]+/g, '_').slice(0, 40) || 'product';
    fetch(p.img, { mode: 'cors' }).then(function (r) {
      if (!r.ok) throw new Error('bad');
      return r.blob();
    }).then(function (b) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = fname + '.webp';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      toast('Tasveer download ho rahi hai 📥');
    }).catch(function () {
      // CORS blocked — open image in new tab so user can long-press save
      window.open(p.img, '_blank');
      toast('Tasveer khul gayi — long-press karke save karein');
    });
  }

  /* ---- order form ---- */
  var formBackdrop = document.getElementById('formBackdrop');
  var fSummary = document.getElementById('fSummary');
  var qVal = document.getElementById('qVal');
  var formProduct = null;
  var formQty = 1;

  function openOrderForm(p) {
    if (!p) return;
    formProduct = p;
    formQty = 1;
    qVal.textContent = '1';
    var code = itemCode(p);
    fSummary.innerHTML = '<b>' + esc(p.name) + '</b><br>' + fmtRs(p.price) +
      (code ? ' • Item Code: JLN-' + code : '') + '<br><span style="color:var(--muted)">Cash on Delivery</span>';
    formBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeForm() {
    formBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    formProduct = null;
  }
  document.getElementById('formClose').addEventListener('click', closeForm);
  formBackdrop.addEventListener('click', function (e) { if (e.target === formBackdrop) closeForm(); });
  document.getElementById('qMinus').addEventListener('click', function () {
    formQty = Math.max(1, formQty - 1); qVal.textContent = String(formQty);
  });
  document.getElementById('qPlus').addEventListener('click', function () {
    formQty = Math.min(50, formQty + 1); qVal.textContent = String(formQty);
  });
  mOrder.addEventListener('click', function () {
    var p = currentProduct;
    closeModal();
    openOrderForm(p);
  });
  document.getElementById('fSubmit').addEventListener('click', function () {
    if (!formProduct) return;
    var name = document.getElementById('fName').value.trim();
    var phone = document.getElementById('fPhone').value.replace(/[\s-]/g, '');
    var city = document.getElementById('fCity').value.trim();
    var addr = document.getElementById('fAddr').value.trim();
    if (phone.indexOf('+92') === 0) phone = '0' + phone.slice(3);
    if (phone.indexOf('92') === 0) phone = '0' + phone.slice(2);
    var ok = true;
    var ePhone = document.getElementById('ePhone');
    var eAddr = document.getElementById('eAddr');
    if (!/^03\d{9}$/.test(phone)) { ePhone.style.display = 'block'; ok = false; } else ePhone.style.display = 'none';
    if (addr.length < 8) { eAddr.style.display = 'block'; ok = false; } else eAddr.style.display = 'none';
    if (!name || !city) { toast('Naam aur sheher likhna zaroori hai'); ok = false; }
    if (!ok) return;
    var msg = orderMsg({ name: name, phone: phone, city: city, addr: addr }, formProduct, formQty);
    window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    closeForm();
    toast('WhatsApp khul gaya hai — Send dabayein, order ho jayega ✅');
  });

  // events
  chipsBox.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    activeCat = b.getAttribute('data-cat');
    var all = chipsBox.querySelectorAll('.chip');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('active', all[i] === b);
    applyFilters();
  });

  var searchTimer = null;
  searchBox.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      query = searchBox.value;
      applyFilters();
    }, 250);
  });

  loadMoreBtn.addEventListener('click', function () { renderMore(false); });

  grid.addEventListener('click', function (e) {
    var ob = e.target.closest('[data-order]');
    if (ob) {
      e.stopPropagation();
      openOrderForm(filtered[Number(ob.getAttribute('data-order'))]);
      return;
    }
    var vb = e.target.closest('[data-view]');
    if (vb) openModal(filtered[Number(vb.getAttribute('data-view'))]);
  });

  mCopy.addEventListener('click', function () {
    if (!currentProduct) return;
    copyText(currentProduct.name + ' - ' + fmtRs(currentProduct.price), 'Copy ho gaya! 📋');
  });

  mDl.addEventListener('click', function () {
    if (!currentProduct) return;
    downloadImage(currentProduct);
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeModal(); closeForm(); } });

  // init
  buildChips();
  applyFilters();
})();
