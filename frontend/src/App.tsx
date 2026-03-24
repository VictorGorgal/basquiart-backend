import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, 
  LayoutGrid, 
  User as UserIcon, 
  LogOut, 
  Trophy, 
  Zap, 
  Heart, 
  Palette,
  Upload,
  Image as ImageIcon,
  Star,
  Users,
  Share2,
  ChevronRight,
  ArrowLeft,
  Settings as SettingsIcon,
  MessageSquare,
  Send,
  Search
} from 'lucide-react';
import { User, Artwork, Group, Comment } from './types';
import { api } from './services/api';
import { authService } from './services/auth';

// --- Components ---

const Navbar = ({ user, onLogout, setPage, page, onLogoClick, onSearch }: { user: User | null, onLogout: () => void, setPage: (p: string) => void, page: string, onLogoClick: () => void, onSearch: (q: string) => void }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <nav className="sticky top-0 z-50 bg-paper/80 backdrop-blur-md border-b border-ink/5 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-8">
        <div 
          className="font-serif text-3xl tracking-tight cursor-pointer hover:text-gold transition-colors whitespace-nowrap"
          onClick={onLogoClick}
        >
          Basquiart-Se
        </div>
        
        {user && (
          <div className="hidden md:flex relative items-center">
            <Search size={16} className="absolute left-4 text-muted" />
            <input 
              type="text"
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onSearch(searchQuery);
                }
              }}
              className="bg-ink/5 border-none rounded-full py-2 pl-10 pr-4 text-sm font-sans w-64 focus:ring-1 focus:ring-gold/30 transition-all"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        {user ? (
          <>
            <button 
              onClick={() => setPage('groups')} 
              className={`p-2 hover:text-gold transition-colors rounded-full ${page === 'groups' ? 'text-gold' : 'text-muted'}`}
              title="Grupos"
            >
              <Users size={20} />
            </button>
            <button onClick={() => setPage('submit')} className="elegant-btn-primary text-sm">
              <Plus size={16} /> <span className="hidden sm:inline">ENVIAR ARTE</span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full border border-ink/10" />
                <span className="hidden sm:inline font-medium text-sm tracking-wide">{user.username}</span>
              </button>

              <AnimatePresence>
                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-4 w-48 bg-white soft-card shadow-xl border border-ink/5 py-2 z-20"
                    >
                      <button 
                        onClick={() => { setPage('settings'); setShowDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-sans hover:bg-paper flex items-center gap-3 transition-colors"
                      >
                        <SettingsIcon size={16} className="text-muted" /> Configurações
                      </button>
                      <button 
                        onClick={() => { onLogout(); setShowDropdown(false); }}
                        className="w-full px-4 py-3 text-left text-sm font-sans hover:bg-red-50 text-red-500 flex items-center gap-3 transition-colors"
                      >
                        <LogOut size={16} /> Sair
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : null}
      </div>
    </nav>
  );
};

// --- Pages ---

const LoginPage = ({ onLogin }: { onLogin: (u: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState<'login' | 'register' | null>(null);
  const [error, setError] = useState('');

  const handleAuth = async (action: 'login' | 'register') => {
    if (!username || !password) return;

    setError('');
    setLoadingAction(action);
    try {
      const result =
        action === 'login'
          ? await api.auth.login(username, password)
          : await api.auth.register(username, password);

      authService.saveToken(result.JWT);

      const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`;
      const decoded = authService.decodeToken(result.JWT);
      const userFromTokenId = Number(decoded?.sub ?? 0);

      const user: User = result.user
        ? {
            ...result.user,
            avatar_url: result.user.avatar_url || fallbackAvatar,
          }
        : {
            id: Number.isFinite(userFromTokenId) ? userFromTokenId : 0,
            username,
            avatar_url: fallbackAvatar,
          };

      authService.saveUser(user);
      onLogin(user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(action === 'login' ? 'Falha ao entrar.' : 'Falha ao cadastrar.');
      }
      console.error(err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAuth('login');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-md w-full p-10 bg-white soft-card"
      >
        <h1 className="font-serif text-5xl mb-2 text-center">Bem-vindo</h1>
        <p className="text-muted text-center mb-10 font-sans text-sm tracking-wide">Entre no estúdio para compartilhar sua visão.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Nome de usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="elegant-input" 
              placeholder=""
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="elegant-input"
              placeholder=""
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-xs font-sans">{error}</p>
          )}
          <button 
            type="submit" 
            disabled={Boolean(loadingAction)}
            className="w-full elegant-btn-primary py-4 text-lg"
          >
            {loadingAction === 'login' ? 'Entrando...' : 'Entrar no Estúdio'}
          </button>
          <button
            type="button"
            onClick={() => void handleAuth('register')}
            disabled={Boolean(loadingAction)}
            className="w-full elegant-btn-outline py-4 text-lg"
          >
            {loadingAction === 'register' ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="mt-8 font-sans text-[10px] text-center text-muted tracking-wide uppercase">
          * Use a mesma senha para entrar novamente.
        </p>
      </motion.div>
    </div>
  );
};

const RatingModal = ({ artwork, user, onClose, onRated }: { artwork: Artwork, user: User, onClose: () => void, onRated: () => void }) => {
  const [scores, setScores] = useState({ technique: 5, authenticity: 5, creativity: 5 });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch(`/api/artworks/${artwork.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, ...scores })
      });
      onRated();
      onClose();
    } catch (err) {
      alert("Você já avaliou esta arte!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white soft-card p-10 max-w-md w-full"
      >
        <h3 className="font-serif text-3xl mb-2">Avaliar Obra</h3>
        <p className="text-muted text-sm mb-8">Forneça sua avaliação honesta através de três pilares.</p>
        <div className="space-y-8">
          {(['technique', 'authenticity', 'creativity'] as const).map((key) => (
            <div key={key}>
              <div className="flex justify-between font-sans text-[10px] tracking-widest font-semibold uppercase mb-3">
                <span className="text-muted">
                  {key === 'technique' ? 'Técnica' : key === 'authenticity' ? 'Autenticidade' : 'Criatividade'}
                </span>
                <span className="text-gold">{scores[key]}/10</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={scores[key]}
                onChange={(e) => setScores({...scores, [key]: parseInt(e.target.value)})}
                className="w-full accent-gold h-1.5 bg-ink/5 rounded-full appearance-none cursor-pointer"
              />
            </div>
          ))}
          <div className="flex gap-4 mt-10">
            <button onClick={onClose} className="flex-1 elegant-btn-outline">CANCELAR</button>
            <button onClick={handleSubmit} disabled={submitting} className="flex-1 elegant-btn-primary">
              {submitting ? '...' : 'ENVIAR AVALIAÇÃO'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CommentsSection = ({ artworkId, user, onCommentAdded }: { artworkId: number, user: User | null, onCommentAdded?: () => void }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = () => {
    console.log("Fetching comments for artwork:", artworkId);
    fetch(`/api/artworks/${artworkId}/comments`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch comments");
        return res.json();
      })
      .then(data => {
        console.log("Comments data:", data);
        setComments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching comments:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchComments();
  }, [artworkId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting comment for artwork:", artworkId, "User:", user?.id);
    if (!newComment.trim() || !user) {
      console.log("Comment submission blocked: empty comment or no user");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/artworks/${artworkId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, content: newComment })
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
        if (onCommentAdded) onCommentAdded();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao postar comentário");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao postar comentário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 pt-8 border-t border-ink/5">
      <h4 className="font-serif text-lg mb-6 flex items-center gap-2">
        <MessageSquare size={16} className="text-gold" /> Diálogo
      </h4>
      
      <div className="space-y-6 mb-8 max-h-[350px] overflow-y-auto pr-4 custom-scrollbar scroll-smooth">
        {comments.map(comment => (
          <motion.div 
            key={comment.id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4 p-3 rounded-2xl hover:bg-ink/[0.02] transition-colors"
          >
            <img src={comment.avatar_url} className="w-8 h-8 rounded-full border border-ink/5 flex-shrink-0" alt="" />
            <div className="flex-grow">
              <div className="flex items-center justify-between mb-1">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink">{comment.username}</span>
                <span className="text-[9px] text-muted uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-sans text-muted leading-relaxed">{comment.content}</p>
            </div>
          </motion.div>
        ))}
        {comments.length === 0 && !loading && (
          <div className="py-12 text-center">
            <p className="text-xs text-muted italic font-serif">Nenhum diálogo ainda. Seja o primeiro a falar.</p>
          </div>
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="relative">
          <input 
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder=""
            className="w-full bg-paper/50 border border-ink/10 rounded-full py-3 px-6 pr-12 text-sm font-sans focus:outline-none focus:border-gold/50 transition-colors"
          />
          <button 
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gold hover:text-ink transition-colors disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
};

const FeedPage = ({ user, groupId, groupName, userId, userName, onNavigateToSubmit, onArtistClick }: { user: User | null, groupId?: number, groupName?: string, userId?: number, userName?: string, onNavigateToSubmit: () => void, onArtistClick: (id: number, name: string) => void }) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<Artwork | null>(null);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const isBackendGroupFeed = Boolean(groupId);

  const fetchArt = () => {
    setLoading(true);

    if (groupId && user) {
      api.posts.listByGroup(groupId)
        .then(data => {
          setArtworks(data);
        })
        .catch(err => {
          console.error(err);
          setArtworks([]);
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    let url = '/api/artworks';
    if (groupId) url = `/api/artworks?group_id=${groupId}`;
    else if (userId) url = `/api/artworks?user_id=${userId}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setArtworks(data);
      })
      .catch(err => {
        console.error(err);
        setArtworks([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchArt();
  }, [groupId, userId, user?.id]);

  if (loading) return <div className="p-20 text-center font-serif text-3xl animate-pulse text-muted">Curando Galeria...</div>;

  return (
    <div className="max-w-[1600px] mx-auto p-6 sm:p-12">
      {groupName ? (
        <div className="mb-16 text-center">
          <h1 className="font-serif text-6xl mb-4">{groupName}</h1>
          <div className="flex flex-col items-center gap-4">
            <div className="inline-block px-4 py-1 rounded-full border border-gold/30 text-gold font-sans text-[10px] tracking-[0.2em] uppercase font-semibold">Coleção Exclusiva</div>
            <button 
              onClick={onNavigateToSubmit}
              className="mt-4 elegant-btn-primary py-2 px-6 text-xs"
            >
              <Plus size={14} className="mr-2" /> ENVIAR PARA ESTE COLETIVO
            </button>
          </div>
        </div>
      ) : userName ? (
        <div className="mb-16 text-center">
          <h1 className="font-serif text-6xl mb-4">Estúdio de {userName}</h1>
        </div>
      ) : (
        <div className="mb-16 text-center">
          <h1 className="font-serif text-6xl mb-4">A Galeria</h1>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {artworks.map((art) => (
          <motion.div 
            key={art.id}
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="soft-card group flex flex-col"
          >
            <div className="p-4 flex items-center justify-between bg-white">
              <button 
                onClick={() => onArtistClick(art.user_id, art.username)}
                className="flex items-center gap-3 hover:text-gold transition-colors"
              >
                <img src={art.avatar_url} className="w-8 h-8 rounded-full border border-ink/5" alt="" />
                <span className="font-sans text-xs font-semibold tracking-wide">{art.username}</span>
              </button>
              <span className="text-[10px] text-muted font-sans uppercase tracking-widest">{new Date(art.created_at).toLocaleDateString()}</span>
            </div>
            
            <div className="aspect-[4/5] bg-zinc-50 relative overflow-hidden">
              <img 
                src={art.image_url} 
                alt={art.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center p-8 backdrop-blur-[2px]">
                <p className="text-paper text-sm text-center font-serif italic leading-relaxed">{art.description}</p>
              </div>
            </div>

            <div className="p-6 bg-white flex-grow">
              <h3 className="font-serif text-2xl mb-6 tracking-tight">{art.title}</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-[9px] font-sans font-bold tracking-widest text-muted uppercase mb-1">Técnica</div>
                  <div className="font-serif text-lg text-gold">{art.technique_score}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-sans font-bold tracking-widest text-muted uppercase mb-1">Autenticidade</div>
                  <div className="font-serif text-lg text-gold">{art.authenticity_score}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-sans font-bold tracking-widest text-muted uppercase mb-1">Criatividade</div>
                  <div className="font-serif text-lg text-gold">{art.creativity_score}</div>
                </div>
              </div>

              {!isBackendGroupFeed && openComments === art.id && (
                <CommentsSection artworkId={art.id} user={user} onCommentAdded={fetchArt} />
              )}
            </div>

            <div className="p-5 bg-paper/50 border-t border-ink/5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-serif text-xl">
                  <Trophy size={16} className="text-gold" />
                  {art.total_points}
                </div>
                {isBackendGroupFeed ? (
                  <span className="flex items-center gap-1.5 font-sans text-[9px] tracking-widest text-muted uppercase">
                    <MessageSquare size={12} /> Diálogo (indisponível)
                  </span>
                ) : (
                  <button 
                    onClick={() => setOpenComments(openComments === art.id ? null : art.id)}
                    className="flex items-center gap-1.5 font-sans text-[9px] tracking-widest text-muted uppercase hover:text-gold transition-colors"
                  >
                    <MessageSquare size={12} /> Diálogo ({art.comment_count || 0})
                  </button>
                )}
              </div>
              
              {user && user.id !== art.user_id && !isBackendGroupFeed && (
                <button 
                  onClick={() => setRatingTarget(art)}
                  className="elegant-btn-outline text-[10px] py-1.5 px-4 tracking-widest uppercase font-bold"
                >
                  Avaliar
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {artworks.length === 0 && (
        <div className="py-32 text-center">
          <p className="font-serif text-2xl text-muted italic">A galeria aguarda sua primeira pincelada.</p>
        </div>
      )}

      {ratingTarget && user && (
        <RatingModal 
          artwork={ratingTarget} 
          user={user} 
          onClose={() => setRatingTarget(null)} 
          onRated={fetchArt} 
        />
      )}
    </div>
  );
};

const GroupsPage = ({ user, onSelectGroup, initialSearchQuery = '' }: { user: User, onSelectGroup: (g: Group) => void, initialSearchQuery?: string }) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [searchResults, setSearchResults] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const fetchGroups = () => {
    console.log("Fetching groups for user:", user.id);
    api.groups.listMine()
      .then(data => {
        console.log("User groups (backend):", data);
        setGroups(data);
      })
      .catch(err => {
        console.error(err);
        setGroups([]);
      });
    
    fetch('/api/groups/public')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch public groups");
        return res.json();
      })
      .then(data => {
        console.log("Public groups:", data);
        setPublicGroups(data);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        fetch(`/api/groups/search?q=${searchQuery}`)
          .then(res => res.json())
          .then(data => {
            setSearchResults(data);
            setIsSearching(false);
          });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating group:", name, "User:", user.id);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, creator_id: user.id, visibility, cover_url: coverUrl })
      });
      
      if (res.ok) {
        setName('');
        setDescription('');
        setVisibility('public');
        setCoverUrl(null);
        setShowCreate(false);
        fetchGroups();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar coletivo");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão ao criar coletivo");
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: inviteCode, user_id: user.id })
    });
    if (res.ok) {
      setInviteCode('');
      setShowJoin(false);
      fetchGroups();
    } else {
      alert("Código inválido ou você já é um membro");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-12">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-8 mb-12">
        <div className="text-center sm:text-left">
          <h1 className="font-serif text-6xl mb-2">Coletivos de Arte</h1>
          <p className="text-muted font-sans text-sm tracking-wide">Participe de círculos exclusivos de mentes criativas.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowJoin(true)} className="elegant-btn-outline">PARTICIPAR DO GRUPO</button>
          <button onClick={() => setShowCreate(true)} className="elegant-btn-primary">CRIAR NOVO</button>
        </div>
      </div>

      <div className="mb-12 relative">
        <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" />
        <input 
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white soft-card py-5 pl-16 pr-6 font-serif text-xl focus:ring-2 focus:ring-gold/20 transition-all outline-none"
        />
        {isSearching && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <div className="mb-16">
          <h2 className="font-sans text-[10px] tracking-widest font-bold text-gold uppercase mb-6">Resultados da Busca</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {searchResults.map(group => (
              <motion.div 
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="soft-card p-8 flex flex-col justify-between hover:border-gold/30 cursor-pointer group bg-gold/5"
                onClick={() => onSelectGroup(group)}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-serif text-3xl group-hover:text-gold transition-colors">{group.name}</h3>
                    <ChevronRight className="text-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="font-sans text-sm text-muted leading-relaxed mb-8">{group.description}</p>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-ink/5">
                  <div className="flex items-center gap-2 font-sans text-[10px] tracking-widest font-bold uppercase text-muted">
                    <Users size={14}/> {group.member_count} Membros
                  </div>
                  <div className="font-sans text-[10px] tracking-widest font-bold uppercase text-gold/60">
                    Coletivo Público
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-sans text-[10px] tracking-widest font-bold text-muted uppercase mb-6">Seus Coletivos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {groups.map(group => (
          <motion.div 
            key={group.id}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="soft-card overflow-hidden flex flex-col hover:border-gold/30 cursor-pointer group"
            onClick={() => onSelectGroup(group)}
          >
            {group.cover_url && (
              <div className="h-32 w-full overflow-hidden">
                <img src={group.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
              </div>
            )}
            <div className="p-8 flex flex-col justify-between flex-grow">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-serif text-3xl group-hover:text-gold transition-colors">{group.name}</h3>
                  <ChevronRight className="text-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                </div>
                <p className="font-sans text-sm text-muted leading-relaxed mb-8">{group.description}</p>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-ink/5">
                <div className="flex items-center gap-2 font-sans text-[10px] tracking-widest font-bold uppercase text-muted">
                  <Users size={14}/> {group.member_count} Membros
                </div>
                <div className="font-sans text-[10px] tracking-widest font-bold uppercase text-gold/60">
                  {group.invite_code ? `Codigo: ${group.invite_code}` : 'Integrado via backend'}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full text-center py-16 rounded-3xl border border-dashed border-ink/10">
            <p className="font-serif text-xl text-muted italic">Nenhum coletivo participando ainda.</p>
          </div>
        )}
      </div>

      <h2 className="font-sans text-[10px] tracking-widest font-bold text-muted uppercase mb-6">Coletivos Públicos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {publicGroups.map(group => {
          const isMember = groups.some(g => g.id === group.id);
          return (
            <motion.div 
              key={group.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="soft-card overflow-hidden flex flex-col hover:border-gold/30 cursor-pointer group"
              onClick={() => onSelectGroup(group)}
            >
              {group.cover_url && (
                <div className="h-32 w-full overflow-hidden">
                  <img src={group.cover_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                </div>
              )}
              <div className="p-8 flex flex-col justify-between flex-grow">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <h3 className="font-serif text-3xl group-hover:text-gold transition-colors">{group.name}</h3>
                      {isMember && (
                        <span className="font-sans text-[8px] tracking-widest font-bold text-gold uppercase mt-1">Você é membro</span>
                      )}
                    </div>
                    <ChevronRight className="text-muted group-hover:text-gold group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="font-sans text-sm text-muted leading-relaxed mb-8">{group.description}</p>
                </div>
                <div className="flex justify-between items-center pt-6 border-t border-ink/5">
                  <div className="flex items-center gap-2 font-sans text-[10px] tracking-widest font-bold uppercase text-muted">
                    <Users size={14}/> {group.member_count} Membros
                  </div>
                  <div className="font-sans text-[10px] tracking-widest font-bold uppercase text-gold/60">
                    Coletivo Público
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {publicGroups.length === 0 && (
          <div className="col-span-full text-center py-16 rounded-3xl border border-dashed border-ink/10">
            <p className="font-serif text-xl text-muted italic">Nenhum outro coletivo público disponível.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white soft-card p-10 w-full max-w-md">
              <h3 className="font-serif text-3xl mb-2">Novo Coletivo</h3>
              <p className="text-muted text-sm mb-8">Estabeleça um espaço privado para seu círculo interno.</p>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Foto de Capa</label>
                  <div 
                    className="w-full h-32 rounded-xl border border-dashed border-ink/10 bg-paper/50 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 hover:border-gold/30 transition-all relative overflow-hidden group"
                    onClick={() => document.getElementById('group-cover-upload')?.click()}
                  >
                    {coverUrl ? (
                      <img src={coverUrl} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <>
                        <ImageIcon size={24} className="mb-2 text-muted group-hover:text-gold transition-colors" />
                        <span className="font-sans text-[8px] tracking-[0.2em] font-bold uppercase text-muted group-hover:text-gold">Upload Capa</span>
                      </>
                    )}
                    <input 
                      id="group-cover-upload"
                      type="file" 
                      accept="image/*" 
                      onChange={handleCoverChange} 
                      className="hidden" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Nome</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="" className="elegant-input" required />
                </div>
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Descrição</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="" className="elegant-input min-h-[100px]" />
                </div>
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Visibilidade</label>
                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setVisibility('public')}
                      className={`flex-1 py-3 rounded-xl font-sans text-[10px] tracking-widest font-bold uppercase transition-all ${visibility === 'public' ? 'bg-gold text-ink' : 'bg-paper text-muted border border-ink/5'}`}
                    >
                      Público
                    </button>
                    <button 
                      type="button"
                      onClick={() => setVisibility('private')}
                      className={`flex-1 py-3 rounded-xl font-sans text-[10px] tracking-widest font-bold uppercase transition-all ${visibility === 'private' ? 'bg-gold text-ink' : 'bg-paper text-muted border border-ink/5'}`}
                    >
                      Privado
                    </button>
                  </div>
                  <p className="text-[10px] text-muted italic mt-2">
                    {visibility === 'public' ? 'Qualquer pessoa pode encontrar e participar deste coletivo.' : 'Apenas aqueles com um código de convite podem participar.'}
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 elegant-btn-outline">CANCELAR</button>
                  <button type="submit" className="flex-1 elegant-btn-primary">CRIAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showJoin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white soft-card p-10 w-full max-w-md">
              <h3 className="font-serif text-3xl mb-2">Participar do Coletivo</h3>
              <p className="text-muted text-sm mb-8">Insira o código de convite único para obter acesso.</p>
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Código de Convite</label>
                  <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="" className="elegant-input text-center tracking-[0.5em] font-semibold" required />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowJoin(false)} className="flex-1 elegant-btn-outline">CANCELAR</button>
                  <button type="submit" className="flex-1 elegant-btn-primary">PARTICIPAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SettingsPage = ({ user, onLogout }: { user: User, onLogout: () => void }) => (
  <div className="max-w-3xl mx-auto p-6 sm:p-12">
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white soft-card p-10 sm:p-16"
    >
      <h1 className="font-serif text-5xl mb-8">Configurações</h1>
      
      <div className="space-y-12">
        <div className="flex items-center gap-8 pb-12 border-b border-ink/5">
          <img src={user.avatar_url} alt={user.username} className="w-24 h-24 rounded-full border-2 border-gold/20 p-1" />
          <div>
            <h2 className="font-serif text-3xl">{user.username}</h2>
            <p className="text-muted font-sans text-sm tracking-wide">Membro desde {new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="font-sans text-[10px] tracking-widest font-bold text-muted uppercase">Preferências da Conta</h3>
          <div className="flex justify-between items-center p-4 bg-paper/30 rounded-2xl border border-ink/5">
            <span className="font-sans text-sm font-medium">Perfil Público</span>
            <div className="w-12 h-6 bg-gold rounded-full relative">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
          <div className="flex justify-between items-center p-4 bg-paper/30 rounded-2xl border border-ink/5">
            <span className="font-sans text-sm font-medium">Notificações por E-mail</span>
            <div className="w-12 h-6 bg-ink/10 rounded-full relative">
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <button onClick={onLogout} className="w-full elegant-btn-outline border-red-200 text-red-500 hover:bg-red-50">
            SAIR DO ESTÚDIO
          </button>
        </div>
      </div>
    </motion.div>
  </div>
);

const SubmitPage = ({ user, groupId, onComplete }: { user: User, groupId?: number, onComplete: () => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private'>(groupId ? 'private' : 'public');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(groupId || null);

  useEffect(() => {
    api.groups.listMine()
      .then(groups => {
        setUserGroups(groups);
        if (groupId) {
          setSelectedGroupId(groupId);
        } else if (!selectedGroupId && groups.length > 0) {
          setSelectedGroupId(groups[0].id);
        }
      })
      .catch(err => {
        console.error(err);
        setUserGroups([]);
      });
  }, [user.id, groupId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !title) return;
    if (visibility === 'private' && !selectedGroupId) return;

    setSubmitting(true);
    try {
      await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          group_ids: visibility === 'public' ? [] : [selectedGroupId],
          title,
          description,
          image_url: image
        })
      });
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 sm:p-12">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white soft-card p-10 sm:p-16"
      >
        <div className="text-center mb-16">
          <h1 className="font-serif text-6xl mb-4">Compartilhe Sua Visão</h1>
          <p className="text-muted font-sans text-sm tracking-wide">Contribua com sua última obra-prima para o coletivo.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-10 flex flex-col items-center">
            <div 
              className="w-full max-w-[280px] aspect-square rounded-3xl border border-dashed border-ink/10 bg-paper/50 flex flex-col items-center justify-center cursor-pointer hover:bg-gold/5 hover:border-gold/30 transition-all relative overflow-hidden group"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              {image ? (
                <img src={image} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <>
                  <Upload size={32} className="mb-4 text-muted group-hover:text-gold transition-colors" />
                  <span className="font-sans text-[9px] tracking-[0.2em] font-bold uppercase text-muted group-hover:text-gold">Enviar Arte</span>
                </>
              )}
              <input 
                id="image-upload"
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </div>

            <div className="w-full bg-paper/50 p-8 rounded-3xl border border-ink/5">
              <h3 className="font-serif text-xl mb-6 flex items-center gap-2">
                <Share2 size={18} className="text-gold" /> Visibilidade
              </h3>
              
              <div className="flex gap-4 mb-8">
                <button 
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`flex-1 py-3 rounded-xl font-sans text-[10px] tracking-widest font-bold uppercase transition-all ${visibility === 'public' ? 'bg-gold text-ink' : 'bg-white text-muted border border-ink/5'}`}
                >
                  Público
                </button>
                <button 
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`flex-1 py-3 rounded-xl font-sans text-[10px] tracking-widest font-bold uppercase transition-all ${visibility === 'private' ? 'bg-gold text-ink' : 'bg-white text-muted border border-ink/5'}`}
                >
                  Privado
                </button>
              </div>

              {visibility === 'private' && (
                <div className="space-y-2">
                  <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Selecionar Coletivo</label>
                  <select 
                    value={selectedGroupId || ''} 
                    onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                    className="elegant-input"
                  >
                    {userGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    {userGroups.length === 0 && <option disabled>Nenhum grupo participado</option>}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Título</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="elegant-input" 
                placeholder=""
                required
              />
            </div>

            <div className="space-y-2">
              <label className="font-sans text-[10px] tracking-widest font-semibold text-muted uppercase">Manifesto / Descrição</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="elegant-input min-h-[150px]" 
                placeholder=""
              />
            </div>

            <div className="pt-8">
              <button 
                type="submit"
                disabled={submitting || !image || (visibility === 'private' && !selectedGroupId)}
                className="w-full elegant-btn-primary py-5 text-lg"
              >
                {submitting ? 'Publicando...' : 'Publicar na Galeria'}
              </button>
              <p className="mt-6 font-sans text-[10px] text-muted text-center tracking-widest uppercase italic">
                * A avaliação por pares começará após a publicação.
              </p>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('feed');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  useEffect(() => {
    const savedUser = authService.getUser();
    if (savedUser) {
      setUser({
        id: savedUser.id,
        username: savedUser.username,
        avatar_url: savedUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(savedUser.username)}`,
      });
    }
  }, []);

  useEffect(() => {
    console.log("App initialized. User:", user);
  }, [user]);

  const handleLogin = (u: User) => {
    console.log("User logged in:", u);
    setUser(u);
    authService.saveUser(u);
    setPage('feed');
  };

  const handleLogout = () => {
    setUser(null);
    authService.clearAuth();
    setPage('login');
  };

  const navigateToGroup = (g: Group) => {
    setSelectedGroup(g);
    setPage('group-feed');
  };

  const navigateToArtist = (id: number, name: string) => {
    setSelectedArtistId(id);
    setSelectedArtistName(name);
    setPage('artist-profile');
  };

  const navigateToFeed = () => {
    setSelectedGroup(null);
    setSelectedArtistId(null);
    setPage('feed');
  };

  return (
    <div className="min-h-screen bg-gallery-white selection:bg-neon-green selection:text-brutal-black">
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        setPage={setPage} 
        page={page} 
        onLogoClick={navigateToFeed} 
        onSearch={(q) => { setGlobalSearchQuery(q); setPage('groups'); }}
      />
      
      <main className="pb-20">
        <AnimatePresence mode="wait">
          {page === 'login' && !user && (
            <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoginPage onLogin={handleLogin} />
            </motion.div>
          )}
          
          {page === 'feed' && (
            <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FeedPage user={user} onNavigateToSubmit={() => setPage('submit')} onArtistClick={navigateToArtist} />
            </motion.div>
          )}

          {page === 'artist-profile' && selectedArtistId && (
            <motion.div key="artist-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="max-w-6xl mx-auto px-4 pt-8">
                <button onClick={navigateToFeed} className="flex items-center gap-2 font-mono text-xs font-bold hover:text-gold transition-colors">
                  <ArrowLeft size={14} /> VOLTAR PARA GALERIA
                </button>
              </div>
              <FeedPage 
                user={user} 
                userId={selectedArtistId} 
                userName={selectedArtistName || ''} 
                onNavigateToSubmit={() => setPage('submit')}
                onArtistClick={navigateToArtist}
              />
            </motion.div>
          )}

          {page === 'group-feed' && selectedGroup && (
            <motion.div key="group-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="max-w-6xl mx-auto px-4 pt-8">
                <button onClick={() => setPage('groups')} className="flex items-center gap-2 font-mono text-xs font-bold hover:text-gold transition-colors">
                  <ArrowLeft size={14} /> VOLTAR PARA GRUPOS
                </button>
              </div>
              <FeedPage 
                user={user} 
                groupId={selectedGroup.id} 
                groupName={selectedGroup.name} 
                onNavigateToSubmit={() => setPage('submit')}
                onArtistClick={navigateToArtist}
              />
            </motion.div>
          )}
          
          {page === 'groups' && user && (
            <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GroupsPage user={user} onSelectGroup={navigateToGroup} initialSearchQuery={globalSearchQuery} />
            </motion.div>
          )}
          
          {page === 'submit' && user && (
            <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SubmitPage user={user} groupId={selectedGroup?.id} onComplete={() => setPage(selectedGroup ? 'group-feed' : 'feed')} />
            </motion.div>
          )}

          {page === 'settings' && user && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsPage user={user} onLogout={handleLogout} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      {user && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 sm:hidden">
          <div className="bg-ink/90 backdrop-blur-md text-paper rounded-full shadow-2xl p-2 flex gap-2 border border-paper/10">
            <button onClick={() => setPage('feed')} className={`p-4 rounded-full transition-colors ${page === 'feed' ? 'bg-gold text-ink' : 'hover:bg-paper/10'}`}>
              <LayoutGrid size={20} />
            </button>
            <button onClick={() => setPage('groups')} className={`p-4 rounded-full transition-colors ${page === 'groups' || page === 'group-feed' ? 'bg-gold text-ink' : 'hover:bg-paper/10'}`}>
              <Users size={20} />
            </button>
            <button onClick={() => setPage('submit')} className={`p-4 rounded-full transition-colors ${page === 'submit' ? 'bg-gold text-ink' : 'hover:bg-paper/10'}`}>
              <Plus size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
