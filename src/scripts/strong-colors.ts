const COLORS = [
  "--blue", "--brown", "--cyan", "--green",
  "--indigo", "--mint", "--orange", "--pink",
  "--purple", "--red", "--teal", "--yellow",
];

function colorStrongElements() {
  document.querySelectorAll<HTMLElement>(".app-prose strong").forEach(el => {
    const text = el.textContent?.trim() ?? "";
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    const colorVar = COLORS[Math.abs(hash) % COLORS.length];
    el.style.setProperty("--strong-color", `var(${colorVar})`);
  });
}

colorStrongElements();
document.addEventListener("astro:after-swap", colorStrongElements);
