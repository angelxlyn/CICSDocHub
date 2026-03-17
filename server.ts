import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import multer from "multer";
import cookieParser from "cookie-parser";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(cookieParser());

// Google OAuth2 Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

function getRedirectUri(req: express.Request) {
  // Prefer GOOGLE_REDIRECT_URI if set
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  
  // Otherwise, construct it from the request
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["host"];
  return `${protocol}://${host}/api/auth/google/callback`;
}

// Token storage with file persistence
const TOKEN_PATH = path.join(__dirname, "uploads", "google_tokens.json");

function saveTokens(tokens: any) {
  try {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log("Tokens saved to", TOKEN_PATH);
  } catch (err) {
    console.error("Error saving tokens:", err);
  }
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, "utf8");
      const tokens = JSON.parse(data);
      console.log("Tokens loaded from", TOKEN_PATH);
      return tokens;
    }
  } catch (err) {
    console.error("Error loading tokens:", err);
  }
  return null;
}

let storedTokens: any = loadTokens();

// API Routes
app.get("/api/auth/google/url", (req, res) => {
  const redirectUri = getRedirectUri(req);
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
    redirect_uri: redirectUri
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const redirectUri = getRedirectUri(req);
  try {
    const { tokens } = await oauth2Client.getToken({
      code: code as string,
      redirect_uri: redirectUri
    });
    storedTokens = tokens;
    saveTokens(tokens);
    oauth2Client.setCredentials(tokens);
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/admin';
            }
          </script>
          <p>Google Drive connected! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/google/status", (req, res) => {
  res.json({ connected: !!storedTokens });
});

app.post("/api/upload/drive", upload.single("file"), async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: "Google Drive not connected" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const fileMetadata: any = {
      name: file.originalname,
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: file.mimetype,
      body: fs.createReadStream(file.path),
    };

    let response;
    try {
      response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, webViewLink, webContentLink",
      });
    } catch (uploadError: any) {
      console.error("Primary upload failed:", uploadError.message);
      
      // If primary upload failed due to folder permissions, try root folder
      if (folderId && (uploadError.code === 403 || uploadError.code === 404)) {
        console.log("Retrying upload to root folder...");
        delete fileMetadata.parents;
        response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id, webViewLink, webContentLink",
        });
      } else {
        throw uploadError;
      }
    }

    // Cleanup local file
    fs.unlinkSync(file.path);

    // Make file readable by anyone with the link (optional, based on user preference)
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    res.json({
      id: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
    });
  } catch (error: any) {
    console.error("Drive upload error:", error);
    
    let errorMessage = error.message || "Failed to upload to Google Drive";
    if (error.code === 403) {
      errorMessage = "Insufficient permissions for the specified Google Drive folder. Please check folder access or leave GOOGLE_DRIVE_FOLDER_ID empty.";
    }
    
    res.status(500).json({ error: errorMessage });
  }
});

app.delete("/api/upload/drive/:fileId", async (req, res) => {
  if (!storedTokens) {
    return res.status(401).json({ error: "Google Drive not connected" });
  }

  const { fileId } = req.params;
  if (!fileId) {
    return res.status(400).json({ error: "No file ID provided" });
  }

  try {
    oauth2Client.setCredentials(storedTokens);
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    await drive.files.delete({
      fileId: fileId,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Drive delete error:", error);
    // If file not found, we still consider it a success for our purposes
    if (error.code === 404) {
      return res.json({ success: true, message: "File already deleted or not found" });
    }
    res.status(500).json({ error: error.message || "Failed to delete from Google Drive" });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
