let users = [];
let teamName = "TeamFlow Workspace";

// State
let tasks = [];
let activeUser = null;
let scores = {};
let isSetupComplete = false;

// Initialization
function init() {
    loadState();

    const isHome = document.getElementById('home-page') !== null;
    const isDashboard = document.getElementById('app-page') !== null;

    if (isHome) {
        initHome();
    } else if (isDashboard) {
        if (!isSetupComplete) {
            window.location.href = 'index.html';
            return;
        }
        initDashboard();
    }

    // Auto-polling for local storage changes across tabs
    window.addEventListener('storage', (e) => {
        if (e.key === 'teamFlowState') {
            loadState();
            if (isDashboard) {
                populateUserDropdowns();
                renderBoard();
                renderLeaderboard();
                updateAppHeaders();
            } else if (isHome) {
                renderHomeTeamList();
                document.getElementById('home-team-name').value = teamName;
            }
        }
    });

    setInterval(() => {
        const saved = localStorage.getItem('teamFlowState');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (JSON.stringify(parsed.tasks) !== JSON.stringify(tasks) || Object.keys(parsed.scores || {}).length !== Object.keys(scores).length) {
                loadState();
                if (isDashboard) {
                    renderBoard();
                    renderLeaderboard();
                } else if (isHome) {
                    renderHomeTeamList();
                }
            }
        }
    }, 5000);
}

function loadState() {
    const saved = localStorage.getItem('teamFlowState');
    if (saved) {
        const parsed = JSON.parse(saved);
        tasks = parsed.tasks || [];
        scores = parsed.scores || {};
        if (parsed.users) {
            users = parsed.users;
        }
        if (parsed.teamName) {
            teamName = parsed.teamName;
        }

        isSetupComplete = users.length > 0;

        users.forEach(u => {
            if (scores[u] === undefined) {
                scores[u] = 0;
            }
        });
    } else {
        isSetupComplete = false;
    }

    if (isSetupComplete) {
        const savedUser = sessionStorage.getItem('teamFlowActiveUser');
        if (savedUser && users.includes(savedUser)) {
            activeUser = savedUser;
        } else if (!activeUser && users.length > 0) {
            activeUser = users[0];
        }
    }
}

function saveState() {
    localStorage.setItem('teamFlowState', JSON.stringify({ teamName, tasks, scores, users }));
}

// -----------------------------------------
// DASHBOARD LOGIC (dashboard.html)
// -----------------------------------------

function initDashboard() {
    updateAppHeaders();
    populateUserDropdowns();
    renderBoard();
    renderLeaderboard();
    setupDashboardListeners();
}

function updateAppHeaders() {
    const titleEl = document.getElementById('app-team-name');
    if (titleEl) titleEl.textContent = teamName;
    document.title = `${teamName} - Collaborative Task Management`;
}

function populateUserDropdowns() {
    const activeUserSelect = document.getElementById('active-user');
    const taskAssigneeSelect = document.getElementById('task-assignee');

    if (!activeUserSelect || !taskAssigneeSelect) return;

    activeUserSelect.innerHTML = '';
    taskAssigneeSelect.innerHTML = '';

    users.forEach(user => {
        const option1 = document.createElement('option');
        option1.value = user;
        option1.textContent = user;
        if (user === activeUser) option1.selected = true;
        activeUserSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = user;
        option2.textContent = user;
        taskAssigneeSelect.appendChild(option2);
    });
}

function renderBoard() {
    const todoList = document.getElementById('todo-list');
    const inprogressList = document.getElementById('inprogress-list');
    const completedList = document.getElementById('completed-list');

    if (!todoList) return;

    todoList.innerHTML = '';
    inprogressList.innerHTML = '';
    completedList.innerHTML = '';

    tasks.forEach(task => {
        const card = createTaskCard(task);
        if (task.status === 'todo') todoList.appendChild(card);
        else if (task.status === 'in-progress') inprogressList.appendChild(card);
        else if (task.status === 'completed') completedList.appendChild(card);
    });
}

function getAvatarColor(initial) {
    const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];
    const charCode = initial.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.id = task.id;

    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        setTimeout(() => card.style.opacity = '0.5', 0);
    });
    card.addEventListener('dragend', () => {
        card.style.opacity = '1';
    });

    const initial = task.assignee.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(initial);

    let actionsHtml = '';
    if (task.status === 'todo') {
        actionsHtml = `
            <button class="btn-action" onclick="moveTask('${task.id}', 'in-progress')">→ In Progress</button>
            <button class="btn-action primary" onclick="moveTask('${task.id}', 'completed')">✓ Mark as Done</button>
        `;
    } else if (task.status === 'in-progress') {
        actionsHtml = `
            <button class="btn-action primary" onclick="moveTask('${task.id}', 'completed')">✓ Mark as Done</button>
        `;
    }

    card.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        <div class="task-desc">${escapeHtml(task.description)}</div>
        <div class="task-assignee">
            <span>Assigned to:</span>
            <div class="assignee-avatar" style="background-color: ${avatarColor}">${initial}</div>
            <span>${escapeHtml(task.assignee)}</span>
        </div>
        ${actionsHtml ? `<div class="task-actions">${actionsHtml}</div>` : ''}
    `;

    return card;
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    list.innerHTML = '';

    const sortedUsers = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);

    sortedUsers.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>[${escapeHtml(user)}]</span>
            <span>${scores[user]} Points</span>
        `;
        list.appendChild(li);
    });
}

