(function () {
  "use strict";

  const root = window.CUGB_ARCHIVE_TREE;
  const elements = {
    tree: document.getElementById("folder-tree"),
    breadcrumbs: document.getElementById("breadcrumbs"),
    list: document.getElementById("file-list"),
    meta: document.getElementById("panel-meta"),
    search: document.getElementById("search-input"),
    searchHeading: document.getElementById("search-heading"),
    clearSearch: document.getElementById("clear-search"),
    sidebar: document.getElementById("sidebar"),
    menuButton: document.getElementById("menu-button"),
    closeMenuButton: document.getElementById("close-menu-button"),
    scrim: document.getElementById("sidebar-scrim"),
    musicInvite: document.getElementById("music-invite"),
    musicToggle: document.getElementById("music-toggle"),
    musicSubtitle: document.getElementById("music-subtitle"),
    musicMessage: document.getElementById("music-message"),
    audio: document.getElementById("site-audio"),
    viewer: document.getElementById("image-viewer"),
    viewerImage: document.getElementById("viewer-image"),
    viewerName: document.getElementById("viewer-name"),
    viewerIndex: document.getElementById("viewer-index"),
    viewerOriginal: document.getElementById("viewer-original"),
    viewerPrev: document.getElementById("viewer-prev"),
    viewerNext: document.getElementById("viewer-next"),
    viewerClose: document.getElementById("viewer-close")
  };

  let currentPath = [];
  let visibleImages = [];
  let viewerImageIndex = -1;
  let viewerReturnFocus = null;

  if (!root || root.kind !== "folder") {
    elements.list.innerHTML = emptyState("目录暂时不可用", "未能载入文件名称清单。", "!");
    return;
  }

  function encodePath(parts) {
    return parts.map(encodeURIComponent).join("/");
  }

  function fileUrl(parts) {
    const base = window.CUGB_FILE_BASE || "files/";
    return base + encodePath(parts);
  }

  function getExtension(name) {
    const index = name.lastIndexOf(".");
    return index > -1 ? name.slice(index + 1).toLowerCase() : "file";
  }

  function isImageName(name) {
    return ["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(getExtension(name));
  }

  function typeLabel(node) {
    if (node.kind === "folder") return "文件夹";
    const extension = getExtension(node.name);
    if (extension === "doc" || extension === "docx") return "Word";
    if (extension === "ppt" || extension === "pptx") return "PPT";
    if (extension === "pdf") return "PDF";
    if (["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(extension)) return "图片";
    return extension.toUpperCase();
  }

  function iconLabel(node) {
    if (node.kind === "folder") return "";
    const extension = getExtension(node.name);
    if (extension === "docx") return "DOC";
    if (extension === "pptx") return "PPT";
    if (["jpg", "jpeg", "png", "webp", "gif", "svg", "avif"].includes(extension)) return "IMG";
    return extension.toUpperCase().slice(0, 3);
  }

  function findFolder(parts) {
    let node = root;
    for (const part of parts) {
      node = (node.children || []).find((child) => child.kind === "folder" && child.name === part);
      if (!node) return null;
    }
    return node;
  }

  function parseHash() {
    const value = window.location.hash.replace(/^#\/?/, "");
    if (!value) return [];
    try {
      return value.split("/").filter(Boolean).map(decodeURIComponent);
    } catch (error) {
      return [];
    }
  }

  function goToFolder(parts) {
    const hash = "#/" + encodePath(parts);
    if (window.location.hash === hash || (!parts.length && !window.location.hash)) {
      currentPath = parts;
      renderFolder();
    } else {
      window.location.hash = hash;
    }
    closeSidebar();
  }

  function makeTree(nodes, parentPath) {
    const list = document.createElement("ul");
    list.className = "tree-list";

    nodes.filter((node) => node.kind === "folder").forEach((folder) => {
      const path = parentPath.concat(folder.name);
      const item = document.createElement("li");
      item.className = "tree-item";
      item.dataset.path = JSON.stringify(path);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "tree-button";
      button.dataset.path = JSON.stringify(path);
      button.title = folder.name;
      const childFolders = (folder.children || []).filter((child) => child.kind === "folder");
      button.innerHTML = '<span class="tree-chevron" aria-hidden="true"></span><span class="tree-icon" aria-hidden="true"></span><span class="tree-label"></span>';
      button.querySelector(".tree-chevron").textContent = childFolders.length ? "›" : "";
      button.querySelector(".tree-label").textContent = folder.name;
      button.addEventListener("click", () => goToFolder(path));
      item.appendChild(button);

      if (childFolders.length) item.appendChild(makeTree(childFolders, path));
      list.appendChild(item);
    });
    return list;
  }

  function renderTree() {
    elements.tree.replaceChildren();

    const rootLabel = document.createElement("div");
    rootLabel.className = "tree-level-label";
    rootLabel.textContent = "总文件夹";
    elements.tree.appendChild(rootLabel);

    const rootButton = document.createElement("button");
    rootButton.type = "button";
    rootButton.className = "tree-button tree-root-button";
    rootButton.dataset.path = "[]";
    rootButton.innerHTML = '<span class="tree-root-index" aria-hidden="true">ROOT</span><span class="tree-icon" aria-hidden="true"></span><span class="tree-label"></span>';
    rootButton.querySelector(".tree-label").textContent = root.name;
    rootButton.title = root.name;
    rootButton.addEventListener("click", () => goToFolder([]));
    elements.tree.appendChild(rootButton);

    const divider = document.createElement("div");
    divider.className = "tree-divider";
    divider.innerHTML = "<span>下级文件夹</span><i></i>";
    elements.tree.appendChild(divider);
    elements.tree.appendChild(makeTree(root.children || [], []));
    markActiveTreeItem();
  }

  function markActiveTreeItem() {
    const serialized = JSON.stringify(currentPath);
    elements.tree.querySelectorAll(".tree-button").forEach((button) => {
      const active = button.dataset.path === serialized;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");

      const path = JSON.parse(button.dataset.path || "[]");
      const onCurrentBranch = path.length > 0 && path.every((part, index) => currentPath[index] === part);
      const item = button.closest(".tree-item");
      if (item) item.classList.toggle("expanded", onCurrentBranch);
    });
  }

  function renderBreadcrumbs() {
    elements.breadcrumbs.replaceChildren();
    const labels = [root.name].concat(currentPath);

    labels.forEach((label, index) => {
      if (index > 0) {
        const separator = document.createElement("span");
        separator.className = "crumb-separator";
        separator.textContent = "/";
        separator.setAttribute("aria-hidden", "true");
        elements.breadcrumbs.appendChild(separator);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "crumb-button";
      button.textContent = label;
      button.title = label;
      if (index === labels.length - 1) button.setAttribute("aria-current", "page");
      button.addEventListener("click", () => goToFolder(currentPath.slice(0, index)));
      elements.breadcrumbs.appendChild(button);
    });
  }

  function createRow(node, parentPath, contextPath, index) {
    const path = parentPath.concat(node.name);
    const row = node.kind === "folder" ? document.createElement("button") : document.createElement("a");
    row.className = "file-row";
    if (node.kind === "folder") row.classList.add("folder-row");
    const rowExtension = node.kind === "folder" ? "" : getExtension(node.name);
    if (rowExtension === "doc" || rowExtension === "docx") row.classList.add("document-row", "word-row");
    if (rowExtension === "pdf") row.classList.add("document-row", "pdf-row");
    if (rowExtension === "ppt" || rowExtension === "pptx") row.classList.add("document-row", "presentation-row");
    if (rowExtension === "txt") row.classList.add("document-row", "text-row");
    row.style.animationDelay = Math.min(index * 32, 280) + "ms";

    if (node.kind === "folder") {
      row.type = "button";
      row.addEventListener("click", () => goToFolder(path));
    } else {
      row.href = fileUrl(path);
      if (isImageName(node.name)) {
        row.classList.add("image-row");
        row.addEventListener("click", (event) => {
          event.preventDefault();
          openImageViewer(path, row);
        });
      } else {
        row.target = "_blank";
        row.rel = "noopener";
      }
      row.setAttribute("aria-label", "打开文件：" + node.name);
    }

    const extension = node.kind === "folder" ? "folder" : getExtension(node.name);
    const identity = document.createElement("span");
    identity.className = "file-identity";

    const icon = document.createElement("span");
    icon.className = "file-icon " + extension;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = iconLabel(node);

    const nameWrap = document.createElement("span");
    nameWrap.className = "file-name-wrap";
    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = node.name;
    name.title = node.name;
    nameWrap.appendChild(name);

    if (contextPath) {
      const location = document.createElement("span");
      location.className = "file-path";
      location.textContent = contextPath;
      location.title = contextPath;
      nameWrap.appendChild(location);
    }

    identity.append(icon, nameWrap);

    const type = document.createElement("span");
    type.className = "file-type";
    const typeText = document.createElement("span");
    typeText.textContent = typeLabel(node);
    const arrow = document.createElement("span");
    arrow.className = "row-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = node.kind === "folder" ? "→" : "↗";
    type.append(typeText, arrow);

    row.append(identity, type);
    return row;
  }

  function emptyState(title, description, symbol) {
    return '<div class="empty-state"><div><div class="empty-map" aria-hidden="true">' + symbol + '</div><h3>' + title + '</h3><p>' + description + '</p></div></div>';
  }

  function renderFolder() {
    const node = findFolder(currentPath);
    if (!node) {
      currentPath = [];
      window.location.hash = "#/";
      return;
    }

    elements.search.value = "";
    elements.searchHeading.hidden = true;
    renderBreadcrumbs();
    markActiveTreeItem();
    elements.list.replaceChildren();

    const children = node.children || [];
    const folderCount = children.filter((child) => child.kind === "folder").length;
    const fileCount = children.length - folderCount;
    elements.meta.textContent = folderCount + " 个文件夹 · " + fileCount + " 个文件";
    visibleImages = children
      .filter((child) => child.kind === "file" && isImageName(child.name))
      .map((child) => ({ name: child.name, path: currentPath.concat(child.name) }));

    if (!children.length) {
      const isImageFolder = node.name === "正文的图片集合。";
      elements.list.innerHTML = isImageFolder
        ? emptyState("图片集合暂时为空", "加入图片并重新同步后，将按原文件名显示并可点击打开。", "◇")
        : emptyState("这个文件夹是空的", "原目录中未放置可访问的文件。", "∅");
      return;
    }

    children.forEach((child, index) => elements.list.appendChild(createRow(child, currentPath, "", index)));
  }

  function collectMatches(node, parentPath, term, results) {
    (node.children || []).forEach((child) => {
      const childPath = parentPath.concat(child.name);
      if (child.name.toLocaleLowerCase("zh-CN").includes(term)) {
        results.push({ node: child, parentPath: parentPath.slice(), fullPath: childPath });
      }
      if (child.kind === "folder") collectMatches(child, childPath, term, results);
    });
  }

  function renderSearch(term) {
    const normalized = term.trim().toLocaleLowerCase("zh-CN");
    if (!normalized) {
      renderFolder();
      return;
    }

    const results = [];
    collectMatches(root, [], normalized, results);
    elements.searchHeading.hidden = false;
    elements.breadcrumbs.innerHTML = '<span class="crumb-button" aria-current="page">全站名称搜索</span>';
    elements.meta.textContent = results.length + " 个结果";
    elements.list.replaceChildren();
    visibleImages = results
      .filter((result) => result.node.kind === "file" && isImageName(result.node.name))
      .map((result) => ({ name: result.node.name, path: result.fullPath }));

    if (!results.length) {
      elements.list.innerHTML = emptyState("没有同名线索", "换一个文件夹名或文件名试试。", "?");
      return;
    }

    results.forEach((result, index) => {
      const location = [root.name].concat(result.parentPath).join(" / ");
      elements.list.appendChild(createRow(result.node, result.parentPath, location, index));
    });
  }

  function updateImageViewer() {
    if (!elements.viewer || !visibleImages.length || viewerImageIndex < 0) return;
    const item = visibleImages[viewerImageIndex];
    const source = fileUrl(item.path);
    elements.viewerImage.src = source;
    elements.viewerImage.alt = item.name;
    elements.viewerName.textContent = item.name;
    elements.viewerIndex.textContent = (viewerImageIndex + 1) + " / " + visibleImages.length;
    elements.viewerOriginal.href = source;
    const onlyOne = visibleImages.length < 2;
    elements.viewerPrev.disabled = onlyOne;
    elements.viewerNext.disabled = onlyOne;
  }

  function openImageViewer(path, trigger) {
    if (!elements.viewer || !visibleImages.length) return;
    const encoded = encodePath(path);
    const index = visibleImages.findIndex((item) => encodePath(item.path) === encoded);
    viewerImageIndex = index >= 0 ? index : 0;
    viewerReturnFocus = trigger || document.activeElement;
    updateImageViewer();
    elements.viewer.hidden = false;
    document.body.classList.add("viewer-open");
    window.requestAnimationFrame(() => elements.viewer.classList.add("open"));
    elements.viewerClose.focus();
  }

  function closeImageViewer() {
    if (!elements.viewer || elements.viewer.hidden) return;
    elements.viewer.classList.remove("open");
    document.body.classList.remove("viewer-open");
    window.setTimeout(() => {
      elements.viewer.hidden = true;
      elements.viewerImage.removeAttribute("src");
    }, 180);
    if (viewerReturnFocus && typeof viewerReturnFocus.focus === "function") viewerReturnFocus.focus();
  }

  function stepImageViewer(direction) {
    if (!elements.viewer || elements.viewer.hidden || visibleImages.length < 2) return;
    viewerImageIndex = (viewerImageIndex + direction + visibleImages.length) % visibleImages.length;
    updateImageViewer();
  }

  function setupImageViewer() {
    if (!elements.viewer) return;
    elements.viewerPrev.addEventListener("click", () => stepImageViewer(-1));
    elements.viewerNext.addEventListener("click", () => stepImageViewer(1));
    elements.viewerClose.addEventListener("click", closeImageViewer);
    elements.viewer.querySelectorAll("[data-viewer-close]").forEach((node) => node.addEventListener("click", closeImageViewer));
  }

  function openSidebar() {
    elements.sidebar.classList.add("open");
    elements.scrim.hidden = false;
    elements.menuButton.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    elements.sidebar.classList.remove("open");
    elements.scrim.hidden = true;
    elements.menuButton.setAttribute("aria-expanded", "false");
  }

  function setupIceParticles() {
    const layer = document.getElementById("ice-particle-layer");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precisePointer = window.matchMedia("(pointer: fine)");
    if (!layer || reducedMotion.matches || !precisePointer.matches) return;

    let lastParticleTime = 0;
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const now = performance.now();
      if (now - lastParticleTime < 28 || layer.childElementCount > 90) return;
      lastParticleTime = now;

      const particleCount = Math.random() > .58 ? 3 : 2;
      for (let index = 0; index < particleCount; index += 1) {
        const particle = document.createElement("i");
        const size = 3 + Math.random() * 9;
        const particleStyle = Math.random();
        particle.className = particleStyle > .78
          ? "ice-particle ice-particle-star"
          : particleStyle > .58
            ? "ice-particle ice-particle-round"
            : "ice-particle";
        particle.style.width = size + "px";
        particle.style.height = size + "px";
        particle.style.left = event.clientX + (Math.random() - .5) * 15 + "px";
        particle.style.top = event.clientY + (Math.random() - .5) * 15 + "px";
        particle.style.setProperty("--ice-x", (Math.random() - .5) * 44 + "px");
        particle.style.setProperty("--ice-y", 22 + Math.random() * 46 + "px");
        particle.style.setProperty("--ice-rotate", 100 + Math.random() * 240 + "deg");
        layer.appendChild(particle);
        particle.addEventListener("animationend", () => particle.remove(), { once: true });
      }
    }, { passive: true });
  }

  function setupClickEffects() {
    const layer = document.getElementById("ice-particle-layer");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!layer || reducedMotion.matches) return;

    window.addEventListener("mousedown", (event) => {
      const ripple = document.createElement("i");
      ripple.className = "click-ripple";
      ripple.style.left = event.clientX + "px";
      ripple.style.top = event.clientY + "px";
      layer.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });

      const shardCount = 12;
      for (let index = 0; index < shardCount; index += 1) {
        const angle = (360 / shardCount) * index + Math.random() * 13;
        const distance = 34 + Math.random() * 42;
        const radians = angle * Math.PI / 180;
        const shard = document.createElement("i");
        shard.className = "click-shard";
        shard.style.left = event.clientX + "px";
        shard.style.top = event.clientY + "px";
        shard.style.setProperty("--burst-angle", angle + "deg");
        shard.style.setProperty("--burst-x", Math.cos(radians) * distance + "px");
        shard.style.setProperty("--burst-y", Math.sin(radians) * distance + "px");
        shard.style.animationDelay = index * 7 + "ms";
        layer.appendChild(shard);
        shard.addEventListener("animationend", () => shard.remove(), { once: true });
      }
    }, { passive: true });
  }

  function setupSonarScroll() {
    const rail = document.getElementById("sonar-rail");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!rail || reducedMotion.matches) return;

    let animationFrame = 0;
    function updateSonar() {
      animationFrame = 0;
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, window.scrollY / scrollRange));
      rail.style.setProperty("--sonar-shift", progress * 168 + "px");
      rail.style.setProperty("--wave-shift", (progress - .5) * 36 + "px");
      rail.style.setProperty("--sonar-rotation", progress * 240 + "deg");
    }

    window.addEventListener("scroll", () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateSonar);
    }, { passive: true });
    updateSonar();
  }

  function setupMusicPlayer() {
    const audio = elements.audio;
    const button = elements.musicToggle;
    const invite = elements.musicInvite;
    const message = elements.musicMessage;
    if (!audio || !button || !invite || !message) return;

    let messageTimer = 0;
    const source = window.CUGB_AUDIO_URL || audio.dataset.src || "";
    invite.classList.toggle("audio-missing", !source);
    button.title = source ? "播放背景音乐" : "未检测到可播放音乐";

    function showMessage(text, isError) {
      window.clearTimeout(messageTimer);
      message.textContent = text;
      message.classList.toggle("error", Boolean(isError));
      message.classList.add("show");
      messageTimer = window.setTimeout(() => message.classList.remove("show"), 3600);
    }

    function setPlaying(playing) {
      invite.classList.toggle("playing", playing);
      button.setAttribute("aria-pressed", String(playing));
      button.setAttribute("aria-label", playing ? "暂停音乐" : "确认并播放音乐");
      button.querySelector("span").textContent = playing ? "暂停" : "确认";
      if (elements.musicSubtitle) elements.musicSubtitle.textContent = playing ? "Zwei — LAST GAME" : "enjoy my taste？";
      if (playing) message.classList.remove("show", "error");
    }

    button.addEventListener("click", async () => {
      if (!audio.paused) {
        audio.pause();
        setPlaying(false);
        return;
      }

      if (!source) {
        showMessage("未检测到可播放音乐（需要 MP3 / M4A / OGG）", true);
        return;
      }

      if (!audio.src) audio.src = source;
      try {
        await audio.play();
        setPlaying(true);
      } catch (error) {
        setPlaying(false);
        showMessage("音乐暂时无法播放，请重新打开页面后再试", true);
      }
    });

    audio.addEventListener("timeupdate", () => {
      const progress = audio.duration ? audio.currentTime / audio.duration : 0;
      invite.style.setProperty("--music-progress", Math.max(0, Math.min(1, progress)));
    });
    audio.addEventListener("ended", () => setPlaying(false));
    audio.addEventListener("error", () => {
      setPlaying(false);
      showMessage("音乐文件加载失败，请重新打开页面后再试", true);
    });
  }

  function setupIntroSequence() {
    const intro = document.getElementById("intro-sequence");
    if (!intro) return;

    let finished = false;
    let skipTimer = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function revealPage() {
      if (finished) return;
      finished = true;
      window.clearTimeout(skipTimer);
      document.body.classList.remove("intro-active");
      document.body.classList.add("intro-complete");
      intro.remove();
      document.removeEventListener("keydown", handleIntroKey);
    }

    function skipIntro() {
      if (finished || intro.classList.contains("intro-skip")) return;
      intro.classList.add("intro-skip");
      skipTimer = window.setTimeout(revealPage, 340);
    }

    function handleIntroKey(event) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") skipIntro();
    }

    if (reducedMotion) {
      revealPage();
      return;
    }

    intro.addEventListener("click", skipIntro);
    intro.addEventListener("animationend", (event) => {
      if (event.target === intro && event.animationName === "intro-curtain") revealPage();
    });
    document.addEventListener("keydown", handleIntroKey);
    window.setTimeout(revealPage, 3400);
  }

  window.addEventListener("hashchange", () => {
    closeImageViewer();
    currentPath = parseHash();
    renderFolder();
  });

  elements.search.addEventListener("input", (event) => renderSearch(event.target.value));
  elements.clearSearch.addEventListener("click", () => {
    elements.search.value = "";
    renderFolder();
    elements.search.focus();
  });
  elements.menuButton.addEventListener("click", openSidebar);
  elements.closeMenuButton.addEventListener("click", closeSidebar);
  elements.scrim.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (elements.viewer && !elements.viewer.hidden) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepImageViewer(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepImageViewer(1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeImageViewer();
      }
      return;
    }
    if (event.key === "/" && document.activeElement !== elements.search) {
      event.preventDefault();
      elements.search.focus();
    }
    if (event.key === "Escape") {
      if (elements.search.value) {
        elements.search.value = "";
        renderFolder();
      }
      closeSidebar();
    }
  });

  currentPath = parseHash();
  renderTree();
  renderFolder();
  setupIceParticles();
  setupClickEffects();
  setupSonarScroll();
  setupMusicPlayer();
  setupImageViewer();
  setupIntroSequence();
})();
