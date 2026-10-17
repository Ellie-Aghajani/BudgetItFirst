import { app, BrowserWindow, Menu, Notification, ipcMain } from "electron";
import path from "path";
import Store from "electron-store";
import { startStaticServer } from "./server";

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

interface WindowBounds {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

const store = new Store() as Store & {
  get: (key: string, defaultValue?: unknown) => unknown;
  set: (key: string, value: unknown) => void;
};

function getSavedBounds(): WindowBounds {
  const saved = store.get("windowBounds") as WindowBounds | undefined;
  if (
    saved &&
    typeof saved.width === "number" &&
    typeof saved.height === "number"
  ) {
    return saved;
  }
  return { width: 1000, height: 700 };
}

const APP_NAME = "Budget It First";

app.setName(APP_NAME);

async function createWindow() {
  const savedBounds = getSavedBounds();

  mainWindow = new BrowserWindow({
    title: APP_NAME,
    ...savedBounds,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5174");
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = path.join(__dirname, "../dist");
    const serverUrl = await startStaticServer(distPath);
    mainWindow.loadURL(serverUrl);
  }

  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function saveBounds() {
  if (mainWindow) {
    store.set("windowBounds", mainWindow.getBounds());
  }
}
function createMenu() {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    // On macOS, apps conventionally have a first menu named after the
    // app itself (containing About/Quit/etc.) — this is expected by
    // macOS users and looks wrong if missing.
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              {
                label: `About ${APP_NAME}`,
                click: () => {
                  // no-op; this is just for the macOS app menu label
                },
              },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        isMac
          ? { role: "close" as const }
          : {
              label: `Quit ${APP_NAME}`,
              click: () => app.quit(),
            },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        { role: "selectAll" as const },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" as const },
        { role: "toggleDevTools" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
  createMenu();
  await createWindow();
});

ipcMain.on(
  "show-notification",
  (_event, { title, body }: { title: string; body: string }) => {
    new Notification({ title, body }).show();
  },
);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
