import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { MemoryItem } from '../types';
import { 
  HardDrive, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  FileText, 
  ShieldCheck, 
  Database, 
  PieChart as PieChartIcon, 
  Sparkles, 
  Layers, 
  Activity, 
  Lock,
  Download,
  Info
} from 'lucide-react';

interface StorageUsageDashboardProps {
  memories: MemoryItem[];
  totalStorageGB?: number; // default e.g. 50 GB or 100 GB
}

export interface MediaCategoryBreakdown {
  label: string;
  typeKey: 'photo' | 'video' | 'audio' | 'document' | 'vault';
  count: number;
  sizeMB: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

export const StorageUsageDashboard: React.FC<StorageUsageDashboardProps> = ({
  memories,
  totalStorageGB = 50
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedViewType, setSelectedViewType] = useState<'donut' | 'progress'>('donut');

  // Compute storage breakdown dynamically based on actual memory items
  const breakdownData = useMemo(() => {
    let photosCount = 0;
    let photosSizeMB = 0;

    let videosCount = 0;
    let videosSizeMB = 0;

    let audioCount = 0;
    let audioSizeMB = 0;

    let docsCount = 0;
    let docsSizeMB = 0;

    let vaultCount = 0;
    let vaultSizeMB = 0;

    memories.forEach(item => {
      // Check if video
      if (item.videoUrl || item.mediaType === 'video') {
        videosCount += 1;
        videosSizeMB += 18.5; // Avg 18.5 MB per video
      } 
      // Check if audio story
      else if (item.description?.includes('[Spoken Story Transcription]') || item.title?.toLowerCase().includes('voice') || item.title?.toLowerCase().includes('audio')) {
        audioCount += 1;
        audioSizeMB += 4.2; // Avg 4.2 MB per spoken story
      }
      // Check if document/legal
      else if (item.category === 'Legal' || item.mediaType === 'document' || !item.imageUrl) {
        docsCount += 1;
        docsSizeMB += 2.8; // Avg 2.8 MB per document
      } 
      // Photo/Image
      else {
        photosCount += 1;
        photosSizeMB += 5.4; // Avg 5.4 MB per photo
      }

      // High security vault extra overhead
      if (item.encryptionLevel === 'Quantum-Proof' || item.encryptionLevel === 'Level 5 Protected') {
        vaultCount += 1;
        vaultSizeMB += 1.2;
      }
    });

    // Default minimum demo fallback values so the chart is visually rich even if empty
    if (photosCount === 0 && videosCount === 0 && docsCount === 0) {
      photosCount = 12; photosSizeMB = 64.8;
      videosCount = 4; videosSizeMB = 74.0;
      audioCount = 6; audioSizeMB = 25.2;
      docsCount = 8; docsSizeMB = 22.4;
      vaultCount = 5; vaultSizeMB = 18.6;
    }

    const totalUsedMB = photosSizeMB + videosSizeMB + audioSizeMB + docsSizeMB + vaultSizeMB;

    const categories: MediaCategoryBreakdown[] = [
      {
        label: 'Photos & Visuals',
        typeKey: 'photo',
        count: photosCount,
        sizeMB: Math.round(photosSizeMB * 10) / 10,
        percentage: Math.round((photosSizeMB / totalUsedMB) * 100) || 0,
        color: '#DFB260', // Warm Gold
        icon: <ImageIcon className="w-4 h-4 text-[#F5D77F]" />
      },
      {
        label: 'HD Videos & Recordings',
        typeKey: 'video',
        count: videosCount,
        sizeMB: Math.round(videosSizeMB * 10) / 10,
        percentage: Math.round((videosSizeMB / totalUsedMB) * 100) || 0,
        color: '#10B981', // Emerald
        icon: <Video className="w-4 h-4 text-emerald-400" />
      },
      {
        label: 'Spoken Voice Stories',
        typeKey: 'audio',
        count: audioCount,
        sizeMB: Math.round(audioSizeMB * 10) / 10,
        percentage: Math.round((audioSizeMB / totalUsedMB) * 100) || 0,
        color: '#F59E0B', // Amber
        icon: <Mic className="w-4 h-4 text-amber-400" />
      },
      {
        label: 'Documents & Deeds',
        typeKey: 'document',
        count: docsCount,
        sizeMB: Math.round(docsSizeMB * 10) / 10,
        percentage: Math.round((docsSizeMB / totalUsedMB) * 100) || 0,
        color: '#3B82F6', // Blue
        icon: <FileText className="w-4 h-4 text-blue-400" />
      },
      {
        label: 'Encrypted Vault Proofs',
        typeKey: 'vault',
        count: vaultCount,
        sizeMB: Math.round(vaultSizeMB * 10) / 10,
        percentage: Math.round((vaultSizeMB / totalUsedMB) * 100) || 0,
        color: '#8B5CF6', // Purple
        icon: <Lock className="w-4 h-4 text-purple-400" />
      }
    ];

    return {
      totalUsedMB: Math.round(totalUsedMB * 10) / 10,
      totalUsedGB: Math.round((totalUsedMB / 1024) * 100) / 100,
      totalCount: memories.length || (photosCount + videosCount + audioCount + docsCount),
      categories
    };
  }, [memories]);

  // Render D3 Donut Chart
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const width = 280;
    const height = 280;
    const margin = 20;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.62; // Donut hole size

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // D3 Pie Generator
    const pie = d3.pie<MediaCategoryBreakdown>()
      .value(d => d.sizeMB)
      .sort(null)
      .padAngle(0.04);

    // D3 Arc Generators
    const arc = d3.arc<d3.PieArcDatum<MediaCategoryBreakdown>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(6);

    const arcHover = d3.arc<d3.PieArcDatum<MediaCategoryBreakdown>>()
      .innerRadius(innerRadius - 4)
      .outerRadius(radius + 8)
      .cornerRadius(8);

    // Draw slices
    const pieData = pie(breakdownData.categories);

    const slices = g.selectAll('path')
      .data(pieData)
      .enter()
      .append('path')
      .attr('d', arc as any)
      .attr('fill', d => d.data.color)
      .attr('stroke', '#0A0514')
      .attr('stroke-width', '3px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.3s ease');

    // Slice interaction
    slices
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover as any)
          .attr('filter', 'drop-shadow(0px 0px 8px rgba(223,178,96,0.6))');
        setActiveCategory(d.data.label);
      })
      .on('mouseleave', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc as any)
          .attr('filter', 'none');
        setActiveCategory(null);
      });

    // Center Donut Text
    const centerGroup = g.append('g').attr('text-anchor', 'middle');

    centerGroup.append('text')
      .attr('dy', '-0.5em')
      .attr('fill', '#FFF2A8')
      .attr('font-size', '20px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'Cinzel, serif')
      .text(`${breakdownData.totalUsedMB} MB`);

    centerGroup.append('text')
      .attr('dy', '1.1em')
      .attr('fill', '#C8B1E4')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .text(`${breakdownData.totalCount} Permaweb Assets`);

  }, [breakdownData]);

  const totalCapacityMB = totalStorageGB * 1024;
  const overallUsedPercentage = Math.min(100, Math.round((breakdownData.totalUsedMB / totalCapacityMB) * 100 * 100) / 100);

  return (
    <div className="cosmic-card-gold p-6 sm:p-8 rounded-3xl space-y-6 relative overflow-hidden shadow-2xl">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#DFB260]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DFB260]/20 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40 shadow">
            <HardDrive className="w-6 h-6 text-[#F5D77F]" />
          </div>
          <div>
            <h2 className="font-cinzel font-bold text-xl text-[#FFF2A8] flex items-center gap-2">
              <span>Arweave Permaweb Storage Dashboard</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                D3 Analytics
              </span>
            </h2>
            <p className="text-xs text-[#C8B1E4]/90 font-mono">
              Immutable storage distribution, asset sizes &amp; cryptographic breakdown
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#0A0514] p-1 rounded-xl border border-[#DFB260]/30 text-xs">
          <button
            onClick={() => setSelectedViewType('donut')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              selectedViewType === 'donut'
                ? 'bg-[#DFB260] text-[#120B21] shadow font-bold'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Donut Chart</span>
          </button>
          <button
            onClick={() => setSelectedViewType('progress')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              selectedViewType === 'progress'
                ? 'bg-[#DFB260] text-[#120B21] shadow font-bold'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Progress Breakdown</span>
          </button>
        </div>
      </div>

      {/* Main Storage Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
          <span className="text-[11px] text-[#C8B1E4] font-mono uppercase tracking-wider block">Total Vault Used</span>
          <div className="flex items-baseline space-x-2">
            <span className="font-cinzel font-bold text-2xl text-[#FFF2A8]">{breakdownData.totalUsedMB} MB</span>
            <span className="text-xs font-mono text-[#F5D77F]">({breakdownData.totalUsedGB} GB)</span>
          </div>
          <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>100% Permanently Encrypted on Permaweb</span>
          </p>
        </div>

        <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
          <span className="text-[11px] text-[#C8B1E4] font-mono uppercase tracking-wider block">Allocated Perpetual Capacity</span>
          <div className="flex items-baseline space-x-2">
            <span className="font-cinzel font-bold text-2xl text-[#FFF2A8]">{totalStorageGB} GB</span>
            <span className="text-xs font-mono text-[#C8B1E4]/70">({overallUsedPercentage}% used)</span>
          </div>
          <div className="w-full bg-[#120B21] h-1.5 rounded-full overflow-hidden border border-[#DFB260]/20 mt-2">
            <div 
              className="bg-gradient-to-r from-[#DFB260] to-[#F5D77F] h-full transition-all duration-500" 
              style={{ width: `${Math.max(2, overallUsedPercentage)}%` }}
            />
          </div>
        </div>

        <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
          <span className="text-[11px] text-[#C8B1E4] font-mono uppercase tracking-wider block">Total Stored Assets</span>
          <div className="flex items-baseline space-x-2">
            <span className="font-cinzel font-bold text-2xl text-[#FFF2A8]">{breakdownData.totalCount}</span>
            <span className="text-xs font-mono text-purple-300">Items / Artifacts</span>
          </div>
          <p className="text-[10px] text-[#C8B1E4]/80 font-mono flex items-center gap-1">
            <Database className="w-3 h-3 text-amber-400" />
            <span>24 Active Node Replications</span>
          </p>
        </div>
      </div>

      {/* Chart Visualization & Category Breakdown List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        
        {/* Left Column: D3 Chart or D3 Visual Bar */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-[#0A0514] p-6 rounded-3xl border border-[#DFB260]/30 relative">
          
          {selectedViewType === 'donut' ? (
            <div className="relative flex flex-col items-center">
              <svg ref={svgRef} className="w-64 h-64 filter drop-shadow-lg" />
              {activeCategory && (
                <div className="mt-2 text-center animate-fade-in">
                  <span className="text-xs font-mono text-[#F5D77F] font-bold">{activeCategory}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full space-y-4 py-4">
              <span className="text-xs font-mono font-bold text-[#F5D77F] uppercase tracking-wider block border-b border-[#DFB260]/20 pb-2">
                Storage Size Allocation Share
              </span>

              {/* Stacked D3 Segment Bar */}
              <div className="w-full h-6 bg-[#120B21] rounded-xl overflow-hidden border border-[#DFB260]/30 flex p-0.5 gap-0.5">
                {breakdownData.categories.map((cat, i) => (
                  <div
                    key={cat.typeKey}
                    style={{ 
                      width: `${Math.max(3, cat.percentage)}%`, 
                      backgroundColor: cat.color 
                    }}
                    className="h-full rounded-sm transition-all duration-300 hover:opacity-90 relative group"
                    title={`${cat.label}: ${cat.sizeMB} MB (${cat.percentage}%)`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#C8B1E4] pt-2">
                {breakdownData.categories.map(cat => (
                  <div key={cat.typeKey} className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.label} ({cat.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Category Breakdown Table / Cards */}
        <div className="lg:col-span-7 space-y-3">
          <span className="text-xs font-mono text-[#C8B1E4] uppercase tracking-wider block font-bold">
            Asset Type Breakdown
          </span>

          <div className="space-y-2.5">
            {breakdownData.categories.map((cat) => (
              <div 
                key={cat.typeKey}
                className="bg-[#0A0514] p-3.5 rounded-2xl border border-[#DFB260]/20 hover:border-[#DFB260]/50 transition-all flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-[#120B21] border border-[#DFB260]/30">
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                      {cat.label}
                    </h4>
                    <span className="text-[10px] text-[#C8B1E4]/70 font-mono block">
                      {cat.count} {cat.count === 1 ? 'file' : 'files'} stored
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Category Progress Bar */}
                  <div className="w-24 hidden sm:block">
                    <div className="flex justify-between text-[10px] font-mono text-[#C8B1E4] mb-1">
                      <span>{cat.percentage}%</span>
                    </div>
                    <div className="w-full bg-[#120B21] h-1.5 rounded-full overflow-hidden border border-[#DFB260]/20">
                      <div 
                        className="h-full rounded-full transition-all duration-300" 
                        style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} 
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs text-[#FFF2A8] font-bold block">{cat.sizeMB} MB</span>
                    <span className="text-[9px] font-mono text-[#F5D77F] block">Arweave Immutable</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Arweave Health Notice */}
          <div className="bg-[#120B21]/80 p-3 rounded-xl border border-[#DFB260]/30 flex items-center justify-between text-[11px] text-[#C8B1E4]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#F5D77F]" />
              <span>Permaweb storage fees fully prepaid in sovereign AR tokens. Zero monthly subscription expiry.</span>
            </div>
            <a 
              href="https://viewblock.io/arweave" 
              target="_blank" 
              rel="noreferrer"
              className="text-[#F5D77F] hover:underline font-mono text-[10px] shrink-0 ml-2"
            >
              Verify Node Tx
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
