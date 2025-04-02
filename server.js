const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());

// Serve static files from the current directory
const path = require('path');
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('./fantasy11.db', (err) => {
    if (err) console.error('Error opening database:', err);
    else console.log('Connected to SQLite database.');
});

// Create table if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS assigned_values (
        match TEXT,
        player TEXT,
        value TEXT,
        PRIMARY KEY (match, player)
    )
`);

// Create table for overall scores if not exists
db.run(`
    CREATE TABLE IF NOT EXISTS overall_scores (
        player TEXT PRIMARY KEY,
        total_score INTEGER
    )
`);

// Serve a default response for the root route
app.get('/', (req, res) => {
    res.send('Fantasy 11 Backend Server is running!');
});

// API to save assigned values with protection for existing matches
app.post('/api/saveAssignedValues', (req, res) => {
    const { match, values, password } = req.body;

    // Check if the password is correct
    if (password !== 'admin123') {
        return res.status(403).send('Unauthorized: Incorrect password.');
    }

    // Check if data already exists for the match
    db.get('SELECT COUNT(*) AS count FROM assigned_values WHERE match = ?', [match], (err, row) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error checking existing data.');
        }

        if (row.count > 0) {
            // If data exists, prevent modification
            return res.status(400).send(`Data for match ${match} already exists and cannot be modified.`);
        }

        // If no data exists, proceed with saving
        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO assigned_values (match, player, value) VALUES (?, ?, ?)');
            for (const [player, value] of Object.entries(values)) {
                stmt.run(match, player, value);
            }
            stmt.finalize();
            res.sendStatus(200);
        });
    });
});

// Remove the API to save overall scores
// app.post('/api/saveOverallScores', (req, res) => {
//     const { scores } = req.body;
//     db.serialize(() => {
//         const stmt = db.prepare('INSERT OR REPLACE INTO overall_scores (player, total_score) VALUES (?, ?)');
//         for (const [player, totalScore] of Object.entries(scores)) {
//             stmt.run(player, totalScore);
//         }
//         stmt.finalize();
//         res.sendStatus(200);
//     });
// });

// API to get assigned values
app.get('/api/getAssignedValues', (req, res) => {
    const { match } = req.query;
    db.all('SELECT player, value FROM assigned_values WHERE match = ?', [match], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error retrieving data.');
        } else {
            const values = {};
            rows.forEach(row => values[row.player] = row.value);
            res.json(values);
        }
    });
});

// Remove the API to get overall scores
// app.get('/api/getOverallScores', (req, res) => {
//     db.all(`
//         SELECT player, SUM(value) AS total_score
//         FROM assigned_values
//         GROUP BY player
//     `, [], (err, rows) => {
//         if (err) {
//             console.error(err);
//             res.status(500).send('Error retrieving overall scores.');
//         } else {
//             const scores = {};
//             rows.forEach(row => scores[row.player] = row.total_score);
//             res.json(scores);
//         }
//     });
// });

// API to calculate and retrieve overall scores with password protection for updates
app.post('/api/calculateOverallScores', (req, res) => {
    const { password } = req.body;

    // Check if the password is correct
    if (password !== 'admin123') {
        return res.status(403).send('Unauthorized: Incorrect password.');
    }

    db.all(`
        SELECT player, SUM(CAST(value AS INTEGER)) AS total_score
        FROM assigned_values
        GROUP BY player
    `, [], (err, rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error calculating overall scores.');
        } else {
            // Update the overall_scores table
            db.serialize(() => {
                const stmt = db.prepare('INSERT OR REPLACE INTO overall_scores (player, total_score) VALUES (?, ?)');
                rows.forEach(row => {
                    stmt.run(row.player, row.total_score);
                });
                stmt.finalize();
            });

            // Send the calculated scores as a response
            const scores = {};
            rows.forEach(row => scores[row.player] = row.total_score);
            res.json(scores);
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
