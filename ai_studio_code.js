// INITIAL DATA
let rooms = JSON.parse(localStorage.getItem('taba_rooms')) || {};
let activeRoomCode = localStorage.getItem('taba_active_room') || null;
let currentUser = JSON.parse(localStorage.getItem('taba_user')) || null;

// Initialize Lucide Icons
lucide.createIcons();

// --- PERSISTENCE CHECK ---
window.onload = () => {
    if (activeRoomCode && rooms[activeRoomCode]) {
        showDashboard();
    }
};

// --- NAVIGATION LOGIC ---
function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showTab(tabName) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.side-nav button').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if(tabName === 'contribution') renderChart();
}

// --- ROOM LOGIC ---
function handleCreateRoom() {
    const name = document.getElementById('create-room-name').value;
    const leader = document.getElementById('create-leader-name').value;
    
    if(!name || !leader) return alert("Isi data dulu ya!");

    const code = "TABA-" + Math.floor(1000 + Math.random() * 9000);
    
    rooms[code] = {
        name: name,
        leader: leader,
        members: [{name: leader, avatar: '🐙', points: 0}],
        tasks: [],
        chats: []
    };

    currentUser = { name: leader, avatar: '🐙', role: 'leader' };
    activeRoomCode = code;
    
    saveAndRedirect();
}

function handleJoinRoom() {
    const name = document.getElementById('join-name').value;
    const code = document.getElementById('join-code').value.toUpperCase();
    const avatar = document.querySelector('.avatar-options span.selected')?.innerText || '🐠';

    if(!rooms[code]) return alert("Kode room tidak ditemukan!");

    rooms[code].members.push({ name, avatar, points: 0 });
    currentUser = { name, avatar, role: 'member' };
    activeRoomCode = code;

    saveAndRedirect();
}

function selectAvatar(el) {
    document.querySelectorAll('.avatar-options span').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
}

function saveAndRedirect() {
    localStorage.setItem('taba_rooms', JSON.stringify(rooms));
    localStorage.setItem('taba_active_room', activeRoomCode);
    localStorage.setItem('taba_user', JSON.stringify(currentUser));
    location.reload();
}

function showDashboard() {
    document.getElementById('landing-page').classList.add('hidden');
    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
    
    const room = rooms[activeRoomCode];
    document.getElementById('display-room-name').innerText = room.name;
    document.getElementById('display-room-code').innerText = activeRoomCode;
    document.getElementById('user-display-name').innerText = currentUser.name;
    document.getElementById('user-display-avatar').innerText = currentUser.avatar;

    renderTasks();
    renderChat();
}

function leaveRoom() {
    localStorage.removeItem('taba_active_room');
    localStorage.removeItem('taba_user');
    location.reload();
}

// --- TASK SYSTEM ---
function handleAddTask() {
    const title = document.getElementById('task-name').value;
    const desc = document.getElementById('task-desc').value;
    const pts = parseInt(document.getElementById('task-difficulty').value);

    const newTask = {
        id: Date.now(),
        title,
        desc,
        points: pts,
        status: 'available',
        assignee: null,
        approvals: []
    };

    rooms[activeRoomCode].tasks.push(newTask);
    saveData();
    renderTasks();
    closeModal('addTaskModal');
}

function renderTasks() {
    const container = document.getElementById('task-list');
    container.innerHTML = '';
    
    rooms[activeRoomCode].tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = `
            <span class="status-badge status-${task.status}">${task.status}</span>
            <h4>${task.title}</h4>
            <p>${task.desc}</p>
            <div style="margin-top:15px; font-weight:bold; color:var(--neon-aqua)">💎 ${task.points} Pts</div>
            <div style="margin-top:10px">
                ${renderTaskButton(task)}
            </div>
        `;
        container.appendChild(card);
    });
    renderValidation();
}

function renderTaskButton(task) {
    if(task.status === 'available') {
        return `<button class="btn-primary w-100" onclick="takeTask(${task.id})">Ambil Tugas</button>`;
    }
    if(task.status === 'in-progress' && task.assignee === currentUser.name) {
        return `<button class="btn-primary w-100" style="background:#ee9b00" onclick="submitTask(${task.id})">Submit Hasil</button>`;
    }
    return `<small>Assignee: ${task.assignee || 'None'}</small>`;
}

