'use strict';

/* =========================
   1) Datos de demo
   ========================= */
const DB = {
  products: [
    { id: 'pav-rig',  name: 'Diseño de Pavimento Rígido', price: 29.9, img: 'imagenes_plantillas/Diseño_de_columnas.jpeg' },
    { id: 'vigas-2d', name: 'Diseño de Vigas 2D',         price: 24.9, img: 'imagenes_plantillas/Pavimento_rigido.jpeg' },
    { id: 'col-vias', name: 'Estudios de Vías y Columnas', price: 19.9, img: 'imagenes_plantillas/Vigas_y_columnas.jpeg' }
  ]
};

/* =========================
   2) Utilidades
   ========================= */
const LS = {
  get(key, fallback){ try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch(e){ return fallback; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};

function fmt(n){ return 'S/ ' + Number(n).toFixed(2); }
function findProduct(id){ return DB.products.find(p => p.id === id); }

/* =========================
   3) Carrito
   ========================= */
function cartCount(){
  const cart = LS.get('cart', []);
  return cart.reduce((a,i)=> a + i.qty, 0);
}

function syncCartBadge(){
  const el = document.querySelector('[data-cart-count]');
  if(!el) return;
  const n = cartCount();
  el.textContent = n;
  el.style.display = n > 0 ? 'inline-grid' : 'none';
}

function addToCart(id, qty=1){
  const cart = LS.get('cart', []);
  const found = cart.find(it => it.id === id);
  if(found){ found.qty += qty; } else { cart.push({ id, qty }); }
  LS.set('cart', cart);
  syncCartBadge();
}

function removeFromCart(id){
  const cart = LS.get('cart', []).filter(it => it.id !== id);
  LS.set('cart', cart);
  syncCartBadge();
}

/* =========================
   4) Render: Catálogo / Detalle / Carrito / Checkout / Descargas / Perfil
   ========================= */
function renderCatalog(){
  const wrap = document.querySelector('[data-catalog]');
  if(!wrap) return;

  wrap.innerHTML = '';
  DB.products.forEach(p=>{
    const card = document.createElement('article');
    card.className = 'card outline-red stack-2';
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h3 class="h3">${p.name}</h3>
      <div class="row between center-y">
        <span class="price">${fmt(p.price)}</span>
        <div class="row gap-3">
          <a class="btn btn--ghost" href="./detalle.html?id=${p.id}">Ver</a>
          <button class="btn btn--primary" data-add="${p.id}">Agregar</button>
        </div>
      </div>`;
    wrap.appendChild(card);
  });

  wrap.querySelectorAll('[data-add]').forEach(b=>{
    b.addEventListener('click', e=>{
      addToCart(e.currentTarget.getAttribute('data-add'));
    });
  });
}

function renderDetail(){
  const img   = document.querySelector('[data-detail-img]');
  const title = document.querySelector('[data-detail-title]');
  const price = document.querySelector('[data-detail-price]');
  const add   = document.querySelector('[data-detail-add]');
  if(!img || !title || !price || !add) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 'pav-rig';
  const p = findProduct(id);
  if(!p) return;

  img.src = p.img; img.alt = p.name;
  title.textContent = p.name;
  price.textContent = fmt(p.price);
  add.onclick = ()=> addToCart(p.id);
}

function renderCart(){
  const wrap = document.querySelector('[data-cart]');
  const totalEl = document.querySelector('[data-total]');
  if(!wrap || !totalEl) return;

  const cart = LS.get('cart', []);
  wrap.innerHTML = '';
  let total = 0;

  cart.forEach(item=>{
    const p = findProduct(item.id);
    if(!p) return;
    const line = p.price * item.qty;
    total += line;

    const row = document.createElement('div');
    row.className = 'item';
    row.innerHTML = `
      <div class="row center-y gap-3">
        <img src="${p.img}" alt="${p.name}" style="width:96px;height:auto">
        <div>
          <div>${p.name}</div>
          <div class="muted">Cant: ${item.qty}</div>
        </div>
      </div>
      <div class="row center-y gap-3">
        <div class="price">${fmt(line)}</div>
        <button class="btn" data-remove="${p.id}">Eliminar</button>
      </div>`;
    wrap.appendChild(row);
  });

  totalEl.textContent = fmt(total);

  wrap.querySelectorAll('[data-remove]').forEach(b=>{
    b.addEventListener('click', e=>{
      removeFromCart(e.currentTarget.getAttribute('data-remove'));
      renderCart(); // re-render
    });
  });
}

function renderCheckout(){
  const subEl = document.querySelector('[data-subtotal]');
  const igvEl = document.querySelector('[data-igv]');
  const totEl = document.querySelector('[data-total]');
  const payBtn = document.querySelector('[data-pay]');
  if(!subEl || !igvEl || !totEl || !payBtn) return;

  const cart = LS.get('cart', []);
  const subtotal = cart.reduce((a,it)=>{
    const p = findProduct(it.id); return a + (p ? p.price * it.qty : 0);
  }, 0);
  const igv = 0; // ejemplo
  const total = subtotal + igv;

  subEl.textContent = fmt(subtotal);
  igvEl.textContent = fmt(igv);
  totEl.textContent = fmt(total);

  payBtn.onclick = ()=>{
    const purchases = LS.get('purchases', []);
    cart.forEach(it=>{
      const p = findProduct(it.id);
      if(p) purchases.push({ id:p.id, name:p.name, when:Date.now(), version:'v1.0' });
    });
    LS.set('purchases', purchases);
    LS.set('cart', []);
    location.href = './gracias.html';
  };
}

function renderDownloads(){
  const wrap = document.querySelector('[data-downloads]');
  if(!wrap) return;

  const purchases = LS.get('purchases', []);
  if(!purchases.length){
    wrap.innerHTML = '<p class="muted">No hay compras aún.</p>';
    return;
  }

  wrap.innerHTML = '';
  purchases.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'card row between center-y';
    const btn = document.createElement('a');
    btn.className = 'btn btn--secondary';
    btn.href = '#';
    btn.textContent = 'Descargar';
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      alert('Descarga simulada de ' + p.name);
    });

    const left = document.createElement('div');
    left.innerHTML = `${p.name} <span class="muted">(${p.version})</span>`;

    row.appendChild(left);
    row.appendChild(btn);
    wrap.appendChild(row);
  });
}

function renderProfile(){
  const u = LS.get('user', { email:'-', user:'-' });
  const emailEl = document.querySelector('[data-email]');
  const userEl  = document.querySelector('[data-user]');
  if(emailEl) emailEl.textContent = u.email || '-';
  if(userEl)  userEl.textContent  = u.user  || '-';
}

/* =========================
   5) Auth (demo localStorage)
   ========================= */
function handleRegister(){
  const btn = document.querySelector('#btn-registrar') || document.querySelector('[data-register]');
  if(!btn) return;

  btn.addEventListener('click', ()=>{
    const data = {
      nombres:   document.querySelector('#nombres')?.value?.trim(),
      ap_pat:    document.querySelector('#ap_paterno')?.value?.trim(),
      ap_mat:    document.querySelector('#ap_materno')?.value?.trim(),
      edad:      document.querySelector('#edad')?.value?.trim(),
      carrera:   document.querySelector('#carrera')?.value?.trim(),
      telefono:  document.querySelector('#telefono')?.value?.trim(),
      email:     document.querySelector('#email')?.value?.trim(),
      pais:      document.querySelector('#pais')?.value,
      pass:      document.querySelector('#pass')?.value,
      pass2:     document.querySelector('#pass2')?.value,
      acepto:    document.querySelector('#acepto')?.checked
    };

    // Validaciones rápidas
    const errPass = document.querySelector('#err-pass');
    if(errPass) errPass.style.display = 'none';

    if(!data.nombres || !data.ap_pat || !data.ap_mat || !data.email || !data.pass || !data.pass2 || !data.pais){
      alert('Completa todos los campos obligatorios'); return;
    }
    if(data.pass !== data.pass2){
      if(errPass) errPass.style.display = 'block';
      return;
    }
    if(!data.acepto){
      alert('Debes aceptar Términos y Privacidad'); return;
    }

    // Registrar (DEMO)
    const users = LS.get('users', []);
    if(users.find(u => u.email === data.email)){
      alert('Ese correo ya está registrado'); return;
    }
    users.push({
      email: data.email,
      user:  `${data.nombres} ${data.ap_pat}`,
      meta: {
        ap_mat: data.ap_mat, edad: data.edad, carrera: data.carrera,
        telefono: data.telefono, pais: data.pais
      }
      // En real: password hash en el servidor
    });
    LS.set('users', users);

    // Autologin demo
    LS.set('user', { email: data.email, user: `${data.nombres} ${data.ap_pat}` });
    location.href = './perfil.html';
  });
}

function handleLogin(){
  const btn = document.querySelector('#btn-login') || document.querySelector('[data-login]');
  if(!btn) return;

  btn.addEventListener('click', ()=>{
    const email = document.querySelector('#loginEmail')?.value?.trim();
    const pass  = document.querySelector('#loginPass')?.value; // demo
    if(!email || !pass){ alert('Completa correo y contraseña'); return; }

    const users = LS.get('users', []);
    const u = users.find(x => x.email === email);
    if(!u){ alert('No existe una cuenta con ese correo'); return; }

    LS.set('user', { email: u.email, user: u.user });
    location.href = './perfil.html';
  });
}

/* =========================
   6) Guard de rutas
   ========================= */
function requireAuthOn(paths=[]){
  const must = paths.some(p => location.pathname.endsWith(p));
  if(!must) return;
  if(!LS.get('user', null)) location.href = './login.html';
}

/* =========================
   7) Wiring (al cargar DOM)
   ========================= */
document.addEventListener('DOMContentLoaded', ()=>{
  syncCartBadge();
  renderCatalog();
  renderDetail();
  renderCart();
  renderCheckout();
  renderDownloads();
  renderProfile();
  handleLogin();
  handleRegister();
  requireAuthOn(['perfil.html','checkout.html']);
});

/* =========================
   8) Accesibilidad, aplica preferencias de accesibilidad guardadas (sitewide)
   ========================= */
(function () {
  const prefs = JSON.parse(localStorage.getItem('a11y_prefs') || '{}');
  const root = document.documentElement;
  Object.keys(prefs).forEach(cls => { if (prefs[cls]) root.classList.add(cls); });
})();

/* =========================
   9) Accesibilidad, aplica preferencias de accesibilidad guardadas (clases + números) / (sitewide numbers) en todo el sitio
   ========================= */
(function () {
  const root = document.documentElement;

  // Clases booleanas
  const prefs = JSON.parse(localStorage.getItem('a11y_prefs') || '{}');
  Object.keys(prefs).forEach(cls => { if (prefs[cls]) root.classList.add(cls); });

  // Números (sliders)
  const nums = JSON.parse(localStorage.getItem('a11y_num') || '{}');
  if(nums.scale)  root.style.setProperty('--a11y-font-scale', nums.scale + '%');
  if(nums.line)   root.style.setProperty('--a11y-line', (nums.line/100).toFixed(2));
  if(nums.letter) root.style.setProperty('--a11y-letter', nums.letter + 'px');

  // Idioma
  const meta = JSON.parse(localStorage.getItem('a11y_meta') || '{}');
  if(meta.lang) root.setAttribute('lang', meta.lang);
})();


/* =========================
   10) i18n + ASR funcionalidad extra: traducir textos marcados con [data-i18n]
   ========================= */
(async function(){
  const toSel = document.getElementById('i18n-target');
  const btnTr = document.getElementById('i18n-translate');
  const btnRs = document.getElementById('i18n-reset');
  if(!btnTr) return;

  async function translatePage(){
    const target = toSel.value || 'en-US';
    const nodes = [...document.querySelectorAll('[data-i18n]')];
    const payload = nodes.map(n => ({ key:n.getAttribute('data-i18n'), text:n.innerText.trim() }));

    const res = await fetch('/api/translate', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ target, items: payload })
    });
    if(!res.ok){ alert('Error al traducir'); return; }
    const data = await res.json(); // { translations: [{key, text}] }
    const map = new Map(data.translations.map(x=>[x.key, x.text]));
    nodes.forEach(n=>{
      const k = n.getAttribute('data-i18n');
      if(map.has(k)) n.innerText = map.get(k);
    });
    localStorage.setItem('a11y_meta', JSON.stringify({ ...(JSON.parse(localStorage.getItem('a11y_meta')||'{}')), lang: target }));
    document.documentElement.setAttribute('lang', target);
  }

  function resetSpanish(){
    location.reload(); // simple y efectivo para volver a los textos originales
  }

  btnTr.addEventListener('click', translatePage);
  btnRs.addEventListener('click', resetSpanish);
})();


/* =========================
   11) ASR funcionalidad extra: subir audio/video y recibir VTT + transcripción
   ========================= */
(function(){
  const file = document.getElementById('asr-file');
  const btn  = document.getElementById('asr-upload');
  const out  = document.getElementById('asr-text');
  if(!btn) return;

  btn.addEventListener('click', async ()=>{
    if(!file.files?.length){ alert('Elige un archivo'); return; }
    const fd = new FormData();
    fd.append('media', file.files[0]);

    const res = await fetch('/api/asr', { method:'POST', body: fd });
    if(!res.ok){ alert('Error al generar subtítulos'); return; }
    const data = await res.json(); // { vtt, text }
    out.textContent = data.text || '';
    // descarga automática del .vtt
    const blob = new Blob([data.vtt], { type:'text/vtt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'subtitulos.vtt'; a.click();
    URL.revokeObjectURL(url);
  });
})();

