import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildFillableMedicalRecordsPdf } from "../src/app/lib/medical-records-pdf.mjs";
import { getMedicalRecordsForm } from "../src/app/lib/medical-records-forms.mjs";

const formType = process.argv.includes("--request") ? "request" : "release";
const definition = getMedicalRecordsForm(formType);
const source = await readFile(`src/assets/medical-records/original-${formType}.pdf`);
const pdf = await buildFillableMedicalRecordsPdf(source, { formType });
await mkdir("output/pdf", { recursive: true });
await writeFile(`output/pdf/${definition.id}-fillable.pdf`, pdf);
await writeFile(path.join("public", definition.pdfPath), pdf);
console.log(`Built fillable medical records ${formType} PDF (original preserved in src/assets/medical-records).`);
