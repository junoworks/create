#!/usr/bin/env node

import { exec, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { promisify } from "node:util";

const SUPABASE_URL = "https://kgfipbdrigsksyfqdhrm.supabase.co";
const STORAGE_BUCKET = "exports";
const TEMPLATE_URL =
  "https://github.com/junoworks/juno-template/archive/refs/heads/main.zip";

const execAsync = promisify(exec);
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: npx create-juno <export-id> [directory-name]");
  console.error("\nExample: npx create-juno quickly-light-mouse");
  process.exit(1);
}

const id = args[0];
const targetDir = args[1] || id;

console.log("--> Export Id:", id);
console.log("--> Target directory:", targetDir);

const exportUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${id}`;
const templateZipPath = path.resolve(process.cwd(), `template-${id}.zip`);
const exportZipPath = path.resolve(process.cwd(), `${id}.zip`);
const targetPath = path.resolve(process.cwd(), targetDir);

try {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let isUpdate = false;

  if (fs.existsSync(targetPath)) {
    console.log(`\n--> Directory already exists: ${targetPath}`);
    const updateAnswer = await new Promise((resolve) => {
      rl.question(
        "Would you like to update the existing project? (Y/n): ",
        (ans) => {
          resolve(ans.toLowerCase().trim());
        },
      );
    });

    if (updateAnswer === "n" || updateAnswer === "no") {
      rl.close();
      console.error(
        "\nPlease use a different directory name or remove the existing directory.",
      );
      process.exit(1);
    }

    isUpdate = true;
    console.log("--> Updating existing project...");
  }

  console.log("--> Target path:", targetPath);

  // For updates, skip template download and just fetch the export
  if (isUpdate) {
    const exportResponse = await fetch(exportUrl);

    if (!exportResponse.ok) {
      rl.close();
      console.error("\nERR Failed to fetch export");
      console.log(exportResponse.status, exportUrl);
      process.exit(1);
    }

    console.log(exportResponse.status, exportUrl);

    const exportBuffer = Buffer.from(await exportResponse.arrayBuffer());
    fs.writeFileSync(exportZipPath, exportBuffer);

    const { stdout: exportUnzipOut, stderr: exportUnzipErr } = await execAsync(
      `unzip -o -q "${exportZipPath}" -d "${targetPath}"`,
    );
    if (exportUnzipOut) console.log("-->", exportUnzipOut);
    if (exportUnzipErr) console.error("ERR", exportUnzipErr);
    console.log(" OK Project updated with latest export");

    fs.unlinkSync(exportZipPath);
    rl.close();

    console.log("\nUpdate complete! Your project files have been refreshed.");
    console.log(`\ncd ${targetDir}`);
    console.log("npm run dev");
    process.exit(0);
  }

  // Fresh setup continues below
  fs.mkdirSync(targetPath, { recursive: true });

  const templateResponse = await fetch(TEMPLATE_URL);

  if (!templateResponse.ok) {
    rl.close();
    console.error("\nERR Failed to fetch template");
    console.log(templateResponse.status, TEMPLATE_URL);
    process.exit(1);
  }

  console.log(templateResponse.status, TEMPLATE_URL);

  const templateBuffer = Buffer.from(await templateResponse.arrayBuffer());
  fs.writeFileSync(templateZipPath, templateBuffer);

  const { stdout: templateUnzipOut, stderr: templateUnzipErr } =
    await execAsync(`unzip -q "${templateZipPath}" -d "${targetPath}"`);
  if (templateUnzipOut) console.log("-->", templateUnzipOut);
  if (templateUnzipErr) console.error("ERR", templateUnzipErr);
  const extractedDir = path.join(targetPath, "juno-template-main");

  if (fs.existsSync(extractedDir)) {
    const files = fs.readdirSync(extractedDir);
    for (const file of files) {
      const sourcePath = path.join(extractedDir, file);
      const destPath = path.join(targetPath, file);
      fs.renameSync(sourcePath, destPath);
    }
    fs.rmdirSync(extractedDir);
  } else {
    const targetContents = fs.readdirSync(targetPath);
    console.error(
      "\nERR Extracted directory not found. Target path contents:",
      targetContents,
    );
    fs.unlinkSync(templateZipPath);
    rl.close();
    process.exit(1);
  }

  fs.unlinkSync(templateZipPath);

  const exportResponse = await fetch(exportUrl);

  if (!exportResponse.ok) {
    rl.close();
    console.error("\nERR Failed to fetch export");
    console.log(exportResponse.status, exportUrl);
    process.exit(1);
  }

  console.log(exportResponse.status, exportUrl);

  const exportBuffer = Buffer.from(await exportResponse.arrayBuffer());
  fs.writeFileSync(exportZipPath, exportBuffer);

  const { stdout: exportUnzipOut, stderr: exportUnzipErr } = await execAsync(
    `unzip -o -q "${exportZipPath}" -d "${targetPath}"`,
  );
  if (exportUnzipOut) console.log("-->", exportUnzipOut);
  if (exportUnzipErr) console.error("ERR", exportUnzipErr);
  console.log(" OK Exported");

  fs.unlinkSync(exportZipPath);

  const installAnswer = await new Promise((resolve) => {
    rl.question("\nInstall npm dependencies? (Y/n): ", (ans) => {
      resolve(ans.toLowerCase().trim());
    });
  });

  if (installAnswer === "n" || installAnswer === "no") {
    rl.close();
    console.log("Then it's all. To finish setup manually:");
    console.log(`\ncd ${targetDir}`);
    console.log("npm install");
    console.log("npm run dev");
    process.exit(0);
  }

  const { stdout: installStdout, stderr: installStderr } = await execAsync(
    "npm install --fund false --audit false",
    {
      cwd: targetPath,
    },
  );
  if (installStdout) console.log(installStdout);
  if (installStderr) console.err(installStderr);

  const devAnswer = await new Promise((resolve) => {
    rl.question("Start dev server? (Y/n): ", (ans) => {
      resolve(ans.toLowerCase().trim());
    });
  });

  if (devAnswer === "n" || devAnswer === "no") {
    rl.close();
    console.log("Then it's all. To start the dev server, run:");
    console.log(`\ncd ${targetDir}`);
    console.log("npm run dev");
    process.exit(0);
  }

  const devProcess = spawn("npm", ["run", "dev"], {
    cwd: targetPath,
    stdio: "inherit",
    shell: true,
  });
  console.log(" OK Dev server process spawned, PID:", devProcess.pid);

  devProcess.on("error", (err) => {
    console.error("ERR", err.message);
    console.error("ERR", err.stack);
    process.exit(1);
  });

  devProcess.on("exit", (code, signal) => {
    console.log(
      `\n[DEBUG] Dev server exited with code: ${code}, signal: ${signal}`,
    );
  });
} catch (err) {
  console.error("\n[ERROR] Unexpected!");
  console.error("Error message:", err.message);
  console.error("Error stack:", err.stack);
  console.error("Error name:", err.name);

  console.log("\nCleaning up temporary files...");
  if (fs.existsSync(templateZipPath)) {
    console.log("Deleting:", templateZipPath);
    fs.unlinkSync(templateZipPath);
  }
  if (fs.existsSync(exportZipPath)) {
    console.log("Deleting:", exportZipPath);
    fs.unlinkSync(exportZipPath);
  }
  process.exit(1);
}
