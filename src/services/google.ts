import { PROD_REG_EXP, UAT_REG_EXP } from "@/utils";
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

  public async read(
    documentId: string,
    environment: string
  ): Promise<string[] | undefined> {
    try {
      const docs = google.docs({ version: "v1", auth: this.auth });
      const content = await docs.documents.get({ documentId });
      const delimiter = environment === "prod" ? PROD_REG_EXP : UAT_REG_EXP;
      return this.extractTextByBlock(content.data.body?.content, delimiter);
    } catch (error) {
      console.error("Error reading document:", error);
      return undefined;
    }
  }

  public async readUat(documentId: string): Promise<string[] | undefined> {
    try {
      const docs = google.docs({ version: "v1", auth: this.auth });
      const content = await docs.documents.get({ documentId });
      const delimiter = UAT_REG_EXP;
      return this.extractTextByBlock(content.data.body?.content, delimiter);
    } catch (error) {
      console.error("Error reading document:", error);
      return undefined;
    }
  }

  public async readProd(documentId: string): Promise<string[] | undefined> {
    try {
      const docs = google.docs({ version: "v1", auth: this.auth });
      const content = await docs.documents.get({ documentId });
      const delimiter = PROD_REG_EXP;
      return this.extractTextByBlock(content.data.body?.content, delimiter);
    } catch (error) {
      console.error("Error reading document:", error);
      return undefined;
    }
  }
  private extractTextByBlock(
    content: docs_v1.Schema$StructuralElement[] | undefined,
    regexDelimiter: RegExp
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
            const text = paragraphElement.textRun.content.trim();
            if (regexDelimiter.test(text)) {
              if (currentBlock.trim()) {
                blocks.push(currentBlock.trim());
                currentBlock = "";
              }
            }
            currentBlock += text + "\n";
          }
        });
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
