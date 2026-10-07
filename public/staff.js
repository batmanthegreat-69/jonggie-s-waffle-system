const $ = (s) => document.querySelector(s),
  peso = (n) => '₱' + Number(n).toFixed(2);
const esc = (s) =>
  String(s).replace(/[&<>\"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));

const api = (u, m = 'GET', b) =>
  fetch(u, {
    method: m,
    headers: { 'Content-Type': 'application/json' },
    body: b && JSON.stringify(b)
  }).then((r) => r.json());

let timer;

async function init() {
  const me = await api('/api/me');
  $('#login').hidden = !!me.user;
  $('#app').hidden = !me.user;
  clearInterval(timer);
  if (me.user) {
    refresh();
    timer = setInterval(refresh, 5000);
  }
}

async function login(e) {
  e.preventDefault();
  const r = await api('/api/login', 'POST', {
    username: $('#u').value,
    password: $('#p').value
  });
  r.error ? $('#err').textContent = r.error : init();
}

async function logout() {
  await api('/api/logout', 'POST');
  init();
}

const NEXT = { Received: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function orderTime(value, options) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, options);
}

function renderOrderCard(order, history = false) {
  const created = orderTime(order.created, history
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { hour: 'numeric', minute: '2-digit' });
  return `<article class="card ${order.status === 'Completed' ? 'done' : ''}">
    <div class="order-card-heading">
      <h3>#${order.id} <span>·</span> Table ${esc(order.table_no)}</h3>
      ${created ? `<time>${esc(created)}</time>` : ''}
    </div>
    <small class="order-customer">${esc(order.customer)}</small>
    <ul>${order.items.map((item) => `<li class="order-item">${item.image ? `<img class="order-item-photo" src="/uploads/${encodeURIComponent(item.image)}" alt="">` : ''}<span class="order-item-copy">${item.qty} x ${esc(item.name)}${item.addons ? `<small>${esc(item.addons)}</small>` : ''}</span></li>`).join('')}</ul>
    <b class="order-total">${peso(order.total)}</b>
    ${order.cash_given != null ? `<small class="order-cash">Cash ${peso(order.cash_given)}, change ${peso(order.cash_given - order.total)}</small>` : ''}
    <div class="status"><span class="on">${esc(order.status)}</span></div>
    ${order.status === 'Pending' ? `<p><small>Waiting for the customer's code (${esc(order.code || '')}).</small></p>` : ''}
    ${history ? '' : `<label class="order-paid"><input type="checkbox" ${order.paid ? 'checked' : ''} onchange="patchOrder(${order.id},{paid:this.checked})">Paid at counter</label>
    ${NEXT[order.status] ? `<button class="alt order-action" onclick="patchOrder(${order.id},{status:'${NEXT[order.status]}'})">Mark ${NEXT[order.status]}</button>` : ''}`}
  </article>`;
}

async function refresh() {
  const orders = await api('/api/staff/orders?date=' + encodeURIComponent(localDateValue()));
  if (orders.error) {
    init();
    return;
  }

  const active = orders.filter((order) => order.status !== 'Completed');
  const completed = orders.filter((order) => order.status === 'Completed');
  $('#activeCount').textContent = active.length;
  $('#completedCount').textContent = completed.length;
  $('#activeOrders').innerHTML = active.length
    ? active.map((order) => renderOrderCard(order)).join('')
    : '<p class="orders-empty">No active orders. New orders appear here automatically.</p>';
  $('#completedOrders').innerHTML = completed.length
    ? completed.map((order) => renderOrderCard(order)).join('')
    : '<p class="orders-empty">No completed orders today.</p>';

  const m = await api('/api/menu');
  if (!document.activeElement || document.activeElement.tagName !== 'INPUT')
    $('#menuList').innerHTML =
      '<table><tr><th>Photo</th><th>Item</th><th>Price</th><th>Available</th><th></th></tr>' +
      m.items
        .map(
          (i) =>
            `<tr><td>${i.image ? `<img src="/uploads/${encodeURIComponent(i.image)}" alt="" width="56" height="56" style="object-fit:cover;border-radius:8px;display:block">` : '<small>No photo</small>'}<label class="btn" style="display:inline-block;position:relative;margin-top:.3rem;padding:.2rem .6rem;font-size:.8rem;cursor:pointer">${i.image ? 'Change' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" style="position:absolute;opacity:0;width:1px;height:1px" onchange="uploadPhoto(${i.id},this)"></label>${i.image ? ` <button class="ghost" style="padding:.2rem .6rem;font-size:.8rem" onclick="removePhoto(${i.id})">Remove</button>` : ''}</td><td>${esc(i.name)}<small style="display:block">${esc(i.category)}</small></td>
 <td><input type="number" min="0" value="${i.price}" aria-label="Price" onchange="patchItem(${i.id},{price:this.value})"></td>
 <td><input type="checkbox" style="width:auto" ${i.available ? 'checked' : ''} aria-label="Available" onchange="patchItem(${i.id},{available:this.checked})"></td>
 <td><button class="ghost" onclick="if(confirm('Delete this item?'))delItem(${i.id})">Delete</button></td></tr>`
        )
        .join('') + '</table>';
}

async function searchHistory(event) {
  event.preventDefault();
  const results = $('#historyResults');
  results.innerHTML = '<p class="admin-muted">Searching orders…</p>';
  const params = new URLSearchParams({
    date: $('#historyDate').value,
    search: $('#historySearch').value.trim()
  });
  const orders = await api('/api/staff/orders?' + params.toString());
  if (orders.error) {
    results.innerHTML = `<p class="err">${esc(orders.error)}</p>`;
    return;
  }
  results.innerHTML = orders.length
    ? orders.map((order) => renderOrderCard(order, true)).join('')
    : '<p class="orders-empty">No matching orders for that date.</p>';
}

async function confirmCode() {
  const m = $('#cmsg'),
    r = await fetch('/api/staff/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: $('#code').value })
    }),
    d = await r.json();
  if (!r.ok) {
    m.className = 'err';
    m.textContent = d.error;
    return;
  }

  m.className = '';
  m.textContent =
    `Order #${d.id} for table ${d.table_no} confirmed. Total ${peso(d.total)}` +
    (d.cash_given != null ? `, cash ${peso(d.cash_given)}, give change ${peso(d.cash_given - d.total)}.` : '.');
  $('#code').value = '';
  refresh();
}

// Shrinks the photo in the browser first (phone photos are huge), then uploads it.
async function uploadPhoto(id, input) {
  const f = input.files[0];
  if (!f) return;

  try {
    const bmp = await createImageBitmap(f),
      k = Math.min(1, 900 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
    const fd = new FormData();
    fd.append('photo', blob, 'photo.jpg');
    const r = await fetch('/api/staff/items/' + id + '/image', { method: 'POST', body: fd }),
      d = await r.json();
    if (!r.ok) alert(d.error);
  } catch (e) {
    alert('Could not read that image. Try a JPG or PNG.');
  }
  refresh();
}

async function removePhoto(id) {
  if (confirm('Remove this photo?')) {
    await api('/api/staff/items/' + id + '/image', 'DELETE');
    refresh();
  }
}

async function patchOrder(id, b) {
  await api('/api/staff/orders/' + id, 'PATCH', b);
  refresh();
}

async function patchItem(id, b) {
  await api('/api/staff/items/' + id, 'PATCH', b);
  refresh();
}

async function delItem(id) {
  await api('/api/staff/items/' + id, 'DELETE');
  refresh();
}

async function addItem() {
  const r = await api('/api/staff/items', 'POST', {
    name: $('#nn').value.trim(),
    category: $('#nc').value,
    price: $('#np').value
  });
  if (r.error) {
    $('#merr').textContent = r.error;
    return;
  }
  $('#merr').textContent = '';
  $('#nn').value = '';
  $('#np').value = '';
  refresh();
}

$('#historyDate').value = localDateValue();
init();
