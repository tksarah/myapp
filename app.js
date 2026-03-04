const TODO_KEY = "todos";
const CATEGORY_KEY = "categories";

/* ===== DOM ===== */
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const dueDateInput = document.getElementById("due-date-input");
const todoList = document.getElementById("todo-list");
const categorySelect = document.getElementById("category-select");

const statusFilter = document.getElementById("status-filter");
const categoryFilter = document.getElementById("category-filter");
const dueFilter = document.getElementById("due-filter");
const sortSelect = document.getElementById("sort-select");

const openModalBtn = document.getElementById("open-category-modal");
const closeModalBtn = document.getElementById("close-category-modal");
const modal = document.getElementById("category-modal");

const categoryListEl = document.getElementById("category-list");
const newCategoryInput = document.getElementById("new-category-input");
const addCategoryBtn = document.getElementById("add-category-button");

/* ===== Color Picker State ===== */
let selectedCategoryColor = "#999999";

/* ===== State ===== */
let todos = loadTodos();
let categories = loadCategories();

let currentSort = "created-desc";
let currentStatusFilter = "all";
let currentCategoryFilter = "all";
let currentDueFilter = "all";

/* ===== Utility ===== */
function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getThisWeekRangeLocal() {
  const now = new Date();
  const mondayBased = (now.getDay() + 6) % 7;

  const start = new Date(now);
  start.setDate(start.getDate() - mondayBased);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    startStr: getLocalDateString(start),
    endStr: getLocalDateString(end),
  };
}

/* ===== Models ===== */
function createCategory(name, color) {
  return {
    id: crypto.randomUUID(),
    name,
    color: color || "#999999",
    createdAt: new Date().toISOString(),
  };
}

function createTodo(title, categoryId, dueDate) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    categoryId,
    completed: false,
    dueDate: dueDate || null,
    createdAt: now,
    updatedAt: now,
  };
}

/* ===== Storage ===== */
function loadTodos() {
  return JSON.parse(localStorage.getItem(TODO_KEY) || "[]");
}
function saveTodos() {
  localStorage.setItem(TODO_KEY, JSON.stringify(todos));
}
function loadCategories() {
  return JSON.parse(localStorage.getItem(CATEGORY_KEY) || "[]");
}
function saveCategories() {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories));
}

/* ===== Init ===== */
if (categories.length === 0) {
  categories.push(createCategory("未分類", "#777777"));
  saveCategories();
}
renderAll();

/* ===== Color Picker Init ===== */
document.querySelectorAll(".color-dot").forEach(dot => {
  dot.style.backgroundColor = dot.dataset.color;
  dot.onclick = () => {
    document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
    dot.classList.add("selected");
    selectedCategoryColor = dot.dataset.color;
  };
});

/* ===== Modal ===== */
openModalBtn.onclick = () => modal.classList.remove("hidden");
closeModalBtn.onclick = () => modal.classList.add("hidden");
modal.onclick = (e) => e.target === modal && modal.classList.add("hidden");

/* ===== Category CRUD ===== */
addCategoryBtn.onclick = () => {
  const name = newCategoryInput.value.trim();
  if (!name) return;

  categories.push(createCategory(name, selectedCategoryColor));
  newCategoryInput.value = "";
  selectedCategoryColor = "#999999";
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));

  saveCategories();
  renderAll();
};

function deleteCategory(id) {
  const uncategorized = categories.find(c => c.name === "未分類");
  todos.forEach(t => {
    if (t.categoryId === id) t.categoryId = uncategorized.id;
  });
  categories = categories.filter(c => c.id !== id);
  saveCategories();
  saveTodos();
  renderAll();
}

/* ===== Todo CRUD ===== */
todoForm.onsubmit = (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  todos.push(createTodo(title, categorySelect.value, dueDateInput.value));
  todoInput.value = "";
  dueDateInput.value = "";
  saveTodos();
  renderTodos();
};

