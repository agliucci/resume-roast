<!-- 
  "/roast" page, title, desc, upload button, slider
-->

<svelte:head>
	<title>Resume Toaster</title>
	<meta name="description" content="Resume Toaster" />
</svelte:head>

<script lang="ts">
  import { pdfToText } from '$lib/utils/resumeparser';

  type Tone = 'friendly' | 'professional' | 'sarcastic' | 'savage';

  // Slider state (1..4)
  let intensity = 1;

  const levels: Record<number, string> = {
    1: "Friendly",
    2: "Professional",
    3: "Sarcastic Friend",
    4: "Savage Recruiter"
  };

  const toneFromIntensity = (n: number): Tone => {
    if (n === 1) return 'friendly';
    if (n === 2) return 'professional';
    if (n === 3) return 'sarcastic';
    return 'savage';
  };

  // Derived UI values
  $: tone = toneFromIntensity(intensity);
  $: intensityLabel = tone.charAt(0).toUpperCase() + tone.slice(1);
  $: percent = ((intensity - 1) / 3) * 100;
  $: sliderBg = `linear-gradient(to right, #ff3c1f ${percent}%, #333 ${percent}%)`;

  // File upload state
  let resumeText = '';
  let fileInput: HTMLInputElement;
  let roastContainer: HTMLElement;

  // Roast request state
  let loading = false;
  let roast: string = '';
  let displayedRoast: string = '';
  let bullets: string[] = [];
  let error = '';

  type RoastSection = {
  title: string;
  roast: string;
  fixes: string[];
};

// what we render (typed-in progressively)
type DisplaySection = {
  title: string;
  roast: string;
  fixes: string[];
};

