(function () {
  "use strict";

  const sidebar = document.querySelector(".hs-layout-sidebar");
  const menuToggle = document.querySelector(".hs-layout-menu-toggle");
  const closeButton = document.querySelector(".hs-layout-sidebar-close");
  const backdrop = document.querySelector(".hs-layout-backdrop");

  if (!sidebar || !menuToggle) {
    return;
  }

  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let lastFocusedElement = null;

  function getFocusableElements() {
    return Array.from(sidebar.querySelectorAll(focusableSelector));
  }

  function isMobile() {
    return window.matchMedia("(max-width: 1023px)").matches;
  }

  function openSidebar() {
    if (!isMobile()) {
      return;
    }

    lastFocusedElement = document.activeElement;

    sidebar.classList.add("is-open");
    backdrop?.classList.add("is-visible");

    menuToggle.setAttribute("aria-expanded", "true");
    sidebar.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    const focusableElements = getFocusableElements();

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  function closeSidebar(options = {}) {
    const { restoreFocus = true } = options;

    sidebar.classList.remove("is-open");
    backdrop?.classList.remove("is-visible");

    menuToggle.setAttribute("aria-expanded", "false");
    sidebar.setAttribute("aria-hidden", isMobile() ? "true" : "false");

    document.body.style.overflow = "";

    if (
      restoreFocus &&
      lastFocusedElement &&
      typeof lastFocusedElement.focus === "function"
    ) {
      lastFocusedElement.focus();
    }

    lastFocusedElement = null;
  }

  function toggleSidebar() {
    if (sidebar.classList.contains("is-open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function handleKeydown(event) {
    if (!sidebar.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSidebar();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement =
      focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function updateCurrentPage() {
    const currentPath = normalizePath(window.location.pathname);

    const links = sidebar.querySelectorAll(
      ".hs-layout-nav-link[href]"
    );

    links.forEach((link) => {
      const linkUrl = new URL(link.href, window.location.origin);
      const linkPath = normalizePath(linkUrl.pathname);

      const isCurrent =
        linkPath === currentPath ||
        (
          linkPath !== "/" &&
          currentPath.startsWith(`${linkPath}/`)
        );

      link.classList.toggle("is-active", isCurrent);

      if (isCurrent) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function normalizePath(path) {
    if (!path || path === "/") {
      return "/";
    }

    const normalized = path.replace(/\/+$/, "");

    return normalized || "/";
  }

  function handleResize() {
    if (!isMobile()) {
      sidebar.classList.remove("is-open");
      backdrop?.classList.remove("is-visible");

      menuToggle.setAttribute("aria-expanded", "false");
      sidebar.setAttribute("aria-hidden", "false");

      document.body.style.overflow = "";

      lastFocusedElement = null;
    } else if (!sidebar.classList.contains("is-open")) {
      sidebar.setAttribute("aria-hidden", "true");
    }
  }

  menuToggle.addEventListener("click", toggleSidebar);

  closeButton?.addEventListener("click", () => {
    closeSidebar();
  });

  backdrop?.addEventListener("click", () => {
    closeSidebar();
  });

  document.addEventListener("keydown", handleKeydown);

  window.addEventListener("resize", handleResize);

  updateCurrentPage();
  handleResize();
})();