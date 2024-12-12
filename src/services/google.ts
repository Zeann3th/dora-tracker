import { GoogleAuth } from "google-auth-library";
import { docs_v1, google } from "googleapis";
import path from "path";

class GoogleAPIClient {
  private readonly auth: GoogleAuth;

  constructor() {
    this.auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(import.meta.dirname, "../../google.json"),
      scopes: ["https://www.googleapis.com/auth/documents.readonly"],
    });
  }

  public async readDocs(documentId: string): Promise<string[] | undefined> {
    try {
      const docs = google.docs({ version: "v1", auth: this.auth });
      const content = await docs.documents.get({ documentId });
      return this.extractTextByBlock(content.data.body?.content);
    } catch (error) {
      console.error("Error reading document:", error);
      return undefined;
    }
  }

  private extractTextByLine(
    content: docs_v1.Schema$StructuralElement[] | undefined,
  ): string[] {
    const lines: string[] = [];

    if (!content) {
      return [];
    }

    content.forEach((element) => {
      if (element.paragraph && element.paragraph.elements) {
        let line = "";
        element.paragraph.elements.forEach((paragraphElement) => {
          if (paragraphElement.textRun && paragraphElement.textRun.content) {
            line += paragraphElement.textRun.content;
          }
        });
        if (line.trim()) {
          lines.push(line.trim());
        }
      }
    });

    return lines;
  }

  private extractTextByBlock(
    content: docs_v1.Schema$StructuralElement[] | undefined,
  ): string[] {
    const blocks: string[] = [];

    if (!content) {
      return [];
    }

    let currentBlock = "";
    content.forEach((element) => {
      if (element.paragraph && element.paragraph.elements) {
        element.paragraph.elements.forEach((paragraphElement) => {
          if (paragraphElement.textRun && paragraphElement.textRun.content) {
            currentBlock += paragraphElement.textRun.content;
          }
        });
      }

      if (/\n{2,}/.test(currentBlock)) {
        const [block, remaining] = currentBlock.split(/\n{2,}/, 2);
        blocks.push(block.trim());
        currentBlock = remaining || "";
      }
    });

    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }

    return blocks;
  }
}

const GoogleDocumentClient = new GoogleAPIClient();

export { GoogleDocumentClient };
