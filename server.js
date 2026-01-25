require('dotenv').config();
const express = require("express");
const app = express();
const path = require("path");
const db = require("./db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "client/dist"))); // Serve React Build

// Middleware to simulate context (Device, Location)
// in real app, use a library like 'express-useragent' and 'geoip-lite'
app.use((req, res, next) => {
  req.ctx = {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip
  };
  next();
});

const verifyToken = require("./middleware/auth");

// --- HUB API ---

/*
  CREATE a new HUB (Protected)
  POST /api/hubs
  body: { handle, title, description, themeConfig }
*/
app.post("/api/hubs", verifyToken, async (req, res) => {
  const { handle, title, description, themeConfig } = req.body;
  if (!handle) return res.status(400).json({ error: "Handle is required" });

  try {
    const result = await db.query(
      `INSERT INTO hubs (handle, uid, title, description, theme_config) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [handle, req.user.uid, title || "My Links", description || "", JSON.stringify(themeConfig || {})]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique_violation
      return res.status(409).json({ error: "Handle already taken" });
    }
    res.status(500).json({ error: err.message });
  }
});

/*
  LIST all HUBs for Current User (Protected)
  GET /api/hubs
*/
app.get("/api/hubs", verifyToken, async (req, res) => {
  try {
    console.log('Fetching hubs for user:', req.user.uid);
    // Only return hubs belonging to the authenticated user
    const result = await db.query("SELECT * FROM hubs WHERE uid = $1 ORDER BY created_at DESC", [req.user.uid]);
    console.log('Found hubs:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /api/hubs:', err);
    res.status(500).json({ error: err.message });
  }
});

/*
  GET Hub by Handle (Public View)
  - Applying Smart Rules (Time, Device)
  GET /api/hubs/:handle
*/
app.get("/api/hubs/:handle", async (req, res) => {
  const handle = req.params.handle;
  const currentHour = new Date().getHours();
  const isMobile = /mobile/i.test(req.ctx.userAgent);

  try {
    const hubResult = await db.query("SELECT * FROM hubs WHERE handle = $1", [handle]);
    const hub = hubResult.rows[0];

    if (!hub) return res.status(404).json({ error: "Hub not found" });

    // Track Hub View
    // Fire and forget, or await if critical
    db.query("INSERT INTO analytics (hub_id, event_type, user_agent) VALUES ($1, 'view', $2)",
      [hub.id, req.ctx.userAgent]
    ).catch(err => console.error("Analytics error:", err));

    // Fetch Links for this Hub
    const linksResult = await db.query("SELECT * FROM links WHERE hub_id = $1", [hub.id]);
    const links = linksResult.rows;

    // --- SMART ENGINE ---
    const visibleLinks = links.filter(link => {
      // 1. Time Rule
      if (link.start_hour !== null && link.end_hour !== null) {
        if (currentHour < link.start_hour || currentHour >= link.end_hour) return false;
      }
      // 2. Device Rule
      if (link.device_target === 'mobile' && !isMobile) return false;
      if (link.device_target === 'desktop' && isMobile) return false;

      return true;
    });

    // Ranking logic (Clicks + Priority)
    const rankedLinks = visibleLinks.map(link => {
      let score = link.clicks;
      if (link.time_priority) score += link.time_priority;
      return { ...link, effective_score: score };
    });

    rankedLinks.sort((a, b) => b.effective_score - a.effective_score);

    res.json({
      hub: {
        ...hub,
        theme_config: JSON.parse(hub.theme_config || '{}')
      },
      links: rankedLinks
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- LINK API ---

/*
  ADD Link to Hub (Protected)
  POST /api/links
*/
app.post("/api/links", verifyToken, async (req, res) => {
  const { hubId, title, url, startHour, endHour, timePriority, deviceTarget } = req.body;

  try {
    // Verify user owns the hub
    const hubCheck = await db.query("SELECT uid FROM hubs WHERE id = $1", [hubId]);
    if (hubCheck.rows.length === 0) return res.status(404).json({ error: "Hub not found" });
    if (hubCheck.rows[0].uid !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

    const result = await db.query(
      `INSERT INTO links 
      (hub_id, title, url, start_hour, end_hour, time_priority, device_target)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [hubId, title, url, startHour, endHour, timePriority, deviceTarget || 'all']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
  DELETE Link (Protected)
*/
app.delete("/api/links/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    // Check ownership via Hub
    const check = await db.query(`
      SELECT hubs.uid FROM links 
      JOIN hubs ON links.hub_id = hubs.id 
      WHERE links.id = $1
    `, [id]);

    if (check.rows.length === 0) return res.status(404).json({ error: "Link not found" });
    if (check.rows[0].uid !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

    await db.query("DELETE FROM links WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- REDIRECT SERVICE ---

/*
  Smart Redirect
  GET /go/:id
*/
app.get("/go/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const linkResult = await db.query("SELECT * FROM links WHERE id = $1", [id]);
    const link = linkResult.rows[0];

    if (!link) return res.status(404).send("Link not found");

    // Async Analytics
    db.query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id]).catch(console.error);
    db.query("INSERT INTO analytics (hub_id, link_id, event_type, user_agent) VALUES ($1, $2, 'click', $3)",
      [link.hub_id, id, req.ctx.userAgent]
    ).catch(console.error);

    res.redirect(link.url);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});


// --- ANALYTICS API ---

/*
  GET Analytics (Protected)
*/
app.get("/api/analytics/:hubId", verifyToken, async (req, res) => {
  const hubId = req.params.hubId;

  try {
    // Check ownership
    const hubCheck = await db.query("SELECT uid FROM hubs WHERE id = $1", [hubId]);
    if (hubCheck.rows.length === 0) return res.status(404).json({ error: "Hub not found" });
    if (hubCheck.rows[0].uid !== req.user.uid) return res.status(403).json({ error: "Unauthorized" });

    const query = `
      SELECT 
        COUNT(CASE WHEN event_type='view' THEN 1 END) as total_views,
        COUNT(CASE WHEN event_type='click' THEN 1 END) as total_clicks
      FROM analytics WHERE hub_id = $1
    `;

    const result = await db.query(query, [hubId]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all for React Router
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});


app.listen(3000, () => {
  console.log("Create Hub API Server running on port 3000");
});
