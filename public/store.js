const $ = (s) => document.querySelector(s);
const peso = (n) => '₱' + Number(n).toFixed(2);
const esc = (s) =>
  String(s).replace(/[&<>\"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));

let menu = { items: [], addons: [] },
  cart = [],
  cat = 'All',
  searchText = '',
  user = null,
  tt;

const openD = (id) => $('#' + id).showModal();
document.querySelectorAll('dialog').forEach((d) =>
  d.addEventListener('click', (e) => {
    if (e.target === d) d.close();
  })
);

function toast(m) {
  const t = $('#toast');
  t.textContent = m;
  t.hidden = false;
  clearTimeout(tt);
  tt = setTimeout(() => (t.hidden = true), 2000);
}

async function load() {
  menu = await (await fetch('/api/menu')).json();
  renderMenu();
  renderCart();
  loadProofGallery();
}

async function loadProofGallery() {
  const r = await fetch('/api/proof-gallery');
  if (!r.ok) return;
  const photos = await r.json();
  $('#proofGallery').innerHTML = photos.length
    ? photos.map((photo) => `
      <article class="proof-card">
        <img src="/uploads/${encodeURIComponent(photo.image)}" alt="${esc(photo.customer_name)}'s waffle proof">
        <div class="proof-meta">
          <strong>${esc(photo.customer_name)}</strong>
          ${photo.caption ? `<small>${esc(photo.caption)}</small>` : '<small>Happy customer</small>'}
        </div>
      </article>
    `).join('')
    : '<p>Be the first customer to share a proof photo.</p>';
}

function renderMenu() {
  const cats = ['All', ...new Set(menu.items.map((i) => i.category))];
  $('#pills').innerHTML = cats
    .map(
      (c) =>
        `<button class="ghost ${c === cat ? 'on' : ''}" onclick="cat='${c}';renderMenu()">${esc(c)}</button>`
    )
    .join('');
  $('#items').innerHTML =
    menu.items
      .filter(
        (i) =>
          (cat === 'All' || i.category === cat) &&
          `${i.name} ${i.category}`.toLowerCase().includes(searchText)
      )
      .map((i) => {
        const food = i.category === 'Waffles';
        const icon = i.image
          ? ''
          : i.category === 'Waffles'
            ? '🧇'
            : i.category === 'Drinks'
              ? '☕'
              : i.category === 'Pizza'
                ? '🍕'
                : i.category === 'Ice Cream'
                  ? '🍦'
                  : i.category === 'Fries'
                    ? '🍟'
                    : i.category === 'Bubble Tea'
                      ? '🧋'
                      : '☕';
        return (
          `<div class="card ${i.available ? '' : 'sold'}"><div class="tile ${food ? '' : 'd'}">${
            i.image ? `<img src="/uploads/${encodeURIComponent(i.image)}" alt="${esc(i.name)}">` : icon
          }</div><div class="body"><h3>${esc(i.name)}</h3><span class="price">${peso(i.price)}</span>${
            i.available
              ? `<button class="alt" onclick="addTap(${i.id})">Add to order</button>`
              : '<span class="soldtag">Sold out</span>'
          }</div></div>`
        );
      })
      .join('') || '<p>No items yet.</p>';
}

function searchMenu() {
  searchText = $('#menuSearch').value.trim().toLowerCase();
  renderMenu();
}

let pend = null;

function addTap(id) {
  const it = menu.items.find((i) => i.id === id);
  if (it.category !== 'Waffles' || !menu.addons.length) {
    pushLine(id, [], 1);
    return;
  }
  pend = id;
  $('#addTitle').textContent = it.name;
  $('#addQty').value = 1;
  $('#addList').innerHTML = menu.addons
    .map(
      (a) =>
        `<label style="display:block;padding:.25rem 0"><input type="checkbox" value="${a.id}">${esc(a.name)} +${peso(a.price)}</label>`
    )
    .join('');
  $('#addDlg').showModal();
}

function confirmAdd(withExtras) {
  const ids = withExtras
    ? [...document.querySelectorAll('#addList input:checked')].map((x) => +x.value)
    : [];
  pushLine(
    pend,
    ids,
    Math.max(1, Math.min(20, +$('#addQty').value || 1))
  );
  $('#addDlg').close();
}

function pushLine(id, ids, qty) {
  cart.push({ item_id: id, addon_ids: ids, qty });
  renderCart();
  toast('Added to your order');
}

const cartTotal = () => cart.reduce((s, l) => s + line(l).price * l.qty, 0),
  cartCount = () => cart.reduce((s, l) => s + l.qty, 0);

function cartBarUI() {
  $('#cnt').textContent = cartCount();
  const b = $('#cartBar');
  b.hidden = !cart.length;
  b.innerHTML = `<span><b>${cartCount()}</b> item${cartCount() > 1 ? 's' : ''} in your order, ${peso(cartTotal())}</span><button class="alt" onclick="openD('cartDlg')">View order</button>`;
}

function updateChange() {
  const c = $('#cash').value,
    t = cartTotal();
  $('#change').innerHTML =
    c === '' || !cart.length
      ? ''
      : +c >= t
        ? `Change: <b>${peso(+c - t)}</b>`
        : `<span class="err">Cash is less than the total (${peso(t)})</span>`;
}

function line(l) {
  const it = menu.items.find((i) => i.id === l.item_id),
    ads = l.addon_ids
      .map((id) => menu.addons.find((a) => a.id === id))
      .filter(Boolean);
  return {
    it,
    ads,
    price: (it ? it.price : 0) + ads.reduce((s, a) => s + a.price, 0)
  };
}

function renderCart() {
  cartBarUI();
  updateChange();
  if (!cart.length) {
    $('#cart').innerHTML = '<p>Your order is empty. Pick something from the menu.</p>';
    return;
  }

  let total = 0;
  $('#cart').innerHTML =
    '<table>' +
    cart
      .map((l, n) => {
        const { it, ads, price } = line(l);
        total += price * l.qty;
        return `<tr><td><div class="cart-item">${it && it.image ? `<img src="/uploads/${encodeURIComponent(it.image)}" alt="">` : ''}<div>${esc(it ? it.name : 'Item')}<small>${ads.map((a) => esc(a.name)).join(', ')}</small></div></div></td>
  <td><input type="number" min="1" max="20" value="${l.qty}" aria-label="Quantity" onchange="cart[${n}].qty=Math.max(1,+this.value||1);renderCart()"></td>
  <td>${peso(price * l.qty)}</td><td><button class="ghost sm" onclick="cart.splice(${n},1);renderCart()">Remove</button></td></tr>`;
      })
      .join('') +
    `</table><p><b>Total: ${peso(total)}</b> (pay at the counter)</p>`;
}

async function place() {
  $('#err').textContent = '';
  const r = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: $('#name').value.trim(),
      table_no: $('#table').value.trim(),
      lines: cart,
      cash_given: $('#cash').value
    })
  });
  const d = await r.json();
  if (!r.ok) {
    $('#err').textContent = d.error;
    if (/available/.test(d.error)) load();
    return;
  }

  localStorage.setItem('orderId', d.id);
  const total = cartTotal(),
    cash = $('#cash').value;
  cart = [];
  $('#cash').value = '';
  renderCart();
  $('#cartDlg').close();
  $('#bigCode').textContent = d.code;
  $('#codeInfo').innerHTML =
    `Total: <b>${peso(total)}</b>` +
    (cash !== '' ? `<br>Your cash: ${peso(cash)}, change: <b>${peso(cash - total)}</b>` : '');
  $('#codeDlg').showModal();
  track();
  if (user) myOrders();
}

