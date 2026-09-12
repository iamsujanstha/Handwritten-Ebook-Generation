import { CoverPageConfig } from "../types";

export function sanitizeCoverImageUrl(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // If user pasted raw SVG markup
  if (trimmed.startsWith("<svg") && trimmed.includes("</svg>")) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`;
  }

  // If it's a data:image/svg+xml URI
  if (trimmed.startsWith("data:image/svg+xml")) {
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx !== -1) {
      const header = trimmed.slice(0, commaIdx);
      const content = trimmed.slice(commaIdx + 1);

      // Base64 is already safe
      if (header.includes(";base64")) {
        return trimmed;
      }

      // If content contains raw quotes, brackets, or unencoded characters, encode it safely
      let clean = content;
      try {
        clean = decodeURIComponent(content);
      } catch (_) {
        clean = content;
      }
      return `data:image/svg+xml;utf8,${encodeURIComponent(clean)}`;
    }
  }

  // Normal image URLs (relative like /uploads/... or http / https)
  // Ensure double quotes are escaped so they cannot break HTML attribute quotes
  return trimmed.replace(/"/g, "%22");
}

export function generateCoverPageHtml(config: CoverPageConfig): string {
  const {
    title = "Engineering Systems Manual",
    subtitle = "Architecture & Technical Specifications",
    author = "",
    edition = "",
    template = "notebook",
    accentColor = "#1c4b82",
    imageUrl = "",
    imagePosition = "center"
  } = config;

  const hasAuthor = Boolean(author && author.trim().length > 0);
  const hasEdition = Boolean(edition && edition.trim().length > 0);
  const hasSubtitle = Boolean(subtitle && subtitle.trim().length > 0);

  const safeImageUrl = sanitizeCoverImageUrl(imageUrl);
  const hasImage = Boolean(safeImageUrl && safeImageUrl.length > 0);

  const escapedTitle = escapeHtml(title || "Engineering Systems Manual");
  const escapedSubtitle = escapeHtml(subtitle || "");
  const escapedAuthor = escapeHtml(author || "");
  const escapedEdition = escapeHtml(edition || "");

  if (template === "blueprint") {
    return `
      <div class="cover-wrapper blueprint-cover-wrapper" style="page-break-after: always; break-after: page; width: 100%; min-height: 1056px; display: flex; justify-content: center; align-items: center; background-color: #0b1526; padding: 24px 0; box-sizing: border-box;">
        <div class="blueprint-cover-container" style="width: 816px; min-height: 1008px; background-color: #0d1b30; background-image: linear-gradient(rgba(30, 58, 95, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(30, 58, 95, 0.4) 1px, transparent 1px); background-size: 24px 24px; border: 3px solid #38bdf8; border-radius: 8px; padding: 3.5rem 4rem; position: relative; box-sizing: border-box; color: #f0f9ff; font-family: 'Patrick Hand', cursive; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
          
          <!-- Top Technical Header -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #38bdf8; padding-bottom: 0.75rem; margin-bottom: 2rem;">
              <span style="font-family: 'Fira Code', monospace; font-size: 0.85rem; color: #38bdf8; letter-spacing: 2px; font-weight: 600;">SYS-SPEC // BLUEPRINT ARCHITECTURE</span>
              <span style="font-family: 'Fira Code', monospace; font-size: 0.85rem; color: #94a3b8;">DWG NO: B-7092-A</span>
            </div>

            ${hasEdition ? `
              <div style="display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #7dd3fc; padding: 0.25rem 0.85rem; border-radius: 4px; font-family: 'Patrick Hand SC', cursive; font-size: 0.95rem; margin-bottom: 1.25rem; text-align: center;">
                ${escapedEdition}
              </div>
            ` : ''}

            <h1 style="font-family: 'Patrick Hand SC', cursive; font-size: 3.5rem; line-height: 1.1; color: #ffffff; margin: 0 0 1rem 0; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3); text-align: center;">
              ${escapedTitle}
            </h1>

            ${hasSubtitle ? `
              <p style="font-size: 1.45rem; line-height: 1.4; color: #94a3b8; margin: 0 0 2rem 0; font-style: italic; text-align: center;">
                ${escapedSubtitle}
              </p>
            ` : ''}
          </div>

          <!-- Cover Image Centerpiece (if provided) -->
          ${hasImage ? `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 1.5rem 0; break-inside: avoid; page-break-inside: avoid;">
              <div style="background: rgba(13, 27, 48, 0.85); border: 2px solid #38bdf8; border-radius: 8px; padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); max-width: 90%; text-align: center;">
                <img src="${safeImageUrl}" alt="Cover Artwork" style="max-height: 380px; max-width: 100%; border-radius: 4px; display: block; margin: 0 auto; object-fit: contain; filter: contrast(105%);" />
              </div>
            </div>
          ` : `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 2rem 0;">
              <div style="border: 2px dashed rgba(56, 189, 248, 0.4); border-radius: 8px; width: 85%; height: 280px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #38bdf8; opacity: 0.8;">
                <span style="font-family: 'Patrick Hand SC', cursive; font-size: 1.75rem; letter-spacing: 3px;">TECHNICAL ARCHITECTURE</span>
                <span style="font-family: 'Fira Code', monospace; font-size: 0.8rem; color: #94a3b8; margin-top: 0.5rem;">[ COMPLETE SPECIFICATION MATRIX ]</span>
              </div>
            </div>
          `}

          <!-- Bottom Technical Title Block -->
          <div style="border: 2px solid #38bdf8; background: rgba(15, 23, 42, 0.7); border-radius: 6px; padding: 1rem 1.5rem; display: flex; justify-content: ${hasAuthor ? 'space-between' : 'flex-end'}; align-items: center;">
            ${hasAuthor ? `
              <div>
                <div style="font-family: 'Fira Code', monospace; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase;">PREPARED & CERTIFIED BY</div>
                <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.35rem; color: #ffffff;">${escapedAuthor}</div>
              </div>
            ` : ''}
            <div style="text-align: right; font-family: 'Fira Code', monospace; font-size: 0.8rem; color: #38bdf8;">
              <div>STATUS: APPROVED</div>
              <div style="color: #94a3b8;">ENGINEERING VERIFIED</div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  if (template === "minimal") {
    return `
      <div class="cover-wrapper minimal-cover-wrapper" style="page-break-after: always; break-after: page; width: 100%; min-height: 1056px; display: flex; justify-content: center; align-items: center; background-color: #f8fafc; padding: 24px 0; box-sizing: border-box;">
        <div class="minimal-cover-container" style="width: 816px; min-height: 1008px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 5rem 4.5rem; position: relative; box-sizing: border-box; color: #0f172a; font-family: 'Patrick Hand', cursive; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
          
          <div>
            ${hasEdition ? `
              <div style="font-family: 'Fira Code', monospace; font-size: 0.8rem; letter-spacing: 3px; color: ${accentColor}; text-transform: uppercase; margin-bottom: 2rem; font-weight: 600;">
                ${escapedEdition}
              </div>
            ` : ''}

            <h1 style="font-family: 'Patrick Hand SC', cursive; font-size: 3.8rem; line-height: 1.05; color: #0f172a; margin: 0 0 1.25rem 0; letter-spacing: -0.5px; text-align: center;">
              ${escapedTitle}
            </h1>

            <div style="width: 60px; height: 4px; background-color: ${accentColor}; margin-bottom: 1.5rem;"></div>

            ${hasSubtitle ? `
              <p style="font-size: 1.45rem; line-height: 1.4; color: #64748b; margin: 0 0 2rem 0; max-width: 620px; text-align: center;">
                ${escapedSubtitle}
              </p>
            ` : ''}
          </div>

          <!-- Cover Image -->
          ${hasImage ? `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 1.5rem 0; break-inside: avoid; page-break-inside: avoid;">
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #fafafa; box-shadow: 0 8px 24px rgba(0,0,0,0.06); max-width: 85%;">
                <img src="${safeImageUrl}" alt="Cover Artwork" style="max-height: 380px; max-width: 100%; border-radius: 4px; display: block; margin: 0 auto; object-fit: contain;" />
              </div>
            </div>
          ` : `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center;"></div>
          `}

          <!-- Footer -->
          ${hasAuthor ? `
            <div style="border-top: 1px solid #e2e8f0; padding-top: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end;">
              <div>
                <div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase; font-family: 'Fira Code', monospace;">Author</div>
                <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.35rem; color: #0f172a;">${escapedAuthor}</div>
              </div>
              <div style="font-size: 0.85rem; color: #94a3b8; font-family: 'Fira Code', monospace;">
                Document Reference
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  if (template === "vintage") {
    return `
      <div class="cover-wrapper vintage-cover-wrapper" style="page-break-after: always; break-after: page; width: 100%; min-height: 1056px; display: flex; justify-content: center; align-items: center; background-color: #1c1917; padding: 24px 0; box-sizing: border-box;">
        <div class="vintage-cover-container" style="width: 816px; min-height: 1008px; background-color: #292524; border: 4px solid #b45309; outline: 2px solid #78350f; outline-offset: -12px; border-radius: 6px; padding: 4.5rem; position: relative; box-sizing: border-box; color: #fef3c7; font-family: 'Patrick Hand', cursive; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 20px 40px rgba(0,0,0,0.7);">
          
          <div style="text-align: center;">
            ${hasEdition ? `
              <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1rem; letter-spacing: 4px; color: #d97706; text-transform: uppercase; margin-bottom: 1.5rem;">
                ★ ${escapedEdition} ★
              </div>
            ` : ''}

            <h1 style="font-family: 'Patrick Hand SC', cursive; font-size: 3.6rem; line-height: 1.1; color: #fef3c7; margin: 0 auto 1.25rem auto; text-shadow: 0 2px 4px rgba(0,0,0,0.5); max-width: 680px; text-align: center;">
              ${escapedTitle}
            </h1>

            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin: 1rem 0;">
              <span style="height: 1px; width: 80px; background: #b45309;"></span>
              <span style="color: #d97706; font-size: 1.2rem;">❖</span>
              <span style="height: 1px; width: 80px; background: #b45309;"></span>
            </div>

            ${hasSubtitle ? `
              <p style="font-size: 1.45rem; line-height: 1.4; color: #d6d3d1; margin: 0 auto; font-style: italic; max-width: 600px; text-align: center;">
                ${escapedSubtitle}
              </p>
            ` : ''}
          </div>

          <!-- Cover Image Cameo -->
          ${hasImage ? `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 1.5rem 0; break-inside: avoid; page-break-inside: avoid;">
              <div style="border: 3px solid #b45309; border-radius: 12px; padding: 10px; background: #1c1917; box-shadow: 0 10px 30px rgba(0,0,0,0.8); max-width: 80%; text-align: center;">
                <img src="${safeImageUrl}" alt="Cover Artwork" style="max-height: 360px; max-width: 100%; border-radius: 8px; display: block; margin: 0 auto; object-fit: contain;" />
              </div>
            </div>
          ` : `
            <div style="flex: 1; display: flex; justify-content: center; align-items: center;"></div>
          `}

          ${hasAuthor ? `
            <div style="text-align: center; border-top: 1px solid rgba(217, 119, 6, 0.4); padding-top: 1.5rem;">
              <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.5rem; color: #fef3c7;">${escapedAuthor}</div>
              <div style="font-family: 'Fira Code', monospace; font-size: 0.75rem; color: #a8a29e; letter-spacing: 2px; margin-top: 0.35rem; text-transform: uppercase;">
                Privately Published Technical Manuscript
              </div>
            </div>
          ` : ''}

        </div>
      </div>
    `;
  }

  if (template === "modern") {
    return `
      <div class="cover-wrapper modern-cover-wrapper" style="page-break-after: always; break-after: page; width: 100%; min-height: 1056px; display: flex; justify-content: center; align-items: center; background-color: #f1f5f9; padding: 24px 0; box-sizing: border-box;">
        <div class="modern-cover-container" style="width: 816px; min-height: 1008px; background-color: #ffffff; border: 2px solid #0f172a; border-radius: 8px; position: relative; box-sizing: border-box; color: #0f172a; font-family: 'Patrick Hand', cursive; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-shadow: 8px 10px 0 #0f172a;">
          
          <!-- Top Accent Banner -->
          <div style="background-color: ${accentColor}; color: #ffffff; padding: 1.25rem 3.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a;">
            <span style="font-family: 'Patrick Hand SC', cursive; font-size: 1.15rem; letter-spacing: 2px; font-weight: bold;">E-BOOK SPECIFICATION</span>
            ${hasEdition ? `<span style="font-family: 'Fira Code', monospace; font-size: 0.85rem; opacity: 0.9;">${escapedEdition}</span>` : ''}
          </div>

          <div style="padding: 3rem 3.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h1 style="font-family: 'Patrick Hand SC', cursive; font-size: 3.8rem; line-height: 1.05; color: #0f172a; margin: 0 0 1rem 0; text-align: center;">
                ${escapedTitle}
              </h1>

            ${hasSubtitle ? `
              <p style="font-size: 1.5rem; line-height: 1.4; color: #475569; margin: 0 0 1.5rem 0; text-align: center;">
                ${escapedSubtitle}
              </p>
            ` : ''}
            </div>

            <!-- Cover Image -->
            ${hasImage ? `
              <div style="display: flex; justify-content: center; align-items: center; margin: 1.5rem 0; break-inside: avoid; page-break-inside: avoid;">
                <div style="border: 2px solid #0f172a; border-radius: 8px; padding: 10px; background: #ffffff; box-shadow: 5px 5px 0 #0f172a; max-width: 85%;">
                  <img src="${safeImageUrl}" alt="Cover Artwork" style="max-height: 380px; max-width: 100%; border-radius: 4px; display: block; margin: 0 auto; object-fit: contain;" />
                </div>
              </div>
            ` : `
              <div style="flex: 1;"></div>
            `}

            <div style="border-top: 2px solid #0f172a; padding-top: 1.5rem; display: flex; justify-content: ${hasAuthor ? 'space-between' : 'flex-end'}; align-items: center;">
              ${hasAuthor ? `
                <div>
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-family: 'Fira Code', monospace; color: #64748b; font-weight: bold;">AUTHOR & ARCHITECT</div>
                  <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.4rem; color: #0f172a;">${escapedAuthor}</div>
                </div>
              ` : ''}
              <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.1rem; color: ${accentColor}; font-weight: bold;">
                FIELD READY
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // Default: 'notebook' (Hand-drawn field notebook aesthetic)
  return `
    <div class="cover-wrapper notebook-cover-wrapper" style="page-break-after: always; break-after: page; width: 100%; min-height: 1056px; display: flex; justify-content: center; align-items: center; background-color: #f4eee1; padding: 24px 0; box-sizing: border-box;">
      <div class="notebook-container notebook-cover-container" style="width: 816px; min-height: 1008px; margin: 0 auto; background-color: #fcf9f2; background-image: linear-gradient(to right, transparent 78px, #fca5a5 78px, #fca5a5 80px, transparent 80px), linear-gradient(to bottom, transparent 31px, #e3dac9 32px); background-size: 100% 100%, 100% 32px; background-position: 0 0, 0 0; padding: 3.5rem 4rem 3.5rem 6.5rem; border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1); border: 2px solid #2d3748; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
        
        <!-- Header badge & title -->
        <div>
          <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 1.25rem; min-height: 28px;">
            ${hasEdition ? `
              <div style="font-family: 'Patrick Hand', cursive; font-size: 1.05rem; color: #64748b; font-style: italic;">
                ${escapedEdition}
              </div>
            ` : ''}
          </div>

          <h1 style="font-family: 'Patrick Hand SC', cursive; font-size: 3.8rem; line-height: 1.1; color: ${accentColor || '#1c4b82'}; margin: 0 0 0.75rem 0; text-shadow: 2px 2px 0 rgba(28, 75, 130, 0.08); text-align: center;">
            ${escapedTitle}
          </h1>

          ${hasSubtitle ? `
            <div style="font-family: 'Patrick Hand', cursive; font-size: 1.5rem; line-height: 1.4; color: #475569; margin-bottom: 1.25rem; text-align: center;">
              ${escapedSubtitle}
            </div>
          ` : ''}

          <div style="border-bottom: 3px dashed ${accentColor || '#1c4b82'}; margin: 1.25rem 0 2rem 0; opacity: 0.8;"></div>
        </div>

        <!-- Cover Image (Polaroid / Notebook Figure Frame) -->
        ${hasImage ? `
          <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 1rem 0; break-inside: avoid; page-break-inside: avoid;">
            <div style="background: #ffffff; border: 2px solid #2d3748; border-radius: 8px; padding: 1.25rem 1.5rem; box-shadow: 6px 7px 0 rgba(0,0,0,0.1); max-width: 88%; text-align: center; transform: rotate(-0.5deg);">
              <img src="${safeImageUrl}" alt="Cover Illustration" style="max-height: 380px; max-width: 100%; border-radius: 4px; display: block; margin: 0 auto; object-fit: contain;" />
            </div>
          </div>
        ` : `
          <div style="flex: 1; display: flex; justify-content: center; align-items: center; margin: 1.5rem 0;">
            <div style="border: 2px dashed #94a3b8; border-radius: 12px; width: 85%; height: 260px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(255,255,255,0.6);">
              <span style="font-family: 'Patrick Hand SC', cursive; font-size: 2rem; color: #1c4b82;">OFFICIAL FIELD SPECIFICATION</span>
              <span style="font-family: 'Patrick Hand', cursive; font-size: 1.15rem; color: #64748b; margin-top: 0.5rem; font-style: italic;">Verified Architecture & Practical Protocols</span>
            </div>
          </div>
        `}

        ${(hasAuthor || hasEdition) ? `
          <!-- Footer / Metadata Block -->
          <div style="margin-top: 1.5rem; background: #ffffff; border: 2px solid #2d3748; border-radius: 8px; padding: 1rem 1.5rem; display: flex; justify-content: ${hasAuthor && hasEdition ? 'space-between' : hasAuthor ? 'flex-start' : 'flex-end'}; align-items: center; box-shadow: 4px 4px 0 rgba(0,0,0,0.06); break-inside: avoid; page-break-inside: avoid;">
            ${hasAuthor ? `
              <div>
                <div style="font-family: 'Patrick Hand SC', cursive; font-size: 0.9rem; color: #64748b; letter-spacing: 1px;">AUTHOR & RECORDED BY</div>
                <div style="font-family: 'Patrick Hand SC', cursive; font-size: 1.45rem; color: #1e1e24; font-weight: bold;">${escapedAuthor}</div>
              </div>
            ` : ''}
            ${hasEdition ? `
              <div style="text-align: right;">
                <div style="font-family: 'Patrick Hand SC', cursive; font-size: 0.85rem; color: #64748b;">EDITION & CLASSIFICATION</div>
                <div style="font-family: 'Patrick Hand', cursive; font-size: 1.15rem; color: #1c4b82; font-weight: bold;">
                  ${escapedEdition}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

      </div>
    </div>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
