import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Copy, FileText, Check, Settings, Sparkles, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import mriKneeTemplate from '@/templates/mri_knee.json';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Dialog from '@radix-ui/react-dialog';
import SettingsDialog from '@/components/SettingsDialog';
import { generateImpression } from '@/lib/ai';

function App() {
  const [activeTemplate, setActiveTemplate] = useState(mriKneeTemplate);
  const [region, setRegion] = useState('Right');
  const [findings, setFindings] = useState({});
  const [notes, setNotes] = useState({});
  const [patientInfo, setPatientInfo] = useState({
    name: '', id: '', age: '', sex: '', date: new Date().toISOString().split('T')[0], refPhysician: ''
  });
  const [generatedReport, setGeneratedReport] = useState('');
  const [impression, setImpression] = useState('');
  const [copied, setCopied] = useState(false);

  // AI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Initialize findings state
  useEffect(() => {
    const initialFindings = {};
    const initialNotes = {};
    activeTemplate.sections.forEach(section => {
      if (section.items) {
        section.items.forEach(item => {
          initialFindings[item.id] = 'Not Assessed';
          initialNotes[item.id] = '';
        });
      } else {
        // Legacy support for flat sections
        initialFindings[section.id] = 'Not Assessed';
        initialNotes[section.id] = '';
      }
    });
    setFindings(initialFindings);
    setNotes(initialNotes);
  }, [activeTemplate]);

  const handleFindingChange = (id, value) => {
    setFindings(prev => ({ ...prev, [id]: value }));
  };

  const handleNoteChange = (id, value) => {
    setNotes(prev => ({ ...prev, [id]: value }));
  };

  const buildReportText = () => {
    let reportText = `MRI REPORT - ${activeTemplate.title.toUpperCase()} (${region.toUpperCase()})\n\n`;

    // Patient Info
    reportText += `PATIENT: ${patientInfo.name || 'N/A'} | ID: ${patientInfo.id || 'N/A'}\n`;
    reportText += `AGE/SEX: ${patientInfo.age || '-'} / ${patientInfo.sex || '-'}\n`;
    reportText += `DATE: ${patientInfo.date} | REF: ${patientInfo.refPhysician || 'N/A'}\n\n`;

    // Technique
    reportText += `TECHNIQUE:\nMultiplanar multisequence MRI of the ${region.toLowerCase()} knee.\n\n`;

    // Findings
    reportText += `FINDINGS:\n`;
    activeTemplate.sections.forEach(section => {
      let sectionHasFindings = false;
      let sectionText = `${section.title}:\n`;
      let currentGroup = null;

      if (section.items) {
        section.items.forEach(item => {
          const finding = findings[item.id];
          const note = notes[item.id];

          if (finding && finding !== 'Not Assessed') {
            // Add group header if needed
            if (item.group && item.group !== currentGroup) {
              sectionText += `  ${item.group}:\n`;
              currentGroup = item.group;
            }

            const option = item.options.find(opt => opt.label === finding);
            const text = option ? option.value : finding;

            // Indent if in a group
            const prefix = item.group ? `    - ` : `- `;
            sectionText += `${prefix}${item.title}: ${text}`;
            if (note) sectionText += ` ${note}`;
            sectionText += `\n`;
            sectionHasFindings = true;
          }
        });
      } else {
        // Legacy support
        const finding = findings[section.id];
        const note = notes[section.id];
        if (finding && finding !== 'Not Assessed') {
          const option = section.options.find(opt => opt.label === finding);
          const text = option ? option.value : finding;
          sectionText += `${text}`;
          if (note) sectionText += ` ${note}`;
          sectionText += `\n`;
          sectionHasFindings = true;
        }
      }

      if (sectionHasFindings) {
        reportText += sectionText + '\n';
      }
    });

    return reportText;
  };

  const generateReport = () => {
    let reportText = buildReportText();

    // Impression
    reportText += `\nIMPRESSION:\n`;
    if (impression) {
      reportText += impression;
    } else {
      const abnormalities = [];
      activeTemplate.sections.forEach(section => {
        if (section.items) {
          section.items.forEach(item => {
            const finding = findings[item.id];
            if (finding && finding !== 'Not Assessed' && finding !== 'Normal' && finding !== 'None' && finding !== 'Intact' && finding !== 'Absent') {
              const option = item.options.find(opt => opt.label === finding);
              abnormalities.push(option ? option.value : finding);
            }
          });
        } else {
          const finding = findings[section.id];
          if (finding && finding !== 'Not Assessed' && finding !== 'Normal' && finding !== 'None') {
            abnormalities.push(finding);
          }
        }
      });

      if (abnormalities.length > 0) {
        reportText += abnormalities.join('\n');
      } else {
        reportText += `No acute abnormality identified.`;
      }
    }

    setGeneratedReport(reportText);
  };

  const handleAiRefinement = async () => {
    const apiKey = localStorage.getItem('ai_api_key');
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setIsGeneratingAI(true);
    try {
      const currentFindings = buildReportText();
      const provider = localStorage.getItem('ai_provider') || 'gemini';

      const result = await generateImpression(currentFindings, { apiKey, provider });
      setImpression(result);
    } catch (error) {
      alert(`AI Error: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT COLUMN: INPUTS */}
        <div className="space-y-6">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {activeTemplate.title} Reporting
              </h1>
              <p className="text-slate-400">AI-Assisted Structured Reporting Tool</p>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </header>

          {/* Region Selector */}
          <div className="flex space-x-2 bg-slate-900/50 p-1 rounded-lg border border-slate-800 w-fit">
            {['Right', 'Left', 'Bilateral'].map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all",
                  region === r
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Patient Info */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Patient Context</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                placeholder="Name"
                className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={patientInfo.name} onChange={e => setPatientInfo({ ...patientInfo, name: e.target.value })}
              />
              <input
                placeholder="ID"
                className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={patientInfo.id} onChange={e => setPatientInfo({ ...patientInfo, id: e.target.value })}
              />
              <input
                placeholder="Age"
                className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={patientInfo.age} onChange={e => setPatientInfo({ ...patientInfo, age: e.target.value })}
              />
              <input
                placeholder="Sex"
                className="bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={patientInfo.sex} onChange={e => setPatientInfo({ ...patientInfo, sex: e.target.value })}
              />
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {activeTemplate.sections.map(section => (
              <Section
                key={section.id}
                section={section}
                findings={findings}
                notes={notes}
                onFindingChange={handleFindingChange}
                onNoteChange={handleNoteChange}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="lg:sticky lg:top-6 h-fit space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <FileText className="w-4 h-4 text-blue-400" />
                Live Preview
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateReport}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-md transition-colors"
                >
                  Generate
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-md transition-colors flex items-center gap-2"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              className="w-full h-[600px] bg-slate-950 p-6 text-sm font-mono text-slate-300 outline-none resize-none"
              value={generatedReport}
              onChange={(e) => setGeneratedReport(e.target.value)}
              placeholder="Report will be generated here..."
            />
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-400">Impression Override</h3>
              <button
                onClick={handleAiRefinement}
                disabled={isGeneratingAI}
                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isGeneratingAI ? 'Refining...' : 'Auto-Refine'}
              </button>
            </div>
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-md p-3 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              rows={4}
              placeholder="Custom impression..."
              value={impression}
              onChange={e => setImpression(e.target.value)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

function Section({ section, findings, notes, onFindingChange, onNoteChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Check if any item in this section is abnormal
  const hasAbnormality = section.items ? section.items.some(item => {
    const val = findings[item.id];
    return val && val !== 'Normal' && val !== 'None' && val !== 'Intact' && val !== 'Absent' && val !== 'Not Assessed';
  }) : false;

  // Group items by their 'group' property
  const groupedItems = section.items ? section.items.reduce((acc, item) => {
    const groupName = item.group || 'General';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {}) : {};

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all duration-200">
      <div className="flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
        <Collapsible.Trigger className="flex items-center gap-3 flex-1 text-left">
          <div className={cn(
            "w-2 h-2 rounded-full",
            hasAbnormality ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-slate-600"
          )} />
          <span className="font-medium text-slate-200">{section.title}</span>
        </Collapsible.Trigger>

        <div className="flex items-center gap-3">
          {section.knowledgePoint && (
            <div className="relative group">
              <button
                onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
                className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-full transition-colors"
              >
                <Info className="w-4 h-4" />
              </button>
              {showInfo && (
                <div className="absolute right-0 top-8 z-50 w-64 bg-slate-800 border border-slate-700 p-3 rounded-lg shadow-xl text-xs text-slate-300 leading-relaxed">
                  {section.knowledgePoint}
                </div>
              )}
            </div>
          )}
          <Collapsible.Trigger>
            <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-200", isOpen && "rotate-180")} />
          </Collapsible.Trigger>
        </div>
      </div>

      <Collapsible.Content className="border-t border-slate-800/50 bg-slate-950/30 p-4 space-y-6 animate-slideDown">
        {section.helperText && (
          <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded-md text-xs text-blue-200 mb-4">
            {section.helperText}
          </div>
        )}

        {Object.entries(groupedItems).map(([groupName, items]) => (
          <Group
            key={groupName}
            title={groupName}
            items={items}
            findings={findings}
            notes={notes}
            onFindingChange={onFindingChange}
            onNoteChange={onNoteChange}
          />
        ))}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function Group({ title, items, findings, notes, onFindingChange, onNoteChange }) {
  const [isOpen, setIsOpen] = useState(true); // Default open, or false if preferred
  const isGeneral = title === 'General';

  return (
    <div className="space-y-2">
      {!isGeneral && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between text-sm font-bold text-blue-400 mt-4 mb-2 border-b border-blue-900/30 pb-1 hover:text-blue-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            {title}
          </div>
          <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
        </button>
      )}

      {(isOpen || isGeneral) && (
        <div className="space-y-3 pl-2">
          {items.map(item => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr,1.5fr,1.5fr] gap-3 items-start border-b border-slate-800/50 pb-3 last:border-0">
              <label className="text-xs font-medium text-slate-400 pt-2">{item.title}</label>

              <DropdownMenu.Root>
                <DropdownMenu.Trigger className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-md text-sm border transition-all outline-none",
                  findings[item.id] && findings[item.id] !== 'Not Assessed'
                    ? "bg-blue-600/10 border-blue-500/50 text-blue-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                )}>
                  <span className="truncate">{findings[item.id] || 'Select...'}</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="z-50 min-w-[200px] bg-slate-900 border border-slate-800 rounded-md shadow-xl p-1 animate-in fade-in zoom-in-95 duration-100">
                    {item.options.map((opt) => (
                      <DropdownMenu.Item
                        key={opt.label}
                        className={cn(
                          "px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none transition-colors",
                          findings[item.id] === opt.label ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        )}
                        onClick={() => onFindingChange(item.id, opt.label)}
                      >
                        {opt.label}
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator className="h-px bg-slate-800 my-1" />
                    <DropdownMenu.Item
                      className="px-2 py-1.5 text-sm rounded-sm cursor-pointer outline-none text-slate-500 hover:bg-slate-800 hover:text-slate-400"
                      onClick={() => onFindingChange(item.id, 'Not Assessed')}
                    >
                      Not Assessed
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>

              <input
                placeholder="Notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none text-slate-400"
                value={notes[item.id] || ''}
                onChange={(e) => onNoteChange(item.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
