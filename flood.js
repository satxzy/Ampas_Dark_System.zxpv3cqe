// flood.js - FLOOD GITHUB BY RYUICHI v0.0 (Custom README & Files)
// Upload folder + custom file (README.md, dll) ke banyak repo GitHub + clean tool
// Stabil di Termux, VPS, Pterodactyl

const https = require('https');
const fs = require('fs');
const path = require('path');

// =============== HELP ===============
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  const c = {
    r: '\x1b[0m', b: '\x1b[1m',
    cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', red: '\x1b[31m', gray: '\x1b[90m',
  };
  console.log(`
${c.cyan}${c.b}╔══════════════════════════════════════════╗
║  FLOOD GITHUB BY RYUICHI v0.0         ║
╚══════════════════════════════════════════╝${c.r}

${c.yellow}${c.b}📌  CARA PAKAI:${c.r}
  node flood.js --token <TOKEN> [MODE] [OPSI]

${c.yellow}${c.b}🔑  WAJIB:${c.r}
  ${c.green}--token${c.r} <string>   GitHub token (ghp_... atau github_pat_...)

${c.yellow}${c.b}📦  MODE UPLOAD:${c.r}
  node flood.js --token <TOKEN> --name <NAMA> --count <JUMLAH> [OPSI]
  
  ${c.green}--name${c.r}      Nama dasar repo (default: repo)
  ${c.green}--count${c.r}     Jumlah repo (default: 1)
  ${c.green}--folder${c.r}    Folder sumber (default: folder saat ini)
  ${c.green}--private${c.r}   Repo private
  ${c.green}--safe${c.r}      Upload file satu per satu (hindari 409)
  ${c.green}--filedelay${c.r} <ms>  Jeda antar file saat safe (default: 200ms)

${c.yellow}${c.b}📝  CUSTOM FILE (README.md, dll):${c.r}
  ${c.green}--readme${c.r} <teks>      Isi file README.md langsung (contoh: "Halo Dunia")
                        Bisa juga dari file: --readme @/path/readme.txt
  ${c.green}--addfile${c.r} <path:isi> Tambahkan file custom ke repo
                        Contoh: --addfile "docs/info.txt:Ini isi file"
                        Bisa dari file: --addfile "config.json:@./data.json"
                        Gunakan berkali-kali untuk banyak file.

${c.yellow}${c.b}⚡  KECEPATAN:${c.r}
  ${c.green}--concurrency${c.r} <n>  Paralel repo (default: 3, aman)
  ${c.green}--delay${c.r} <ms>       Jeda antar repo (default: 1500ms)
  ${c.green}--brutal${c.r}           Mode cepat (concurrency 8, delay 0)

${c.yellow}${c.b}🧹  MODE BERSIH-BERSIH (--clean):${c.r}
  node flood.js --token <TOKEN> --clean [--target <NAMAFILE>] [--force]
  
  ${c.green}--clean${c.r}      Hapus file tertentu dari SEMUA repo Anda
  ${c.green}--target${c.r} <file>  Nama file yang dihapus (default: flood.js)
  ${c.green}--force${c.r}      Lewati konfirmasi

${c.yellow}${c.b}📝  CONTOH:${c.r}
  # Upload 10 repo dengan custom README.md
  node flood.js --token ghp_xxx --name proyek --count 10 --readme "Dibuat oleh Flood Tool"

  # Upload dengan README dari file + file tambahan
  node flood.js --token ghp_xxx --name repo --count 5 --readme @./readme.txt --addfile "catatan.txt:Versi 1.0"

  # Bersihkan file flood.js dari semua repo (paksa)
  node flood.js --token ghp_xxx --clean --target flood.js --force

${c.yellow}${c.b}💡  TIPS:${c.r}
  - Token butuh izin 'repo' (private) atau 'public_repo'.
  - Di Termux, gunakan koneksi stabil (WiFi).
  - Untuk Pterodactyl/VPS, upload file script dan jalankan via terminal panel.
  - Jika error 409 (conflict), gunakan --safe dan --filedelay 500.
  - File flood.js TIDAK akan ikut terupload (otomatis diabaikan).
`);
  process.exit(0);
}

// =============== KONFIGURASI ===============
const config = {
  token: '',
  baseName: 'repo',
  count: 1,
  concurrency: 3,
  delay: 1500,
  folder: '.',
  private: false,
  safeMode: false,
  fileDelay: 200,
  ignoreList: [],
  brutal: false,
  cleanMode: false,
  targetFile: 'flood.js',
  forceClean: false,
  readmeContent: '',     // isi README.md (jika ada)
  extraFiles: [],        // array { path, content } dari --addfile
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  const v = args[i + 1];
  if (a === '--token' && v) { config.token = v; i++; }
  else if (a === '--name' && v) { config.baseName = v; i++; }
  else if (a === '--count' && v) { config.count = Math.max(1, parseInt(v) || 1); i++; }
  else if (a === '--concurrency' && v) { config.concurrency = parseInt(v) || 3; i++; }
  else if (a === '--delay' && v) { config.delay = parseInt(v) || 1500; i++; }
  else if (a === '--folder' && v) { config.folder = v; i++; }
  else if (a === '--private') { config.private = true; }
  else if (a === '--safe') { config.safeMode = true; }
  else if (a === '--filedelay' && v) { config.fileDelay = parseInt(v) || 200; i++; }
  else if (a === '--ignore' && v) { config.ignoreList.push(v); i++; }
  else if (a === '--brutal') { config.brutal = true; }
  else if (a === '--clean') { config.cleanMode = true; }
  else if (a === '--target' && v) { config.targetFile = v; i++; }
  else if (a === '--force') { config.forceClean = true; }
  else if (a === '--readme' && v) { 
    // Bisa dari file dengan awalan @
    if (v.startsWith('@')) {
      const filePath = v.slice(1);
      try { config.readmeContent = fs.readFileSync(filePath, 'utf8'); } 
      catch (e) { console.log(`Gagal baca file README: ${e.message}`); process.exit(1); }
    } else {
      config.readmeContent = v.replace(/\\n/g, '\n'); // ganti \n literal dengan newline
    }
    i++;
  }
  else if (a === '--addfile' && v) {
    const colonIdx = v.indexOf(':');
    if (colonIdx > 0) {
      const filePath = v.substring(0, colonIdx);
      let contentSrc = v.substring(colonIdx + 1);
      let content;
      if (contentSrc.startsWith('@')) {
        const extFile = contentSrc.slice(1);
        try { content = fs.readFileSync(extFile, 'utf8'); } 
        catch (e) { console.log(`Gagal baca file ${extFile}: ${e.message}`); process.exit(1); }
      } else {
        content = contentSrc.replace(/\\n/g, '\n');
      }
      config.extraFiles.push({ path: filePath, content });
    }
    i++;
  }
}

if (config.brutal) {
  config.concurrency = 8;
  config.delay = 0;
  config.safeMode = false;
  config.fileDelay = 0;
}

if (!config.token) {
  console.log('\x1b[31m❌  Token wajib diisi.\x1b[0m');
  console.log('Ketik "\x1b[36mnode flood.js --help\x1b[0m" untuk panduan.');
  process.exit(1);
}

// =============== WARNA ===============
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// =============== API GITHUB (retry + rate limit + socket hang up) ===============
async function gh(method, endpoint, body = null) {
  let attempt = 0;
  while (true) {
    try {
      const result = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.github.com',
          path: endpoint,
          method,
          headers: {
            'Authorization': `token ${config.token}`,
            'User-Agent': 'flood-ryuichi',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        };
        const req = https.request(opts, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try { resolve(JSON.parse(data)); } catch { resolve(data); }
            } else {
              const retryAfter = parseInt(res.headers['retry-after'] || '10', 10) * 1000;
              reject({ code: res.statusCode, msg: data, retryAfter });
            }
          });
        });
        req.on('error', e => reject({ code: 0, msg: e.message, retryAfter: 5000 }));
        req.on('timeout', () => {
          req.destroy();
          reject({ code: 0, msg: 'Timeout', retryAfter: 5000 });
        });
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
      return result;
    } catch (err) {
      attempt++;
      if ((err.code === 0 || err.code === 403 || err.code === 429 || err.code >= 500) && attempt <= 5) {
        const wait = err.retryAfter || (5000 * attempt);
        console.log(`${c.yellow}⏳  ${err.code === 0 ? 'Koneksi' : 'Rate limit'} - tunggu ${wait/1000}s (coba ke-${attempt})${c.reset}`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(err.msg || 'Gagal request');
    }
  }
}

