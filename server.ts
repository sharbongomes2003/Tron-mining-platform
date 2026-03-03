import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 0,
    referrer_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    tx_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS mining_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    deposit_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    start_time DATETIME,
    last_claim_time DATETIME,
    is_active INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(deposit_id) REFERENCES deposits(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referee_id INTEGER NOT NULL,
    level INTEGER NOT NULL,
    commission REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ADMIN_ADDRESS = "TGAgSSF5b8r9cJL9X9ZhiKWfsMf5KQN4jg";

  // Auth
  app.post("/api/auth", (req, res) => {
    const { address, referrerAddress } = req.body;
    if (!address) return res.status(400).json({ error: "Address required" });

    let user = db.prepare("SELECT * FROM users WHERE address = ?").get(address);
    
    if (!user) {
      let referrerId = null;
      if (referrerAddress) {
        const referrer = db.prepare("SELECT id FROM users WHERE address = ?").get(referrerAddress);
        if (referrer) referrerId = referrer.id;
      }
      
      const result = db.prepare("INSERT INTO users (address, referrer_id) VALUES (?, ?)").run(address, referrerId);
      user = { id: result.lastInsertRowid, address, balance: 0, referrer_id: referrerId };

      // Setup multi-level referrals
      if (referrerId) {
        // Level 1
        db.prepare("INSERT INTO referrals (referrer_id, referee_id, level) VALUES (?, ?, 1)").run(referrerId, user.id);
        
        // Level 2
        const level1Referrer = db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(referrerId);
        if (level1Referrer?.referrer_id) {
          db.prepare("INSERT INTO referrals (referrer_id, referee_id, level) VALUES (?, ?, 2)").run(level1Referrer.referrer_id, user.id);
          
          // Level 3
          const level2Referrer = db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(level1Referrer.referrer_id);
          if (level2Referrer?.referrer_id) {
            db.prepare("INSERT INTO referrals (referrer_id, referee_id, level) VALUES (?, ?, 3)").run(level2Referrer.referrer_id, user.id);
          }
        }
      }
    }

    res.json(user);
  });

  // Get User Data
  app.get("/api/user/:address", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE address = ?").get(req.params.address);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate mining earnings
    const activeSessions = db.prepare("SELECT * FROM mining_sessions WHERE user_id = ? AND is_active = 1").all(user.id);
    let pendingEarnings = 0;
    const now = Date.now();

    activeSessions.forEach((session: any) => {
      const startTime = new Date(session.start_time).getTime();
      const lastClaim = new Date(session.last_claim_time || session.start_time).getTime();
      
      // 200% in 6 days = 33.33% per day = 1.388% per hour
      const totalDuration = 6 * 24 * 60 * 60 * 1000;
      const elapsed = Math.min(now - startTime, totalDuration);
      const claimableElapsed = Math.min(now - lastClaim, totalDuration - (lastClaim - startTime));
      
      if (claimableElapsed > 0) {
        const ratePerMs = (session.amount * 2) / totalDuration;
        pendingEarnings += claimableElapsed * ratePerMs;
      }
    });

    res.json({ ...user, pendingEarnings });
  });

  // Deposit
  app.post("/api/deposit", (req, res) => {
    const { address, amount, txId } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE address = ?").get(address);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (amount < 37) return res.status(400).json({ error: "Min deposit 37 TRX" });

    try {
      db.prepare("INSERT INTO deposits (user_id, amount, tx_id) VALUES (?, ?, ?)").run(user.id, amount, txId);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Transaction ID already submitted" });
    }
  });

  // Withdraw
  app.post("/api/withdraw", (req, res) => {
    const { address, amount } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE address = ?").get(address);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, user.id);
    db.prepare("INSERT INTO withdrawals (user_id, amount) VALUES (?, ?)").run(user.id, amount);
    
    res.json({ success: true });
  });

  // Claim Mining
  app.post("/api/claim", (req, res) => {
    const { address } = req.body;
    const user = db.prepare("SELECT id FROM users WHERE address = ?").get(address);
    if (!user) return res.status(404).json({ error: "User not found" });

    const activeSessions = db.prepare("SELECT * FROM mining_sessions WHERE user_id = ? AND is_active = 1").all(user.id);
    let totalClaimed = 0;
    const now = new Date().toISOString();
    const nowMs = new Date(now).getTime();

    activeSessions.forEach((session: any) => {
      const startTime = new Date(session.start_time).getTime();
      const lastClaim = new Date(session.last_claim_time || session.start_time).getTime();
      const totalDuration = 6 * 24 * 60 * 60 * 1000;
      
      const elapsedTotal = Math.min(nowMs - startTime, totalDuration);
      const claimableElapsed = Math.min(nowMs - lastClaim, totalDuration - (lastClaim - startTime));

      if (claimableElapsed > 0) {
        const ratePerMs = (session.amount * 2) / totalDuration;
        const earned = claimableElapsed * ratePerMs;
        totalClaimed += earned;

        db.prepare("UPDATE mining_sessions SET last_claim_time = ? WHERE id = ?").run(now, session.id);
        
        if (elapsedTotal >= totalDuration) {
          db.prepare("UPDATE mining_sessions SET is_active = 0 WHERE id = ?").run(session.id);
        }
      }
    });

    if (totalClaimed > 0) {
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(totalClaimed, user.id);
    }

    res.json({ claimed: totalClaimed });
  });

  // Admin: Get Pending
  app.get("/api/admin/pending", (req, res) => {
    const address = req.headers["x-admin-address"];
    if (address !== ADMIN_ADDRESS) return res.status(403).json({ error: "Unauthorized" });

    const deposits = db.prepare(`
      SELECT d.*, u.address as user_address 
      FROM deposits d 
      JOIN users u ON d.user_id = u.id 
      WHERE d.status = 'pending'
    `).all();

    const withdrawals = db.prepare(`
      SELECT w.*, u.address as user_address 
      FROM withdrawals w 
      JOIN users u ON w.user_id = u.id 
      WHERE w.status = 'pending'
    `).all();

    res.json({ deposits, withdrawals });
  });

  // Admin: Action Deposit
  app.post("/api/admin/deposit/action", (req, res) => {
    const adminAddress = req.headers["x-admin-address"];
    if (adminAddress !== ADMIN_ADDRESS) return res.status(403).json({ error: "Unauthorized" });

    const { id, action } = req.body; // action: approve, reject
    const deposit = db.prepare("SELECT * FROM deposits WHERE id = ?").get(id);
    if (!deposit) return res.status(404).json({ error: "Deposit not found" });

    if (action === "approve") {
      db.prepare("UPDATE deposits SET status = 'approved' WHERE id = ?").run(id);
      
      // Start mining session
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO mining_sessions (user_id, deposit_id, amount, start_time, last_claim_time, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(deposit.user_id, id, deposit.amount, now, now);

      // Referral Commissions (3 levels: 10%, 5%, 2%)
      const commissions = [0.10, 0.05, 0.02];
      const referrals = db.prepare("SELECT * FROM referrals WHERE referee_id = ? ORDER BY level ASC").all(deposit.user_id);
      
      referrals.forEach((ref: any) => {
        const commissionAmount = deposit.amount * (commissions[ref.level - 1] || 0);
        if (commissionAmount > 0) {
          db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commissionAmount, ref.referrer_id);
          db.prepare("UPDATE referrals SET commission = commission + ? WHERE id = ?").run(commissionAmount, ref.id);
        }
      });
    } else {
      db.prepare("UPDATE deposits SET status = 'rejected' WHERE id = ?").run(id);
    }

    res.json({ success: true });
  });

  // Admin: Action Withdrawal
  app.post("/api/admin/withdraw/action", (req, res) => {
    const adminAddress = req.headers["x-admin-address"];
    if (adminAddress !== ADMIN_ADDRESS) return res.status(403).json({ error: "Unauthorized" });

    const { id, action } = req.body;
    const withdrawal = db.prepare("SELECT * FROM withdrawals WHERE id = ?").get(id);
    if (!withdrawal) return res.status(404).json({ error: "Withdrawal not found" });

    if (action === "approve") {
      db.prepare("UPDATE withdrawals SET status = 'approved' WHERE id = ?").run(id);
    } else {
      db.prepare("UPDATE withdrawals SET status = 'rejected' WHERE id = ?").run(id);
      // Refund balance
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(withdrawal.amount, withdrawal.user_id);
    }

    res.json({ success: true });
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const totalDeposited = db.prepare("SELECT SUM(amount) as total FROM deposits WHERE status = 'approved'").get().total || 0;
    const totalWithdrawn = db.prepare("SELECT SUM(amount) as total FROM withdrawals WHERE status = 'approved'").get().total || 0;
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

    res.json({
      activeUsers: 50000 + activeUsers,
      totalDeposited: 245000 + totalDeposited,
      totalWithdrawn: 389000 + totalWithdrawn,
      minDeposit: 37,
      withdrawFee: 2
    });
  });

  // Get User History
  app.get("/api/user/:address/history", (req, res) => {
    const user = db.prepare("SELECT id FROM users WHERE address = ?").get(req.params.address);
    if (!user) return res.status(404).json({ error: "User not found" });

    const deposits = db.prepare("SELECT * FROM deposits WHERE user_id = ? ORDER BY created_at DESC").all(user.id);
    const withdrawals = db.prepare("SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC").all(user.id);

    res.json({ deposits, withdrawals });
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