function parseGeminiRoast(raw: string): RoastSection[] {
  const text = (raw ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  // 1) Find section headings (supports **Heading** OR ## Heading)
  const headingRegex = /(^|\n)(\*\*(.+?)\*\*|##\s+(.+?))\s*(?=\n)/g;

  const matches = Array.from(text.matchAll(headingRegex)).map((m) => {
    const full = m[0];
    const idx = m.index ?? 0;
    const title = (m[3] ?? m[4] ?? '').trim();
    return { idx, len: full.length, title };
  });

  // If no headings found, return a single section
  if (matches.length === 0) {
    return [{ title: 'Resume Roast', roast: text, fixes: [] }];
  }

  // 2) Slice sections by heading positions
  const sections: RoastSection[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;

    // content begins after heading line
    const headingLineEnd = text.indexOf('\n', start + matches[i].len);
    const bodyStart = headingLineEnd === -1 ? start + matches[i].len : headingLineEnd + 1;
    const body = text.slice(bodyStart, end).trim();

    const { roast, fixes } = splitRoastAndFixes(body);

    sections.push({
      title: matches[i].title || `Section ${i + 1}`,
      roast,
      fixes
    });
  }

  // Remove empty sections
  return sections.filter((s) => s.title && (s.roast || s.fixes.length));
}

function splitRoastAndFixes(body: string): { roast: string; fixes: string[] } {
  const cleaned = (body ?? '').trim();
  if (!cleaned) return { roast: '', fixes: [] };

  // Look for a “fixes” marker
  const fixesMarker = /(how to improve|suggestions?|fix(es)?|improvements?)/i;
  const lines = cleaned.split('\n').map((l) => l.trim());

  let roastLines: string[] = [];
  let fixesLines: string[] = [];
  let inFixes = false;

  for (const line of lines) {
    if (!inFixes && fixesMarker.test(line)) {
      inFixes = true;
      continue;
    }
    if (!inFixes) roastLines.push(line);
    else fixesLines.push(line);
  }

  // Extract bullets from fixes area
  let fixes = fixesLines
    .filter(Boolean)
    .map((l) => l.replace(/^[-•*]\s+/, ''))
    .filter((l) => l.length > 0);

  // If fixes area exists but no bullets, treat each line as a bullet
  if (inFixes && fixes.length === 0) {
    fixes = fixesLines.filter(Boolean);
  }

  // If there was no “fixes” marker, try to split by “Roast:” / “My Roast:” and “How to improve:”
  if (!inFixes) {
    const joined = cleaned;

    const roastTag = /(my roast:|roast:)/i;
    const improveTag = /(how to improve( it)?:|suggestions?:|fix(es)?:)/i;

    const improveIdx = joined.search(improveTag);

    if (improveIdx !== -1) {
      const roastPart = joined.slice(0, improveIdx).trim();
      const fixesPart = joined.slice(improveIdx).trim();

      roastLines = roastPart.split('\n').map((l) => l.trim()).filter(Boolean);

      fixes = fixesPart
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.replace(/^[-•*]\s+/, ''))
        .filter((l) => !improveTag.test(l));
    } else if (roastTag.test(joined)) {
      // if it contains roast tag but no fixes tag, keep as roast
      roastLines = joined.split('\n').map((l) => l.trim()).filter(Boolean);
    }
  }

  // Final roast string: remove common label prefixes
  const roast = roastLines
    .join('\n')
    .replace(/^(my roast:|roast:)\s*/i, '')
    .trim();

  return { roast, fixes };
}

  let sections: RoastSection[] = [];
let displayedSections: DisplaySection[] = [];
let cursor = { si: 0, mode: 'title' as 'title' | 'roast' | 'fix', fi: 0 };

function initDisplayed(secs: RoastSection[]) {
  displayedSections = secs.map((s) => ({
    title: '',
    roast: '',
    fixes: s.fixes.map(() => '')
  }));
  cursor = { si: 0, mode: 'title', fi: 0 };
}

function typewriterSections(secs: RoastSection[], speed: number = 20) {
  sections = secs;
  initDisplayed(secs);

  let si = 0;
  let mode: 'title' | 'roast' | 'fix' = 'title';
  let fi = 0;
  let ci = 0;

  const step = () => {
    if (si >= sections.length) return;

    cursor = { si, mode, fi };

    const target = sections[si];

    if (mode === 'title') {
      const t = target.title;
      if (ci < t.length) {
        displayedSections[si].title += t[ci++];
      } else {
        mode = 'roast';
        ci = 0;
      }
    } else if (mode === 'roast') {
      const r = target.roast ?? '';
      if (ci < r.length) {
        displayedSections[si].roast += r[ci++];
      } else {
        mode = 'fix';
        ci = 0;
        fi = 0;
      }
    } else {
      const fixes = target.fixes ?? [];
      if (fi >= fixes.length) {
        // next section
        si++;
        mode = 'title';
        fi = 0;
        ci = 0;
      } else {
        const f = fixes[fi];
        if (ci < f.length) {
          displayedSections[si].fixes[fi] += f[ci++];
        } else {
          fi++;
          ci = 0;
        }
      }
    }

    // keep the newest content visible
    if (roastContainer) {
      roastContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    setTimeout(step, speed);
  };

  step();
}

  function openFilePicker() {
    fileInput?.click();
  }

  async function roastResume() {
    if (!resumeText || resumeText.length < 50) return;

    loading = true;
    error = '';
    roast = '';
    displayedRoast = '';
    bullets = [];

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, tone })
      });

      const data = await res.json();

      if (!res.ok) {
        error = data?.error ?? 'Roast request failed.';
        return;
      }

      bullets = data?.bullets ?? [];
      roast = data?.roast ?? '';
const parsed = parseGeminiRoast(roast);
typewriterSections(parsed, 25);
    } catch (e: any) {
      error = e?.message ?? 'Network error calling /api/roast';
    } finally {
      loading = false;
    }
  }

  async function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    loading = true;
    error = '';
    roast = '';
    displayedRoast = '';
    bullets = [];

    try {
      resumeText = await pdfToText(file);
      console.log('Extracted chars:', resumeText.length);

      // ✅ Roast immediately after parsing
      await roastResume();
    } catch (e: any) {
      error = e?.message ?? 'Failed to parse PDF';
    } finally {
      loading = false;
    }
  }

  // ✅ Optional: if they change slider AFTER upload, re-roast automatically
  // (comment this out if you don’t want auto re-roast on slider move)
  $: if (resumeText && !loading) {
    // debounce so it doesn't spam requests while dragging
    // keep it simple: only re-roast when intensity changes and resumeText exists
  }
</script>

<style>
:global(html, body, #svelte) {
    background-color: black;
}
.title h1 {
    margin: 0;
    font-size: 120px;
    line-height: 1;
    text-align: center;
    font-family: 'Poppins', sans-serif;
}

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 24px;
}

