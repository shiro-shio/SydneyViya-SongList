const SHEET_ID = '1QKdoY1acqW-tqk2K5CJZAzC-mtiUpKzWyE6eVfLbZ34';
const GID = 0;
const SEARCH_FIELDS = ['語言', '曲名', '歌手', '熟練', '類型'];
const HEADERS = ['語言', '曲名', '歌手', '音源(伴奏)', '熟練', '類型'];
const CSV_URL =`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

let songs = [];
let filteredSongs = [];
let displayCount = 20;
const PAGE_SIZE = 20;

async function loadSongs() {
    const res = await fetch(CSV_URL);
    const csvText = await res.text();
    const rows = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    const dataRows = rows.slice(2);

    function parseCSVLine(line) {
        const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
        const result = [];
        let match;
        while ((match = regex.exec(line)) !== null) {
            if (match[1] !== undefined) {
                result.push(match[1].replace(/""/g, '"').trim());
            } else {
                result.push((match[2] || '').trim());
            }
        }
        return result;
    }

    songs = dataRows.map(r => {
        const fields = parseCSVLine(r);
        const obj = {};
        HEADERS.forEach((h, i) => {
            obj[h] = fields[i] || '';
        });
        return obj;
    });
    renderList(songs);
}
loadSongs();

const input = document.getElementById('kw');
const resultBox = document.getElementById('result');

input.addEventListener('input', () => {
    const kw = input.value.trim().toLowerCase();
    if (!kw) {
        renderList(songs);
        return;
    }
    filteredSongs = songs.filter(song =>
        SEARCH_FIELDS.some(field =>
            song[field]?.toLowerCase().includes(kw)
        )
    );
    renderList(filteredSongs);
});

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log(`已複製：${text}`);
    });
}

function renderList(list, append = false) {
    const resultBox = document.getElementById('result');
    if (!append) {
        resultBox.innerHTML = '';
        displayCount = PAGE_SIZE;
    }

    const fragment = document.createDocumentFragment();
    const itemsToShow = list.slice(displayCount - PAGE_SIZE, displayCount);

    itemsToShow.forEach(song => {
        const div = document.createElement('div');
        div.className = 'item';
        const typeTags = song['類型']
            ? song['類型'].split(',').map(t => `<span class="tag">${t.trim()}</span>`).join(' ')
            : '';

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
                <span class="tag">${song['語言']}</span>
                ${typeTags}
                <span class="tag">熟練：${song['熟練']}</span>
            </div>
        `;
        fragment.appendChild(div);
    });

    resultBox.appendChild(fragment);
}

resultBox.addEventListener('scroll', () => {
    if (resultBox.scrollTop + resultBox.clientHeight >= resultBox.scrollHeight - 20) {
        const currentList = input.value.trim() ? filteredSongs : songs;
        if (displayCount < currentList.length) {
            displayCount += PAGE_SIZE;
            renderList(currentList, true);
        }
    }
});