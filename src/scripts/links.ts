/**
 * Auto-detects external and internal links, adds appropriate CSS classes
 */

function isExternalLink(href: string): boolean {
  // Skip empty or anchor links
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:")
  ) {
    return false;
  }

  // Relative paths are internal
  if (href.startsWith("/")) {
    return false;
  }

  // Check if the link is from the same domain
  try {
    const linkUrl = new URL(href, window.location.origin);
    return linkUrl.origin !== window.location.origin;
  } catch {
    // Invalid URL, treat as internal
    return false;
  }
}

function isInternalLink(href: string): boolean {
  // Skip empty or anchor links
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:")
  ) {
    return false;
  }

  // Relative paths (starting with /) are internal links
  return href.startsWith("/");
}

function addLinkClasses(): void {
  const links = document.querySelectorAll("article a[href]");

  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Check if it's an external link
    if (isExternalLink(href)) {
      link.classList.add("link-external");

      // Add rel="noopener noreferrer" for security
      link.setAttribute("rel", "noopener noreferrer");

      // Add target="_blank"
      link.setAttribute("target", "_blank");
    }
    // Check if it's an internal link (relative path)
    else if (isInternalLink(href)) {
      link.classList.add("link-internal");
    }
  });
}

// Run on page load
addLinkClasses();

// Re-run on view transitions navigation
document.addEventListener("astro:after-swap", addLinkClasses);
