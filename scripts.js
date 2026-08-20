const SEARCH_FIELDS = ['語言', '曲名', '歌手', '熟練', '類型'];
const HEADERS = ['語言', '曲名', '歌手', '音源(伴奏)', '熟練', '類型'];

let songs = [];
let filteredSongs = [];
let displayCount = 20;
const PAGE_SIZE = 20;
let orderCooldownUntil = 0;
let orderCooldownTimer = null;
let isOrdering = false;
let toastTimer = null;
const SongUrl = 'https://song-list.shiroshio0507.workers.dev/api/songs';
const nameDialog = document.getElementById('name-dialog');
const nameForm = document.getElementById('name-form');
const userNameInput = document.getElementById('user-name');
const currentUserName = document.getElementById('current-user-name');
const editNameButton = document.getElementById('edit-name');
let currentUser = localStorage.getItem('songlist-user') || '';

function updateUserName() {
    currentUserName.textContent = currentUser || '未設定';
}

function openNameDialog() {
    userNameInput.value = currentUser;
    nameDialog.showModal();
    userNameInput.focus();
}

updateUserName();
openNameDialog();

editNameButton.addEventListener('click', openNameDialog);

nameForm.addEventListener('submit', () => {
    currentUser = userNameInput.value.trim();
    localStorage.setItem('songlist-user', currentUser);
    updateUserName();
});

async function loadSongs() {
    try {
        const res = await fetch(SongUrl);
        const csvText = await res.text();
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const rows = csvText.split(/\r?\n/).filter(line => line.trim() !== "").map(line => {
            const row = [];
            const matches = line.matchAll(regex);
            
            for (const match of matches) {
                let value = (match[1] !== undefined) 
                    ? match[1].replace(/""/g, '"') 
                    : match[2];
                
                row.push(value !== undefined ? value.trim() : "");
            }
            return row;
        });
        songs = rows.slice(2).map(r => {
            const obj = {};
            HEADERS.forEach((h, i) => {
                obj[h] = r[i] !== undefined ? String(r[i]).trim() : '';
            });
            return obj;
        });

        filteredSongs = songs;
        renderList(false);
        
    } catch (err) {
        console.error("載入失敗:", err);
    }
}


loadSongs();

const input = document.getElementById('kw');
const resultBox = document.getElementById('result');
let rdsongTimeout = null;
input.addEventListener('input', () => {
    if (rdsongTimeout) { clearTimeout(rdsongTimeout); }
    const kw = input.value.trim().toLowerCase();
    filteredSongs = songs.filter(song =>
        SEARCH_FIELDS.some(field =>
            song[field]?.toLowerCase().includes(kw)
        )
    );
    renderList(false);
});

const rdsong = document.getElementById('rdsong')
rdsong.addEventListener('click', () => {
    if (rdsongTimeout) { clearTimeout(rdsongTimeout); }
    const rs = songs[Math.floor(Math.random() * songs.length)]['曲名'];
    filteredSongs = songs.filter(song => song['曲名'].includes(rs));
    renderList(false);
    rdsongTimeout = setTimeout(() => {
            filteredSongs = songs;
            renderList(false);
            rdsongTimeout = null;
        }, 5000);
})

function showOrderToast(message, isError = false) {
        const toast = document.getElementById('order-toast');
        toast.textContent = message;
        toast.classList.toggle('error', isError);
        toast.classList.add('visible');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('visible'), 2500);
}

function updateOrderButtons() {
        const isCoolingDown = orderCooldownUntil > Date.now();
        document.querySelectorAll('.copy-btn').forEach(button => {
                button.disabled = isOrdering || isCoolingDown;
        });
}

function startOrderCooldown() {
        orderCooldownUntil = Date.now() + 10000;
        updateOrderButtons();
        if (orderCooldownTimer) clearTimeout(orderCooldownTimer);
        orderCooldownTimer = setTimeout(() => {
                orderCooldownUntil = 0;
                updateOrderButtons();
        }, 10000);
}

