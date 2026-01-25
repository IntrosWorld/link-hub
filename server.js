const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = require("./db");

/*
  GET all links
  - ranks links using:
    effective_score = (time_priority when active) + clicks
*/
app.get("/links", (req, res) => {
  const currentHour = new Date().getHours();

  db.all("SELECT * FROM links", (err, rows) => {
    if (err) {
      return res.status(500).json(err);
    }

    const rankedLinks = rows.map(link => {
      let score = link.clicks;

      // Apply time-based priority
      if (
        link.start_hour !== null &&
        link.end_hour !== null &&
        currentHour >= link.start_hour &&
        currentHour < link.end_hour
      ) {
        score += link.time_priority || 0;
      }

      return {
        ...link,
        effective_score: score
      };
    });

    // Sort by final score
    rankedLinks.sort(
      (a, b) => b.effective_score - a.effective_score
    );

    res.json(rankedLinks);
  });
});

/*
  ADD a new link
*/
app.post("/links", (req, res) => {
  const { title, url, startHour, endHour, timePriority } = req.body;

  db.run(
    `INSERT INTO links
     (title, url, start_hour, end_hour, time_priority)
     VALUES (?, ?, ?, ?, ?)`,
    [
      title,
      url,
      startHour ?? null,
      endHour ?? null,
      timePriority ?? 0
    ],
    function (err) {
      if (err) {
        return res.status(500).json(err);
      }
      res.json({ id: this.lastID });
    }
  );
});

/*
  Redirect + click analytics
*/
app.get("/go/:id", (req, res) => {
  const id = Number(req.params.id);

  db.get("SELECT url FROM links WHERE id = ?", [id], (err, row) => {
    if (err || !row) {
      return res.status(404).send("Link not found");
    }

    db.run(
      "UPDATE links SET clicks = clicks + 1 WHERE id = ?",
      [id]
    );

    res.redirect(row.url);
  });
});
//delete
app.delete("/links/:id", (req, res) => {
  const id = Number(req.params.id);

  db.run("DELETE FROM links WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json(err);
    }

    res.json({ success: true });
  });
});

/*
  Start server
*/
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
