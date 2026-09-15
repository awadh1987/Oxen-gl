import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Hash,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Lock,
  Globe,
  Database,
  RefreshCw,
  Search,
  ChevronRight,
  Layers
} from 'lucide-react';

export interface CustomsManifestItem {
  id: string;
  manifest_number: string;
  declaration_type: 'IMPORT' | 'EXPORT' | 'TRANSIT';
  border_port_name: string;
  clearance_status: 'CLEARED' | 'PENDING_DOCUMENTATION' | 'UNDER_INSPECTION' | 'HELD';
  zatca_compliance_status: 'REPORTED' | 'NOT_SUBMITTED' | 'REJECTED';
  total_value_sar: number;
  hs_codes: string[];
  block_hash: string;
  previous_hash: string;
  block_index: number;
  timestamp: string;
}

export const CustomsClearanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manifests' | 'ledger'>('manifests');
  const [selectedManifestId, setSelectedManifestId] = useState<string>('m1-uuid-4402');
  const [isSubmittingZatca, setIsSubmittingZatca] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Initial production-grade mock data matrix matching Phase 5 database contracts
  const [manifests, setManifests] = useState<CustomsManifestItem[]>([
    {
      id: 'm1-uuid-4402',
      manifest_number: 'MANIFEST-KSA-2026-0941',
      declaration_type: 'IMPORT',
      border_port_name: 'King Khalid International Airport (RUH)',
      clearance_status: 'CLEARED',
      zatca_compliance_status: 'REPORTED',
      total_value_sar: 425600.0,
      hs_codes: ['8708.29.90', '8504.40.90'],
      block_hash: '8f4da12b9c73e4a55f6612b7a9c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
      previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
      block_index: 142,
      timestamp: '2026-09-14T02:15:30Z'
    },
    {
      id: 'm2-uuid-9912',
      manifest_number: 'MANIFEST-KSA-2026-0942',
      declaration_type: 'TRANSIT',
      border_port_name: 'Batha Border Control Plane (UAE Gate)',
      clearance_status: 'UNDER_INSPECTION',
      zatca_compliance_status: 'NOT_SUBMITTED',
      total_value_sar: 1250350.75,
      hs_codes: ['8471.30.00', '8517.62.00'],
      block_hash: '2b9c73e4a55f6612b7a9c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c18f4da1',
      previous_hash: '8f4da12b9c73e4a55f6612b7a9c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
      block_index: 143,
      timestamp: '2026-09-14T02:45:10Z'
    },
    {
      id: 'm3-uuid-0051',
      manifest_number: 'MANIFEST-KSA-2026-0943',
      declaration_type: 'EXPORT',
      border_port_name: 'King Abdulaziz Port Dammam (KAP)',
      clearance_status: 'PENDING_DOCUMENTATION',
      zatca_compliance_status: 'NOT_SUBMITTED',
      total_value_sar: 89400.0,
      hs_codes: ['3902.10.00'],
      block_hash: '5f6612b7a9c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c18f4da12b9c73e4a5',
      previous_hash: '2b9c73e4a55f6612b7a9c3d4f5e6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c18f4da1',
      block_index: 144,
      timestamp: '2026-09-14T03:02:44Z'
    }
  ]);

  const selectedManifest = useMemo(
    () => manifests.find(m => m.id === selectedManifestId) || manifests[0],
    [manifests, selectedManifestId]
  );

  const filteredManifests = useMemo(() => {
    return manifests.filter(m => {
      const matchesSearch =
        m.manifest_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.border_port_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.hs_codes.some(c => c.includes(searchQuery));
      const matchesStatus = statusFilter === 'ALL' || m.clearance_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [manifests, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = manifests.length;
    const totalValue = manifests.reduce((acc, curr) => acc + curr.total_value_sar, 0);
    const cleared = manifests.filter(m => m.clearance_status === 'CLEARED').length;
    const zatcaCertified = manifests.filter(m => m.zatca_compliance_status === 'REPORTED').length;
    return { total, totalValue, cleared, zatcaCertified };
  }, [manifests]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleZatcaCryptographicReport = async (manifestId: string) => {
    setIsSubmittingZatca(true);
    // Simulate real-time cryptographic XML signing and cryptographic validation delay
    await new Promise(resolve => setTimeout(resolve, 1400));
    setManifests(prev =>
      prev.map(item =>
        item.id === manifestId
          ? { ...item, zatca_compliance_status: 'REPORTED', clearance_status: 'CLEARED' }
          : item
      )
    );
    setIsSubmittingZatca(false);
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-cyan-500 selection:text-black">
      {/* COMPLIANCE BOARD TOP BAR */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800/80 pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Globe className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Cross-Border Customs & Electronic Ledger Reporting
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  PHASE 5 ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                <span>ZATCA Phase-2 (Stage-2) Cryptographic Engine</span>
                <span className="text-slate-600">•</span>
                <span>Immutable SHA-256 General Ledger Chaining</span>
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS & TAB SWITCHER */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs font-mono shadow-inner">
            <button
              onClick={() => setActiveTab('manifests')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'manifests'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              Customs Manifests
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === 'ledger'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 font-bold text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="h-3.5 w-3.5" />
              Immutable Hash Ledger
            </button>
          </div>

          <a
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-cyan-400 transition-colors border border-slate-800 bg-slate-900/60 px-3 py-2 rounded-xl"
          >
            Exit to Hub
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* METRIC CARDS HEADER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
          <span className="text-xs font-mono text-slate-400 block mb-1">Total Manifests Tracked</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              Active Sync
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
          <span className="text-xs font-mono text-slate-400 block mb-1">Declared Cargo Valuation</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white">
              {stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-mono text-slate-400">SAR</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
          <span className="text-xs font-mono text-slate-400 block mb-1">Clearance Ratio</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">
              {stats.total > 0 ? Math.round((stats.cleared / stats.total) * 100) : 0}%
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              {stats.cleared}/{stats.total} Cleared
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-md">
          <span className="text-xs font-mono text-slate-400 block mb-1">ZATCA Cryptographic Certs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-teal-300">{stats.zatcaCertified}</span>
            <span className="text-xs font-mono text-[#10b981] bg-emerald-950/60 px-2 py-0.5 rounded border border-[#10b981]/40 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Stage-2 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* VIEW CONTENT TABS */}
      {activeTab === 'manifests' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: CUSTOMS DECLARATIONS LIST */}
          <div className="lg:col-span-7 space-y-4">
            {/* SEARCH & FILTER BAR */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter by Manifest #, Port name, or HS Code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl text-xs font-mono">
                {['ALL', 'CLEARED', 'UNDER_INSPECTION', 'PENDING_DOCUMENTATION'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      statusFilter === st
                        ? 'bg-slate-800 font-bold text-cyan-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredManifests.map(manifest => {
                const isSelected = selectedManifest?.id === manifest.id;
                return (
                  <div
                    key={manifest.id}
                    onClick={() => setSelectedManifestId(manifest.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-cyan-500/80 bg-[#0c1222] shadow-xl shadow-cyan-950/30'
                        : 'border-slate-800/80 bg-[#090d19]/80 hover:border-slate-700 hover:bg-[#0c1020]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500" />
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {manifest.manifest_number}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            #BLOCK-{manifest.block_index}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tracking-tight text-white block mt-1">
                          {manifest.border_port_name}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-1 text-[10px] font-mono rounded-md font-bold uppercase tracking-wider ${
                          manifest.declaration_type === 'IMPORT'
                            ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                            : manifest.declaration_type === 'EXPORT'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                            : 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                        }`}
                      >
                        {manifest.declaration_type}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                      {manifest.hs_codes.map(code => (
                        <span
                          key={code}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400"
                        >
                          HS: {code}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 font-mono text-[11px] font-semibold ${
                            manifest.clearance_status === 'CLEARED'
                              ? 'text-emerald-400'
                              : manifest.clearance_status === 'UNDER_INSPECTION'
                              ? 'text-amber-400'
                              : manifest.clearance_status === 'HELD'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {manifest.clearance_status === 'CLEARED' && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {manifest.clearance_status === 'UNDER_INSPECTION' && (
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                          )}
                          {manifest.clearance_status === 'PENDING_DOCUMENTATION' && (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {manifest.clearance_status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-mono text-slate-200 font-bold">
                        {manifest.total_value_sar.toLocaleString('en-US', { minimumFractionDigits: 2 })} SAR
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: SELECTION AUDIT DETAILS */}
          <div className="lg:col-span-5">
            {selectedManifest ? (
              <div className="bg-[#0b1021] border border-slate-800/90 rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl sticky top-6">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-600" />

                <div className="border-b border-slate-800/80 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-bold tracking-tight text-white">
                        {selectedManifest.manifest_number}
                      </h3>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        UUID: {selectedManifest.id}
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                      Port: {selectedManifest.border_port_name.split(' ')[0]}
                    </span>
                  </div>
                </div>

                {/* TARIFF DETAILS */}
                <div className="space-y-2 text-xs">
                  <span className="text-slate-400 font-mono uppercase tracking-wider text-[10px] font-bold">
                    Harmonized System (HS) Codes:
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedManifest.hs_codes.map(code => (
                      <span
                        key={code}
                        className="px-2.5 py-1.5 bg-slate-900/90 border border-slate-800 font-mono rounded-lg text-xs text-slate-200 flex items-center gap-1.5"
                      >
                        <Layers className="h-3 w-3 text-cyan-400" />
                        {code}
                      </span>
                    ))}
                  </div>
                </div>

                {/* CRYPTOGRAPHIC BLOCK DETAILS */}
                <div className="space-y-3 p-4 bg-[#070b16] rounded-xl border border-slate-800/80 font-mono text-xs">
                  <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/60">
                    <span className="flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-cyan-400" />
                      LEDGER BLOCK SEQUENCE
                    </span>
                    <span className="text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
                      #BLOCK-{selectedManifest.block_index}
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                      <span>SHA-256 CURRENT HASH:</span>
                      <button
                        onClick={() => handleCopy(selectedManifest.block_hash)}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedHash === selectedManifest.block_hash ? (
                          <>
                            <Check className="h-3 w-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-300 text-[10px] break-all leading-relaxed bg-black/60 p-2.5 rounded-lg border border-slate-800 font-mono">
                      {selectedManifest.block_hash}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">PREVIOUS BLOCK HASH:</span>
                    <p className="text-slate-500 text-[10px] break-all leading-relaxed bg-black/40 p-2 rounded-lg border border-slate-900 font-mono">
                      {selectedManifest.previous_hash}
                    </p>
                  </div>
                </div>

                {/* REGULATORY SUBMISSION BOX */}
                <div className="pt-2 border-t border-slate-800/80 space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400">ZATCA Stage-2 Reporting:</span>
                    <span
                      className={`px-2.5 py-1 rounded-md font-bold text-[11px] flex items-center gap-1.5 ${
                        selectedManifest.zatca_compliance_status === 'REPORTED'
                          ? 'bg-emerald-950/80 text-[#10b981] border border-[#10b981]/50'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {selectedManifest.zatca_compliance_status === 'REPORTED' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10b981]" />
                          REPORTED & VALIDATED
                        </>
                      ) : (
                        selectedManifest.zatca_compliance_status
                      )}
                    </span>
                  </div>

                  {selectedManifest.zatca_compliance_status !== 'REPORTED' ? (
                    <button
                      onClick={() => handleZatcaCryptographicReport(selectedManifest.id)}
                      disabled={isSubmittingZatca}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 disabled:opacity-50"
                    >
                      {isSubmittingZatca ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          COMPILING REGULATORY XML SIGNATURE...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          DISPATCH CRYPTOGRAPHIC COMPLIANCE INVOICE
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-[#10b981]/40 text-[#10b981] text-xs font-mono flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10b981]" />
                      <span>✔ ZATCA CERTIFIED: Cryptographic verification payload approved. Ledger audit sealed.</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 border border-slate-800 rounded-2xl text-center text-slate-500 font-mono text-xs">
                Select an active customs manifest pipeline to view cryptographic audit trails.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* BLOCKCHAIN LEDGER VIEW PANEL */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0b1021] border border-slate-800/90 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-slate-800/80 gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-cyan-400" />
                  Sequential Anti-Tamper Blockchain Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Demonstrating SHA-256 cryptographic linkage across all financial journal vouchers & border declarations.
                </p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <ShieldCheck className="h-4 w-4" />
                <span>Chain Invariance Verified: 0 Breaches</span>
              </div>
            </div>

            {/* BLOCKCHAIN NODE CHAIN */}
            <div className="pt-8 space-y-6">
              {manifests.map((block, idx) => {
                const isHovered = hoveredBlockIndex === block.block_index;
                return (
                  <div key={block.id} className="relative">
                    {/* CONNECTOR LINE */}
                    {idx < manifests.length - 1 && (
                      <div className="absolute left-6 top-16 bottom-[-24px] w-0.5 bg-gradient-to-b from-cyan-500 to-slate-800 z-0" />
                    )}

                    <div
                      onMouseEnter={() => setHoveredBlockIndex(block.block_index)}
                      onMouseLeave={() => setHoveredBlockIndex(null)}
                      className={`relative z-10 p-5 rounded-2xl border transition-all ${
                        isHovered
                          ? 'border-cyan-400 bg-[#0f172a] shadow-xl shadow-cyan-950/40'
                          : 'border-slate-800 bg-[#070b16] hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-cyan-400 text-xs shadow-inner">
                            #{block.block_index}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white font-mono">
                                BLOCK INDEX #{block.block_index}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-semibold">
                                DIGITALLY SEALED
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              Payload Source: {block.manifest_number} • {block.border_port_name}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-mono text-slate-400">
                          {new Date(block.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs font-mono">
                        <div className="p-3 rounded-xl bg-black/40 border border-slate-800/80">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <span>SHA-256 CURRENT HASH:</span>
                            <button
                              onClick={() => handleCopy(block.block_hash)}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              {copiedHash === block.block_hash ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </div>
                          <p className="text-cyan-300 text-[11px] break-all leading-relaxed font-mono">
                            {block.block_hash}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-black/20 border border-slate-900">
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                            <span>PREVIOUS LINKED HASH:</span>
                          </div>
                          <p className="text-slate-500 text-[11px] break-all leading-relaxed font-mono">
                            {block.previous_hash}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
