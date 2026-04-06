import type { Artwork, Comment, Group, User } from '../types';
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
  description?: string;
  member_count?: number;
  visibility?: 'public' | 'private';
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
  commentCount?: number;
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
  likes?: {
    totalLikes: number;
    hasLiked: boolean;
  } | null;
};

type BackendPublicGroup = {
  id: number;
  name: string;
  description?: string | null;
  member_count?: number;
  invite_code?: string | null;
  visibility?: 'public' | 'private';
  creator_id?: number;
  created_at?: string;
  cover_url?: string | null;
};

type BackendInvite = {
  id: number;
};

type BackendComment = {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  postId: number;
  user: {
    id: number;
    username: string;
  };
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
  const fallbackDescription = group.lastPost
    ? `Ultimo post de ${group.lastPost.author}`
    : `Participacao como ${group.role.toLowerCase()}`;

  return {
    id: group.groupId,
    name: group.name,
    description: group.description || fallbackDescription,
    creator_id: 0,
    invite_code: '',
    visibility: group.visibility || 'private',
    member_count: group.member_count || 0,
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
    comment_count: post.commentCount ?? 0,
    like_count: post.likes?.totalLikes ?? 0,
    has_liked: post.likes?.hasLiked ?? false,
  };
}

function mapPublicGroup(group: BackendPublicGroup): Group {
  return {
    id: group.id,
    name: group.name,
    description: group.description || '',
    creator_id: group.creator_id || 0,
    invite_code: group.invite_code || '',
    visibility: group.visibility || 'public',
    member_count: group.member_count || 0,
    cover_url: group.cover_url || undefined,
    created_at: group.created_at || new Date().toISOString(),
  };
}

function mapCommentToFrontend(comment: BackendComment): Comment {
  const username = comment.user?.username || `user-${comment.userId}`;

  return {
    id: comment.id,
    artwork_id: comment.postId,
    user_id: comment.userId,
    username,
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
    content: comment.content,
    created_at: comment.createdAt,
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

function extractApiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') {
    return fallback;
  }

  const payload = data as Record<string, unknown>;
  const detail = payload.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          const msg = (item as Record<string, unknown>).msg;
          if (typeof msg === 'string') {
            return msg;
          }
        }

        return '';
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' | ');
    }
  }

  if (typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error;
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
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
    const errorData = await response.json().catch(() => undefined);
    throw new Error(extractApiErrorMessage(errorData, `API error: ${response.statusText}`));
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

  async listPublic(): Promise<Group[]> {
    const response = await requestWithAuth<BackendPublicGroup[]>('/group/public');
    return response.map(mapPublicGroup);
  },

  async create(name: string, description: string, visibility: 'public' | 'private'): Promise<void> {
    await jsonRequest<unknown>('/group/create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: description || null,
        visibility,
      }),
    });
  },

  async sendInvite(groupId: number, receiverId: number): Promise<number> {
    const response = await jsonRequest<BackendInvite>('/group/invite', {
      method: 'POST',
      body: JSON.stringify({
        group_id: groupId,
        receiverId,
      }),
    });
    return response.id;
  },

  async acceptInvite(inviteId: number): Promise<void> {
    await requestWithAuth<unknown>(`/group/invites/${inviteId}/accept`, {
      method: 'POST',
    });
  },
};

export const postApi = {
  async listByGroup(groupId: number, page = 1, pageSize = 10): Promise<Artwork[]> {
    const response = await requestWithAuth<BackendPaginatedPosts>(
      `/posts/${groupId}?page=${page}&page_size=${pageSize}`
    );
    return response.posts.map(mapPostToArtwork);
  },

  async createInGroup(
    groupId: number,
    payload: { title: string; description: string; image: File }
  ): Promise<void> {
    const formData = new FormData();
    const title = payload.title.trim();
    const description = payload.description.trim();
    const content = [title, description].filter(Boolean).join('\n\n') || title;

    formData.append('content', content);
    formData.append('images', payload.image);

    await requestWithAuth<unknown>(`/posts/${groupId}`, {
      method: 'POST',
      body: formData,
    });
  },

  async toggleLike(postId: number): Promise<{ liked: boolean }> {
    return requestWithAuth<{ liked: boolean }>(`/posts/${postId}/like`, {
      method: 'POST',
    });
  },

  async rate(
    postId: number,
    payload: { technique: number; authenticity: number; creativity: number }
  ): Promise<void> {
    const toBackendScore = (value: number) => Math.min(5, Math.max(1, Math.round(value / 2)));

    await jsonRequest<unknown>(`/posts/${postId}/rate`, {
      method: 'POST',
      body: JSON.stringify({
        ratings: [
          { category: 'Technique', score: toBackendScore(payload.technique) },
          { category: 'Composition', score: toBackendScore(payload.authenticity) },
          { category: 'Creativity', score: toBackendScore(payload.creativity) },
        ],
      }),
    });
  },

  async listComments(postId: number): Promise<Comment[]> {
    const response = await requestWithAuth<BackendComment[]>(`/posts/${postId}/comments`);
    return response.map(mapCommentToFrontend);
  },

  async createComment(postId: number, content: string): Promise<Comment> {
    const response = await jsonRequest<BackendComment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    return mapCommentToFrontend(response);
  },
};

export const api = {
  auth: authApi,
  groups: groupApi,
  posts: postApi,
};
