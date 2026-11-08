require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const pool = require("./db");
const { auth, signToken } = require("./auth");

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL?.split(",") || true }));
app.use(express.json({ limit: "1mb" }));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  const [rows] = await pool.query(
    "SELECT id,name,email,password_hash,status FROM users WHERE email=? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const user = rows[0];
  if (!user || user.status !== "active" || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}));

app.get("/api/auth/me", auth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id,name,email,status FROM users WHERE id=? LIMIT 1",
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ message: "User not found" });
  res.json({ user: rows[0] });
}));

function registerCrud({ path, table, fields, select = "*" }) {
  app.get(`/api/${path}`, auth, asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${select} FROM ${table} WHERE user_id=? ORDER BY id DESC`,
      [req.user.id]
    );
    res.json(rows);
  }));

  app.get(`/api/${path}/:id`, auth, asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT ${select} FROM ${table} WHERE id=? AND user_id=? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  }));

  app.post(`/api/${path}`, auth, asyncHandler(async (req, res) => {
    const values = fields.map((f) => req.body[f] ?? null);
    if (fields.some((f) => req.body[f] === undefined) && table !== "participants") {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const columns = ["user_id", ...fields];
    const [result] = await pool.query(
      `INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      [req.user.id, ...values]
    );
    const [rows] = await pool.query(
      `SELECT ${select} FROM ${table} WHERE id=? AND user_id=?`,
      [result.insertId, req.user.id]
    );
    res.status(201).json(rows[0]);
  }));

  app.put(`/api/${path}/:id`, auth, asyncHandler(async (req, res) => {
    const set = fields.map((f) => `${f}=?`).join(",");
    const values = fields.map((f) => req.body[f] ?? null);
    const [result] = await pool.query(
      `UPDATE ${table} SET ${set} WHERE id=? AND user_id=?`,
      [...values, req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Not found" });
    const [rows] = await pool.query(
      `SELECT ${select} FROM ${table} WHERE id=? AND user_id=?`,
      [req.params.id, req.user.id]
    );
    res.json(rows[0]);
  }));

  app.delete(`/api/${path}/:id`, auth, asyncHandler(async (req, res) => {
    const [result] = await pool.query(
      `DELETE FROM ${table} WHERE id=? AND user_id=?`,
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  }));
}

registerCrud({
  path: "departments",
  table: "departments",
  fields: ["name", "description", "status"]
});

registerCrud({
  path: "positions",
  table: "positions",
  fields: ["department_id", "name", "description", "status"]
});

registerCrud({
  path: "events",
  table: "events",
  fields: ["name", "event_code", "description", "location", "start_date", "end_date", "start_time", "end_time", "capacity", "status"]
});

app.get("/api/participants", auth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.*, d.name AS department_name, po.name AS position_name
    FROM participants p
    LEFT JOIN departments d ON d.id=p.department_id AND d.user_id=p.user_id
    LEFT JOIN positions po ON po.id=p.position_id AND po.user_id=p.user_id
    WHERE p.user_id=?
    ORDER BY p.id DESC
  `, [req.user.id]);
  res.json(rows);
}));

app.post("/api/participants", auth, asyncHandler(async (req, res) => {
  const { full_name, email, phone, gender, department_id, position_id } = req.body;
  if (!full_name) return res.status(400).json({ message: "Full name is required" });

  const [result] = await pool.query(
    `INSERT INTO participants
     (user_id,full_name,email,phone,gender,department_id,position_id)
     VALUES (?,?,?,?,?,?,?)`,
    [req.user.id, full_name, email || null, phone || null, gender || null, department_id || null, position_id || null]
  );

  const [rows] = await pool.query(
    "SELECT * FROM participants WHERE id=? AND user_id=?",
    [result.insertId, req.user.id]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/participants/:id", auth, asyncHandler(async (req, res) => {
  const { full_name, email, phone, gender, department_id, position_id } = req.body;
  const [result] = await pool.query(
    `UPDATE participants
     SET full_name=?,email=?,phone=?,gender=?,department_id=?,position_id=?
     WHERE id=? AND user_id=?`,
    [full_name, email || null, phone || null, gender || null, department_id || null, position_id || null, req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Participant not found" });
  const [rows] = await pool.query("SELECT * FROM participants WHERE id=?", [req.params.id]);
  res.json(rows[0]);
}));

app.delete("/api/participants/:id", auth, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "DELETE FROM participants WHERE id=? AND user_id=?",
    [req.params.id, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Participant not found" });
  res.json({ success: true });
}));

app.get("/api/events/:eventId/participants", auth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT ep.*, p.full_name,p.email,p.phone,p.gender,
           d.name AS department_name, po.name AS position_name,
           c.checked_in_at
    FROM event_participants ep
    JOIN participants p ON p.id=ep.participant_id AND p.user_id=ep.user_id
    LEFT JOIN departments d ON d.id=p.department_id
    LEFT JOIN positions po ON po.id=p.position_id
    LEFT JOIN checkins c ON c.event_participant_id=ep.id
    WHERE ep.event_id=? AND ep.user_id=?
    ORDER BY ep.id DESC
  `, [req.params.eventId, req.user.id]);
  res.json(rows);
}));

