const $ = id => document.getElementById(id);
const DELAY = 1200;
let n = 0, m = [], dp = [], act = [], steps = [], robbed = [];
let cur = 0, timer = null;
function renderInputs(values) {
    const k = Math.min(10, Math.max(1, parseInt($('count').value) || 1));
    const old = values || [...document.querySelectorAll('#houses input')].map(i => i.value);
    $('houses').innerHTML = '';
    for (let i = 0; i < k; i++) {
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = 0;
        inp.placeholder = 'بيت ' + (i + 1);
        inp.value = old[i] ?? '';
        inp.setAttribute('aria-label', 'فلوس البيت ' + (i + 1));
        $('houses').appendChild(inp);
    }
}

function start() {
    const k = parseInt($('count').value);
    const vals = [...document.querySelectorAll('#houses input')].map(i => Number(i.value));
    let err = '';
    if (!Number.isInteger(k) || k < 1 || k > 10) err = 'عدد البيوت لازم يكون من 1 إلى 10.';
    else if ([...document.querySelectorAll('#houses input')].some(i => i.value.trim() === '')) err = 'املا فلوس كل البيوت.';
    else if (vals.some(v => !Number.isInteger(v) || v < 0 || v > 999)) err = 'الفلوس لازم تكون رقم صحيح من 0 إلى 999.';
    $('error').hidden = !err;
    $('error').textContent = err;
    if (err) return;
    stop();
    n = k;
    m = [0, ...vals]; // 1-based
    solve();
    cur = 0;
    $('solver').hidden = false;
    render();
    $('solver').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function solve() {
    dp = [0];
    act = [null];
    steps = [{ type: 'init' }];
    for (let i = 1; i <= n; i++) {
        const skip = dp[i - 1];
        const prev2 = i >= 2 ? dp[i - 2] : 0;
        const take = prev2 + m[i];
        const rob = take > skip;
        dp[i] = rob ? take : skip;
        act[i] = rob ? 'rob' : 'skip';
        steps.push({ type: 'fill', i, skip, take, prev2, rob });
    }
    robbed = [];
    let i = n;
    while (i >= 1) {
        if (act[i] === 'rob') {
            steps.push({ type: 'trace', i, action: 'rob' });
            robbed.push(i);
            i -= 2;
        } else {
            steps.push({ type: 'trace', i, action: 'skip' });
            i -= 1;
        }
    }
    robbed.sort((a, b) => a - b);
    steps.push({ type: 'done' });
}

function render() {
    const s = steps[cur];
    $('counter').textContent = `الخطوة ${cur + 1} من ${steps.length}`;
    $('prev').disabled = cur === 0;
    $('next').disabled = cur === steps.length - 1;
    $('skip').disabled = cur === steps.length - 1;
    renderTable(s);
    $('stepCard').hidden = s.type === 'done';
    if (s.type !== 'done') renderStep(s);
    renderResults(s);
}

function renderTable(s) {
    const revealed = s.type === 'init' ? 0 : s.type === 'fill' ? s.i : n;
    const refs = new Set(), chosen = new Set(), path = new Set();
    let currentI = null;
    if (s.type === 'fill') {
        currentI = s.i;
        if (s.i - 1 >= 1) refs.add(s.i - 1);
        if (s.i - 2 >= 1) refs.add(s.i - 2);
        const src = s.rob ? s.i - 2 : s.i - 1;
        if (src >= 1) chosen.add(src);
    }
    if (s.type === 'trace') currentI = s.i;
    steps.slice(0, cur + 1).forEach(st => {
        if (st.type === 'trace' && st.action === 'rob') path.add(st.i);
    });
    if (s.type === 'done') robbed.forEach(i => path.add(i));
    let head = '<tr><th>البيت</th>';
    let money = '<tr><th>الفلوس</th>';
    let vals = '<tr><th>أكبر مبلغ لحد البيت</th>';
    let dec = '<tr><th>القرار</th>';
    for (let i = 1; i <= n; i++) {
        const shown = i <= revealed;
        let moneyCls = 'cell', dpCls = 'cell';
        if (!shown) dpCls += ' pending';
        if (refs.has(i)) dpCls += chosen.has(i) ? ' chosen' : ' ref';
        if (path.has(i)) { moneyCls += ' path'; dpCls += ' path'; }
        if (i === currentI) { moneyCls += ' current'; dpCls += ' current'; }
        head += `<td class="idx">${i}</td>`;
        money += `<td class="${moneyCls}">${m[i]}</td>`;
        vals += `<td class="${dpCls}">${shown ? dp[i] : '?'}</td>`;
        dec += `<td class="dec${shown && act[i] === 'rob' ? ' rob' : ''}">${shown ? (act[i] === 'rob' ? 'سرقة' : 'ترك') : ''}</td>`;
    }
    const wrap = $('tableWrap');
    wrap.innerHTML = `<table class="dp"><tbody>${head}</tr>${money}</tr>${vals}</tr>${dec}</tr></tbody></table>`;
    const el = wrap.querySelector('.current');
    if (el) wrap.scrollLeft = el.offsetLeft - wrap.clientWidth / 2 + el.clientWidth / 2;
}
function renderStep(s) {
    let title = '', body = '';
    if (s.type === 'init') {
        title = 'البداية';
        body = `<p class="note">هنمشي على البيوت واحد واحد. <span dir="ltr">dp[i]</span> معناها: أكبر مبلغ نقدر ناخده من أول بيت لحد البيت رقم i،
        من غير ما نسرق بيتين جنب بعض. وبنبدأ بـ <span dir="ltr">dp[0] = 0</span> لأن لو مفيش بيوت مفيش فلوس.</p>
        <p class="note">في كل بيت قدامنا اختيارين بس: نسرقه ونسيب اللي قبله، أو نسيبه ونكمل بأحسن نتيجة لحد اللي قبله.</p>`;
    }
    if (s.type === 'fill') {
        const i = s.i;
        title = `البيت ${i} (فلوسه ${m[i]})`;
        const robTxt = i >= 2
            ? `dp[${i - 2}] + ${m[i]} = ${s.prev2} + ${m[i]} = ${s.take}`
            : `0 + ${m[i]} = ${s.take}`;
        const skipTxt = `dp[${i - 1}] = ${s.skip}`;
        const best = Math.max(s.take, s.skip);
        body = `<p class="note">قدامنا اختيارين، ونختار الأكبر:</p>
        <ul class="cands">
            <li class="cand${s.rob ? ' best' : ''}"><b>سرقة</b><span dir="ltr">${robTxt}</span></li>
            <li class="cand${s.rob ? '' : ' best'}"><b>ترك</b><span dir="ltr">${skipTxt}</span></li>
        </ul>
        <p class="verdict ok"><span dir="ltr">dp[${i}] = max(${s.take}, ${s.skip}) = ${best}</span>، يعني ${s.rob ? 'نسرق' : 'نسيب'} البيت ${i}.</p>`;
    }
    if (s.type === 'trace') {
        title = 'معرفة البيوت اللي هنسرقها';
        if (s.action === 'rob') {
            const next = s.i - 2;
            body = `<p class="note">عند البيت <b>${s.i}</b>: القرار المخزن "سرقة"، يعني هنسرقه.
            وبعدها ${next >= 1 ? `بننط للبيت <b>${next}</b> لأن البيت ${s.i - 1} جنبه ومينفعش.` : 'منفضلش فيه بيوت نكمل بيها، وكده خلصنا.'}</p>`;
        } else {
            const next = s.i - 1;
            body = `<p class="note">عند البيت <b>${s.i}</b>: القرار المخزن "ترك"، يعني منسرقوش،
            وننزل للبيت <b>${next}</b>${next >= 1 ? '.' : ' ولسه مفيش بيوت قبله، وكده خلصنا.'}</p>`;
        }
    }
    $('stepTitle').textContent = title;
    $('stepBody').innerHTML = body;
}

function renderResults(s) {
    const r = $('results');
    if (s.type !== 'done') { r.hidden = true; return; }
    r.hidden = false;
    const chips = robbed.length
        ? robbed.map(i => `<span class="chip">بيت ${i} (${m[i]})</span>`).join('')
        : '<span class="note">مفيش داعي نسرق أي بيت (كل البيوت فلوسها صفر)</span>';
    const sum = robbed.length
        ? `<p class="compare">المجموع: <span dir="ltr">${robbed.map(i => m[i]).join(' + ')} = ${dp[n]}</span>
        ومفيش بيتين منهم جنب بعض.</p>`
        : '';
    r.innerHTML = `
        <h2>النتيجة</h2>
        <div class="stats">
            <div class="stat"><small>أكبر مبلغ ممكن</small><strong>${dp[n]}</strong></div>
            <div class="stat"><small>البيوت اللي هنسرقها</small><div class="chips">${chips}</div></div>
            <div class="stat"><small>عدد البيوت</small><strong>${n}</strong></div>
        </div>
        ${sum}`;
}

function go(i) {
    cur = Math.min(steps.length - 1, Math.max(0, i));
    render();
}

function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    $('play').textContent = 'تشغيل تلقائي';
}

function togglePlay() {
    if (timer) { stop(); return; }
    if (cur === steps.length - 1) return;
    $('play').textContent = 'إيقاف';
    timer = setInterval(() => {
        go(cur + 1);
        if (cur >= steps.length - 1) stop();
    }, DELAY);
}

$('count').addEventListener('input', () => renderInputs());
$('start').addEventListener('click', start);
$('example').addEventListener('click', () => {
    $('count').value = 5;
    renderInputs([2, 7, 9, 3, 1]);
    start();
});
$('next').addEventListener('click', () => { stop(); go(cur + 1); });
$('prev').addEventListener('click', () => { stop(); go(cur - 1); });
$('skip').addEventListener('click', () => { stop(); go(steps.length - 1); });
$('restart').addEventListener('click', () => { stop(); go(0); });
$('play').addEventListener('click', togglePlay);

renderInputs();