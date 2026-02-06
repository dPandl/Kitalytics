// FIX: Define missing picker option types to resolve "Cannot find name" errors.
interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
    types?: FilePickerAcceptType[];
    multiple?: boolean;
}

interface SaveFilePickerOptions {
    types?: FilePickerAcceptType[];
    suggestedName?: string;
}

// Augment the global Window interface to include the File System Access API methods
declare global {
  interface Window {
    // FIX: Corrected typo from `OpenFileFilePickerOptions` to `OpenFilePickerOptions`.
    showOpenFilePicker: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  // FIX: Removed manually-defined 'FileSystemFileHandle' and 'FileSystemWritableFileStream' interfaces
  // which were conflicting with TypeScript's built-in DOM library types. This resolves the
  // "Subsequent property declarations must have the same type" errors.
  
  // FIX: Augment FileSystemHandle to include permission methods, which might be missing in some TypeScript DOM library versions.
  // This resolves `queryPermission` and `requestPermission` not existing on `FileSystemFileHandle`.
  interface FileSystemHandle {
    queryPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
    requestPermission(descriptor?: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
  }
}

export const verifyPermission = async (fileHandle: FileSystemFileHandle): Promise<boolean> => {
    const options = { mode: 'readwrite' as const };
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }
    return false;
};

export interface FileSystemAccess {
  isSupported: () => boolean;
  openFile: (options: OpenFilePickerOptions) => Promise<FileSystemFileHandle | null>;
  createFile: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle | null>;
  readFile: (fileHandle: FileSystemFileHandle) => Promise<string>;
  writeFile: (fileHandle: FileSystemFileHandle, contents: string) => Promise<void>;
}

const fileSystemAccess: FileSystemAccess = {
  isSupported: () => 'showOpenFilePicker' in window,
  
  openFile: async (options) => {
    if (!fileSystemAccess.isSupported()) return null;
    try {
      const [handle] = await window.showOpenFilePicker(options);
      return handle;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('File open picker was cancelled by the user.');
      } else {
        console.error('File open failed', err);
      }
      return null;
    }
  },

  createFile: async (options) => {
    if (!fileSystemAccess.isSupported()) return null;
    try {
      return await window.showSaveFilePicker(options);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('File save picker was cancelled by the user.');
      } else {
        console.error('File save failed', err);
      }
      return null;
    }
  },

  readFile: async (fileHandle) => {
    const file = await fileHandle.getFile();
    return await file.text();
  },

  writeFile: async (fileHandle, contents) => {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(contents);
      await writable.close();
    } catch (err) {
        console.error("Error writing to file:", err);
    }
  },
};

export default fileSystemAccess;

// Define common picker options
export const groupFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Gruppendatei',
        accept: { 'application/json': ['.klgruppe'] },
    }],
};

export const groupPeriodFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Gruppen-Zeitraumdatei',
        accept: { 'application/json': ['.klgrpperiod'] },
    }],
};

export const kindergartenFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Einrichtungsdatei',
        accept: { 'application/json': ['.kleinrichtung'] },
    }],
};

export const kindergartenPeriodFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Einrichtungs-Zeitraumdatei',
        accept: { 'application/json': ['.kleinrperiod'] },
    }],
};

export const workspaceFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Workspace-Datei',
        accept: { 'application/json': ['.klworkspace'] },
    }],
};

export const workspacePeriodFileOptions: SaveFilePickerOptions = {
    types: [{
        description: 'Kitalytics Workspace-Zeitraumdatei',
        accept: { 'application/json': ['.klwsperiod'] },
    }],
};


export const directorImportFileOptions: OpenFilePickerOptions = {
    types: [
        {
            description: 'Kitalytics Gruppen-Zeitraumdateien',
            accept: { 'application/json': ['.klgrpperiod'] },
        }
    ],
    multiple: true
}

export const adminImportFileOptions: OpenFilePickerOptions = {
     types: [
        {
            description: 'Kitalytics Einrichtungs-Zeitraumdateien',
            accept: { 'application/json': ['.kleinrperiod'] },
        }
    ],
    multiple: true,
}