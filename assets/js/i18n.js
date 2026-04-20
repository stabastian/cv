const STORAGE_KEY = "cv.lang";
const DEFAULT_LANG = "es";
const SUPPORTED = ["es", "en"];

const translations = {};

function getNested(obj, path) {
    return path.split(".").reduce((acc, key) => {
        if (acc == null) return undefined;
        return acc[key];
    }, obj);
}

async function loadLang(lang) {
    if (translations[lang]) return translations[lang];
    const res = await fetch(`assets/i18n/${lang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load ${lang}.json`);
    const data = await res.json();
    translations[lang] = data;
    return data;
}

function applyText(root, dict) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const value = getNested(dict, key);
        if (typeof value === "string") el.textContent = value;
    });

    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        const pairs = el.getAttribute("data-i18n-attr").split(",");
        pairs.forEach((pair) => {
            const [attr, key] = pair.split(":").map((s) => s.trim());
            if (!attr || !key) return;
            const value = getNested(dict, key);
            if (typeof value === "string") el.setAttribute(attr, value);
        });
    });
}

function applyLists(root, dict) {
    root.querySelectorAll("[data-i18n-list]").forEach((el) => {
        const key = el.getAttribute("data-i18n-list");
        const items = getNested(dict, key);
        if (!Array.isArray(items)) return;
        el.innerHTML = "";
        items.forEach((text) => {
            const li = document.createElement("li");
            li.textContent = text;
            el.appendChild(li);
        });
    });
}

function renderSkills(dict) {
    const container = document.querySelector("[data-i18n-skills]");
    if (!container) return;
    const groups = getNested(dict, "skills.groups");
    if (!Array.isArray(groups)) return;
    container.innerHTML = "";
    groups.forEach((group) => {
        const wrap = document.createElement("div");
        wrap.className = "skills__group";

        const name = document.createElement("h3");
        name.className = "skills__group-name";
        name.textContent = group.name;
        wrap.appendChild(name);

        const list = document.createElement("ul");
        list.className = "skills__list";
        (group.items || []).forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });
        wrap.appendChild(list);

        container.appendChild(wrap);
    });
}

function renderProjects(dict) {
    document.querySelectorAll("[data-i18n-projects]").forEach((container) => {
        const key = container.getAttribute("data-i18n-projects");
        const projects = getNested(dict, key);
        if (!Array.isArray(projects)) return;
        container.innerHTML = "";
        projects.forEach((project) => {
            const item = document.createElement("div");
            item.className = "project";

            const head = document.createElement("div");
            head.className = "project__head";

            const name = document.createElement("h4");
            name.className = "project__name";
            name.textContent = project.name || "";
            head.appendChild(name);

            if (project.time) {
                const time = document.createElement("span");
                time.className = "project__time";
                time.textContent = project.time;
                head.appendChild(time);
            }

            item.appendChild(head);

            if (project.summary) {
                const summary = document.createElement("p");
                summary.className = "project__summary";
                summary.textContent = project.summary;
                item.appendChild(summary);
            }

            if (Array.isArray(project.bullets) && project.bullets.length) {
                const list = document.createElement("ul");
                list.className = "project__bullets";
                project.bullets.forEach((text) => {
                    const li = document.createElement("li");
                    li.textContent = text;
                    list.appendChild(li);
                });
                item.appendChild(list);
            }

            container.appendChild(item);
        });
    });
}

function renderEducation(dict) {
    const container = document.querySelector("[data-i18n-education]");
    if (!container) return;
    const items = getNested(dict, "education.items");
    if (!Array.isArray(items)) return;
    container.innerHTML = "";
    items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "education__item";

        const degree = document.createElement("span");
        degree.className = "education__degree";
        degree.textContent = item.degree || "";
        row.appendChild(degree);

        if (item.place) {
            const place = document.createElement("span");
            place.className = "education__place";
            place.textContent = item.place;
            row.appendChild(place);
        }

        if (item.time) {
            const time = document.createElement("span");
            time.className = "education__time";
            time.textContent = item.time;
            row.appendChild(time);
        }

        if (item.note) {
            const note = document.createElement("span");
            note.className = "education__note";
            note.textContent = item.note;
            row.appendChild(note);
        }

        container.appendChild(row);
    });
}

function renderLanguages(dict) {
    const container = document.querySelector("[data-i18n-languages]");
    if (!container) return;
    const items = getNested(dict, "languages.items");
    if (!Array.isArray(items)) return;
    container.innerHTML = "";
    items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "languages__item";

        const name = document.createElement("span");
        name.className = "languages__name";
        name.textContent = item.name || "";
        row.appendChild(name);

        const level = document.createElement("span");
        level.className = "languages__level";
        level.textContent = item.level || "";
        row.appendChild(level);

        container.appendChild(row);
    });
}

function updateToggleState(lang) {
    document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
        const btnLang = btn.getAttribute("data-lang");
        btn.setAttribute("aria-pressed", String(btnLang === lang));
    });
}

function updateDocumentMeta(dict, lang) {
    document.documentElement.setAttribute("lang", lang);
    const title = getNested(dict, "meta.title");
    if (title) document.title = title;
    const description = getNested(dict, "meta.description");
    if (description) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement("meta");
            meta.setAttribute("name", "description");
            document.head.appendChild(meta);
        }
        meta.setAttribute("content", description);
    }
}

async function setLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = DEFAULT_LANG;
    try {
        const dict = await loadLang(lang);
        applyText(document, dict);
        applyLists(document, dict);
        renderSkills(dict);
        renderProjects(dict);
        renderEducation(dict);
        renderLanguages(dict);
        updateDocumentMeta(dict, lang);
        updateToggleState(lang);
        localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
        console.error("i18n load failed", err);
    }
}

function bindToggle() {
    document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const lang = btn.getAttribute("data-lang");
            if (lang) setLang(lang);
        });
    });
}

function initialLang() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED.includes(stored)) return stored;
    return DEFAULT_LANG;
}

document.addEventListener("DOMContentLoaded", () => {
    bindToggle();
    setLang(initialLang());
});