app.post("/api/events/:eventId/participants", auth, asyncHandler(async (req, res) => {
  const { participant_id } = req.body;
  const [events] = await pool.query(
    "SELECT id,name,event_code FROM events WHERE id=? AND user_id=? LIMIT 1",
    [req.params.eventId, req.user.id]
  );
  if (!events[0]) return res.status(404).json({ message: "Event not found" });

  const [participants] = await pool.query(
    "SELECT id FROM participants WHERE id=? AND user_id=? LIMIT 1",
    [participant_id, req.user.id]
  );
  if (!participants[0]) return res.status(404).json({ message: "Participant not found" });

  const [existing] = await pool.query(
    "SELECT id FROM event_participants WHERE event_id=? AND participant_id=? LIMIT 1",
    [req.params.eventId, participant_id]
  );
  if (existing[0]) return res.status(409).json({ message: "Participant is already registered for this event" });

  const registrationCode = `${events[0].event_code}-${String(Date.now()).slice(-6)}`;
  const qrToken = uuidv4();

  const [result] = await pool.query(
    `INSERT INTO event_participants
     (user_id,event_id,participant_id,registration_code,qr_token)
     VALUES (?,?,?,?,?)`,
    [req.user.id, req.params.eventId, participant_id, registrationCode, qrToken]
  );

  const [rows] = await pool.query(`
    SELECT ep.*,p.full_name,p.email,p.phone,p.gender,
           d.name AS department_name,po.name AS position_name,
           e.name AS event_name,e.event_code
    FROM event_participants ep
    JOIN participants p ON p.id=ep.participant_id
    JOIN events e ON e.id=ep.event_id
    LEFT JOIN departments d ON d.id=p.department_id
    LEFT JOIN positions po ON po.id=p.position_id
    WHERE ep.id=? AND ep.user_id=?
  `, [result.insertId, req.user.id]);

  res.status(201).json(rows[0]);
}));

