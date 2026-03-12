---
layout: ../layouts/AboutLayout.astro
title: "About Me"
---

Hi, I'm Lyx and I live in the BeiJing. Thanks for visiting my site.

I'm a marathon runner with a personal best of 2:50. I consider myself a philosopher of marathon training. I believe in the principle of minimum effective dose and practice long-termism.

I once tried becoming a Les Mills instructor, but gave it up because the training approach conflicted with endurance running. I admit this attempt failed. But I'm still proud of it, because I recognized my limitations and followed my heart to make choices.

On the other side, I'm a programmer. I write something, but master nothing. I hope to build products the market loves, solve real problems, and get paid for it.

Since 2018, I've been struggling with severe depression, so I left the tech companies and have been at home. It's been <span id="years-since-2018">8</span> years since I last held a programming job. But I still like to call myself a programmer, cause this title means focus, diligence, and curiosity.

---

This site is built with [Astro](https://astro.build).

I'd love to hear your feedback on this site and my work.

See you on the road.

---

<script define:vars={{ currentYear: new Date().getFullYear() }}>
  const startYear = 2018;
  document.getElementById('years-since-2018').textContent = String(currentYear - startYear);
</script>
