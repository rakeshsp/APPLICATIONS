import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";

export default function MRIKneeReportApp() {
  const [region, setRegion] = useState("Right");
  const [patientInfo, setPatientInfo] = useState({ name: "", id: "", age: "", sex: "", date: "", refPhysician: "" });
  const [report, setReport] = useState("");
  const [impression, setImpression] = useState("");

  const handlePatientChange = (field, value) => {
    setPatientInfo((prev) => ({ ...prev, [field]: value }));
  };

  const generateReport = () => {
    const draft = `MRI Knee Report (Region: ${region})\n\nPatient Name: ${patientInfo.name}\nPatient ID: ${patientInfo.id}\nAge: ${patientInfo.age}\nSex: ${patientInfo.sex}\nDate: ${patientInfo.date}\nReferring Physician: ${patientInfo.refPhysician}\n\nTechnique:\n- 3T MRI scanner using dedicated knee coil.\n- Sequences: Sagittal PD, PD FS; Coronal PD FS, T1; Axial PD FS.\n- Optional: GRE / DESS / STIR / 3D SPACE / Post-contrast T1 FS.\n- Slice thickness ≤3 mm; FOV 14–16 cm.\n\nSystematic Assessment:\n- Bone & Marrow: Normal marrow signal. No fractures or contusions.\n- Cartilage: Grade II chondromalacia in the medial femorotibial compartment.\n- Menisci: Posterior horn medial meniscus tear reaching inferior surface.\n- Ligaments: Complete ACL tear. PCL intact. Grade I MCL sprain.\n- Effusion/Synovium: Moderate joint effusion with small Baker’s cyst.\n- Soft Tissues: Hoffa’s fat pad normal. No bursitis or cysts.\n\nImpression:\n${impression}`;
    setReport(draft);
  };

  const anatomicalSections = [
    { title: "Bone & Marrow", description: "Best on T1 and PD/T2 FS. Look for marrow edema, fractures, subchondral cysts." },
    { title: "Articular Cartilage", description: "GRE/DESS for surface; PD FS for edema. Grade using Outerbridge I–IV." },
    { title: "Menisci", description: "PD non-FS for morphology; PD FS for edema. Only surface-reaching signal = tear." },
    { title: "Ligaments", description: "PD FS (sagittal for cruciates, coronal for collaterals). Grade I–III sprains." },
    { title: "Extensor Mechanism", description: "Axial PD FS for tilt/subluxation; sagittal for tendon tears." },
    { title: "Joint Effusion & Synovium", description: "T2 FS/STIR to detect effusion, synovitis, Baker’s cysts." },
    { title: "Soft Tissues", description: "STIR/PD FS for edema, bursitis, cysts; T1 for fatty atrophy." },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center">🦵 MRI Knee AI-Assisted Reporting</h1>

        {/* Tabs */}
        <Tabs defaultValue="Right" className="w-full">
          <TabsList className="flex justify-center space-x-4 bg-gray-800 p-2 rounded-lg">
            {['Right', 'Left', 'Bilateral'].map((r) => (
              <TabsTrigger key={r} value={r} onClick={() => setRegion(r)} className="px-4 py-2 text-sm rounded-md">
                {r} Knee
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Study Context */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">Study Context</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 bg-gray-800 p-4 rounded-md">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Patient Name" value={patientInfo.name} onChange={(e) => handlePatientChange("name", e.target.value)} />
              <Input placeholder="Patient ID" value={patientInfo.id} onChange={(e) => handlePatientChange("id", e.target.value)} />
              <Input placeholder="Age" value={patientInfo.age} onChange={(e) => handlePatientChange("age", e.target.value)} />
              <Input placeholder="Sex (M/F)" value={patientInfo.sex} onChange={(e) => handlePatientChange("sex", e.target.value)} />
              <Input type="date" placeholder="Study Date" value={patientInfo.date} onChange={(e) => handlePatientChange("date", e.target.value)} />
              <Input placeholder="Referring Physician" value={patientInfo.refPhysician} onChange={(e) => handlePatientChange("refPhysician", e.target.value)} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Technique Section */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">Technique Details</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 bg-gray-800 p-4 rounded-md">
            <ul className="list-disc pl-5 space-y-2 text-gray-100">
              <li>3T MRI scanner with dedicated knee coil.</li>
              <li>Standard sequences: Sagittal PD, PD FS; Coronal PD FS, T1; Axial PD FS.</li>
              <li>Optional sequences: GRE / DESS / STIR / 3D SPACE / Post-contrast T1 FS.</li>
              <li>Slice thickness ≤3 mm; Field of view (FOV): 14–16 cm.</li>
              <li>Patient supine, knee in slight flexion, minimal motion artefact.</li>
              <li>Ensure full coverage of distal femur, proximal tibia, patella, and soft tissues.</li>
            </ul>
          </CollapsibleContent>
        </Collapsible>

        {/* Systematic Anatomical Assessment */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">Systematic Anatomical Assessment</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            {anatomicalSections.map((section, idx) => (
              <Collapsible key={idx}>
                <CollapsibleTrigger asChild>
                  <Button className="bg-gray-800 hover:bg-gray-700 w-full text-left justify-between">{section.title}</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-gray-900 p-4 rounded-md">
                  <p className="text-sm text-gray-300 mb-3">{section.description}</p>
                  <Select>
                    <SelectTrigger className="bg-gray-800 text-gray-100 border border-gray-600">Choose finding</SelectTrigger>
                    <SelectContent className="bg-gray-800 text-gray-100">
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="abnormal">Abnormal</SelectItem>
                      <SelectItem value="not-assessed">Not Assessed</SelectItem>
                    </SelectContent>
                  </Select>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Generated Report */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">Generated Report (Editable)</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 bg-gray-800 p-4 rounded-md">
            <Button onClick={generateReport} className="mb-4 bg-blue-600 hover:bg-blue-700">Generate Structured Report</Button>
            <Textarea value={report} onChange={(e) => setReport(e.target.value)} rows={10} className="bg-gray-900 border-gray-700 text-gray-100" />
          </CollapsibleContent>
        </Collapsible>

        {/* AI Refined Impression */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">AI Refined Impression (Optional)</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 bg-gray-800 p-4 rounded-md">
            <Textarea value={impression} onChange={(e) => setImpression(e.target.value)} rows={6} placeholder="Once connected, AI backend can refine impression here." className="bg-gray-900 border-gray-700 text-gray-100" />
          </CollapsibleContent>
        </Collapsible>

        {/* Implementation Notes */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button className="bg-gray-700 hover:bg-gray-600 w-full text-left justify-between">Implementation Notes</Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 bg-gray-800 p-4 rounded-md text-sm text-gray-400 space-y-2">
            <p>• Template follows Radiopaedia MRI Knee structured protocol and includes sequences, anatomy, and grading systems.</p>
            <p>• Cartilage, ligament, and meniscal sections pre-configured with reporting placeholders.</p>
            <p>• The 'AI Backend' can be configured to refine impressions or generate teaching outputs.</p>
            <p>• You can continue to evolve text blocks to match your reporting style without changing the structure.</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
