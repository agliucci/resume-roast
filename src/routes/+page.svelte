<!-- 
  "/" landing page, title, desc, upload button
-->


<svelte:head>
	<title>AI Resume Toaster</title>
	<meta name="description" content="AI Resume Toaster" />
</svelte:head>

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
  background: linear-gradient(to right, #ff3c1f 50%, #333 50%);
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
  transition: transform 0.3s ease;
}


</style>



<div class="page">
  <div class="title">
    <h1 style="font-size:120px; color:white;">AI Resume</h1>
    <h1 style="font-size:120px; color:red;">Toaster</h1>
  </div>

  <h3 style="text-align:center; color:gray;"> Upload your resume. We'll judge it. Then we'll fix it. </h3>

<div class="roast-container">
  <h2>Roast Intensity</h2>

  <div class="slider-wrapper">
    <input type="range" min="1" max="4" step="1" value="1" id="intensity">
    <div class="ticks">
      <span>😌</span>
      <span>🙂</span>
      <span>🔥</span>
      <span>☠️</span>
    </div>
  </div>

<script>const slider = document.getElementById("intensity");
const display = document.getElementById("intensityDisplay");

const levels = {
  1: "Friendly 😌",
  2: "Professional 🙂",
  3: "Sarcastic Friend 🔥🔥🔥",
  4: "Savage Recruiter ☠️"
};

function updateSlider() {
  const value = slider.value;
  const percent = ((value - 1) / 3) * 100;

  slider.style.background =
    `linear-gradient(to right, #ff3c1f ${percent}%, #333 ${percent}%)`;

  display.textContent = levels[value];

  display.classList.remove("fire-animate");
  void display.offsetWidth; // restart animation
  display.classList.add("fire-animate");
}

slider.addEventListener("input", updateSlider);

updateSlider();</script>

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
</div>