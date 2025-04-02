const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('points.db'); // Database file

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS points (match TEXT, player TEXT, points INTEGER)");
});

const insertData = (match, data, callback) => {
    const stmt = db.prepare("INSERT INTO points VALUES (?, ?, ?)");
    try {
        data.forEach(item => {
            stmt.run(match, item.player, item.points, function(err) {
                if (err) {
                    console.error('Error inserting row:', err);
                }
            });
        });
        stmt.finalize(err => {
            if (err) {
                console.error('Error finalizing statement:', err);
                callback(err);
            } else {
                callback(null);
            }
        });
    } catch (err) {
        console.error('Error preparing statement:', err);
        callback(err);
    }
};

const getData = (match, callback) => {
    db.all("SELECT player, points FROM points WHERE match = ?", [match], (err, rows) => {
        if (err) {
            console.error('Error retrieving data:', err);
            callback(err, null);
        } else {
            callback(null, rows);
        }
    });
};

const clearAllData = (callback) => {
    db.run("DELETE FROM points", (err) => {
        if (err) {
            console.error('Error clearing data:', err);
            callback(err);
        } else {
            callback(null);
        }
    });
};

module.exports = {
    insertData: insertData,
    getData: getData,
    clearAllData: clearAllData
};
