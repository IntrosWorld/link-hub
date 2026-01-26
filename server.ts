import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import { query } from './db';
import { verifyToken } from './middleware/auth';
import { AuthenticatedRequest, ContextRequest } from './types/express';
import { DatabaseHub, DatabaseLink, AnalyticsSummary } from './types/database';

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "client/dist")));

app.use(((req: Request, _res: Response, next: NextFunction) => {
  (req as ContextRequest).ctx = {
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip || ''
  };
  next();
}) as RequestHandler);

interface CreateHubRequestBody {
  handle: string;
  title?: string;
  description?: string;
  themeConfig?: Record<string, unknown>;
}

app.post("/api/hubs", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { handle, title, description, themeConfig } = req.body as CreateHubRequestBody;

  if (!handle) {
    res.status(400).json({ error: "Handle is required" });
    return;
  }

  try {
    const result = await query<DatabaseHub>(
      `INSERT INTO hubs (handle, uid, title, description, theme_config)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        handle,
        authReq.user.uid,
        title || "My Links",
        description || "",
        JSON.stringify(themeConfig || {})
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const dbError = err as { code?: string; message: string };
    if (dbError.code === '23505') {
      res.status(409).json({ error: "Handle already taken" });
      return;
    }
    res.status(500).json({ error: dbError.message });
  }
}) as RequestHandler);

app.get("/api/hubs", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    console.log('Fetching hubs for user:', authReq.user.uid);
    const result = await query<DatabaseHub>(
      "SELECT * FROM hubs WHERE uid = $1 ORDER BY created_at DESC",
      [authReq.user.uid]
    );
    console.log('Found hubs:', result.rows.length);
    res.json(result.rows);
  } catch (err) {
    const error = err as Error;
    console.error('Error in /api/hubs:', error);
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

interface LinkWithScore extends DatabaseLink {
  effective_score: number;
}

const isOutsideTimeWindow = (link: DatabaseLink, currentHour: number): boolean => {
  if (link.start_hour === null || link.end_hour === null) {
    return false;
  }
  return currentHour < link.start_hour || currentHour >= link.end_hour;
};

const shouldHideOnDevice = (link: DatabaseLink, isMobile: boolean): boolean => {
  if (link.device_target === 'mobile' && !isMobile) return true;
  if (link.device_target === 'desktop' && isMobile) return true;
  return false;
};

const calculateLinkScore = (link: DatabaseLink): LinkWithScore => {
  let score = link.clicks;
  if (link.time_priority) {
    score += link.time_priority;
  }
  return { ...link, effective_score: score };
};

app.get("/api/hubs/:handle", (async (req: Request, res: Response) => {
  const ctxReq = req as ContextRequest;
  const handle = req.params.handle;
  const currentHour = new Date().getHours();
  const isMobile = /mobile/i.test(ctxReq.ctx.userAgent);

  try {
    const hubResult = await query<DatabaseHub>(
      "SELECT * FROM hubs WHERE handle = $1",
      [handle]
    );
    const hub = hubResult.rows[0];

    if (!hub) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    query(
      "INSERT INTO analytics (hub_id, event_type, user_agent) VALUES ($1, 'view', $2)",
      [hub.id, ctxReq.ctx.userAgent]
    ).catch(err => console.error("Analytics error:", err));

    const linksResult = await query<DatabaseLink>(
      "SELECT * FROM links WHERE hub_id = $1",
      [hub.id]
    );
    const links = linksResult.rows;

    const visibleLinks = links.filter(link => {
      if (isOutsideTimeWindow(link, currentHour)) return false;
      if (shouldHideOnDevice(link, isMobile)) return false;
      return true;
    });

    const rankedLinks = visibleLinks.map(calculateLinkScore);
    rankedLinks.sort((a, b) => b.effective_score - a.effective_score);

    res.json({
      hub: {
        ...hub,
        theme_config: JSON.parse(hub.theme_config || '{}')
      },
      links: rankedLinks
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

interface CreateLinkRequestBody {
  hubId: number;
  title: string;
  url: string;
  startHour?: number | null;
  endHour?: number | null;
  timePriority?: number;
  deviceTarget?: 'all' | 'mobile' | 'desktop';
}

app.post("/api/links", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { hubId, title, url, startHour, endHour, timePriority, deviceTarget } = req.body as CreateLinkRequestBody;

  try {
    const hubCheck = await query<{ uid: string }>(
      "SELECT uid FROM hubs WHERE id = $1",
      [hubId]
    );

    if (hubCheck.rows.length === 0) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    if (hubCheck.rows[0].uid !== authReq.user.uid) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const result = await query<{ id: number }>(
      `INSERT INTO links
      (hub_id, title, url, start_hour, end_hour, time_priority, device_target)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [hubId, title, url, startHour, endHour, timePriority, deviceTarget || 'all']
    );
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

app.delete("/api/links/:id", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const id = req.params.id;
    const check = await query<{ uid: string }>(
      `SELECT hubs.uid FROM links
       JOIN hubs ON links.hub_id = hubs.id
       WHERE links.id = $1`,
      [id]
    );

    if (check.rows.length === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    if (check.rows[0].uid !== authReq.user.uid) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    await query("DELETE FROM links WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

app.get("/go/:id", (async (req: Request, res: Response) => {
  const ctxReq = req as ContextRequest;
  const id = Number(req.params.id);

  try {
    const linkResult = await query<DatabaseLink>(
      "SELECT * FROM links WHERE id = $1",
      [id]
    );
    const link = linkResult.rows[0];

    if (!link) {
      res.status(404).send("Link not found");
      return;
    }

    query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id])
      .catch(console.error);

    query(
      "INSERT INTO analytics (hub_id, link_id, event_type, user_agent) VALUES ($1, $2, 'click', $3)",
      [link.hub_id, id, ctxReq.ctx.userAgent]
    ).catch(console.error);

    res.redirect(link.url);
  } catch (err) {
    res.status(500).send("Server Error");
  }
}) as RequestHandler);

app.get("/api/analytics/:hubId", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const hubId = req.params.hubId;

  try {
    const hubCheck = await query<{ uid: string }>(
      "SELECT uid FROM hubs WHERE id = $1",
      [hubId]
    );

    if (hubCheck.rows.length === 0) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    if (hubCheck.rows[0].uid !== authReq.user.uid) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const analyticsQuery = `
      SELECT
        COUNT(CASE WHEN event_type='view' THEN 1 END) as total_views,
        COUNT(CASE WHEN event_type='click' THEN 1 END) as total_clicks
      FROM analytics WHERE hub_id = $1
    `;

    const result = await query<AnalyticsSummary>(analyticsQuery, [hubId]);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

app.get(/.*/, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

app.listen(3000, () => {
  console.log("Create Hub API Server running on port 3000");
});