// =============== BACA FILE ===============
function getAllFiles(dir, ignorePaths) {
  const ignore = new Set(ignorePaths.map(p => path.resolve(p)));
  const results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.resolve(dir, item.name);
    if (ignore.has(fp)) continue;
    if (item.isDirectory()) {
      if (item.name === '.git' || item.name === 'node_modules') continue;
      results.push(...getAllFiles(fp, ignorePaths));
    } else {
      results.push(fp);
    }
  }
  return results;
}

function randomSuffix() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789.-~';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return '.' + s;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function drawProgress(current, total, startTime) {
  const pct = Math.round((current / total) * 100);
  const barLen = 25;
  const filled = Math.round((current / total) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  process.stdout.write(`\r   ${c.cyan}[${bar}]${c.reset} ${c.green}${pct}%${c.reset} ${c.gray}(${current}/${total})${c.reset} ${c.yellow}⏱ ${elapsed}s${c.reset}`);
}

// =============== UPLOAD FILE ===============
async function uploadFiles(owner, repo, branch, files, baseDir) {
  if (config.safeMode) {
    for (const absPath of files) {
      const rel = path.relative(baseDir, absPath).replace(/\\/g, '/');
      const content = await fs.promises.readFile(absPath);
      const b64 = content.toString('base64');
      await gh('PUT', `/repos/${owner}/${repo}/contents/${rel}`, {
        message: `Add ${rel}`,
        content: b64,
        branch,
      });
      if (config.fileDelay > 0) await new Promise(r => setTimeout(r, config.fileDelay));
    }
  } else {
    const tasks = files.map(async absPath => {
      const rel = path.relative(baseDir, absPath).replace(/\\/g, '/');
      const content = await fs.promises.readFile(absPath);
      const b64 = content.toString('base64');
      return gh('PUT', `/repos/${owner}/${repo}/contents/${rel}`, {
        message: `Add ${rel}`,
        content: b64,
        branch,
      });
    });
    await Promise.all(tasks);
  }
}

