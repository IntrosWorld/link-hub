import 'dotenv/config';
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import { query } from './db';
import { verifyToken } from './middleware/auth';
import admin from './firebaseAdmin';
import { AuthenticatedRequest, ContextRequest } from './types/express';
import { DatabaseHub, DatabaseLink, DatabaseUser, AnalyticsSummary, DatabaseLinkArrangement, DatabaseUserLinkData } from './types/database';

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

interface ViewerInfo {
  uid: string;
  username: string | null;
}

const normalizeUsernames = (names?: string[] | null): string[] => {
  if (!names) return [];
  return names
    .map(name => name.trim().toLowerCase())
    .filter(Boolean);
};

const getOptionalViewer = async (req: Request): Promise<ViewerInfo | null> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const adminWithInit = admin as any;
  if (!adminWithInit.isInitialized || !adminWithInit.isInitialized()) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  const userResult = await query<DatabaseUser>(
    "SELECT username FROM users WHERE uid = $1",
    [decodedToken.uid]
  );

  return {
    uid: decodedToken.uid,
    username: userResult.rows[0]?.username ?? null
  };
};

const canViewHub = (hub: Pick<DatabaseHub, 'uid' | 'visibility' | 'allowed_usernames'>, viewer: ViewerInfo | null): boolean => {
  if (viewer && viewer.uid === hub.uid) return true;
  if (hub.visibility === 'public') return true;
  if (hub.visibility === 'private') return false;

  const allowed = normalizeUsernames(hub.allowed_usernames);
  if (!viewer?.username) return false;
  return allowed.includes(viewer.username.toLowerCase());
};

const canViewLink = (link: Pick<DatabaseLink, 'visibility' | 'allowed_usernames'>, hub: Pick<DatabaseHub, 'uid'>, viewer: ViewerInfo | null): boolean => {
  console.log('canViewLink check:', {
    linkId: (link as any).id,
    linkVisibility: link.visibility,
    linkAllowedUsernames: link.allowed_usernames,
    viewerUsername: viewer?.username,
    viewerUid: viewer?.uid,
    hubUid: hub.uid
  });

  if (viewer && viewer.uid === hub.uid) {
    console.log('Access granted: Hub owner');
    return true;
  }

  if (link.visibility === 'public') {
    console.log('Access granted: Public link');
    return true;
  }

  const allowed = normalizeUsernames(link.allowed_usernames);
  console.log('Normalized allowed usernames:', allowed);

  if (!viewer?.username) {
    console.log('Access denied: No viewer username');
    return false;
  }

  const result = allowed.includes(viewer.username.toLowerCase());
  console.log('Access result for username', viewer.username.toLowerCase(), ':', result);
  return result;
};

// ====== USER / USERNAME ENDPOINTS ======

interface CreateUsernameRequestBody {
  username: string;
  displayName?: string;
}

app.post("/api/users/username", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { username, displayName } = req.body as CreateUsernameRequestBody;

  if (!username) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  if (!usernameRegex.test(username)) {
    res.status(400).json({ error: "Username must be 3-20 characters (alphanumeric, underscores, hyphens only)" });
    return;
  }

  try {
    const result = await query<DatabaseUser>(
      `INSERT INTO users (uid, username, display_name)
       VALUES ($1, $2, $3) RETURNING *`,
      [authReq.user.uid, username.toLowerCase(), displayName || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const dbError = err as { code?: string; message: string };
    if (dbError.code === '23505') {
      res.status(409).json({ error: "Username already taken" });
      return;
    }
    res.status(500).json({ error: dbError.message });
  }
}) as RequestHandler);

