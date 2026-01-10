const SEARCH_FIELDS = ['語言', '曲名', '歌手', '熟練', '類型'];
const HEADERS = ['語言', '曲名', '歌手', '音源(伴奏)', '熟練', '類型'];
const API_URL =`https://script.google.com/macros/s/AKfycbzndg2ucDRDrBnej9lTiphmKHKatx8RGLFn-vIFCZKivxthIjvxrfsPBYGYuz8SpWDt/exec`;

let songs = [];
let filteredSongs = [];
let displayCount = 20;
const PAGE_SIZE = 20;

async function loadSongs() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        songs = data.slice(2).map(r => {
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

input.addEventListener('input', () => {
    const kw = input.value.trim().toLowerCase();
    filteredSongs = songs.filter(song =>
        SEARCH_FIELDS.some(field => 
            song[field]?.toLowerCase().includes(kw)
        )
    );
    renderList(false);
});

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log(`已複製：${text}`);
    });
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

        const score = parseInt(song['熟練']) || 0;
        const maxStars = 5;
        const starDisplay = '★'.repeat(Math.max(0, Math.min(score, maxStars))) + 
                            '☆'.repeat(Math.max(0, maxStars - score));

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="song">🎵 ${song['曲名']}</div>
                <button class="copy-btn" onclick="copyText('${song['曲名']}')">
                    <img src="https://raw.githubusercontent.com/shiro-shio/SydneyViya-SongList/main/img/B_copy.svg"
                    class="icon"
                    draggable="false"
                    > 複製
                </button>
            </div>
            <div class="meta">
                <img src="https://raw.githubusercontent.com/shiro-shio/SydneyViya-SongList/main/img/B_karaoke.svg"
                class="icon"
                draggable="false"> ${song['歌手']}
            </div>
            <div class="meta">
                <span class="tag">熟練：${starDisplay}</span>
                <span class="tag">${song['語言']}</span>
                ${typeTags}
            </div>
        `;
        fragment.appendChild(div);
    });

    resultBox.appendChild(fragment);
    if (append) displayCount = end;
}

resultBox.addEventListener('scroll', () => {
    if (resultBox.scrollTop + resultBox.clientHeight >= resultBox.scrollHeight - 20) {
        if (displayCount < filteredSongs.length) {
            renderList(true);
        }
    }
});