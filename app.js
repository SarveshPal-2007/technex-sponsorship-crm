/* ============================================================
   TechNex Sponsorship CRM — App Logic
   ============================================================ */

(() => {
  'use strict';

  // ── Storage key ──
  const STORAGE_KEY = 'technexSponsors';

  // ── State ──
  let sponsors = [];
  let editingId = null;
  let activeFilter = 'All';
  let activeSort = 'newest';

  // ── DOM refs ──
  const form         = document.getElementById('sponsorForm');
  const submitBtn    = document.getElementById('submitBtn');
  const cancelBtn    = document.getElementById('cancelEditBtn');
  const tableBody    = document.getElementById('tableBody');
  const sortSelect   = document.getElementById('sortSelect');

  // Form inputs
  const inp = {
    companyName:    document.getElementById('companyName'),
    pocName:        document.getElementById('pocName'),
    expectedAmount: document.getElementById('expectedAmount'),
    status:         document.getElementById('status'),
    notes:          document.getElementById('notes'),
  };

  // Stat cards
  const statTotal   = document.getElementById('statTotal');
  const statSecured = document.getElementById('statSecured');
  const statRaised  = document.getElementById('statRaised');

  // ── Helpers ──
  const statusClasses = {
    'Not Contacted':     'badge--not-contacted',
    'Emailed':           'badge--emailed',
    'Meeting Scheduled': 'badge--meeting',
    'Secured':           'badge--secured',
    'Declined':          'badge--declined',
  };

  const STATUSES = ['Not Contacted', 'Emailed', 'Meeting Scheduled', 'Secured', 'Declined'];

  function formatCurrency(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  // ── CRUD ──

  function loadSponsors() {
    const raw = localStorage.getItem(STORAGE_KEY);
    sponsors = raw ? JSON.parse(raw) : [];
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sponsors));
  }

  function addSponsor(e) {
    e.preventDefault();

    const entry = {
      id:             editingId || Date.now(),
      companyName:    inp.companyName.value.trim(),
      pocName:        inp.pocName.value.trim(),
      expectedAmount: Number(inp.expectedAmount.value),
      status:         inp.status.value,
      notes:          inp.notes.value.trim(),
    };

    if (editingId) {
      const idx = sponsors.findIndex(s => s.id === editingId);
      if (idx !== -1) sponsors[idx] = entry;
      exitEditMode();
    } else {
      sponsors.push(entry);
    }

    saveData();
    render();
    form.reset();
  }

  function deleteSponsor(id) {
    sponsors = sponsors.filter(s => s.id !== id);
    if (editingId === id) exitEditMode();
    saveData();
    render();
  }

  function updateStatus(id, newStatus) {
    const sponsor = sponsors.find(s => s.id === id);
    if (sponsor) {
      sponsor.status = newStatus;
      saveData();
      render();
    }
  }

  // ── Edit mode ──

  function enterEditMode(id) {
    const sponsor = sponsors.find(s => s.id === id);
    if (!sponsor) return;

    editingId = id;
    inp.companyName.value    = sponsor.companyName;
    inp.pocName.value        = sponsor.pocName;
    inp.expectedAmount.value = sponsor.expectedAmount;
    inp.status.value         = sponsor.status;
    inp.notes.value          = sponsor.notes;

    submitBtn.textContent = '✓ Update Sponsor';
    cancelBtn.style.display = 'block';

    // Scroll sidebar into view on mobile
    document.getElementById('sidebar').scrollIntoView({ behavior: 'smooth' });
  }

  function exitEditMode() {
    editingId = null;
    submitBtn.textContent = '+ Add Sponsor';
    cancelBtn.style.display = 'none';
    form.reset();
  }

  // ── Filtering & Sorting ──

  function getFilteredSorted() {
    let list = activeFilter === 'All'
      ? [...sponsors]
      : sponsors.filter(s => s.status === activeFilter);

    switch (activeSort) {
      case 'newest':      list.sort((a, b) => b.id - a.id); break;
      case 'oldest':      list.sort((a, b) => a.id - b.id); break;
      case 'amount-desc': list.sort((a, b) => b.expectedAmount - a.expectedAmount); break;
      case 'amount-asc':  list.sort((a, b) => a.expectedAmount - b.expectedAmount); break;
      case 'name-asc':    list.sort((a, b) => a.companyName.localeCompare(b.companyName)); break;
      case 'name-desc':   list.sort((a, b) => b.companyName.localeCompare(a.companyName)); break;
    }

    return list;
  }

  // ── Render ──

  function renderAnalytics() {
    const total   = sponsors.length;
    const secured = sponsors.filter(s => s.status === 'Secured');
    const raised  = secured.reduce((sum, s) => sum + s.expectedAmount, 0);

    statTotal.textContent   = total;
    statSecured.textContent = secured.length;
    statRaised.textContent  = formatCurrency(raised);
  }

  function renderTable() {
    const list = getFilteredSorted();
    tableBody.innerHTML = '';

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty">
              <div class="empty__icon">📋</div>
              <div class="empty__text">${
                sponsors.length === 0
                  ? 'No sponsors yet — add one from the sidebar!'
                  : 'No sponsors match the current filter.'
              }</div>
            </div>
          </td>
        </tr>`;
      return;
    }

    list.forEach(s => {
      const tr = document.createElement('tr');

      // Status select options
      const statusOptions = STATUSES.map(
        st => `<option value="${st}" ${st === s.status ? 'selected' : ''}>${st}</option>`
      ).join('');

      tr.innerHTML = `
        <td><strong>${escapeHtml(s.companyName)}</strong></td>
        <td>${escapeHtml(s.pocName)}</td>
        <td class="amount">${formatCurrency(s.expectedAmount)}</td>
        <td>
          <select class="status-select" data-id="${s.id}">
            ${statusOptions}
          </select>
          <span class="badge ${statusClasses[s.status] || ''}">${s.status}</span>
        </td>
        <td>
          <span class="notes-preview" title="${escapeAttr(s.notes)}">${escapeHtml(s.notes) || '—'}</span>
        </td>
        <td>
          <div class="actions">
            <button class="actions__btn actions__btn--edit" data-edit="${s.id}">Edit</button>
            <button class="actions__btn actions__btn--delete" data-delete="${s.id}">Delete</button>
          </div>
        </td>`;

      // Show badge, hide select by default; swap on focus
      const sel   = tr.querySelector('.status-select');
      const badge = tr.querySelector('.badge');
      sel.style.display = 'none';

      badge.addEventListener('click', () => {
        badge.style.display = 'none';
        sel.style.display = '';
        sel.focus();
      });

      sel.addEventListener('change', () => {
        updateStatus(s.id, sel.value);
      });

      sel.addEventListener('blur', () => {
        sel.style.display = 'none';
        badge.style.display = '';
      });

      tableBody.appendChild(tr);
    });
  }

  function render() {
    renderAnalytics();
    renderTable();
  }

  // ── Escape helpers ──
  function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Event Listeners ──

  form.addEventListener('submit', addSponsor);
  cancelBtn.addEventListener('click', exitEditMode);

  // Delegated click for edit/delete
  tableBody.addEventListener('click', e => {
    const editId   = e.target.dataset.edit;
    const deleteId = e.target.dataset.delete;
    if (editId)   enterEditMode(Number(editId));
    if (deleteId) deleteSponsor(Number(deleteId));
  });

  // Filter buttons
  document.getElementById('toolbar').addEventListener('click', e => {
    if (!e.target.matches('.toolbar__btn')) return;
    activeFilter = e.target.dataset.filter;

    document.querySelectorAll('.toolbar__btn').forEach(b => b.classList.remove('toolbar__btn--active'));
    e.target.classList.add('toolbar__btn--active');

    render();
  });

  // Sort select
  sortSelect.addEventListener('change', () => {
    activeSort = sortSelect.value;
    render();
  });

  // ── Init ──
  loadSponsors();
  render();
})();