async function ordersong(button, artist, songName) {
        if (isOrdering || orderCooldownUntil > Date.now()) return;

        isOrdering = true;
        updateOrderButtons();
        try {
                const res = await fetch('https://song-list.shiroshio0507.workers.dev/api/order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user: currentUser || 'anonymous',
                        artist: artist,
                        songName: songName
                    })
                });
                const responseText = await res.text();
                console.log("status =", res.status);
                console.log("response =", responseText);
                if (!res.ok) throw new Error(`點歌失敗：${res.status}`);
                showOrderToast('已送出點歌');
                startOrderCooldown();
        } catch (err) {
                console.error(err);
                showOrderToast('點歌失敗，請稍後再試', true);
        } finally {
                isOrdering = false;
                updateOrderButtons();
        }
}

function renderList(append = false) {
    if (!append) {
        resultBox.innerHTML = '';
        displayCount = PAGE_SIZE;
        resultBox.scrollTop = 0;
    }
    const fragment = document.createDocumentFragment();
    const start = append ? displayCount : 0;
    const end = Math.min(start + PAGE_SIZE, filteredSongs.length);
    const slice = filteredSongs.slice(start, end);

    slice.forEach(song => {
        const div = document.createElement('div');
        div.className = 'item';
        
        const typeTags = song['類型'] 
            ? song['類型'].split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('') 
            : '';
        const iswarn = song['類型'].includes('版權') ? ' warnwarn' : ''
        const score = parseInt(song['熟練']) || 0;
        const maxStars = 5;
        const starDisplay = '★'.repeat(Math.max(0, Math.min(score, maxStars))) + 
                            '☆'.repeat(Math.max(0, maxStars - score));

        div.innerHTML = `
            <div class='img_p'></div>
            <div style="display:flex; justify-content:space-between; align-items:center; white-space: nowrap;">
                <div class="song${iswarn}">🎵 ${song['曲名']}</div>
                <button class="copy-btn" onclick="ordersong(this, '${song['歌手']}', '${song['曲名']}')">
                    <i class="fa-solid fa-paper-plane"></i> 點歌
                </button>
            </div>
            <div class="meta">
                <img src="https://raw.githubusercontent.com/shiro-shio/SydneyViya-SongList/main/img/B_karaoke.svg"
                class="icon"
                draggable="false"> ${song['歌手']}
            </div>
            <div class="meta">
                <span class="tag">熟練：${song['熟練']}</span>
                <span class="tag">${song['語言']}</span>
                ${typeTags}
            </div>
        `;
        fragment.appendChild(div);
    });

    resultBox.appendChild(fragment);
    updateOrderButtons();
    if (append) displayCount = end;
}

resultBox.addEventListener('scroll', () => {
    if (resultBox.scrollTop + resultBox.clientHeight >= resultBox.scrollHeight - 20) {
        if (displayCount < filteredSongs.length) {
            renderList(true);
        }
    }
});


let isDown = false;
let startY, scrollTop;
let velocity = 0;
let lastY = 0;
let rafId = null;

function applyInertia() {
    if (Math.abs(velocity) > 0.1) {
        resultBox.scrollTop -= velocity;
        velocity *= 0.97;
        rafId = requestAnimationFrame(applyInertia);
    }
}

resultBox.addEventListener('mousedown', (e) => {
    isDown = true;
    startY = e.pageY - resultBox.offsetTop;
    scrollTop = resultBox.scrollTop;
    lastY = e.pageY;
    velocity = 0;
    cancelAnimationFrame(rafId);
});

resultBox.addEventListener('mouseleave', () => {
    isDown = false;
});

window.addEventListener('mouseup', () => {
    isDown = false;
    applyInertia();
});

window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const currentY = e.pageY;
    velocity = currentY - lastY; 
    lastY = currentY;
    const y = e.pageY - resultBox.offsetTop;
    const walk = (y - startY); 
    resultBox.scrollTop = scrollTop - walk;
});






