import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("artrats.db");

// Migration: Add cover_url to groups if it doesn't exist
try {
  db.prepare("SELECT cover_url FROM groups LIMIT 1").get();
} catch (e) {
  try {
    db.prepare("ALTER TABLE groups ADD COLUMN cover_url TEXT").run();
  } catch (err) {
    console.log("Migration failed or column already exists");
  }
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    avatar_url TEXT
  );

  CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    image_url TEXT,
    technique_score INTEGER DEFAULT 0,
    authenticity_score INTEGER DEFAULT 0,
    creativity_score INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS artwork_groups (
    artwork_id INTEGER,
    group_id INTEGER,
    PRIMARY KEY(artwork_id, group_id),
    FOREIGN KEY(artwork_id) REFERENCES artworks(id),
    FOREIGN KEY(group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    description TEXT,
    creator_id INTEGER,
    invite_code TEXT UNIQUE,
    visibility TEXT DEFAULT 'public',
    cover_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER,
    user_id INTEGER,
    technique INTEGER,
    authenticity INTEGER,
    creativity INTEGER,
    UNIQUE(artwork_id, user_id),
    FOREIGN KEY(artwork_id) REFERENCES artworks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    artwork_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(artwork_id) REFERENCES artworks(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed Demo Data if empty
const artworkCount = db.prepare("SELECT COUNT(*) as count FROM artworks").get().count;
if (artworkCount === 0) {
  // No demo data
}

// Seed Groups if empty
const groupCount = db.prepare("SELECT COUNT(*) as count FROM groups").get().count;
if (groupCount === 0) {
  // No demo data
}

// Add some demo comments
const firstArt = db.prepare("SELECT id FROM artworks LIMIT 1").get();
if (firstArt) {
  const commentCount = db.prepare("SELECT COUNT(*) as count FROM comments WHERE artwork_id = ?").get(firstArt.id).count;
  if (commentCount === 0) {
    // No demo data
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Auth Mock (Simple for demo)
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt:", username);
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) {
      const info = db.prepare("INSERT INTO users (username, password, avatar_url) VALUES (?, ?, ?)")
        .run(username, password, `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`);
      user = { id: Number(info.lastInsertRowid), username, avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}` };
    }
    res.json(user);
  });

  // Artworks API
  app.get("/api/artworks", (req, res) => {
    const { group_id, user_id } = req.query;
    let query = `
      SELECT artworks.*, users.username, users.avatar_url,
      (SELECT COUNT(*) FROM comments WHERE artwork_id = artworks.id) as comment_count
      FROM artworks 
      JOIN users ON artworks.user_id = users.id 
    `;
    const params = [];
    const whereClauses = [];

    if (group_id) {
      query += ` JOIN artwork_groups ON artworks.id = artwork_groups.artwork_id `;
      whereClauses.push(`artwork_groups.group_id = ?`);
      params.push(group_id);
    } else if (!user_id) {
      // Global feed: show artworks that are NOT in any group
      query += ` LEFT JOIN artwork_groups ON artworks.id = artwork_groups.artwork_id `;
      whereClauses.push(`artwork_groups.group_id IS NULL`);
    }

    if (user_id) {
      whereClauses.push(`artworks.user_id = ?`);
      params.push(user_id);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY artworks.created_at DESC `;
    
    const artworks = db.prepare(query).all(...params);
    res.json(artworks);
  });

  app.post("/api/artworks", (req, res) => {
    const { user_id, group_ids, title, description, image_url } = req.body;
    console.log("Creating artwork:", title, "for user:", user_id);
    
    try {
      const info = db.prepare(`
        INSERT INTO artworks (user_id, title, description, image_url)
        VALUES (?, ?, ?, ?)
      `).run(user_id, title, description, image_url);
      
      const artwork_id = Number(info.lastInsertRowid);
      
      if (group_ids && Array.isArray(group_ids)) {
        const insertGroup = db.prepare("INSERT INTO artwork_groups (artwork_id, group_id) VALUES (?, ?)");
        group_ids.forEach(gid => {
          insertGroup.run(artwork_id, gid);
        });
      }
      
      res.json({ id: artwork_id });
    } catch (err) {
      console.error("Error creating artwork:", err);
      res.status(500).json({ error: "Failed to create artwork" });
    }
  });

  app.post("/api/artworks/:id/rate", (req, res) => {
    const { user_id, technique, authenticity, creativity } = req.body;
    const artwork_id = req.params.id;

    try {
      db.prepare(`
        INSERT INTO ratings (artwork_id, user_id, technique, authenticity, creativity)
        VALUES (?, ?, ?, ?, ?)
      `).run(artwork_id, user_id, technique, authenticity, creativity);

      // Update artwork scores (average)
      const stats = db.prepare(`
        SELECT AVG(technique) as avg_t, AVG(authenticity) as avg_a, AVG(creativity) as avg_c, COUNT(*) as count
        FROM ratings WHERE artwork_id = ?
      `).get(artwork_id);

      const total_points = Math.round(stats.avg_t + stats.avg_a + stats.avg_c);
      
      db.prepare(`
        UPDATE artworks 
        SET technique_score = ?, authenticity_score = ?, creativity_score = ?, total_points = ?, rating_count = ?
        WHERE id = ?
      `).run(Math.round(stats.avg_t), Math.round(stats.avg_a), Math.round(stats.avg_c), total_points, stats.count, artwork_id);

      res.json({ success: true, total_points });
    } catch (err) {
      res.status(400).json({ error: "Already rated or invalid data" });
    }
  });

  // Comments API
  app.get("/api/artworks/:id/comments", (req, res) => {
    const artwork_id = req.params.id;
    const comments = db.prepare(`
      SELECT comments.*, users.username, users.avatar_url 
      FROM comments 
      JOIN users ON comments.user_id = users.id 
      WHERE artwork_id = ? 
      ORDER BY created_at ASC
    `).all(artwork_id);
    res.json(comments);
  });

  app.post("/api/artworks/:id/comments", (req, res) => {
    const artwork_id = Number(req.params.id);
    const { user_id, content } = req.body;
    const uid = Number(user_id);
    console.log("Posting comment on artwork:", artwork_id, "by user:", uid);
    try {
      const info = db.prepare(`
        INSERT INTO comments (artwork_id, user_id, content)
        VALUES (?, ?, ?)
      `).run(artwork_id, uid, content);
      res.json({ id: Number(info.lastInsertRowid) });
    } catch (err) {
      console.error("Error posting comment:", err);
      res.status(400).json({ error: "Failed to post comment" });
    }
  });

  // Groups API
  app.get("/api/groups", (req, res) => {
    const { user_id } = req.query;
    const groups = db.prepare(`
      SELECT groups.*, (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id) as member_count
      FROM groups
      JOIN group_members ON groups.id = group_members.group_id
      WHERE group_members.user_id = ?
    `).all(user_id);
    res.json(groups);
  });

  app.get("/api/groups/public", (req, res) => {
    const groups = db.prepare(`
      SELECT groups.*, (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id) as member_count
      FROM groups
      WHERE visibility = 'public'
      ORDER BY created_at DESC
    `).all();
    console.log("Returning public groups:", groups.length);
    res.json(groups);
  });

  app.get("/api/groups/search", (req, res) => {
    const { q } = req.query;
    const groups = db.prepare(`
      SELECT groups.*, (SELECT COUNT(*) FROM group_members WHERE group_id = groups.id) as member_count
      FROM groups
      WHERE visibility = 'public' AND (name LIKE ? OR description LIKE ?)
      LIMIT 20
    `).all(`%${q}%`, `%${q}%`);
    res.json(groups);
  });

  app.post("/api/groups", (req, res) => {
    const { name, description, creator_id, visibility = 'public', cover_url } = req.body;
    const uid = Number(creator_id);
    const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("Creating group:", name, "by user:", uid);
    try {
      const info = db.prepare(`
        INSERT INTO groups (name, description, creator_id, invite_code, visibility, cover_url)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, description, uid, invite_code, visibility, cover_url);
      
      const group_id = Number(info.lastInsertRowid);
      db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(group_id, uid);
      
      res.json({ id: group_id, invite_code });
    } catch (err) {
      console.error("Error creating group:", err);
      res.status(400).json({ error: "Group name already exists" });
    }
  });

  app.post("/api/groups/join", (req, res) => {
    const { invite_code, user_id } = req.body;
    const group = db.prepare("SELECT id FROM groups WHERE invite_code = ?").get(invite_code);
    if (!group) return res.status(404).json({ error: "Invalid invite code" });
    
    try {
      db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(group.id, user_id);
      res.json({ success: true, group_id: group.id });
    } catch (err) {
      res.status(400).json({ error: "Already a member" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