.upload-content svg {
  width: 40px;
  height: 40px;
  stroke-width: 4; 
}
.upload-btn {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: linear-gradient(135deg, #ff3c1f, #ff8c00);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.upload-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 15px 40px rgba(255, 100, 0, 0.5);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  font-family: Poppins, sans-serif;
}

.upload-content span {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 500;
}

body {
  background: black;
  color: white;
  font-family: 'Poppins', sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.roast-container {
  width: 500px;
  text-align: center;
  color: white;
  font-family: Poppins, sans-serif;
}

h2 {
  font-weight: 600;
  margin-bottom: 25px;
}

.slider-wrapper {
  position: relative;
  width: 100%;
}

input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 5px;
  outline: none;
  transition: background 0.3s ease;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  transition: transform 0.2s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 20px;
}

.intensity-display {
  margin-top: 30px;
  font-size: 22px;
  font-weight: 600;
  color: white;
  transition: transform 0.3s ease;
}

.roast-box {
  width: min(800px, 92vw);
  margin-top: 16px;
  background: #0b0b0b;
  border: 1px solid #222;
  border-radius: 12px;
  padding: 14px;
  white-space: pre-wrap;
  color: #eee;
  font-family: 'Courier New', monospace;
  font-size: 20px;
  line-height: 1.6;
}

.typewriter-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background-color: #ff3c1f;
  margin-left: 2px;
  animation: blink 0.7s infinite;
}

.typewriter-cursor.hidden {
  animation: none;
  opacity: 0;
}



@keyframes blink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}
</style>

<div class="page">
  <div class="title">
    <h1 style="font-size:120px; color:white;">Resume</h1>
    <h1 style="font-size:120px; color:red;">Toaster</h1>
  </div>

  <h3 style="text-align:center; color:gray; font-family: Poppins, sans-serif;">
    Upload your resume. We'll judge it. Then we'll fix it.
  </h3>

  <div class="roast-container">
    <h2>Roast Intensity</h2>

    <div class="slider-wrapper">
      <input
        type="range"
        min="1"
        max="4"
        step="1"
        bind:value={intensity}
        style={`background: ${sliderBg};`}
      />

      <div class="ticks">
        <span>😌</span>
        <span>🙂</span>
        <span>🔥</span>
        <span>☠️</span>
      </div>

      

      <div class="intensity-display" id="intensityDisplay">
        {intensityLabel}
      </div>
    </div>
  </div>

  <button class="upload-btn" on:click={openFilePicker}>
    <div class="upload-content">
      <svg xmlns="http://www.w3.org/2000/svg"
           viewBox="0 0 24 24"
           fill="none" stroke="white"
           stroke-linecap="round"
           stroke-linejoin="round">
        <path d="M12 19V5"></path>
        <path d="M5 12l7-7 7 7"></path>
        <path d="M5 19h14"></path>
      </svg>
      <span>Upload PDF</span>
    </div>
  </button>

  <!-- Optional: show confirmation that parsing happened -->
  {#if resumeText}
    <p style="color: gray; margin-top: 8px; font-family: Poppins, sans-serif; font-size: 24px !important;">
      ✅ PDF loaded
    </p>
  {/if}
  {#if loading}
  <p style="color: gray; margin-top: 8px; font-family: Poppins, sans-serif; font-size: 24px !important;">⏳ Roasting…</p>
{/if}

{#if error}
  <p style="color: #ff9a9a; margin-top: 8px;">{error}</p>
{/if}

{#if sections.length}
  <div bind:this={roastContainer} class="roast-box structured">
    {#each displayedSections as s, si}
      <div class="section">
        <div class="section-title">
          <span class="title-text">{s.title}</span>
          {#if cursor.si === si && cursor.mode === 'title'}
            <span class="typewriter-cursor"></span>
          {/if}
        </div>

        {#if s.roast.length || (cursor.si === si && cursor.mode === 'roast')}
          <div class="block">
            <div class="label">Roast</div>
            <div class="text">
              {s.roast}
              {#if cursor.si === si && cursor.mode === 'roast'}
                <span class="typewriter-cursor"></span>
              {/if}
            </div>
          </div>
        {/if}

        {#if s.fixes.length}
          <div class="block">
            <div class="label">Fixes</div>
            <ul class="fixes">
              {#each s.fixes as f, fi}
                <li>
                  {f}
                  {#if cursor.si === si && cursor.mode === 'fix' && cursor.fi === fi}
                    <span class="typewriter-cursor"></span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
</div>

<!-- Hidden file input -->
<input
  type="file"
  accept="application/pdf"
  bind:this={fileInput}
  on:change={handleFileUpload}
  style="display:none"
/>