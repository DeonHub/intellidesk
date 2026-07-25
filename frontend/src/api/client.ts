const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export type UserRole = "end_user" | "technician" | "manager" | "admin";

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface Ticket {
  _id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdBy: User | string;
  assignedTo?: User | string | null;
  escalatedTo?: User | string | null;
  slaDueAt?: string | null;
  resolvedAt?: string | null;
  aiSuggestedResolution?: string;
  updates: {
    message: string;
    author: User | string;
    createdAt: string;
    isInternal?: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

function getToken(): string | null {
  return localStorage.getItem("intellidesk_token");
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export { API_URL };