const STEPS = ['Pending', 'Received', 'Preparing', 'Ready', 'Completed'],
  LABEL = { Pending: 'Waiting for cashier' };

async function track() {
  const id = localStorage.getItem('orderId'),
    bar = $('#trackBar');
  if (!id) {
    bar.hidden = true;
    return;
  }

  const r = await fetch('/api/orders/' + id);
  if (!r.ok) {
    localStorage.removeItem('orderId');
    bar.hidden = true;
    return;
  }

  const o = await r.json();
  bar.hidden = false;
  const completed = o.status === 'Completed';
  const msg =
    o.status === 'Pending'
      ? o.code
        ? `Show code <b>${esc(o.code)}</b> to the cashier to confirm.`
        : 'Waiting for the cashier to confirm.'
      : o.status === 'Ready'
        ? 'Your order is ready.'
        : completed
          ? 'Enjoy your order.'
          : 'We are preparing your order.';
  bar.innerHTML =
    `<div><b>Order #${o.id}</b>, table ${esc(o.table_no)}, ${peso(o.total)}<br><small>${msg}</small></div>
 <div class="status">${STEPS.map((s) => `<span class="${s === o.status ? 'on' : ''}">${LABEL[s] || s}</span>`).join('')}</div>` +
    (completed
      ? '<div class="track-actions"><button class="alt" type="button" onclick="openProof()">Share a photo</button><button class="ghost" type="button" onclick="localStorage.removeItem(\'orderId\');track()">Dismiss</button></div>'
      : '');

  if (completed) $('#proofSubmit').disabled = false;
}