// =============== BUAT REPO + CUSTOM README & FILES (FIX) ===============
async function createAndUpload(owner, files, baseDir) {
  let repoName = config.baseName + randomSuffix();
  let repo;
  try {
    repo = await gh('POST', '/user/repos', {
      name: repoName,
      private: config.private,
      auto_init: true,
    });
  } catch (e) {
    if (e.message.includes('422') || e.message.includes('already exists')) {
      repoName = config.baseName + randomSuffix();
      repo = await gh('POST', '/user/repos', {
        name: repoName,
        private: config.private,
        auto_init: true,
      });
    } else throw e;
  }

  const branch = repo.default_branch;

  // Upload file dari folder sumber
  if (files.length > 0) {
    await uploadFiles(owner, repo.name, branch, files, baseDir);
  }

  // --- Custom README.md ---
  if (config.readmeContent) {
    const contentB64 = Buffer.from(config.readmeContent, 'utf8').toString('base64');
    try {
      // Karena auto_init=true, README.md pasti ada -> ambil sha-nya
      const existing = await gh('GET', `/repos/${owner}/${repo.name}/contents/README.md?ref=${branch}`);
      // Update file yang sudah ada
      await gh('PUT', `/repos/${owner}/${repo.name}/contents/README.md`, {
        message: 'Update README.md',
        content: contentB64,
        sha: existing.sha,
        branch,
      });
    } catch (e) {
      // Jika ternyata tidak ada (404), buat baru
      if (e.message && e.message.includes('404')) {
        await gh('PUT', `/repos/${owner}/${repo.name}/contents/README.md`, {
          message: 'Add README.md',
          content: contentB64,
          branch,
        });
      } else {
        throw e;
      }
    }
  }

  // --- Custom extra files ---
  for (const extra of config.extraFiles) {
    const contentB64 = Buffer.from(extra.content, 'utf8').toString('base64');
    // Untuk file tambahan, anggap belum ada -> langsung buat
    await gh('PUT', `/repos/${owner}/${repo.name}/contents/${extra.path}`, {
      message: `Add ${extra.path}`,
      content: contentB64,
      branch,
    });
  }

  return repo.html_url;
}

