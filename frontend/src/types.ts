export interface User {
  id: number;
  username: string;
  avatar_url: string;
}

export interface Artwork {
  id: number;
  user_id: number;
  group_id: number | null;
  username: string;
  avatar_url: string;
  title: string;
  description: string;
  image_url: string;
  technique_score: number;
  authenticity_score: number;
  creativity_score: number;
  total_points: number;
  rating_count: number;
  created_at: string;
  comment_count?: number;
}

export interface Group {
  id: number;
  name: string;
  description: string;
  creator_id: number;
  invite_code: string;
  visibility: 'public' | 'private';
  member_count: number;
  cover_url?: string;
  created_at: string;
}

export interface Comment {
  id: number;
  artwork_id: number;
  user_id: number;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}
