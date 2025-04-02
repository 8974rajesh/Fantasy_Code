const selectElement = document.getElementById('mySelect');
const valueSelect = document.getElementById('valueSelect');
const matchSelect = document.getElementById('matchSelect');
const assignButton = document.getElementById('assignButton');
const submitMatchButton = document.getElementById('submitMatchButton');
const retrieveButton = document.getElementById('retrieveButton');
const clearSelectedMatchButton = document.getElementById('clearSelectedMatchButton');

let assignedValues = {};
const players = ["Gopi", "Nikhil", "Sankings", "Bp", "Rajesh", "Bharadwaj"]; // Player names

// Populate Player Dropdown
function populatePlayerDropdown() {
    selectElement.innerHTML = ''; 
    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        selectElement.appendChild(option);
    });
}

// Populate Value Dropdown
function updateValueDropdownOptions() {
    valueSelect.innerHTML = ''; 
    const values = [100, 80, 70, 50, 0];

    values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        if (Object.values(assignedValues).includes(value.toString())) {
            option.disabled = true;
        }
        valueSelect.appendChild(option);
    });
}

// Update Player Dropdown
function updateDropdownOptions() {
    selectElement.innerHTML = '';

    players.forEach(player => {
        const option = document.createElement('option');
        option.value = player;
        option.textContent = player;
        if (assignedValues.hasOwnProperty(player)) {
            option.disabled = true;
        }
        selectElement.appendChild(option);
    });

    selectElement.disabled = Object.keys(assignedValues).length === players.length;
}

// Save Assigned Values to Database with Password
async function saveAssignedValuesToDB(match, values) {
    const password = prompt('Enter the admin password to save changes:');
    if (!password) {
        alert('Action canceled.');
        return;
    }

    try {
        const response = await fetch('/api/saveAssignedValues', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ match, values, password })
        });
        if (!response.ok) {
            if (response.status === 403) {
                alert('Unauthorized: Incorrect password.');
            } else if (response.status === 400) {
                const errorMessage = await response.text();
                alert(errorMessage); // Show the error message from the server
            } else {
                throw new Error('Failed to save data.');
            }
        } else {
            alert('Data saved successfully.');
        }
    } catch (error) {
        console.error(error);
        alert('Error saving data.');
    }
}

// Load Assigned Values from Database
async function loadAssignedValuesFromDB(match) {
    try {
        const response = await fetch(`/api/getAssignedValues?match=${match}`);
        if (!response.ok) throw new Error('Failed to load data.');
        return await response.json();
    } catch (error) {
        console.error(error);
        alert('Error loading data.');
        return {};
    }
}

// Load Match Data
async function loadAssignedValues() {
    const selectedMatch = matchSelect.value;
    assignedValues = await loadAssignedValuesFromDB(selectedMatch);
    updateTable();
    assignButton.disabled = Object.keys(assignedValues).length > 0;
}

// Assign Score to Player
assignButton.addEventListener('click', async function () {
    const selectedPlayer = selectElement.value;
    const selectedValue = valueSelect.value;
    const selectedMatch = matchSelect.value;

    if (!selectedPlayer || !selectedValue || !selectedMatch) {
        alert('Please select all fields.');
        return;
    }

    assignedValues[selectedPlayer] = selectedValue;

    // Save assigned values to localStorage
    localStorage.setItem(`assignedValues_${selectedMatch}`, JSON.stringify(assignedValues));

    updateTable();
    updateDropdownOptions();
    updateValueDropdownOptions();

    const allValuesDisabled = Array.from(valueSelect.options).every(option => option.disabled);
    if (allValuesDisabled) {
        players.forEach(player => {
            if (!assignedValues.hasOwnProperty(player)) {
                assignedValues[player] = '0';
            }
        });
        localStorage.setItem(`assignedValues_${selectedMatch}`, JSON.stringify(assignedValues));
        updateTable();
    }
});

// Initialize counter in localStorage if not already set
if (!localStorage.getItem('submitCounter')) {
    localStorage.setItem('submitCounter', '1');
}

// Submit Match
submitMatchButton.addEventListener('click', function () {
    const selectedMatch = matchSelect.value;

    if (!selectedMatch) {
        alert('Select a match.');
        return;
    }

    // Save assigned values to localStorage
    localStorage.setItem(`assignedValues_${selectedMatch}`, JSON.stringify(assignedValues));

    // Increment the counter
    let counter = parseInt(localStorage.getItem('submitCounter'), 10);
    counter += 1;
    localStorage.setItem('submitCounter', counter.toString());

    alert(`Match ${selectedMatch} submitted! `);
    if (counter > 9) {
        counter=0;
    }

    // Recalculate and update overall scores after submission
    calculateOverallScores();

    location.reload(); // Refresh the page after submission
});

