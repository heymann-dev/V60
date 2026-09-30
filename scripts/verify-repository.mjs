import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("index.html");
const markup = html.slice(0, html.indexOf("<script>"));
const serviceWorker = read("service-worker.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const checks = [];

function check(name, pass) {
  checks.push({ name, pass: Boolean(pass) });
}

function count(pattern, text = html) {
  return [...text.matchAll(pattern)].length;
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const required = [
  ".gitignore",
  ".nojekyll",
  "README.md",
  "icon-192.png",
  "icon-512.png",
  "icon.svg",
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
];
required.forEach((file) => check(`Required file: ${file}`, fs.existsSync(path.join(root, file))));

const pageIds = [...markup.matchAll(/<section class="page(?: active)?" id="([^"]+)"/g)].map((match) => match[1]);
const navPages = [...markup.matchAll(/<button[^>]*data-page="([^"]+)"/g)].map((match) => match[1]);
const expectedPages = ["home", "today", "reset", "health", "photos", "mountains", "goals", "reviews", "data"];
check("Eight original app areas plus Reset remain intact", JSON.stringify(pageIds) === JSON.stringify(expectedPages));
check("Reset is a visible primary navigation target", JSON.stringify(navPages) === JSON.stringify(expectedPages));

const dailyChecks = [...markup.matchAll(/data-check="([^"]+)"/g)].map((match) => match[1]);
check("Exactly six permanent daily checks", dailyChecks.length === 6 && new Set(dailyChecks).size === 6);
check("Exactly one Hevy follow-through control", dailyChecks.filter((item) => item === "hevy").length === 1);
check("Exactly one LooksMax control", dailyChecks.filter((item) => item === "looks").length === 1);
check("Exactly five Body Status sliders", count(/data-pain="[^"]+"/g, markup) === 5);
check("Body Status values have live accessible labels", count(/data-pain-output="[^"]+" aria-label="[^"]+ pain level 0"/g, markup) === 5 && /output\.setAttribute\("aria-label"/.test(html));
check("Orthopedic history is archived without an active interface", !/Orthopedic command board|Medical and imaging history|id="healthRegions"|id="healthTimeline"/.test(markup) && /state\.health\.regions = Array\.isArray/.test(html) && /state\.health\.timeline = Array\.isArray/.test(html));
check("Exactly two optional daily text fields", count(/id="todayFocus"/g) === 1 && count(/id="quickNote"/g) === 1);
check("Exactly one Complete Day control", count(/id="completeDay"/g) === 1);
check("Exactly three current photo slots", count(/data-photo-slot="[^"]+"/g, markup) === 3);
check("Photo slots expose only Physique, Recovery, and Vision", count(/<select data-photo-category><option>Physique<\/option><option(?: selected)?>Recovery<\/option><option(?: selected)?>Vision<\/option><\/select>/g, markup) === 3);
check("One editable standing mission statement", count(/id="missionStatement"/g, markup) === 1 && /DEFAULT_MISSION_STATEMENT/.test(html));
check("Northstar Web has six connected axes", /const LIFE_WEB_AXES/.test(html) && count(/\{ key: "(?:training|rehab|career|mental|spiritual|logging)"/g, html) === 6 && /function lifeWebSnapshot/.test(html));
check("Northstar Web has editable calibration infrastructure", /id="lifeWebCalibration"/.test(markup) && /data-web-label/.test(html) && /data-web-weight/.test(html) && /function saveLifeWebSettings/.test(html));
check("Northstar Web compares calendar months and ranks attention", /function lifeWebComparison/.test(html) && /monthlyIntelligence/.test(html) && /attentionOrder/.test(html));
check("Literal wall contains exactly 52 strict bricks at runtime", /Array\.from\(\{ length: 52 \}/.test(html) && /function wallQualifies/.test(html) && /all six checks \+ Zero Tolerance kept/.test(html));
check("Fortress Wall is above the editable mission on Home", markup.indexOf('id="fortressWallCard"') > 0 && markup.indexOf('id="fortressWallCard"') < markup.indexOf('id="missionStatement"'));
check("Fortress HUD unifies rank, XP, streak, badges, and supply drops", count(/class="hud-stat (?:rank|xp|streak|badges|drops)"/g, markup) === 5);
check("Fortress exposes eight brick-gated reward checkpoints", /const WALL_CHECKPOINTS/.test(html) && count(/\{ target: (?:7|14|21|28|35|42|49|52), name:/g, html) === 8 && /id="wallCheckpoints"/.test(markup));
check("Bricks have four thirteen-day color sectors", /brickNumber <= 13 \? "foundation"/.test(html) && /brickNumber <= 26 \? "rampart"/.test(html) && /brickNumber <= 39 \? "citadel"/.test(html) && /: "summit"/.test(html));
check("Wall bricks are interactive without awarding manual evidence", /data-wall-brick/.test(html) && /Brick .* is locked/.test(html) && !/data-wall-brick[^\n]+campaign\.xp\s*\+=/.test(html));
check("Reset Protocol is one authoritative page", count(/id="reset"/g, markup) === 1 && !/id="resetDialog"/.test(html));
check("Reset Protocol is complete", /8 rounds/.test(html) && /25 push-ups/.test(html) && /secondsPerPhase: 5/.test(html));
check("Reset completion ledger is visible below the protocol", count(/id="reset(?:TotalCount|MonthCount|WeekCount|LastDate)"/g, markup) === 4 && /function renderResetLedger/.test(html));
check("Install and controlled-update controls are present", /id="installApp"/.test(html) && /id="reloadUpdate"/.test(html));
check("Empty URL hash cannot create an invalid selector", /const initial = location\.hash\.slice\(1\);/.test(html) && /initial && document\.getElementById\(initial\)/.test(html));

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
check("DOM IDs are unique", ids.length === new Set(ids).size);

const achievementBlock = html.match(/const ACHIEVEMENT_XP_BONUSES = Object\.freeze\(\{([\s\S]*?)\}\);/)?.[1] || "";
check("Twenty-four evidence-backed achievement awards", count(/"[^"]+"\s*:\s*\d+/g, achievementBlock) === 24);
check("Level 50 remains calibrated near 3,000 XP", /0\.84 \* level \* level/.test(html) && /3,000 XP summit/.test(html));
check("October 1 is the FINAL 92 Day 1 boundary", /const CAMPAIGN_START = "2026-10-01";/.test(html) && /const CAMPAIGN_END = "2026-12-31";/.test(html));
check("V60 FINAL 92 backup format is active", /project-northstar-final92-private-backup-v60/.test(html) && /const VERSION = 60;/.test(html));
check("V59 restore compatibility remains", /project-52-private-backup-v59/.test(html) && /return "v59"/.test(html));
check("V58 restore compatibility remains", /project-52-private-backup-v58/.test(html) && /return "v58"/.test(html));
check("V57 restore compatibility remains", /project-52-private-backup-v57/.test(html) && /return "v57"/.test(html));
check("V56 restore compatibility remains", /project-52-private-backup-v56/.test(html) && /return "v56"/.test(html));
check("V55 restore compatibility remains", /project-52-private-backup-v55/.test(html) && /return "v55"/.test(html));
check("V54 restore compatibility remains", /project-52-private-backup-v54/.test(html) && /return "v54"/.test(html));
check("V53 restore compatibility remains", /project-52-private-backup-v53/.test(html) && /return "v53"/.test(html));
check("V52 restore compatibility remains", /project-52-private-backup-v52/.test(html) && /return "v52"/.test(html));
check("FINAL 92 reward vault includes the approved priority discs and summit reward", /MVP Neutron Detour/.test(html) && /Mint Discs Lobster/.test(html) && /FINAL 92 Summit Reward/.test(html));
check("Every FINAL 92 supply drop includes a real loadout and purchase check", /REWARD_CATALOG/.test(html) && count(/discountCheck:/g, html) === 8 && count(/upgrade:/g, html) === 8);
check("Gamification uses a deterministic unified ledger", /function rebuildGameLedger/.test(html) && /function gameLedgerIntegrity/.test(html) && /gameAuditVersion: 4/.test(html));
check("Historical V46 through V59 and V60 completed-day snapshots retain sealed XP", /project-52-completed-day-v\(\?:4\[6-9\]\|5\[0-9\]\)/.test(html) && /project-northstar-final92-day-v60/.test(html));
check("Public action seed remains empty", /const TODO_SEED = \[\];/.test(html));
check("Public financial-command structure is present without personal balances", /id: "goal-finance"/.test(html) && /source: "financial-independence"/.test(html) && /old restored balances stay historical until refreshed/.test(html));
check("Ironwall Blacksite visual system remains active", /V59 IRONWALL BLACKSITE COMMAND/.test(html) && /--bg: #010202/.test(html) && /--red: #9b4039/.test(html));
check("Functional Ironwall fortress color system is active", /V59 IRONWALL FORTRESS COMMAND/.test(html) && /--amber-live: #d6a344/.test(html) && /--cyan-live: #4aa8cb/.test(html) && /--violet-live: #9a6bc8/.test(html) && /--emerald-live: #56bd82/.test(html));

check("FINAL 92 has exactly three monthly phases", /STRENGTHEN/.test(html) && /INTENSIFY/.test(html) && /PROVE IT/.test(html) && count(/month: "2026-(?:10|11|12)"/g, html) === 3);
check("Daily support metrics are stored separately from the six brick checks", /data-support="protein"/.test(markup) && /data-support="sleepHours"/.test(markup) && /data-support="outside"/.test(markup) && /data-support="bodyweight"/.test(markup) && /data-support="glucoseReadiness"/.test(markup) && /data-support="recoveryQuality"/.test(markup) && /data-support="swelling"/.test(markup) && /function aggregateSupport/.test(html));
check("Weekly and monthly reviews derive support metrics from daily records", /weeklySupportReview/.test(html) && /monthlySupportReview/.test(html) && /aggregateSupport\(weeklyStart, end, campaign\)/.test(html) && /aggregateSupport\(selectedMonthWindow.start, selectedMonthWindow.end, campaign\)/.test(html));
check("Reviews surface swelling, Rehab/PT, and Hevy/training", html.includes("[\"Swelling\"") && html.includes("[\"Rehab / PT\"") && html.includes("[\"Hevy / training\""));
check("Iron Ledger contains six benchmark missions and Hevy remains the workout-detail source", /const IRON_LEDGER_BLUEPRINT/.test(html) && count(/id: "(?:INC30|OHP185|CHIN130|P500|CURL135|SQ200)"/g, html) === 6 && /Hevy remains the workout-detail source of truth/.test(html));
check("Restore migration protects the FINAL 92 epoch", /pre-final-92-2026/.test(html) && /resetActiveProgressIfNeeded/.test(html) && /merged\.start = CAMPAIGN_START/.test(html) && /merged\.end = CAMPAIGN_END/.test(html));
check("Old active rewards cannot replace the eight current reward gates", /if \(incomingEpoch !== PROGRESS_EPOCH\)/.test(html) && /merged\.rewards = defaultRewards\(\)/.test(html));
check("Recovery Command and follow-up surfaces exist without publishing private recovery data", /id="recoveryCommandCard"/.test(markup) && /id="recoveryFollowups"/.test(markup) && /id="recoveryMilestones"/.test(markup));
check("Canonical legacy proof survives old-backup migration", /FINAL92_LEGACY_PROOF/.test(html) && /historicalWallBest: 26/.test(html) && /noSlither90Complete: true/.test(html) && /historicalBestAttentionStreak: 90/.test(html) && /Math\.max\(Number\(merged\.historicalWallBest\).*FINAL92_LEGACY_PROOF\.historicalWallBest/.test(html));
check("Home restores the locked Today Command structure", /id="todayCommandCard"/.test(markup) && /id="criticalMission"/.test(markup) && /id="bodyMission"/.test(markup) && /id="lifeMission"/.test(markup) && /id="powerMove"/.test(markup));
check("Today Command stays guidance rather than a hidden brick gate", /Mission cards guide the day; they do not create extra brick requirements/.test(markup) && /function renderTodayCommand/.test(html));
check("Today Command exposes calendar day type and capacity context", /id="commandDayType"/.test(markup) && /id="commandCapacity"/.test(markup) && /function commandCapacity/.test(html) && /function dayTypeFromCalendar/.test(html));

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
try {
  inlineScripts.forEach((script) => new vm.Script(script));
  check("Inline application JavaScript parses", inlineScripts.length === 1);
} catch {
  check("Inline application JavaScript parses", false);
}
try {
  new vm.Script(serviceWorker);
  check("Service worker JavaScript parses", true);
} catch {
  check("Service worker JavaScript parses", false);
}

check("Manifest stays repository-relative", manifest.id === "./" && manifest.scope === "./" && manifest.start_url === "./index.html#home");
check("Manifest contains install icons", Array.isArray(manifest.icons) && manifest.icons.length === 2);
check("Manifest carries the FINAL 92 identity", manifest.name === "Project Northstar: FINAL 92 — The Lock-In" && manifest.short_name === "FINAL 92");
check("Service-worker cache is repository-scoped", /CACHE_SCOPE_ID/.test(serviceWorker) && /CACHE_PREFIX/.test(serviceWorker));
check("Service-worker update requires an explicit app signal", /SKIP_WAITING/.test(serviceWorker) && !/\.then\(\(\) => self\.skipWaiting\(\)\)/.test(serviceWorker));

const files = walk(root);
const relativeFiles = files.map((file) => path.relative(root, file));
check("No personal photo file types are committed", relativeFiles.every((file) => !/\.(?:jpe?g|heic|heif|mov)$/i.test(file)));
check("No private backup filename is committed", relativeFiles.every((file) => !/(?:private|restore|backup.*\.json)/i.test(file)));
const textFiles = files.filter((file) => /\.(?:html|js|mjs|json|md|txt|yml|yaml|svg|gitignore)$/i.test(file) || path.basename(file) === ".gitignore");
const publicText = textFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
check("No embedded personal image payload exists", !/data:image\/(?:jpeg|png|webp|heic|heif);base64,/i.test(publicText));
check("No embedded private seed assignment exists", !/__PROJECT52_PRIVATE_SEED__\s*=/.test(publicText));
const privateFinancialMarkers = [
  "100" + "704",
  "100," + "704",
  "16," + "151",
  "115" + "K",
  "60" + "K",
  "American" + " Funds",
  "Robin" + "hood",
  "SoFi" + " savings",
  "Wells" + " Fargo",
  "paid-off" + " Crown",
];
check("No known private financial values are committed", privateFinancialMarkers.every((marker) => !publicText.toLowerCase().includes(marker.toLowerCase())));

const failed = checks.filter((item) => !item.pass);
checks.forEach((item) => console.log(`${item.pass ? "PASS" : "FAIL"}  ${item.name}`));
console.log(`\n${checks.length - failed.length}/${checks.length} repository checks passed.`);
if (failed.length) process.exitCode = 1;
