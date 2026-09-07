export async function uploadImageFile(file: File | Blob, customName?: string): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  const filename = customName || (file instanceof File ? file.name : `image_${Date.now()}.png`);
  formData.append("file", file, filename);

  const response = await fetch("/api/upload-image", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    let errorMsg = "Failed to upload image";
    try {
      const err = await response.json();
      errorMsg = err.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return await response.json();
}

export function insertTextAtCursor(
  textarea: HTMLTextAreaElement,
  currentValue: string,
  textToInsert: string,
  onUpdate: (newValue: string) => void
) {
  const start = textarea.selectionStart ?? currentValue.length;
  const end = textarea.selectionEnd ?? currentValue.length;
  const nextValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
  onUpdate(nextValue);
  
  setTimeout(() => {
    textarea.focus();
    const newCursor = start + textToInsert.length;
    textarea.setSelectionRange(newCursor, newCursor);
  }, 30);
}

export async function handleImagePaste(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  currentValue: string,
  onUpdate: (newValue: string) => void,
  isHtmlMode: boolean = false,
  onUploading?: (status: boolean) => void
): Promise<boolean> {
  const items = e.clipboardData?.items;
  if (!items) return false;

  let imageFile: File | null = null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf("image") !== -1) {
      imageFile = item.getAsFile();
      break;
    }
  }

  if (!imageFile) return false;

  e.preventDefault();
  onUploading?.(true);

  try {
    const result = await uploadImageFile(imageFile, `pasted_${Date.now()}.png`);
    const snippet = isHtmlMode
      ? `\n<figure class="notebook-figure">\n  <img src="${result.url}" alt="Figure" />\n  <figcaption>Figure: Pasted illustration</figcaption>\n</figure>\n`
      : `\n\n![Pasted Image](${result.url})\n\n`;

    insertTextAtCursor(textarea, currentValue, snippet, onUpdate);
    return true;
  } catch (err: any) {
    console.error("Image paste upload failed:", err);
    alert("Failed to upload pasted image: " + (err.message || err));
    return false;
  } finally {
    onUploading?.(false);
  }
}

export async function handleImageDrop(
  e: React.DragEvent<HTMLTextAreaElement>,
  textarea: HTMLTextAreaElement,
  currentValue: string,
  onUpdate: (newValue: string) => void,
  isHtmlMode: boolean = false,
  onUploading?: (status: boolean) => void
): Promise<boolean> {
  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return false;

  let imageFile: File | null = null;
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith("image/")) {
      imageFile = files[i];
      break;
    }
  }

  if (!imageFile) return false;

  e.preventDefault();
  onUploading?.(true);

  try {
    const result = await uploadImageFile(imageFile);
    const snippet = isHtmlMode
      ? `\n<figure class="notebook-figure">\n  <img src="${result.url}" alt="${imageFile.name}" />\n  <figcaption>Figure: ${imageFile.name}</figcaption>\n</figure>\n`
      : `\n\n![${imageFile.name}](${result.url})\n\n`;

    insertTextAtCursor(textarea, currentValue, snippet, onUpdate);
    return true;
  } catch (err: any) {
    console.error("Image drop upload failed:", err);
    alert("Failed to upload dropped image: " + (err.message || err));
    return false;
  } finally {
    onUploading?.(false);
  }
}