function setupDashboardListeners() {
    const activeUserSelect = document.getElementById('active-user');
    if (activeUserSelect) {
        activeUserSelect.addEventListener('change', (e) => {
            activeUser = e.target.value;
            sessionStorage.setItem('teamFlowActiveUser', activeUser);
        });
    }

    const modal = document.getElementById('task-modal');
    const openBtn = document.getElementById('add-task-btn');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-task');
    const form = document.getElementById('add-task-form');

    function openModal() {
        modal.classList.add('active');
        document.getElementById('task-title').focus();
    }

    function closeModal() {
        modal.classList.remove('active');
        form.reset();
        document.getElementById('task-assignee').value = activeUser;
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const desc = document.getElementById('task-desc').value;
            const assignee = document.getElementById('task-assignee').value;

            addTask(title, desc, assignee);
            closeModal();
        });
    }

    const taskLists = document.querySelectorAll('.task-list');
    taskLists.forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.style.backgroundColor = 'rgba(0,0,0,0.02)';
        });
        list.addEventListener('dragleave', () => {
            list.style.backgroundColor = '';
        });
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.style.backgroundColor = '';
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = list.dataset.status;

            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                window.moveTask(taskId, newStatus);
            }
        });
    });
}

function addTask(title, description, assignee) {
    const newTask = {
        id: Date.now().toString(),
        title,
        description,
        assignee,
        status: 'todo'
    };
    tasks.push(newTask);
    saveState();
    renderBoard();
}

window.moveTask = function (taskId, newStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (newStatus === 'completed' && task.status !== 'completed') {
        scores[task.assignee] = (scores[task.assignee] || 0) + 1;
    } else if (task.status === 'completed' && newStatus !== 'completed') {
        scores[task.assignee] = Math.max(0, (scores[task.assignee] || 0) - 1);
    }

    task.status = newStatus;
    saveState();
    renderBoard();
    renderLeaderboard();
};


// -----------------------------------------
// HOME PAGE LOGIC (index.html)
// -----------------------------------------

function initHome() {
    if (teamName && teamName !== "TeamFlow Workspace") {
        document.getElementById('home-team-name').value = teamName;
    }
    renderHomeTeamList();
    setupHomeListeners();
}

function renderHomeTeamList() {
    const list = document.getElementById('home-team-list');
    if (!list) return;
    list.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${escapeHtml(user)}</span>
            <button class="delete-member-btn" onclick="removeMember('${escapeHtml(user).replace(/'/g, "\\'")}')" title="Remove Member">&times;</button>
        `;
        list.appendChild(li);
    });

    const dashboardBtn = document.getElementById('go-to-dashboard-btn');
    if (dashboardBtn) {
        if (users.length > 0) {
            dashboardBtn.classList.remove('btn-secondary');
            dashboardBtn.classList.add('btn-primary');
            dashboardBtn.style.opacity = '1';
            dashboardBtn.style.pointerEvents = 'auto';
        } else {
            dashboardBtn.classList.add('btn-secondary');
            dashboardBtn.classList.remove('btn-primary');
            dashboardBtn.style.opacity = '0.5';
            dashboardBtn.style.pointerEvents = 'none';
        }
    }
}

function setupHomeListeners() {
    const teamNameForm = document.getElementById('team-name-form');
    const addMemberForm = document.getElementById('home-add-member-form');
    const teamNameInput = document.getElementById('home-team-name');

    if (teamNameForm) {
        teamNameForm.addEventListener('submit', (e) => {
            e.preventDefault();
            teamName = teamNameInput.value.trim() || 'TeamFlow Workspace';
            saveState();

            // Visual feedback
            const btn = document.getElementById('save-team-name-btn');
            const originalText = btn.textContent;
            btn.textContent = "Saved!";
            btn.style.backgroundColor = "#10b981";
            btn.style.borderColor = "#10b981";
            btn.style.color = "white";
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style = "";
            }, 2000);
        });
    }

    if (addMemberForm) {
        addMemberForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('home-new-member');
            const name = input.value;
            addMember(name);
            input.value = '';
            input.focus();
        });
    }
}

window.removeMember = function (userToRemove) {
    if (users.length <= 1) {
        alert("You must have at least one member in the team. Without members, the dashboard cannot load.");
        // Still allow deletion if they want an empty team, but warn them. Actually, let's force 1 member minimum or allow 0?
        // Let's allow 0 but dashboard disables.
    }

    if (confirm(`Are you sure you want to remove ${userToRemove}? Their existing tasks will remain without reassignment.`)) {
        users = users.filter(u => u !== userToRemove);
        if (activeUser === userToRemove) {
            activeUser = users.length > 0 ? users[0] : null;
            if (activeUser) {
                sessionStorage.setItem('teamFlowActiveUser', activeUser);
            } else {
                sessionStorage.removeItem('teamFlowActiveUser');
            }
        }
        delete scores[userToRemove];
        isSetupComplete = users.length > 0;
        saveState();
        renderHomeTeamList();
    }
};

function addMember(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (users.includes(trimmed)) {
        alert("This member is already in the workspace.");
        return;
    }

    users.push(trimmed);
    scores[trimmed] = 0;
    isSetupComplete = true;
    if (!activeUser) activeUser = trimmed;
    saveState();
    renderHomeTeamList();
}


// -----------------------------------------
// UTILS
// -----------------------------------------

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', init);
