import type { Artwork, Group, User } from '../types';
import { authService } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type AuthResponse = {
  JWT: string;
  user?: User;
};

type BackendGroupSummary = {
  groupId: number;
  name: string;
  role: 'OWNER' | 'MEMBER';
  lastPost?: {
    content: string;
    author: string;
    createdAt: string;
  } | null;
};

type BackendPost = {
  id: number;
  content: string;
  createdAt: string;
  authorId: number;
  groupId: number;
  author?: {
    id: number;
    username: string;
    createdAt: string;
  } | null;
  images?: Array<{
    id: number;
    url: string;
  }> | null;
  ratings?: Array<{
    category: string;
    average: number;
    totalVotes: number;
  }> | null;
};

type BackendPaginatedPosts = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  posts: BackendPost[];
};

function withAvatar<T extends User>(user: T): T {
  return {
    ...user,
    avatar_url:
      user.avatar_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`,
  };
}

function mapGroupSummary(group: BackendGroupSummary): Group {
  return {
    id: group.groupId,
    name: group.name,
    description: group.lastPost
      ? `Ultimo post de ${group.lastPost.author}`
      : `Participacao como ${group.role.toLowerCase()}`,
    creator_id: 0,
    invite_code: '',
    visibility: 'private',
    member_count: 0,
    cover_url: undefined,
    created_at: group.lastPost?.createdAt || new Date().toISOString(),
  };
}

function ratingAverage(post: BackendPost, category: string): number {
  const value = post.ratings?.find((item) => item.category === category)?.average ?? 0;
  return Number(value.toFixed(1));
}

function mapPostToArtwork(post: BackendPost): Artwork {
  const username = post.author?.username || `user-${post.authorId}`;
  const technique = ratingAverage(post, 'Technique');
  const authenticity = ratingAverage(post, 'Composition');
  const creativity = ratingAverage(post, 'Creativity');
  const points = Number((technique + authenticity + creativity).toFixed(1));
  const ratingCount = post.ratings?.reduce((max, item) => Math.max(max, item.totalVotes), 0) ?? 0;
  const imageUrl = resolveMediaUrl(post.images?.[0]?.url) || 'https://placehold.co/600x800?text=Sem+imagem';
  const content = (post.content || '').trim();
  const title = content ? (content.length > 60 ? `${content.slice(0, 57)}...` : content) : `Post #${post.id}`;

  return {
    id: post.id,
    user_id: post.authorId,
    group_id: post.groupId,
    username,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    title,
    description: content || 'Sem descricao.',
    image_url: imageUrl,
    technique_score: technique,
    authenticity_score: authenticity,
    creativity_score: creativity,
    total_points: points,
    rating_count: ratingCount,
    created_at: post.createdAt,
    comment_count: 0,
  };
}

export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function requestWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authService.getToken();
  const headers = new Headers(options.headers);

  if (token) {
    if (authService.isTokenExpired(token)) {
      authService.clearAuth();
      throw new Error('Sessao expirada. Faca login novamente.');
    }

    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    authService.clearAuth();
    throw new Error('Nao autorizado. Faca login novamente.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as { detail?: string }));
    throw new Error(errorData.detail || `API error: ${response.statusText}`);
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json();
}

async function jsonRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  return requestWithAuth<T>(endpoint, {
    ...options,
    headers,
  });
}

export const authApi = {
  async register(username: string, password: string): Promise<AuthResponse> {
    const response = await jsonRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    return {
      ...response,
      user: response.user ? withAvatar(response.user) : undefined,
    };
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await jsonRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    return {
      ...response,
      user: response.user ? withAvatar(response.user) : undefined,
    };
  },
};

export const groupApi = {
  async listMine(): Promise<Group[]> {
    const response = await requestWithAuth<BackendGroupSummary[]>('/group/');
    return response.map(mapGroupSummary);
  },
};

export const postApi = {
  async listByGroup(groupId: number, page = 1, pageSize = 10): Promise<Artwork[]> {
    const response = await requestWithAuth<BackendPaginatedPosts>(
      `/posts/${groupId}?page=${page}&page_size=${pageSize}`
    );
    return response.posts.map(mapPostToArtwork);
  },
};

export const api = {
  auth: authApi,
  groups: groupApi,
  posts: postApi,
};