function takeTask(id) {
    const task = rooms[activeRoomCode].tasks.find(t => t.id === id);
    task.status = 'in-progress';
    task.assignee = currentUser.name;
    saveData();
    renderTasks();
}

function submitTask(id) {
    const task = rooms[activeRoomCode].tasks.find(t => t.id === id);
    task.status = 'validation';
    saveData();
    renderTasks();
}

// --- VALIDATION SYSTEM ---
function renderValidation() {
    const container = document.getElementById('validation-list');
    container.innerHTML = '';
    
    const valTasks = rooms[activeRoomCode].tasks.filter(t => t.status === 'validation');
    
    valTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'task-card glass';
        item.style.marginBottom = '15px';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <div>
                    <strong>${task.title}</strong><br>
                    <small>Oleh: ${task.assignee}</small>
                </div>
                <div>
                    <button class="btn-small" onclick="approveTask(${task.id})" style="background:var(--aqua)">Approve</button>
                    <button class="btn-small" onclick="rejectTask(${task.id})" style="background:#ae2012">Revisi</button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

function approveTask(id) {
    const task = rooms[activeRoomCode].tasks.find(t => t.id === id);
    // Logic: Langsung complete untuk prototype ini
    task.status = 'completed';
    
    // Add points to member
    const member = rooms[activeRoomCode].members.find(m => m.name === task.assignee);
    if(member) member.points += task.points;

    saveData();
    renderTasks();
    alert("Task disetujui! Poin telah diberikan.");
}

// --- CHAT SYSTEM ---
function sendMessage() {
    const input = document.getElementById('chat-input');
    if(!input.value) return;

    const msg = {
        user: currentUser.name,
        text: input.value,
        me: true
    };

    rooms[activeRoomCode].chats.push(msg);
    saveData();
    input.value = '';
    renderChat();
}

function renderChat() {
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    rooms[activeRoomCode].chats.forEach(m => {
        const div = document.createElement('div');
        div.className = `bubble-msg ${m.user === currentUser.name ? 'me' : ''}`;
        div.innerHTML = `<small style="display:block; font-size:10px opacity:0.7">${m.user}</small>${m.text}`;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

// --- STATS & REPORT ---
function renderChart() {
    const ctx = document.getElementById('contributionChart').getContext('2d');
    const members = rooms[activeRoomCode].members;
    
    if(window.myChart) window.myChart.destroy();
    
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: members.map(m => m.name),
            datasets: [{
                data: members.map(m => m.points),
                backgroundColor: ['#0a9396', '#94d2bd', '#ee9b00', '#005f73', '#ae2012']
            }]
        },
        options: {
            plugins: { legend: { labels: { color: 'white' } } }
        }
    });

    // Render Ranking
    const rankList = document.getElementById('ranking-list');
    rankList.innerHTML = '<h4>Peringkat Kontribusi</h4>';
    members.sort((a,b) => b.points - a.points).forEach((m, i) => {
        rankList.innerHTML += `<p>${i+1}. ${m.avatar} ${m.name}: ${m.points} Pts</p>`;
    });
}

function downloadReport() {
    const room = rooms[activeRoomCode];
    let content = `REPORT TABA: ${room.name}\n`;
    content += `KODE: ${activeRoomCode}\n`;
    content += `---------------------------\n`;
    room.members.forEach(m => {
        content += `${m.name}: ${m.points} Points\n`;
    });
    
    const blob = new Blob([content], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${room.name}.txt`;
    a.click();
}

function saveData() {
    localStorage.setItem('taba_rooms', JSON.stringify(rooms));
}

function autoAssign() {
    const room = rooms[activeRoomCode];
    const availableTasks = room.tasks.filter(t => t.status === 'available');
    
    availableTasks.forEach((task, index) => {
        const memberIndex = index % room.members.length;
        task.status = 'in-progress';
        task.assignee = room.members[memberIndex].name;
    });

    saveData();
    renderTasks();
    alert("Tugas telah dibagi rata oleh gurita pintar!");
}