function openProof() {
  $('#proofError').textContent = '';
  $('#proofDlg').showModal();
}

async function uploadProof() {
  const id = localStorage.getItem('orderId');
  const input = $('#proofInput');
  const file = input.files[0];

  if (!id || !file) {
    $('#proofError').textContent = 'Choose a photo before uploading.';
    return;
  }

  const fd = new FormData();
  fd.append('photo', file);
  const note = $('#proofCaption').value.trim();
  if (note) fd.append('caption', note);

  const r = await fetch('/api/orders/' + id + '/proof', { method: 'POST', body: fd });
  const d = await r.json();
  if (!r.ok) {
    $('#proofError').textContent = d.error || 'Could not upload proof photo.';
    return;
  }

  $('#proofError').textContent = '';
  input.value = '';
  $('#proofCaption').value = '';
  $('#proofDlg').close();
  loadProofGallery();
  toast('Thank you for sharing your proof photo.');
}

async function acct() {
  user = (await (await fetch('/api/customer/me')).json()).name;
  $('#acctBtn').textContent = user || 'Log in';
  if (user) {
    $('#name').value = user;
    $('#acct').innerHTML = `<p><b>Hi, ${esc(user)}</b></p><div id="hist"></div><button class="ghost" onclick="custLogout()">Log out</button>`;
    myOrders();
  } else {
    $('#acct').innerHTML = `<p>You are ordering as a guest. An account is optional: it saves your name and keeps your order history.</p><button class="alt" onclick="authForm('login')">Log in</button> <button class="ghost" onclick="authForm('register')">Create account</button><div id="authBox" style="margin-top:1rem"></div>`;
  }
}

function authForm(mode) {
  const reg = mode === 'register';
  $('#authBox').innerHTML = `${reg ? '<label for="an">Name</label><input id="an" maxlength="60">' : ''}<label for="ae">Email</label><input id="ae" type="email"><label for="ap">Password</label><input id="ap" type="password">
 <p class="err" id="aerr"></p><button class="alt" onclick="auth('${mode}')">${reg ? 'Create account' : 'Log in'}</button> <button class="ghost" onclick="$('#acctDlg').close()">Keep ordering as guest</button>`;
}

async function auth(mode) {
  const body = { email: $('#ae').value, password: $('#ap').value };
  if (mode === 'register') body.name = $('#an').value;
  const r = await fetch('/api/customer/' + mode, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const d = await r.json();
  if (!r.ok) {
    $('#aerr').textContent = d.error;
    return;
  }
  acct();
}

async function custLogout() {
  await fetch('/api/customer/logout', { method: 'POST' });
  $('#name').value = '';
  acct();
}

async function myOrders() {
  const r = await fetch('/api/customer/orders');
  if (!r.ok) return;
  const o = await r.json();
  $('#hist').innerHTML = o.length
    ? '<h3>Recent orders</h3>' +
      o
        .map(
          (x) =>
            `<article class="history-order"><div><b>Order #${x.id}</b><small>Table ${esc(x.table_no)} · ${peso(x.total)} · ${esc(x.status)}</small></div><div class="history-photos">${x.items.map((i) => i.image ? `<img src="/uploads/${encodeURIComponent(i.image)}" alt="${esc(i.name)}" title="${esc(i.name)}">` : '').join('')}</div></article>`
        )
        .join('')
    : '<p>No orders yet.</p>';
}

$('#proofSubmit').addEventListener('click', uploadProof);
acct();
load();
track();
setInterval(track, 5000);
