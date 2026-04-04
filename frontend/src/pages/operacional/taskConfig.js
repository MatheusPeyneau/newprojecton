export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function getAuthHeader() {
  const token = localStorage.getItem("agenciaos_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const STATUS_CFG = {
  TO_DO: { label: "A fazer", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  IN_PROGRESS: { label: "Em andamento", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  IN_REVIEW: { label: "Em revisão", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  DONE: { label: "Concluído", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  BLOCKED: { label: "Bloqueado", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

export const PRIORITY_CFG = {
  LOW: { label: "Baixa", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  NORMAL: { label: "Normal", color: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400" },
  HIGH: { label: "Alta", color: "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400" },
  URGENT: { label: "Urgente", color: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400" },
};

export function formatMinutes(minutes) {
  if (!minutes && minutes !== 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

export function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function isOverdue(dueDateStr, status) {
  if (!dueDateStr || status === "DONE") return false;
  const due = new Date(dueDateStr);
  const now = new Date();
  return due < now;
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