// Retrieve Match Data
retrieveButton.addEventListener('click', async function () {
    const selectedMatch = matchSelect.value;

    if (!selectedMatch) {
        alert('Select a match to retrieve.');
        return;
    }

    assignedValues = await loadAssignedValuesFromDB(selectedMatch);
    if (Object.keys(assignedValues).length > 0) {
        updateTable();
        updateValueDropdownOptions();
        alert(`Data for ${selectedMatch} retrieved.`);
    } else {
        alert(`No data found.`);
    }
});

// Clear Selected Match Data
clearSelectedMatchButton.addEventListener('click', async function () {
    const selectedMatch = matchSelect.value;

    if (!selectedMatch) {
        alert('Select a match.');
        return;
    }

    const password = prompt('Enter the admin password:');
    if (password === 'admin123') {
        if (confirm(`Clear data for ${selectedMatch}?`)) {
            await fetch(`/api/deleteMatchData?match=${selectedMatch}`, { method: 'DELETE' });
            assignedValues = {};
            updateTable();
            alert(`Data cleared for ${selectedMatch}.`);
        }
    } else {
        alert('Incorrect password.');
    }
});

// Update Table with Scores
function updateTable() {
    const table = document.getElementById('pointsTable');
    const rows = table.getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        const playerName = rows[i].getElementsByTagName('td')[0].textContent;
        rows[i].getElementsByTagName('td')[1].textContent = assignedValues[playerName] || '';
    }
}

// Load Overall Scores from Local Storage
function loadOverallScoresFromLocalStorage() {
    const overallScores = {};
    players.forEach(player => overallScores[player] = 0);

    // Iterate through localStorage to sum up scores for each player
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("assignedValues_")) {
            const matchData = JSON.parse(localStorage.getItem(key));
            for (const player in matchData) {
                if (overallScores.hasOwnProperty(player)) {
                    overallScores[player] += parseInt(matchData[player], 10) || 0;
                }
            }
        }
    }

    return overallScores;
}

// Update Overall Scores Table
function updateOverallScores() {
    const overallScores = loadOverallScoresFromLocalStorage();
    const table = document.getElementById('overallScoresTable');
    const rows = table.getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        const playerName = rows[i].getElementsByTagName('td')[0].textContent;
        rows[i].getElementsByTagName('td')[1].textContent = overallScores[playerName] || 0;
    }
}

// Calculate and Save Overall Scores with Password
async function calculateAndSaveOverallScores() {
    const password = prompt('Enter the admin password to update overall scores:');
    if (!password) {
        alert('Action canceled.');
        return;
    }

    try {
        const response = await fetch('/api/calculateOverallScores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        if (!response.ok) {
            if (response.status === 403) {
                alert('Unauthorized: Incorrect password.');
            } else {
                throw new Error('Failed to calculate overall scores.');
            }
        } else {
            const scores = await response.json();
            updateOverallScoresTable(scores);
            alert('Overall scores updated successfully.');
        }
    } catch (error) {
        console.error(error);
        alert('Error updating overall scores.');
    }
}

// Calculate Overall Scores
function calculateOverallScores() {
    const overallScores = {};

    // Initialize scores for all players
    players.forEach(player => {
        overallScores[player] = 0;
    });

    // Iterate through localStorage to sum up scores for each player
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("assignedValues_")) {
            const matchData = JSON.parse(localStorage.getItem(key));
            for (const player in matchData) {
                if (overallScores.hasOwnProperty(player)) {
                    overallScores[player] += parseInt(matchData[player], 10) || 0;
                }
            }
        }
    }

    updateOverallScoresTable(overallScores);
}

function updateOverallScoresTable(scores) {
    const table = document.getElementById('overallScoresTable');
    if (!table) return; // Ensure the table exists before updating

    const rows = table.getElementsByTagName('tr');
    for (let i = 1; i < rows.length; i++) {
        const playerName = rows[i].getElementsByTagName('td')[0].textContent;
        rows[i].getElementsByTagName('td')[1].textContent = scores[playerName] || 0;
    }
}

// Initialize
populatePlayerDropdown();
updateValueDropdownOptions();
updateDropdownOptions();
matchSelect.addEventListener('change', loadAssignedValues);
updateOverallScores();
