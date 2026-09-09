import { getDriveAccessToken, setDriveAccessToken, signInWithGoogle } from '../firebase';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  iconLink?: string;
}

export interface DriveUploadResult {
  success: boolean;
  file?: GoogleDriveFile;
  error?: string;
}

const ERP_FOLDER_NAME = 'Meayon ERP - أرشيف سحابي';

/**
 * Check if the user has an active access token with Drive permissions
 */
export const isDriveAuthenticated = (): boolean => {
  return Boolean(getDriveAccessToken());
};

/**
 * Connect to Google Drive by initiating Google OAuth Sign-in
 */
export const connectGoogleDrive = async (): Promise<boolean> => {
  try {
    const res = await signInWithGoogle();
    return Boolean(res.accessToken || getDriveAccessToken());
  } catch (error) {
    console.error('Failed to authenticate with Google Drive:', error);
    throw error;
  }
};

/**
 * Find or create the dedicated ERP Archive folder in Google Drive
 */
export const getOrCreateErpFolder = async (): Promise<string | null> => {
  const token = getDriveAccessToken();
  if (!token) return null;

  try {
    // 1. Search for existing folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${encodeURIComponent(
      ERP_FOLDER_NAME
    )}' and trashed=false&fields=files(id,name)`;
    
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Folder doesn't exist, create it
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: ERP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'مجلد النسخ الاحتياطية والتقارير المالية لمنظومة ميون ERP',
      }),
    });

    if (createRes.ok) {
      const folder = await createRes.json();
      return folder.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting or creating ERP folder in Drive:', error);
    return null;
  }
};

/**
 * List files stored in the ERP archive folder
 */
export const listDriveErpFiles = async (): Promise<GoogleDriveFile[]> => {
  const token = getDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateErpFolder();
    let query = "trashed=false";
    if (folderId) {
      query += ` and '${folderId}' in parents`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,iconLink)&pageSize=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        setDriveAccessToken(null);
      }
      throw new Error(`Drive API responded with ${res.status}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    return [];
  }
};

/**
 * Upload a file (Blob or string) to Google Drive in the ERP folder
 */
export const uploadFileToDrive = async (
  content: Blob | string,
  fileName: string,
  mimeType: string,
  description?: string
): Promise<DriveUploadResult> => {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, error: 'Google Drive is not authenticated. Please connect your account.' };
  }

  try {
    const folderId = await getOrCreateErpFolder();
    
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType,
      description: description || 'ملف محفوظ من منظومة ميون لإدارة النقليات والكسارات ERP',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}`;

    let fileData: Uint8Array;
    if (typeof content === 'string') {
      fileData = new TextEncoder().encode(content);
    } else {
      const buffer = await content.arrayBuffer();
      fileData = new Uint8Array(buffer);
    }

    const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;
    const encoder = new TextEncoder();
    const mediaHeaderBytes = encoder.encode(mediaHeader);
    const metadataBytes = encoder.encode(metadataPart);
    const closeDelimiterBytes = encoder.encode(closeDelimiter);

    const totalLength =
      metadataBytes.length + mediaHeaderBytes.length + fileData.length + closeDelimiterBytes.length;
    const combined = new Uint8Array(totalLength);

    let offset = 0;
    combined.set(metadataBytes, offset);
    offset += metadataBytes.length;
    combined.set(mediaHeaderBytes, offset);
    offset += mediaHeaderBytes.length;
    combined.set(fileData, offset);
    offset += fileData.length;
    combined.set(closeDelimiterBytes, offset);

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: combined,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return { success: false, error: `Upload failed (${uploadRes.status}): ${errText}` };
    }

    const uploadedFile: GoogleDriveFile = await uploadRes.json();
    return { success: true, file: uploadedFile };
  } catch (error: any) {
    console.error('Failed to upload file to Google Drive:', error);
    return { success: false, error: error.message || 'Unknown upload error' };
  }
};

/**
 * Delete a file from Google Drive with explicit confirmation
 */
export const deleteDriveFile = async (fileId: string, fileName: string): Promise<boolean> => {
  const token = getDriveAccessToken();
  if (!token) return false;

  // Enforce mandatory explicit user confirmation dialog per Workspace Integration Skill
  const confirmed = window.confirm(
    `هل أنت متأكد من حذف الملف "${fileName}" من Google Drive نهائياً؟\n\nAre you sure you want to permanently delete "${fileName}" from Google Drive? This action cannot be undone.`
  );
  if (!confirmed) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.ok || res.status === 204;
  } catch (error) {
    console.error('Failed to delete file from Google Drive:', error);
    alert('تعذر حذف الملف من Google Drive. يرجى المحاولة لاحقاً.');
    return false;
  }
};
