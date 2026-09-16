/* ============================================
   Expense Tracker
   Add / view / delete transactions + live totals
   Day & Night theme toggle
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  const form        = document.getElementById("form");
  const nameInput   = document.getElementById("name");
  const amountInput = document.getElementById("amount");
  const categorySel = document.getElementById("category");
  const typeToggle  = document.getElementById("typeToggle");
  const list        = document.getElementById("list");
  const balanceEl   = document.getElementById("balance");
  const incomeEl    = document.getElementById("income");
  const expenseEl   = document.getElementById("expense");
  const clearBtn    = document.getElementById("clearBtn");
  const toastEl     = document.getElementById("toast");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon   = document.getElementById("themeIcon");

  const STORAGE_KEY = "expense.transactions.v1";
  const THEME_KEY   = "expense.theme.v1";

  let transactions = [];
  let currentType = "expense";

  /* ---------- Currency formatting ---------- */
  const fmt = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  /* ---------- Toast ---------- */
  let toastTimer = null;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  };

  /* ---------- Persistence ---------- */
  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); } catch (_) {}
  };
  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  };

  /* ---------- Date helper ---------- */
  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  /* ---------- Build one list item ---------- */
  const createItem = (t) => {
    const li = document.createElement("li");
    li.className = "item item--" + t.type;
    li.dataset.id = t.id;

    const sign = t.type === "income" ? "+" : "−";

    li.innerHTML = `
      <div class="item__info">
        <div class="item__name"></div>
        <div class="item__meta">
          <span class="item__tag">${t.type === "income" ? "Income" : "Expense"}</span>
          <span>${t.category}</span>
          <span>·</span>
          <span>${formatDate(t.date)}</span>
        </div>
      </div>
      <div class="item__amount">${sign}${fmt(t.amount)}</div>
      <button class="item__delete" type="button" aria-label="Delete transaction" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>
        </svg>
      </button>
    `;

    li.querySelector(".item__name").textContent = t.name;
    return li;
  };

  /* ---------- Render list + totals ---------- */
  const render = () => {
    list.innerHTML = "";

    if (!transactions.length) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.innerHTML = "<span>🧾</span>No transactions yet — add one above.";
      list.appendChild(empty);
    } else {
      // newest first
      [...transactions]
        .sort((a, b) => b.date - a.date)
        .forEach((t) => list.appendChild(createItem(t)));
    }

    updateTotals();
  };

  /* ---------- Calculate totals dynamically ---------- */
  const updateTotals = () => {
    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
    });

    const balance = income - expense;

    incomeEl.textContent = fmt(income);
    expenseEl.textContent = fmt(expense);
    balanceEl.textContent = fmt(balance);

    balanceEl.classList.remove("positive", "negative");
    if (balance > 0) balanceEl.classList.add("positive");
    else if (balance < 0) balanceEl.classList.add("negative");
  };

  /* ---------- Add transaction ---------- */
  const addTransaction = (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!name) { nameInput.focus(); toast("Add a description ✍️"); return; }
    if (isNaN(amount) || amount <= 0) { amountInput.focus(); toast("Enter a valid amount 💵"); return; }

    transactions.push({
      id: "t" + Date.now() + Math.random().toString(36).slice(2, 6),
      name,
      amount: Math.round(amount * 100) / 100,
      category: categorySel.value,
      type: currentType,
      date: Date.now(),
    });

    save();
    render();

    form.reset();
    setType("expense");
    nameInput.focus();
    toast(currentType === "income" ? "Income added ✅" : "Expense added ✅");
  };

  /* ---------- Delete transaction ---------- */
  const deleteTransaction = (id) => {
    const el = list.querySelector(`.item[data-id="${id}"]`);
    transactions = transactions.filter((t) => t.id !== id);
    save();

    if (el) {
      el.style.transition = "opacity .2s, transform .2s";
      el.style.opacity = "0";
      el.style.transform = "translateX(24px)";
      setTimeout(render, 180);
    } else {
      render();
    }
    toast("Transaction deleted 🗑️");
  };

  /* ---------- Type toggle ---------- */
  const setType = (type) => {
    currentType = type;
    [...typeToggle.querySelectorAll("button")].forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.type === type);
    });
  };

  typeToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-type]");
    if (btn) setType(btn.dataset.type);
  });

  /* ---------- Form submit ---------- */
  form.addEventListener("submit", addTransaction);

  /* ---------- List click (delete) ---------- */
  list.addEventListener("click", (e) => {
    const del = e.target.closest(".item__delete");
    if (del) deleteTransaction(del.closest(".item").dataset.id);
  });

  /* ---------- Clear all ---------- */
  clearBtn.addEventListener("click", () => {
    if (!transactions.length) { toast("Nothing to clear"); return; }
    transactions = [];
    save();
    render();
    toast("All transactions cleared 🧹");
  });

  /* ============================================
     THEME (Day / Night)
     ============================================ */
  const SUN = `<circle cx="12" cy="12" r="4.2" />
    <path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8L6 18M18 6l1.8-1.8" />`;
  const MOON = `<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />`;

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-checked", String(isDark));
    themeIcon.innerHTML = isDark ? MOON : SUN;
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  };

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    toast(next === "dark" ? "Night mode 🌙" : "Day mode ☀️");
  });

  /* ---------- Init ---------- */
  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(THEME_KEY) || "light"; } catch (_) {}
  applyTheme(savedTheme);

  transactions = load();
  render();
});