// =============== CLEAN MODE ===============
async function getAllRepos(owner) {
  let page = 1;
  let allRepos = [];
  while (true) {
    try {
      const repos = await gh('GET', `/user/repos?per_page=100&page=${page}`);
      if (repos.length === 0) break;
      allRepos = allRepos.concat(repos);
      page++;
    } catch (e) {
      console.log(`${c.red}❌  Gagal ambil halaman ${page}: ${e.message}${c.reset}`);
      break;
    }
  }
  return allRepos;
}

async function cleanFileFromAllRepos(owner) {
  console.log(`${c.cyan}🧹  Mode bersih-bersih: menghapus ${c.yellow}${config.targetFile}${c.cyan} dari semua repo${c.reset}`);
  
  const repos = await getAllRepos(owner);
  console.log(`${c.green}✅  Ditemukan ${repos.length} repo${c.reset}`);
  
  if (!config.forceClean) {
    console.log(`${c.yellow}⚠️  Ini akan menghapus file '${config.targetFile}' dari SEMUA repo (${repos.length} repo).${c.reset}`);
    console.log(`   Ketik ${c.green}YA${c.reset} untuk melanjutkan:`);
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(resolve => readline.question('', resolve));
    readline.close();
    if (answer.trim().toUpperCase() !== 'YA') {
      console.log(`${c.red}❌  Dibatalkan.${c.reset}`);
      process.exit(0);
    }
  }

  let cleaned = 0, notFound = 0, failed = 0, skipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const repoFullName = repo.full_name;
    try {
      let fileInfo = await gh('GET', `/repos/${repoFullName}/contents/${config.targetFile}`);
      
      if (!fileInfo || fileInfo.type !== 'file' || !fileInfo.sha) {
        skipped++;
        console.log(`${c.yellow}⚠️  [${i+1}/${repos.length}] ${repoFullName} -> bukan file biasa, skip${c.reset}`);
        continue;
      }

      try {
        await gh('DELETE', `/repos/${repoFullName}/contents/${config.targetFile}`, {
          message: `Remove ${config.targetFile}`,
          sha: fileInfo.sha,
        });
        cleaned++;
        console.log(`${c.green}✅  [${i+1}/${repos.length}] ${repoFullName} -> dihapus${c.reset}`);
      } catch (deleteErr) {
        if (deleteErr.message && (deleteErr.message.includes('422') || deleteErr.message.includes('sha'))) {
          try {
            fileInfo = await gh('GET', `/repos/${repoFullName}/contents/${config.targetFile}`);
            if (fileInfo && fileInfo.type === 'file' && fileInfo.sha) {
              await gh('DELETE', `/repos/${repoFullName}/contents/${config.targetFile}`, {
                message: `Remove ${config.targetFile}`,
                sha: fileInfo.sha,
              });
              cleaned++;
              console.log(`${c.green}✅  [${i+1}/${repos.length}] ${repoFullName} -> dihapus (retry)${c.reset}`);
              continue;
            }
          } catch {}
        }
        failed++;
        console.log(`${c.red}❌  [${i+1}/${repos.length}] ${repoFullName} -> gagal hapus${c.reset}`);
      }
    } catch (e) {
      if (e.message && e.message.includes('404')) {
        notFound++;
        console.log(`${c.gray}⏭️  [${i+1}/${repos.length}] ${repoFullName} -> tidak ada${c.reset}`);
      } else {
        failed++;
        console.log(`${c.red}❌  [${i+1}/${repos.length}] ${repoFullName} -> error: ${e.message.slice(0,80)}${c.reset}`);
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${c.cyan}🎉  Selesai dalam ${totalTime}s${c.reset}`);
  console.log(`${c.green}✅  Berhasil hapus: ${cleaned} file${c.reset}`);
  console.log(`${c.gray}⏭️  Tidak ditemukan: ${notFound} repo${c.reset}`);
  if (skipped) console.log(`${c.yellow}⚠️  Dilewati (submodule/symlink): ${skipped} repo${c.reset}`);
  if (failed) console.log(`${c.red}❌  Gagal: ${failed} repo${c.reset}`);
}

// =============== MAIN ===============
(async () => {
  console.log(`${c.cyan}🚀 FLOOD GITHUB BY RYUICHI v0.0${c.reset}`);

  let owner;
  try {
    console.log(`${c.gray}🔐  Login ke GitHub...${c.reset}`);
    const user = await gh('GET', '/user');
    owner = user.login;
    console.log(`${c.green}✅  Akun: ${owner}${c.reset}`);
  } catch (e) {
    console.log(`${c.red}❌  Gagal login: ${e.message}${c.reset}`);
    console.log(`${c.yellow}Periksa token dan koneksi internet.${c.reset}`);
    process.exit(1);
  }

  if (config.cleanMode) {
    await cleanFileFromAllRepos(owner);
    return;
  }

  // === MODE UPLOAD ===
  const baseDir = path.resolve(config.folder);
  const scriptPath = __filename;
  const ignorePaths = [scriptPath];
  for (const f of config.ignoreList) ignorePaths.push(path.resolve(f));

  const allFiles = getAllFiles(baseDir, ignorePaths);
  const totalSize = allFiles.reduce((sum, p) => sum + fs.statSync(p).size, 0);

  console.log(`${c.gray}📁  Folder: ${baseDir}${c.reset} ${c.green}(${allFiles.length} file, ${formatSize(totalSize)})${c.reset}`);
  if (ignorePaths.length > 1) {
    const skipped = ignorePaths.map(p => path.basename(p)).filter(name => name !== path.basename(scriptPath));
    if (skipped.length) console.log(`${c.yellow}🧹  Skip: ${skipped.join(', ')}${c.reset}`);
  }
  if (config.readmeContent) console.log(`${c.cyan}📝  README.md: custom (${config.readmeContent.length} karakter)${c.reset}`);
  if (config.extraFiles.length) console.log(`${c.cyan}📎  Extra files: ${config.extraFiles.map(f=>f.path).join(', ')}${c.reset}`);

  const modeText = config.private ? `${c.red}🔒 Private${c.reset}` : `${c.green}🌍 Public${c.reset}`;
  const safeText = config.safeMode ? ` ${c.yellow}🛡️ Safe${c.reset}` : '';
  console.log(`🎯  Target: ${c.cyan}${config.count} repo${c.reset} (${modeText}${safeText})`);
  console.log(`⚡  Mode: ${c.green}${config.concurrency} concurrent${c.reset}, delay ${c.yellow}${config.delay}ms${c.reset}\n`);

  const startTotal = Date.now();
  let done = 0, success = 0, failed = 0;
  const repoUrls = [];
  const queue = Array.from({ length: config.count }, (_, i) => i + 1);

  const runWorker = async () => {
    while (queue.length) {
      queue.shift();
      try {
        const url = await createAndUpload(owner, allFiles, baseDir);
        done++; success++;
        drawProgress(done, config.count, startTotal);
        repoUrls.push(url);
      } catch (e) {
        done++; failed++;
        drawProgress(done, config.count, startTotal);
        console.log(`\n${c.red}❌  Gagal: ${e.message}${c.reset}`);
      }
      if (config.delay > 0 && done < config.count) await new Promise(r => setTimeout(r, config.delay));
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(config.concurrency, config.count); i++) workers.push(runWorker());
  await Promise.all(workers);

  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  const totalTime = ((Date.now() - startTotal) / 1000).toFixed(1);
  console.log(`\n${c.cyan}🎉  Selesai dalam ${totalTime} detik${c.reset}`);
  console.log(`${c.green}✅  Berhasil: ${success} repo${c.reset}`);
  if (failed) console.log(`${c.red}❌  Gagal: ${failed} repo${c.reset}`);
  if (repoUrls.length) {
    console.log(`${c.cyan}📋  Daftar repo:${c.reset}`);
    repoUrls.forEach((url, i) => console.log(`   ${c.green}${i + 1}.${c.reset} ${c.gray}${url}${c.reset}`));
  }
})();