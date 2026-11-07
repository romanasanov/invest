#!/usr/bin/env node
/** Export the production-rendered public pages while preserving client hydration. */
import { cp, mkdir, writeFile, chmod, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for ${name}`);
  return args[index + 1];
}

const baseUrl = new URL(argument("--base-url", "http://127.0.0.1:8790/"));
if (!["http:", "https:"].includes(baseUrl.protocol)) throw new Error("The preview URL must use HTTP or HTTPS.");
const outputRoot = path.resolve(projectRoot, argument("--out", "../KYOMEI-HTML"));
if (outputRoot === projectRoot || outputRoot === path.dirname(projectRoot)) {
  throw new Error("Choose a dedicated export directory, not the source project or its parent.");
}
const adminUrl = "https://kyomei-partners-roman.kruasanov.chatgpt.site/admin";
const routes = ["/", "/concepts/bistro", "/concepts/ramen", "/concepts/sushi", "/concepts/matcha", "/model"];

async function exists(file) {
  try { await stat(file); return true; } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function fetchChecked(route) {
  const response = await fetch(new URL(route, baseUrl), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
  return response;
}

async function save(relative, text) {
  const destination = path.join(outputRoot, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, text, "utf8");
}

async function main() {
  const clientDirectory = path.join(projectRoot, "dist/client");
  if (!(await exists(clientDirectory))) {
    throw new Error("dist/client is missing. Build the production site and start its preview before exporting.");
  }

  // Fetch every public document before writing an export that could be mistaken for complete.
  const pages = await Promise.all(routes.map(async route => {
    const response = await fetchChecked(route);
    const html = await response.text();
    if (!/<html(?:\s|>)/i.test(html)) throw new Error(`${route}: the response is not an HTML document.`);
    return { route, html };
  }));
  const configResponse = await fetchChecked("/api/config");
  const config = await configResponse.json();

  await mkdir(outputRoot, { recursive: true });
  // The client bundle includes hydration scripts, styles, manifests and runtime assets.
  await cp(clientDirectory, outputRoot, { recursive: true, force: true });
  for (const directory of ["assets", "fonts", "docs"]) {
    const source = path.join(projectRoot, "public", directory);
    if (!(await exists(source))) throw new Error(`public/${directory} is missing.`);
    await cp(source, path.join(outputRoot, directory), { recursive: true, force: true });
  }
  const favicon = path.join(projectRoot, "public/favicon.svg");
  if (await exists(favicon)) await cp(favicon, path.join(outputRoot, "favicon.svg"));

  for (const { route, html } of pages) {
    const relative = route === "/" ? "index.html" : `${route.slice(1)}/index.html`;
    await save(relative, html);
    console.log(`Saved ${relative}`);
  }
  // Python's static server resolves /api/config to this JSON document via its directory redirect.
  // The client uses response.json(), so an HTML Content-Type does not change JSON parsing.
  await save("api/config/index.html", `${JSON.stringify(config, null, 2)}\n`);

  const adminRedirect = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0; url=${adminUrl}"><title>Управление Киомей</title></head>
<body><p>Управление доступно в серверной версии сайта.</p><p><a href="${adminUrl}">Открыть управление Киомей</a></p></body></html>\n`;
  await save("admin/index.html", adminRedirect);
  await save("admin.html", adminRedirect);

  await save("README.txt", `КИОМЕЙ — локальный HTML-предпросмотр

ЗАПУСК НА MAC
Дважды нажмите Start.command. В браузере откроется http://127.0.0.1:8088/.
Оставьте окно Терминала открытым на время просмотра. Для остановки нажмите Control+C.

ЗАПУСК ВРУЧНУЮ
Откройте терминал в этой папке и выполните:
python3 -m http.server 8088 --bind 127.0.0.1
Затем откройте http://127.0.0.1:8088/.
Не открывайте index.html через file://: модели и интерактивным элементам нужен локальный HTTP-сервер.

ЧТО ВКЛЮЧЕНО
Главная, четыре страницы форматов, модель, стили, шрифты, фотографии, PDF и снимок публичной конфигурации.
Исходная гидратация сохранена: это предварительный локальный просмотр production-сайта, а не отдельная серверная установка.
Изменения параметров модели в браузере не публикуют новую конфигурацию.

УПРАВЛЕНИЕ
Раздел /admin перенаправляет в полную серверную версию:
${adminUrl}
Серверные функции и постоянное хранение настроек доступны там. Исходный проект сохраняет полный backend.

Экспорт создан: ${new Date().toISOString()}
Источник HTML: ${baseUrl.origin}
`);

  await save("Start.command", `#!/bin/bash
set -eu
task_directory="$(cd "$(dirname "$0")" && pwd)"
cd "$task_directory"
if ! command -v python3 >/dev/null 2>&1; then
  echo "Для локального просмотра нужен Python 3. Инструкция находится в README.txt."
  read -r -p "Нажмите Enter, чтобы закрыть окно. "
  exit 1
fi
python3 -m http.server 8088 --bind 127.0.0.1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..40}; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "Сервер не запустился. Возможно, порт 8088 уже занят."
    read -r -p "Нажмите Enter, чтобы закрыть окно. "
    exit 1
  fi
  if curl --silent --fail http://127.0.0.1:8088/ >/dev/null; then
    open "http://127.0.0.1:8088/"
    break
  fi
  sleep 0.1
done
echo "Киомей: http://127.0.0.1:8088/ — для остановки нажмите Control+C."
wait "$server_pid"
`);
  await chmod(path.join(outputRoot, "Start.command"), 0o755);
  await save("export-manifest.json", `${JSON.stringify({ createdAt: new Date().toISOString(), source: baseUrl.origin, routes, publicConfig: "/api/config", adminUrl, hydrationPreserved: true }, null, 2)}\n`);
  console.log(`HTML preview exported to ${outputRoot}`);
}

main().catch(error => { console.error(`Export failed: ${error.message}`); process.exitCode = 1; });