app.get("/api/users/check/:username", (async (req: Request, res: Response) => {
  const username = String(req.params.username).toLowerCase();

  try {
    const result = await query<DatabaseUser>(
      "SELECT username FROM users WHERE username = $1",
      [username]
    );
    res.json({ available: result.rows.length === 0 });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

app.get("/api/users/me", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const result = await query<DatabaseUser>(
      "SELECT * FROM users WHERE uid = $1",
      [authReq.user.uid]
    );

    if (result.rows.length === 0) {
      res.json({ hasUsername: false, user: null });
      return;
    }

    res.json({ hasUsername: true, user: result.rows[0] });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// ====== HUB ENDPOINTS ======

interface CreateHubRequestBody {
  handle: string;
  title?: string;
  description?: string;
  themeConfig?: Record<string, unknown>;
  visibility?: 'public' | 'private' | 'restricted';
  allowedUsernames?: string[];
}

app.post("/api/hubs", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { handle, title, description, themeConfig, visibility, allowedUsernames } = req.body as CreateHubRequestBody;

  if (!handle) {
    res.status(400).json({ error: "Handle is required" });
    return;
  }

  try {
    const userResult = await query<DatabaseUser>(
      "SELECT username FROM users WHERE uid = $1",
      [authReq.user.uid]
    );

    if (userResult.rows.length === 0) {
      res.status(400).json({ error: "User must set username first" });
      return;
    }

    const username = userResult.rows[0].username;

    const normalizedAllowedUsernames = Array.isArray(allowedUsernames)
      ? normalizeUsernames(allowedUsernames)
      : null;

    const result = await query<DatabaseHub>(
      `INSERT INTO hubs (handle, username, uid, title, description, theme_config, visibility, allowed_usernames)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        handle,
        username,
        authReq.user.uid,
        title || "My Links",
        description || "",
        JSON.stringify(themeConfig || {}),
        visibility || 'public',
        normalizedAllowedUsernames
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

interface UpdateHubRequestBody {
  visibility?: 'public' | 'private' | 'restricted';
  allowedUsernames?: string[] | null;
}

app.patch("/api/hubs/:id", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const hubId = Number(req.params.id);
  const { visibility, allowedUsernames } = req.body as UpdateHubRequestBody;

  try {
    const hubResult = await query<DatabaseHub>(
      "SELECT * FROM hubs WHERE id = $1",
      [hubId]
    );
    const hub = hubResult.rows[0];

    if (!hub) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    if (hub.uid !== authReq.user.uid) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (visibility) {
      updates.push(`visibility = $${idx}`);
      values.push(visibility);
      idx += 1;
    }

    if (typeof allowedUsernames !== 'undefined') {
      const normalizedAllowed = Array.isArray(allowedUsernames)
        ? normalizeUsernames(allowedUsernames)
        : null;
      updates.push(`allowed_usernames = $${idx}`);
      values.push(normalizedAllowed);
      idx += 1;
    }

    if (updates.length === 0) {
      res.json(hub);
      return;
    }

    values.push(hubId);
    const updateQuery = `UPDATE hubs SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query<DatabaseHub>(updateQuery, values);
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

// ====== ARRANGEMENT ENDPOINTS ======

interface GetArrangementQuery {
  username?: string;
}

app.get("/api/hubs/:hubId/arrangements", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const hubId = Number(req.params.hubId);
  const { username } = req.query as GetArrangementQuery;

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

    if (username !== undefined) {
      // Fetch specific arrangement
      const targetUsername = username || null;
      const result = await query<DatabaseLinkArrangement>(
        "SELECT * FROM link_arrangements WHERE hub_id = $1 AND username IS NOT DISTINCT FROM $2 AND active = true",
        [hubId, targetUsername]
      );

      if (result.rows.length === 0) {
        res.json({ arrangement: null });
        return;
      }

      res.json({ arrangement: result.rows[0] });
    } else {
      // Fetch all arrangements for the hub
      const result = await query<DatabaseLinkArrangement>(
        "SELECT * FROM link_arrangements WHERE hub_id = $1 AND active = true ORDER BY username NULLS FIRST, created_at DESC",
        [hubId]
      );

      res.json({ arrangements: result.rows });
    }
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

interface CreateArrangementBody {
  username?: string | null;
  linkOrder: number[];
  description?: string;
}

app.put("/api/hubs/:hubId/arrangements", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const hubId = Number(req.params.hubId);
  const { username, linkOrder, description } = req.body as CreateArrangementBody;

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

    if (!Array.isArray(linkOrder) || linkOrder.length === 0) {
      res.status(400).json({ error: "linkOrder must be a non-empty array" });
      return;
    }

    const targetUsername = username || null;

    const existingResult = await query<DatabaseLinkArrangement>(
      "SELECT id FROM link_arrangements WHERE hub_id = $1 AND username IS NOT DISTINCT FROM $2",
      [hubId, targetUsername]
    );

    let result;
    if (existingResult.rows.length > 0) {
      result = await query<DatabaseLinkArrangement>(
        `UPDATE link_arrangements
         SET link_order = $1, description = $2, active = true, updated_at = CURRENT_TIMESTAMP
         WHERE hub_id = $3 AND username IS NOT DISTINCT FROM $4
         RETURNING *`,
        [linkOrder, description || null, hubId, targetUsername]
      );
    } else {
      result = await query<DatabaseLinkArrangement>(
        `INSERT INTO link_arrangements (hub_id, username, link_order, description, active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [hubId, targetUsername, linkOrder, description || null]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
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

const isOutsideDateRange = (link: DatabaseLink, currentDate: Date): boolean => {
  if (link.schedule_start_date) {
    const startDate = new Date(link.schedule_start_date);
    if (currentDate < startDate) return true;
  }
  if (link.schedule_end_date) {
    const endDate = new Date(link.schedule_end_date);
    endDate.setHours(23, 59, 59, 999);
    if (currentDate > endDate) return true;
  }
  return false;
};

const isNotAllowedDay = (link: DatabaseLink, currentDay: number): boolean => {
  if (!link.days_of_week || link.days_of_week.length === 0) return false;
  return !link.days_of_week.includes(currentDay);
};

const hasReachedMaxClicks = (link: DatabaseLink): boolean => {
  if (link.max_clicks === null) return false;
  return link.clicks >= link.max_clicks;
};

const hasExpired = (link: DatabaseLink, currentDate: Date): boolean => {
  if (!link.expires_at) return false;
  const expiryDate = new Date(link.expires_at);
  return currentDate > expiryDate;
};

const hasUserReachedMaxClicks = (link: DatabaseLink, userClicks: number): boolean => {
  if (link.max_clicks_per_user === null) return false;
  return userClicks >= link.max_clicks_per_user;
};

const calculateLinkScore = (link: DatabaseLink): LinkWithScore => {
  let score = link.clicks;
  if (link.time_priority) {
    score += link.time_priority;
  }
  return { ...link, effective_score: score };
};

const sendPublicHubResponse = async (
  req: Request,
  res: Response,
  hubQuery: string,
  hubParams: unknown[]
): Promise<void> => {
  const ctxReq = req as ContextRequest;
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const currentDay = currentDate.getDay();
  const isMobile = /mobile/i.test(ctxReq.ctx.userAgent);

  let viewer: ViewerInfo | null = null;
  try {
    viewer = await getOptionalViewer(req);
  } catch (_err) {
    res.status(403).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  try {
    const hubResult = await query<DatabaseHub>(hubQuery, hubParams);
    const hub = hubResult.rows[0];

    if (!hub) {
      res.status(404).json({ error: "Hub not found" });
      return;
    }

    if (!canViewHub(hub, viewer)) {
      res.status(403).json({ error: "Access denied" });
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

    let userClickData: Map<number, number> = new Map();
    if (viewer?.username) {
      const userDataResult = await query<DatabaseUserLinkData>(
        "SELECT link_id, clicks FROM user_link_data WHERE username = $1",
        [viewer.username]
      );
      userDataResult.rows.forEach(row => {
        userClickData.set(row.link_id, row.clicks);
      });
    }

    const visibleLinks = links.filter(link => {
      if (!canViewLink(link, hub, viewer)) return false;
      if (isOutsideTimeWindow(link, currentHour)) return false;
      if (shouldHideOnDevice(link, isMobile)) return false;
      if (isOutsideDateRange(link, currentDate)) return false;
      if (isNotAllowedDay(link, currentDay)) return false;
      if (hasReachedMaxClicks(link)) return false;
      if (hasExpired(link, currentDate)) return false;

      const userClicks = userClickData.get(link.id) || 0;
      if (hasUserReachedMaxClicks(link, userClicks)) return false;

      return true;
    });

    let arrangement: DatabaseLinkArrangement | null = null;
    if (viewer?.username) {
      const userArrangementResult = await query<DatabaseLinkArrangement>(
        "SELECT * FROM link_arrangements WHERE hub_id = $1 AND username = $2 AND active = true",
        [hub.id, viewer.username]
      );
      arrangement = userArrangementResult.rows[0] || null;
    }

    if (!arrangement) {
      const defaultArrangementResult = await query<DatabaseLinkArrangement>(
        "SELECT * FROM link_arrangements WHERE hub_id = $1 AND username IS NULL AND active = true",
        [hub.id]
      );
      arrangement = defaultArrangementResult.rows[0] || null;
    }

    let orderedLinks: DatabaseLink[];
    if (arrangement && arrangement.link_order.length > 0) {
      const linkMap = new Map(visibleLinks.map(link => [link.id, link]));
      orderedLinks = arrangement.link_order
        .map(id => linkMap.get(id))
        .filter((link): link is DatabaseLink => link !== undefined);

      const remainingLinks = visibleLinks.filter(
        link => !arrangement!.link_order.includes(link.id)
      );
      orderedLinks.push(...remainingLinks);
    } else {
      const rankedLinks = visibleLinks.map(calculateLinkScore);
      rankedLinks.sort((a, b) => b.effective_score - a.effective_score);
      orderedLinks = rankedLinks;
    }

    res.json({
      hub: {
        ...hub,
        theme_config: JSON.parse(hub.theme_config || '{}')
      },
      links: orderedLinks
    });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
};

app.get("/api/hubs/:handle", (async (req: Request, res: Response) => {
  const handle = req.params.handle;
  await sendPublicHubResponse(req, res, "SELECT * FROM hubs WHERE handle = $1", [handle]);
}) as RequestHandler);

app.get("/api/hubs/:username/:hubHandle", (async (req: Request, res: Response) => {
  const { username, hubHandle } = req.params;
  await sendPublicHubResponse(
    req,
    res,
    "SELECT * FROM hubs WHERE username = $1 AND handle = $2",
    [String(username).toLowerCase(), String(hubHandle)]
  );
}) as RequestHandler);

interface CreateLinkRequestBody {
  hubId: number;
  title: string;
  url: string;
  startHour?: number | null;
  endHour?: number | null;
  timePriority?: number;
  deviceTarget?: 'all' | 'mobile' | 'desktop';
  visibility?: 'public' | 'restricted';
  allowedUsernames?: string[];
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
  daysOfWeek?: number[] | null;
  maxClicks?: number | null;
  maxClicksPerUser?: number | null;
  expiresAt?: string | null;
}

app.post("/api/links", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const {
    hubId,
    title,
    url,
    startHour,
    endHour,
    timePriority,
    deviceTarget,
    visibility,
    allowedUsernames,
    scheduleStartDate,
    scheduleEndDate,
    daysOfWeek,
    maxClicks,
    maxClicksPerUser,
    expiresAt
  } = req.body as CreateLinkRequestBody;

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

    const normalizedAllowedUsernames = Array.isArray(allowedUsernames)
      ? normalizeUsernames(allowedUsernames)
      : null;

    const result = await query<{ id: number }>(
      `INSERT INTO links
      (hub_id, title, url, start_hour, end_hour, time_priority, device_target, visibility, allowed_usernames,
       schedule_start_date, schedule_end_date, days_of_week, max_clicks, max_clicks_per_user, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
      [
        hubId,
        title,
        url,
        startHour ?? null,
        endHour ?? null,
        timePriority ?? 0,
        deviceTarget || 'all',
        visibility || 'public',
        normalizedAllowedUsernames,
        scheduleStartDate ?? null,
        scheduleEndDate ?? null,
        daysOfWeek ?? null,
        maxClicks ?? null,
        maxClicksPerUser ?? null,
        expiresAt ?? null
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

interface UpdateLinkRequestBody {
  visibility?: 'public' | 'restricted';
  allowedUsernames?: string[] | null;
}

app.patch("/api/links/:id", verifyToken, (async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const linkId = Number(req.params.id);
  const { visibility, allowedUsernames } = req.body as UpdateLinkRequestBody;

  try {
    const linkCheck = await query<{ uid: string }>(
      `SELECT hubs.uid FROM links
       JOIN hubs ON links.hub_id = hubs.id
       WHERE links.id = $1`,
      [linkId]
    );

    if (linkCheck.rows.length === 0) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    if (linkCheck.rows[0].uid !== authReq.user.uid) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (visibility) {
      updates.push(`visibility = $${idx}`);
      values.push(visibility);
      idx += 1;
    }

    if (typeof allowedUsernames !== 'undefined') {
      const normalizedAllowed = Array.isArray(allowedUsernames)
        ? normalizeUsernames(allowedUsernames)
        : null;
      updates.push(`allowed_usernames = $${idx}`);
      values.push(normalizedAllowed);
      idx += 1;
    }

    if (updates.length === 0) {
      res.json({ success: true });
      return;
    }

    values.push(linkId);
    const updateQuery = `UPDATE links SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id`;
    const result = await query<{ id: number }>(updateQuery, values);
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

type LinkWithHubAccess = DatabaseLink & {
  hub_uid: string;
  hub_visibility: DatabaseHub['visibility'];
  hub_allowed_usernames: string[] | null;
};

app.get("/api/links/resolve/:id", (async (req: Request, res: Response) => {
  const ctxReq = req as ContextRequest;
  const id = Number(req.params.id);

  let viewer: ViewerInfo | null = null;
  try {
    viewer = await getOptionalViewer(req);
  } catch (_err) {
    res.status(403).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  try {
    const linkResult = await query<LinkWithHubAccess>(
      `SELECT links.*, hubs.uid as hub_uid, hubs.visibility as hub_visibility, hubs.allowed_usernames as hub_allowed_usernames
       FROM links
       JOIN hubs ON links.hub_id = hubs.id
       WHERE links.id = $1`,
      [id]
    );
    const link = linkResult.rows[0];

    if (!link) {
      res.status(404).json({ error: "Link not found" });
      return;
    }

    const hubAccess = {
      uid: link.hub_uid,
      visibility: link.hub_visibility,
      allowed_usernames: link.hub_allowed_usernames
    };

    if (!canViewHub(hubAccess, viewer)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    if (!canViewLink(link, hubAccess, viewer)) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id])
      .catch(console.error);

    query(
      "INSERT INTO analytics (hub_id, link_id, event_type, user_agent) VALUES ($1, $2, 'click', $3)",
      [link.hub_id, id, ctxReq.ctx.userAgent]
    ).catch(console.error);

    if (viewer?.username) {
      query(
        `INSERT INTO user_link_data (username, link_id, clicks, first_clicked, last_clicked)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (username, link_id)
         DO UPDATE SET clicks = user_link_data.clicks + 1, last_clicked = CURRENT_TIMESTAMP`,
        [viewer.username, id]
      ).catch(console.error);
    }

    res.json({ url: link.url });
  } catch (err) {
    const error = err as Error;
    res.status(500).json({ error: error.message });
  }
}) as RequestHandler);

app.get("/go/:id", (async (req: Request, res: Response) => {
  const ctxReq = req as ContextRequest;
  const id = Number(req.params.id);

  try {
    let viewer: ViewerInfo | null = null;
    try {
      viewer = await getOptionalViewer(req);
    } catch (_err) {
      res.status(403).send("Unauthorized");
      return;
    }

    const linkResult = await query<LinkWithHubAccess>(
      `SELECT links.*, hubs.uid as hub_uid, hubs.visibility as hub_visibility, hubs.allowed_usernames as hub_allowed_usernames
       FROM links
       JOIN hubs ON links.hub_id = hubs.id
       WHERE links.id = $1`,
      [id]
    );
    const link = linkResult.rows[0];

    if (!link) {
      res.status(404).send("Link not found");
      return;
    }

    const hubAccess = {
      uid: link.hub_uid,
      visibility: link.hub_visibility,
      allowed_usernames: link.hub_allowed_usernames
    };

    if (!canViewHub(hubAccess, viewer) || !canViewLink(link, hubAccess, viewer)) {
      res.status(403).send("Access denied");
      return;
    }

    query("UPDATE links SET clicks = clicks + 1 WHERE id = $1", [id])
      .catch(console.error);

    query(
      "INSERT INTO analytics (hub_id, link_id, event_type, user_agent) VALUES ($1, $2, 'click', $3)",
      [link.hub_id, id, ctxReq.ctx.userAgent]
    ).catch(console.error);

    if (viewer?.username) {
      query(
        `INSERT INTO user_link_data (username, link_id, clicks, first_clicked, last_clicked)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (username, link_id)
         DO UPDATE SET clicks = user_link_data.clicks + 1, last_clicked = CURRENT_TIMESTAMP`,
        [viewer.username, id]
      ).catch(console.error);
    }

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

// Only start server if not in Vercel serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(3000, () => {
    console.log("Create Hub API Server running on port 3000");
  });
}

export default app;
