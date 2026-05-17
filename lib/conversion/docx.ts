import JSZip from "jszip";

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

export async function extractDocxParagraphs(fileBuffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const xmlEntry = zip.file("word/document.xml");
  if (!xmlEntry) {
    throw new Error("Invalid DOCX: word/document.xml not found.");
  }
  const xml = await xmlEntry.async("string");
  const paragraphs: string[] = [];
  const paragraphMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) ?? [];

  for (const paragraph of paragraphMatches) {
    const textMatches = paragraph.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) ?? [];
    if (textMatches.length === 0) {
      continue;
    }
    const combined = textMatches
      .map((entry) => entry.replace(/<w:t(?:\s[^>]*)?>/g, "").replace(/<\/w:t>/g, ""))
      .map(decodeXmlEntities)
      .join("")
      .replace(/\s+/g, " ")
      .trim();

    if (combined.length > 0) {
      paragraphs.push(combined);
    }
  }

  return paragraphs;
}