app.delete("/api/events/:eventId/participants/:participantId", auth, asyncHandler(async (req, res) => {
  const [result] = await pool.query(
    "DELETE FROM event_participants WHERE event_id=? AND participant_id=? AND user_id=?",
    [req.params.eventId, req.params.participantId, req.user.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Registration not found" });
  res.json({ success: true });
}));

app.get("/api/event-participants/:id", auth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT ep.*,p.full_name,p.email,p.phone,p.gender,
           d.name AS department_name,po.name AS position_name,
           e.name AS event_name,e.event_code,e.location,e.start_date,e.end_date
    FROM event_participants ep
    JOIN participants p ON p.id=ep.participant_id
    JOIN events e ON e.id=ep.event_id
    LEFT JOIN departments d ON d.id=p.department_id
    LEFT JOIN positions po ON po.id=p.position_id
    WHERE ep.id=? AND ep.user_id=?
    LIMIT 1
  `, [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ message: "Registration not found" });
  res.json(rows[0]);
}));

app.post("/api/checkins/scan", auth, asyncHandler(async (req, res) => {
  const { qrToken, eventId } = req.body;
  if (!qrToken) return res.status(400).json({ message: "QR token is required" });

  const [rows] = await pool.query(`
    SELECT ep.id AS event_participant_id,ep.event_id,ep.participant_id,
           ep.registration_code,ep.status AS registration_status,
           p.full_name,p.email,p.phone,
           d.name AS department_name,po.name AS position_name,
           e.name AS event_name,e.status AS event_status
    FROM event_participants ep
    JOIN participants p ON p.id=ep.participant_id
    JOIN events e ON e.id=ep.event_id
    LEFT JOIN departments d ON d.id=p.department_id
    LEFT JOIN positions po ON po.id=p.position_id
    WHERE ep.qr_token=? AND ep.user_id=?
    LIMIT 1
  `, [qrToken, req.user.id]);

  const registration = rows[0];
  if (!registration) return res.status(404).json({ code: "INVALID_QR", message: "Invalid QR code" });
  if (eventId && Number(eventId) !== Number(registration.event_id)) {
    return res.status(409).json({ code: "WRONG_EVENT", message: "This participant is not registered for the selected event", registration });
  }
  if (registration.registration_status !== "registered") {
    return res.status(409).json({ code: "REGISTRATION_CANCELLED", message: "This registration has been cancelled", registration });
  }
  if (!["active","registration_open"].includes(registration.event_status)) {
    return res.status(409).json({ code: "EVENT_NOT_ACTIVE", message: "This event is not active", registration });
  }

  const [existing] = await pool.query(
    "SELECT checked_in_at FROM checkins WHERE event_participant_id=? LIMIT 1",
    [registration.event_participant_id]
  );
  if (existing[0]) {
    return res.status(409).json({
      code: "ALREADY_CHECKED_IN",
      message: "Participant is already checked in",
      registration,
      checkedInAt: existing[0].checked_in_at
    });
  }

  try {
    await pool.query(
      `INSERT INTO checkins
       (user_id,event_id,participant_id,event_participant_id,checked_in_by,device,ip_address)
       VALUES (?,?,?,?,?,?,?)`,
      [
        req.user.id,
        registration.event_id,
        registration.participant_id,
        registration.event_participant_id,
        req.user.id,
        req.headers["user-agent"] || null,
        req.ip || null
      ]
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const [dupe] = await pool.query(
        "SELECT checked_in_at FROM checkins WHERE event_participant_id=? LIMIT 1",
        [registration.event_participant_id]
      );
      return res.status(409).json({
        code: "ALREADY_CHECKED_IN",
        message: "Participant is already checked in",
        registration,
        checkedInAt: dupe[0]?.checked_in_at
      });
    }
    throw err;
  }

  const [checkin] = await pool.query(
    "SELECT checked_in_at FROM checkins WHERE event_participant_id=? LIMIT 1",
    [registration.event_participant_id]
  );

  res.json({
    success: true,
    code: "CHECKED_IN",
    message: "Check-in successful",
    registration,
    checkedInAt: checkin[0].checked_in_at
  });
}));

app.get("/api/events/:eventId/checkins", auth, asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id,c.checked_in_at,p.full_name,p.email,p.phone,
           d.name AS department_name,po.name AS position_name,
           ep.registration_code
    FROM checkins c
    JOIN participants p ON p.id=c.participant_id
    JOIN event_participants ep ON ep.id=c.event_participant_id
    LEFT JOIN departments d ON d.id=p.department_id
    LEFT JOIN positions po ON po.id=p.position_id
    WHERE c.event_id=? AND c.user_id=?
    ORDER BY c.checked_in_at DESC
  `, [req.params.eventId, req.user.id]);
  res.json(rows);
}));

app.get("/api/dashboard/stats", auth, asyncHandler(async (req, res) => {
  const uid = req.user.id;
  const [[participants]] = await pool.query("SELECT COUNT(*) count FROM participants WHERE user_id=?", [uid]);
  const [[events]] = await pool.query("SELECT COUNT(*) count FROM events WHERE user_id=?", [uid]);
  const [[registrations]] = await pool.query("SELECT COUNT(*) count FROM event_participants WHERE user_id=?", [uid]);
  const [[checkins]] = await pool.query("SELECT COUNT(*) count FROM checkins WHERE user_id=?", [uid]);
  res.json({
    participants: Number(participants.count),
    events: Number(events.count),
    registrations: Number(registrations.count),
    checkins: Number(checkins.count)
  });
}));

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: "A record with the same unique value already exists" });
  }
  res.status(500).json({ message: "Internal server error" });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
