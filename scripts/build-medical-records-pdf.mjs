import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFillableMedicalRecordsPdf } from "../src/app/lib/medical-records-pdf.mjs";
import { MEDICAL_RECORDS_PDF_PATH } from "../src/app/lib/medical-records-release.mjs";

const source = await readFile("src/assets/medical-records/original-release.pdf");
const pdf = await buildFillableMedicalRecordsPdf(source);
await mkdir("output/pdf", { recursive: true });
await writeFile("output/pdf/medical-records-release-fillable.pdf", pdf);
await writeFile(path.join("public", MEDICAL_RECORDS_PDF_PATH), pdf);
console.log("Built fillable medical records release PDF (original preserved in src/assets/medical-records).");