function toggleTodo(todo) {
  todo.completed = !todo.completed;
  todo.updatedAt = new Date().toISOString();
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  renderTodos();
}

/* ===== Render ===== */
function renderTodos() {
  todoList.innerHTML = "";

  let visible = [...todos];

  if (currentStatusFilter === "active") {
    visible = visible.filter(t => !t.completed);
  } else if (currentStatusFilter === "completed") {
    visible = visible.filter(t => t.completed);
  }

  if (currentCategoryFilter !== "all") {
    visible = visible.filter(t => t.categoryId === currentCategoryFilter);
  }

  if (currentDueFilter !== "all") {
    const todayStr = getLocalDateString();
    const { startStr, endStr } = getThisWeekRangeLocal();

    visible = visible.filter(t => {
      if (!t.dueDate) return false;
      if (currentDueFilter === "today") return t.dueDate === todayStr;
      if (currentDueFilter === "week") return t.dueDate >= startStr && t.dueDate <= endStr;
      return true;
    });
  }

  visible.sort((a, b) => {
    if (currentSort.startsWith("due")) {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return currentSort === "due-asc"
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate);
    }

    const key = currentSort.startsWith("created") ? "createdAt" : "updatedAt";
    return currentSort.endsWith("asc")
      ? new Date(a[key]) - new Date(b[key])
      : new Date(b[key]) - new Date(a[key]);
  });

  visible.forEach(todo => {
    const li = document.createElement("li");
    if (todo.completed) li.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.onclick = () => toggleTodo(todo);

    const cat = categories.find(c => c.id === todo.categoryId);
    const catSpan = document.createElement("span");
    catSpan.className = "category";
    catSpan.textContent = cat ? cat.name : "未分類";
    catSpan.style.backgroundColor = cat?.color || "#777777";

    const title = document.createElement("span");
    title.className = "title";
    title.textContent = todo.title;

    const dueSpan = document.createElement("span");
    dueSpan.className = "due-date";
    dueSpan.textContent = todo.dueDate ? `期限: ${todo.dueDate}` : "期限なし";

    const del = document.createElement("button");
    del.textContent = "×";
    del.onclick = () => deleteTodo(todo.id);

    li.append(checkbox, catSpan, title, dueSpan, del);
    todoList.appendChild(li);
  });
}

function renderCategoryList() {
  categoryListEl.innerHTML = "";
  categories.forEach(c => {
    const row = document.createElement("li");
    row.className = "category-row";

    const nameSpan = document.createElement("span");
    nameSpan.className = "category-name";
    nameSpan.textContent = c.name;
    nameSpan.style.backgroundColor = c.color;

    const del = document.createElement("button");
    del.textContent = "削除";
    del.disabled = (c.name === "未分類");
    del.onclick = () => deleteCategory(c.id);

    row.append(nameSpan, del);
    categoryListEl.appendChild(row);
  });
}

function renderCategorySelects() {
  categorySelect.innerHTML = "";
  categoryFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "all";
  allOpt.textContent = "すべてのカテゴリ";
  categoryFilter.appendChild(allOpt);

  categories.forEach(c => {
    const opt1 = document.createElement("option");
    opt1.value = c.id;
    opt1.textContent = c.name;
    categorySelect.appendChild(opt1);

    const opt2 = opt1.cloneNode(true);
    categoryFilter.appendChild(opt2);
  });
}

function renderAll() {
  renderCategoryList();
  renderCategorySelects();
  renderTodos();
}

/* ===== Events ===== */
statusFilter.onchange = () => {
  currentStatusFilter = statusFilter.value;
  renderTodos();
};

categoryFilter.onchange = () => {
  currentCategoryFilter = categoryFilter.value;
  renderTodos();
};

dueFilter.onchange = () => {
  currentDueFilter = dueFilter.value;
  renderTodos();
};

sortSelect.onchange = () => {
  currentSort = sortSelect.value;
  renderTodos();
};
