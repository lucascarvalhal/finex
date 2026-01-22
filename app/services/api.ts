const API_URL = 'http://localhost:8000';

export interface User {
  id: number;
  email: string;
  name: string;
  provider: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  descricao?: string;
  data: string;
}

export interface TransactionCreate {
  tipo: 'receita' | 'despesa';
  valor: number;
  categoria: string;
  descricao?: string;
  data: string;
}

export interface Summary {
  receitas: number;
  despesas: number;
  saldo: number;
}

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro na requisição');
    }

    return response.json();
  }

  // Auth
  async register(data: RegisterData): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return this.request<Transaction[]>('/transactions/');
  }

  async getSummary(): Promise<Summary> {
    return this.request<Summary>('/transactions/summary');
  }

  async createTransaction(data: TransactionCreate): Promise<Transaction> {
    return this.request<Transaction>('/transactions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTransaction(id: number): Promise<void> {
    await this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
