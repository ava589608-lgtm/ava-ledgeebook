import { UploadReceiptResult } from '../types';

export interface DriveFolderInfo {
  id: string;
  webViewLink: string;
}

export const findOrCreateReceiptsFolder = async (accessToken: string): Promise<DriveFolderInfo> => {
  // Check if "Cashbook Receipts" folder exists
  const query = encodeURIComponent("name = 'Cashbook Receipts' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Failed to query Google Drive: ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const folder = searchData.files[0];
    return {
      id: folder.id,
      webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
    };
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Cashbook Receipts',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Receipts and vouchers uploaded from Cashbook app',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create receipts folder in Google Drive: ${errorText}`);
  }

  const createdFolder = await createRes.json();
  return {
    id: createdFolder.id,
    webViewLink: createdFolder.webViewLink || `https://drive.google.com/drive/folders/${createdFolder.id}`,
  };
};

export const uploadReceiptToDrive = async (
  accessToken: string,
  folderId: string,
  file: { name: string; mimeType: string; base64Data: string }
): Promise<UploadReceiptResult> => {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: file.name,
    mimeType: file.mimeType,
    parents: [folderId],
  };

  // Convert base64 to binary byte string
  const binaryContent = atob(file.base64Data);
  const bytes = new Uint8Array(binaryContent.length);
  for (let i = 0; i < binaryContent.length; i++) {
    bytes[i] = binaryContent.charCodeAt(i);
  }

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaPartHeader = `${delimiter}Content-Type: ${file.mimeType}\r\n\r\n`;

  const encoder = new TextEncoder();
  const part1 = encoder.encode(metadataPart);
  const part2 = encoder.encode(mediaPartHeader);
  const part4 = encoder.encode(closeDelimiter);

  // Combine into single Uint8Array
  const totalLength = part1.length + part2.length + bytes.length + part4.length;
  const multipartBody = new Uint8Array(totalLength);
  let offset = 0;
  multipartBody.set(part1, offset);
  offset += part1.length;
  multipartBody.set(part2, offset);
  offset += part2.length;
  multipartBody.set(bytes, offset);
  offset += bytes.length;
  multipartBody.set(part4, offset);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Drive upload failed: ${errorText}`);
  }

  const result = await uploadRes.json();
  const fileId = result.id;
  const webViewLink = result.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  // Attempt to set permission so anyone with link can view (standard for cashbook receipts)
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Could not set public permission on receipt (still accessible to owner):', permErr);
  }

  return {
    fileId,
    name: result.name || file.name,
    webViewLink,
  };
};

// Helper to optimize and compress image before uploading
export const compressImage = (file: File): Promise<{ name: string; mimeType: string; base64Data: string }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          base64Data: base64,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        resolve({
          name: cleanName,
          mimeType: 'image/jpeg',
          base64Data: dataUrl.split(',')[1],
        });
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
