import { useState, useEffect } from "react";
import "./App.css";

const CATEGORIES = [
  "Bills",
  "Recharge",
  "Subscription",
  "Warranty",
  "Birthday",
  "Personal",
  "Study",
  "Health",
  "Shopping",
  "Other",
];

const FILTERS = ["All", "Today", "Upcoming", "Overdue", "Completed"];

// Days before the due date when the user wants an alert (0 = on the day)
const REMIND_OPTIONS = [
  { days: 7, label: "7 days before" },
  { days: 1, label: "1 day before" },
  { days: 0, label: "On the due date" },
];

/* ---------- Date helpers (all use LOCAL time, not UTC) ---------- */

const pad = (n) => String(n).padStart(2, "0");

const toISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getToday = () => toISO(new Date());

const parseISO = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatDate = (iso) =>
  parseISO(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const daysLeft = (iso, today) =>
  Math.round((parseISO(iso) - parseISO(today)) / 86400000);

// Next due date for a repeating reminder.
// anchorDay = the original day of month (e.g. 31), so 31 Jan -> 28 Feb -> 31 Mar.
const nextDate = (iso, repeat, anchorDay) => {
  const [y, m, d] = iso.split("-").map(Number);
  const day = anchorDay || d;

  if (repeat === "Daily") return toISO(new Date(y, m - 1, d + 1));
  if (repeat === "Weekly") return toISO(new Date(y, m - 1, d + 7));

  if (repeat === "Monthly") {
    const lastDayNextMonth = new Date(y, m + 1, 0).getDate();
    return toISO(new Date(y, m, Math.min(day, lastDayNextMonth)));
  }

  if (repeat === "Yearly") {
    const lastDayNextYear = new Date(y + 1, m, 0).getDate();
    return toISO(new Date(y + 1, m - 1, Math.min(day, lastDayNextYear)));
  }

  return iso;
};

const formatAmount = (amount) => {
  const n = Number(amount);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

const remindLabel = (days) =>
  days
    .map((d) => (d === 0 ? "due date" : `${d}d before`))
    .join(", ");

/* ---------- Component ---------- */

function App() {
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("lifeset_tasks");

      return savedTasks
        ? JSON.parse(savedTasks)
        : [
            { id: 1, title: "Pay electricity bill", category: "Bills", date: "2026-11-07", done: false, repeat: "Monthly", anchorDay: 7, amount: null, remindBefore: [1, 0] },
            { id: 2, title: "Renew gym membership", category: "Personal", date: "2026-11-08", done: false, repeat: "None", anchorDay: 8, amount: null, remindBefore: [1, 0] },
            { id: 3, title: "Complete college assignment", category: "Study", date: "2026-11-06", done: true, repeat: "None", anchorDay: 6, amount: null, remindBefore: [1, 0] },
          ];
    } catch {
      return [];
    }
  });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Personal");
  const [date, setDate] = useState("");
  const [repeat, setRepeat] = useState("None");
  const [amount, setAmount] = useState("");
  const [remindBefore, setRemindBefore] = useState([1, 0]);
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    localStorage.setItem("lifeset_tasks", JSON.stringify(tasks));
  }, [tasks]);

  const today = getToday();

  const resetForm = () => {
    setTitle("");
    setCategory("Personal");
    setDate("");
    setRepeat("None");
    setAmount("");
    setRemindBefore([1, 0]);
    setEditingId(null);
  };

  const toggleRemind = (days) => {
    setRemindBefore((prev) =>
      prev.includes(days)
        ? prev.filter((d) => d !== days)
        : [...prev, days].sort((a, b) => b - a)
    );
  };

  const addTask = (e) => {
    e.preventDefault();

    if (!title.trim() || !date) return;

    const amountValue = amount === "" ? null : Number(amount);

    if (editingId !== null) {
      setTasks(
        tasks.map((task) =>
          task.id === editingId
            ? {
                ...task,
                title: title.trim(),
                category,
                date,
                repeat,
                anchorDay: Number(date.split("-")[2]),
                amount: amountValue,
                remindBefore,
              }
            : task
        )
      );
    } else {
      setTasks([
        ...tasks,
        {
          id: Date.now(),
          title: title.trim(),
          category,
          date,
          repeat,
          anchorDay: Number(date.split("-")[2]),
          amount: amountValue,
          remindBefore,
          done: false,
        },
      ]);
    }

    resetForm();
  };

  const startEdit = (task) => {
    setTitle(task.title);
    setCategory(task.category);
    setDate(task.date);
    setRepeat(task.repeat || "None");
    setAmount(task.amount === null || task.amount === undefined ? "" : String(task.amount));
    setRemindBefore(task.remindBefore || []);
    setEditingId(task.id);
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter((t) => t.id !== id));
    if (editingId === id) resetForm();
  };

  // Marking a repeating reminder as done creates the next one automatically.
  const toggleDone = (task) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === task.id ? { ...t, done: !t.done } : t
      );

      if (!task.done && task.repeat && task.repeat !== "None") {
        updated.push({
          ...task,
          id: Date.now(),
          date: nextDate(task.date, task.repeat, task.anchorDay),
          done: false,
        });
      }

      return updated;
    });
  };

  const filteredTasks = tasks
    .filter((task) => {
      if (filter === "Today") return task.date === today && !task.done;
      if (filter === "Upcoming") return task.date > today && !task.done;
      if (filter === "Overdue") return task.date < today && !task.done;
      if (filter === "Completed") return task.done;
      return !task.done;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const completed = tasks.filter((task) => task.done).length;
  const pending = tasks.filter((task) => !task.done).length;
  const overdue = tasks.filter((task) => !task.done && task.date < today).length;

  const getBadge = (task) => {
    if (task.done) return null;
    const left = daysLeft(task.date, today);

    if (left < 0)
      return (
        <span className="badge overdue">
          {Math.abs(left)} {Math.abs(left) === 1 ? "day" : "days"} overdue
        </span>
      );
    if (left === 0) return <span className="badge due-today">Due today</span>;
    if (left <= 7)
      return (
        <span className="badge soon">
          {left} {left === 1 ? "day" : "days"} left
        </span>
      );
    return null;
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2 className="logo">Life<span>Set.</span></h2>
        <p className="menu-label">MENU</p>

        <button
          className={filter === "All" ? "nav-item active" : "nav-item"}
          onClick={() => setFilter("All")}
        >
          ▦ Dashboard
        </button>
        <button
          className={filter === "Today" ? "nav-item active" : "nav-item"}
          onClick={() => setFilter("Today")}
        >
          ◷ Today
        </button>
        <button
          className={filter === "Upcoming" ? "nav-item active" : "nav-item"}
          onClick={() => setFilter("Upcoming")}
        >
          ▣ Upcoming
        </button>
        <button
          className={filter === "Completed" ? "nav-item active" : "nav-item"}
          onClick={() => setFilter("Completed")}
        >
          ✓ Completed
        </button>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">L</div>
            <div>
              <strong>My LifeSet</strong>
              <small>Personal space</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="welcome">YOUR PERSONAL ORGANIZER</p>
            <h1>Dashboard</h1>
          </div>
          <div className="today-date">{new Date().toDateString()}</div>
        </header>

        <section className="hero">
          <div>
            <p className="welcome">YOUR DAY, YOUR CONTROL</p>
            <h2>
              {overdue > 0
                ? `${overdue} overdue ${overdue === 1 ? "reminder needs" : "reminders need"} attention.`
                : "Make today count."}
            </h2>
            <p>Keep your tasks, reminders and everyday life organised.</p>
          </div>
          <div className="hero-icon">✦</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Total pending</span>
            <h2>{pending}</h2>
            <small>Tasks to take care of</small>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <h2>{completed}</h2>
            <small>Tasks finished</small>
          </div>
          <div className="stat-card">
            <span>Total reminders</span>
            <h2>{tasks.length}</h2>
            <small>Everything in one place</small>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="welcome">STAY ON TRACK</p>
                <h2>{filter === "All" ? "Your reminders" : filter + " reminders"}</h2>
              </div>
              <span className="task-count">{filteredTasks.length} tasks</span>
            </div>

            <div className="filters">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  className={filter === item ? "filter active-filter" : "filter"}
                  onClick={() => setFilter(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="task-list">
              {filteredTasks.length === 0 && (
                <p className="empty">Nothing here yet. Enjoy your free time!</p>
              )}

              {filteredTasks.map((task) => (
                <div className="task" key={task.id}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task)}
                  />

                  <div className="task-info">
                    <strong className={task.done ? "done" : ""}>{task.title}</strong>
                    <small>
                      {task.category} · {formatDate(task.date)}
                      {task.repeat && task.repeat !== "None" ? ` · ${task.repeat}` : ""}
                    </small>
                    {task.remindBefore && task.remindBefore.length > 0 && (
                      <small>Alerts: {remindLabel(task.remindBefore)}</small>
                    )}
                  </div>

                  {task.amount !== null && task.amount !== undefined && (
                    <span className="amount">{formatAmount(task.amount)}</span>
                  )}

                  {getBadge(task)}

                  <button className="edit" onClick={() => startEdit(task)}>
                    Edit
                  </button>
                  <button
                    className="delete"
                    aria-label={`Delete ${task.title}`}
                    onClick={() => deleteTask(task.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="panel add-panel">
            <p className="welcome">{editingId !== null ? "EDIT TASK" : "NEW TASK"}</p>
            <h2>{editingId !== null ? "Edit reminder" : "Add a reminder"}</h2>
            <p className="form-description">Don't forget the little things.</p>

            <form onSubmit={addTask}>
              <label htmlFor="title">Reminder title</label>
              <input
                id="title"
                className="form-input"
                type="text"
                placeholder="e.g. Pay internet bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <label htmlFor="category">Category</label>
              <select
                id="category"
                className="form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <label htmlFor="amount">Amount (optional)</label>
              <input
                id="amount"
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 649"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <label htmlFor="date">Due date</label>
              <input
                id="date"
                className="form-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />

              <label htmlFor="repeat">Repeat reminder</label>
              <select
                id="repeat"
                className="form-input"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              >
                <option value="None">Does not repeat</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>

              <span className="field-label">Remind me</span>
              <div className="remind-group">
                {REMIND_OPTIONS.map((option) => (
                  <label className="remind-option" key={option.days}>
                    <input
                      type="checkbox"
                      checked={remindBefore.includes(option.days)}
                      onChange={() => toggleRemind(option.days)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>

              <button className="add-button" type="submit">
                {editingId !== null ? "Save changes" : "+ Add reminder"}
              </button>

              {editingId !== null && (
                <button className="cancel-button" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </form>
          </div>
        </section>

        <footer>LifeSet · Organise your life, one day at a time.</footer>
      </main>
    </div>
  );
}

export default App;
